/**
 * Search Utilities for Bespoke Platform
 * Supports multi-token search matching Product Name, Category, Fabric, Color, and Materials.
 */

export const RECENT_SEARCHES_KEY = 'bespoke_recent_searches'

export function getRecentSearches() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, 5) : []
  } catch {
    return []
  }
}

export function saveRecentSearch(term) {
  if (typeof window === 'undefined') return []
  const clean = (term || '').trim()
  if (!clean) return getRecentSearches()

  try {
    const existing = getRecentSearches()
    const filtered = existing.filter((item) => item.toLowerCase() !== clean.toLowerCase())
    const updated = [clean, ...filtered].slice(0, 5)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    return updated
  } catch {
    return []
  }
}

export function removeRecentSearch(term) {
  if (typeof window === 'undefined') return []
  try {
    const existing = getRecentSearches()
    const updated = existing.filter((item) => item.toLowerCase() !== (term || '').trim().toLowerCase())
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    return updated
  } catch {
    return []
  }
}

export function clearRecentSearches() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY)
  } catch {}
}

/**
 * Extract fabric names associated with a product (from root and materials)
 */
export function getProductFabrics(product) {
  if (!product) return []
  const list = []
  if (product.fabric) list.push(String(product.fabric))
  if (Array.isArray(product.fabrics)) {
    product.fabrics.forEach((f) => {
      if (f) list.push(String(f))
    })
  }
  if (product.material_name && isKnownFabric(product.material_name)) list.push(String(product.material_name))
  if (product.variant_name && isKnownFabric(product.variant_name)) list.push(String(product.variant_name))
  if (Array.isArray(product.materials)) {
    product.materials.forEach((m) => {
      if (m?.fabric) list.push(String(m.fabric))
      if (m?.name && isKnownFabric(m.name)) list.push(String(m.name))
      if (m?.material_name && isKnownFabric(m.material_name)) list.push(String(m.material_name))
    })
  }
  return Array.from(new Set(list.map((s) => s.trim()))).filter(Boolean)
}

/**
 * Extract color names associated with a product (from root and materials)
 */
export function getProductColors(product) {
  if (!product) return []
  const list = []
  if (product.color) list.push(String(product.color))
  if (Array.isArray(product.colors)) {
    product.colors.forEach((c) => {
      if (c) list.push(String(c))
    })
  }
  if (product.material_name && isKnownColor(product.material_name)) list.push(String(product.material_name))
  if (product.variant_name && isKnownColor(product.variant_name)) list.push(String(product.variant_name))
  if (Array.isArray(product.materials)) {
    product.materials.forEach((m) => {
      if (m?.color) list.push(String(m.color))
      if (m?.material_name) {
        if (isKnownColor(m.material_name)) list.push(String(m.material_name))
        else if (isNaN(m.material_name) && !['test', 'ready', 'both', 'sdac'].includes(String(m.material_name).toLowerCase())) {
          list.push(String(m.material_name))
        }
      }
      if (m?.name && isKnownColor(m.name)) list.push(String(m.name))
    })
  }
  return Array.from(new Set(list.map((s) => s.trim()))).filter(Boolean)
}

const COMMON_FABRICS = [
  'cotton', 'silk', 'linen', 'polyester', 'polyster', 'wool', 'chiffon',
  'georgette', 'velvet', 'denim', 'satin', 'crepe', 'rayon', 'viscose',
  'organza', 'khadi', 'tulle', 'nylon', 'jacquard', 'brocade'
]

const COMMON_COLORS = [
  'red', 'blue', 'green', 'black', 'white', 'yellow', 'pink', 'purple',
  'orange', 'navy', 'grey', 'gray', 'brown', 'maroon', 'gold', 'golden',
  'silver', 'beige', 'cream', 'peach', 'teal', 'magenta', 'cyan', 'olive'
]

function isKnownFabric(str) {
  const s = String(str).toLowerCase()
  return COMMON_FABRICS.some((f) => s.includes(f))
}

function isKnownColor(str) {
  const s = String(str).toLowerCase()
  return COMMON_COLORS.some((c) => s.includes(c))
}

/**
 * Builds searchable tokenized corpus for a product
 */
export function getSearchCorpus(product) {
  if (!product) return ''
  const pName = String(product.product_name || product.title || product.name || '')
  const pDesc = String(product.description || '')
  const pCat = String(product.category_name || product.category || '')
  const pSubcat = String(product.subcategory_name || product.subcategory || '')
  const pGender = String(product.gender || '')
  const pBrand = String(product.brand || product.shop_name || product.seller_name || '')
  const pVariant = String(product.variant_name || product.material_name || '')
  const pOccasion = String(product.occasion || '')

  const fabrics = getProductFabrics(product)
  const colors = getProductColors(product)

  const materialStrings = (Array.isArray(product.materials) ? product.materials : []).flatMap((m) => [
    String(m.name || ''),
    String(m.material_name || ''),
    String(m.fabric || ''),
    String(m.color || ''),
    String(m.description || ''),
  ])

  return [
    pName,
    pDesc,
    pCat,
    pSubcat,
    pGender,
    pBrand,
    pVariant,
    pOccasion,
    ...fabrics,
    ...colors,
    ...materialStrings,
  ]
    .join(' ')
    .toLowerCase()
}

/**
 * Normalize queries (e.g. handle polyester/polyster, plurals, etc.)
 */
function normalizeToken(token) {
  const t = token.toLowerCase()
  if (t === 'polyester') return 'polyster'
  if (t.endsWith('s') && t.length > 4 && !t.endsWith('ss')) {
    return t.slice(0, -1) // e.g. "kurtas" -> "kurta", "shirts" -> "shirt"
  }
  return t
}

/**
 * Check if a product matches a user search query
 */
export function matchProductQuery(product, query) {
  if (!product) return false
  if (product.is_active === '0' || product.is_active === 0 || product.action === '1') return false
  const cleanQuery = (query || '').trim().toLowerCase()
  if (!cleanQuery) return true

  const corpus = getSearchCorpus(product)
  if (corpus.includes(cleanQuery)) return true

  const rawTokens = cleanQuery.split(/\s+/).filter(Boolean)
  if (rawTokens.length === 0) return true

  // Check every token against corpus
  return rawTokens.every((rawTok) => {
    const tok = rawTok.toLowerCase()
    const normTok = normalizeToken(tok)
    return (
      corpus.includes(tok) ||
      corpus.includes(normTok) ||
      (tok === 'polyster' && corpus.includes('polyester')) ||
      (tok === 'polyester' && corpus.includes('polyster'))
    )
  })
}

/**
 * Score relevance of a product to query for best-match ordering
 */
export function scoreProductQuery(product, query) {
  if (!product || !query) return 0
  const cleanQuery = query.trim().toLowerCase()
  if (!cleanQuery) return 0

  let score = 0
  const pTitle = String(product.product_name || product.title || '').toLowerCase()
  const pVariant = String(product.variant_name || product.material_name || '').toLowerCase()
  const fabrics = getProductFabrics(product).map((f) => f.toLowerCase())
  const colors = getProductColors(product).map((c) => c.toLowerCase())
  const pCat = String(product.category_name || product.category || '').toLowerCase()

  // Exact full query match
  if (pTitle === cleanQuery) score += 200
  else if (pTitle.includes(cleanQuery)) score += 80

  const tokens = cleanQuery.split(/\s+/).filter(Boolean)

  tokens.forEach((t) => {
    const tok = t.toLowerCase()
    const norm = normalizeToken(tok)

    if (pTitle.includes(tok) || pTitle.includes(norm)) score += 40
    if (pVariant.includes(tok) || pVariant.includes(norm)) score += 35

    // Color match
    if (colors.some((c) => c.includes(tok) || tok.includes(c))) score += 45

    // Fabric match
    if (
      fabrics.some(
        (f) =>
          f.includes(tok) ||
          f.includes(norm) ||
          (tok === 'polyester' && f.includes('polyster'))
      )
    ) {
      score += 45
    }

    // Category match
    if (pCat.includes(tok)) score += 20
  })

  // Add rating factor
  if (product.rating) score += Number(product.rating) || 0

  return score
}

