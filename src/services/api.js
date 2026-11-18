// API Service for Bespoke E-Commerce Platform
// Node.js Backend (bespokeBackend): http://localhost:8080
// Laravel Remote API: http://43.204.68.67/bespoke/public/api/

import { NAVIGATION_CATEGORIES } from '../data/navigationData'

export const NODE_API = import.meta.env.VITE_NODE_API || 'http://localhost:8080'
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://43.204.68.67/bespoke/public/api'
export const S3_BASE_URL = import.meta.env.VITE_S3_BASE_URL || 'https://bespoke-2026.s3.ap-south-1.amazonaws.com'
const PROXY_URL = '/bespoke-api'

/**
 * Format any raw path or filename into a full AWS S3 URL
 */
export function formatImageUrl(path) {
  if (!path || typeof path !== 'string') return null
  const trimmed = path.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  const clean = trimmed.replace(/^\/+/, '')
  return `${S3_BASE_URL}/${clean}`
}

/**
 * Universal safe fetcher for both direct array and paginated { data: { data: [] } } Laravel responses
 */
async function fetchEndpoint(path) {
  async function makeRequest(url) {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()

    // Normalize paginated or direct responses
    if (json.data && Array.isArray(json.data.data)) {
      return json.data.data
    }
    if (Array.isArray(json.data)) {
      return json.data
    }
    return json.data || []
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`

  // 1. Primary: Local Node.js backend
  try {
    return await makeRequest(`${NODE_API}/api${cleanPath}`)
  } catch (nodeErr) {
    // 2. Fallback: Direct Remote Laravel
    try {
      return await makeRequest(`${BASE_URL}${cleanPath}`)
    } catch (directErr) {
      // 3. Fallback: Proxy
      try {
        return await makeRequest(`${PROXY_URL}${cleanPath}`)
      } catch {
        throw directErr
      }
    }
  }
}

/**
 * 1. Categories
 */
export async function getCategories() {
  // First attempt from Node.js backend
  try {
    const res = await fetch(`${NODE_API}/api/categories`)
    if (res.ok) {
      const json = await res.json()
      if (Array.isArray(json.data) && json.data.length > 0) return json.data
    }
  } catch {
    // Fallback to remote API
  }
  return await fetchEndpoint('/categories?per_page=100')
}

/**
 * 2. Subcategories
 */
export async function getSubcategories() {
  try {
    const res = await fetch(`${NODE_API}/api/subcategories`)
    if (res.ok) {
      const json = await res.json()
      if (Array.isArray(json.data) && json.data.length > 0) return json.data
    }
  } catch {
    // Fallback to remote API
  }
  return await fetchEndpoint('/subcategories?per_page=100')
}

/**
 * 3. App Banners (Hero Slider)
 */
export async function getAppBanners() {
  try {
    const res = await fetch(`${NODE_API}/api/app-banners`)
    if (res.ok) {
      const json = await res.json()
      if (Array.isArray(json.data) && json.data.length > 0) return json.data
    }
  } catch {
    // Fallback to remote API
  }
  return await fetchEndpoint('/app-banners')
}

/**
 * 4. Shops in Spotlight
 */
export async function getSpotlights() {
  return await fetchEndpoint('/spotlights')
}

/**
 * 5. Top Designers
 */
export async function getDesigners() {
  return await fetchEndpoint('/designers')
}

/**
 * Fetch detailed designer atelier profile and curated products by designer ID
 */
export async function getDesignerDetails(designerId) {
  if (!designerId) return null
  const id = String(designerId).trim()

  // 1. Fetch from Node.js backend: /api/designer/:id
  try {
    const res = await fetch(`${NODE_API}/api/designer/${id}`, {
      headers: { Accept: 'application/json' },
    })
    if (res.ok) {
      const json = await res.json()
      if (json.status && json.designer) {
        return json.designer
      }
    }
  } catch (err) {
    console.warn(`Node API /api/designer/${id} failed:`, err.message)
  }

  // 2. Fetch from Node.js backend: /api/designer/product?designer_id=:id
  try {
    const res = await fetch(`${NODE_API}/api/designer/product?designer_id=${id}`, {
      headers: { Accept: 'application/json' },
    })
    if (res.ok) {
      const json = await res.json()
      if (json.status && json.designer) {
        return json.designer
      }
    }
  } catch (err) {
    console.warn(`Node API /api/designer/product?designer_id=${id} failed:`, err.message)
  }

  // 3. Fallback to /bespoke-api proxy
  try {
    const res = await fetch(`/bespoke-api/designer/product?designer_id=${id}`, {
      headers: { Accept: 'application/json' },
    })
    if (res.ok) {
      const json = await res.json()
      if (json.designer) return json.designer
    }
  } catch {}

  return null
}

/**
 * 6. Top Current Deals
 */
export async function getCurrentDeals() {
  const deals = await fetchEndpoint('/current-deals')
  return Array.isArray(deals) ? deals.filter((d) => isProductActive(d.product || d)) : deals
}

/**
 * 7. Super Saver Deals
 */
export async function getSuperSaverDeals() {
  const deals = await fetchEndpoint('/supersaver-deals')
  return Array.isArray(deals) ? deals.filter((d) => isProductActive(d.product || d)) : deals
}

/**
 * Helper: Strictly determine if a product is active based on product_materials.is_active = '1'
 */
export function isProductActive(product) {
  if (!product) return false
  if (product.is_active === '0' || product.is_active === 0 || product.is_active === false) {
    return false
  }
  if (product.action === '1' || product.action === 1) {
    return false
  }
  const mats = product.product_materials || product.materials
  if (Array.isArray(mats) && mats.length > 0) {
    const hasActiveMat = mats.some((m) => {
      const activeVal = m.is_active !== undefined ? m.is_active : m.active
      const isAct =
        activeVal === undefined || activeVal === null
          ? true
          : String(activeVal) === '1' || activeVal === 1 || activeVal === true
      const isNotDeleted = m.action === undefined || m.action === null ? true : String(m.action) !== '1'
      return isAct && isNotDeleted
    })
    if (!hasActiveMat) return false
  }
  return true
}

/**
 * 8. Products (Connected directly to bespokeBackend on Node.js / MySQL products table)
 */
export async function getProducts(params = {}) {
  // Attempt from local bespokeBackend first
  try {
    const query = new URLSearchParams(params).toString()
    const url = `${NODE_API}/api/products${query ? `?${query}` : ''}`
    const res = await fetch(url)
    if (res.ok) {
      const json = await res.json()
      if (json.status && Array.isArray(json.data)) {
        return json.data.filter(isProductActive)
      }
    }
  } catch (nodeErr) {
    console.warn('Node API products fetch failed, falling back to remote endpoint:', nodeErr.message)
  }

  // Fallback to Laravel endpoints
  try {
    const list = await fetchEndpoint('/product/list?per_page=50')
    return Array.isArray(list) ? list.filter(isProductActive) : []
  } catch {
    try {
      const list = await fetchEndpoint('/products?per_page=50')
      return Array.isArray(list) ? list.filter(isProductActive) : []
    } catch (err) {
      console.warn('Could not fetch products from API, returning empty list', err)
      return []
    }
  }
}

/**
 * 9. Single Product Details
 * Uses: http://43.204.68.67/bespoke/public/api/show/product?product_id=:id
 */
export async function getProductDetails(productId) {
  if (!productId) return null

  const targetId = String(productId).trim()
  console.log(`[Bespoke API] Requesting show/product?product_id=${targetId}`)

  // 1. Fetch from local Node.js backend: /api/show/product?product_id=:id
  try {
    const res = await fetch(`${NODE_API}/api/show/product?product_id=${targetId}`, {
      headers: { Accept: 'application/json' },
    })
    if (res.ok) {
      const json = await res.json()
      if (json.status && json.data) {
        return json.data
      }
    }
  } catch (err) {
    console.warn(`Node API /api/show/product?product_id=${targetId} failed:`, err.message)
  }

  // 2. Fallback to /show/product?product_id=:id on Node API
  try {
    const res = await fetch(`${NODE_API}/show/product?product_id=${targetId}`, {
      headers: { Accept: 'application/json' },
    })
    if (res.ok) {
      const json = await res.json()
      if (json.status && json.data) {
        return json.data
      }
    }
  } catch (err) {
    console.warn(`Node API /show/product?product_id=${targetId} failed:`, err.message)
  }

  // 3. Fallback via Vite proxy /bespoke-api/show/product (prevents browser CORS)
  try {
    const res = await fetch(`/bespoke-api/show/product?product_id=${targetId}`, {
      headers: { Accept: 'application/json' },
    })
    if (res.ok) {
      const json = await res.json()
      if (json.status && json.data) {
        return json.data
      }
    }
  } catch (err) {
    console.warn(`Proxy /bespoke-api/show/product?product_id=${targetId} failed:`, err.message)
  }

  // 3. Direct remote API call
  try {
    const res = await fetch(`http://43.204.68.67/bespoke/public/api/show/product?product_id=${targetId}`, {
      headers: { Accept: 'application/json' },
    })
    if (res.ok) {
      const json = await res.json()
      if (json.status && json.data) {
        return json.data
      }
    }
  } catch (err) {
    console.warn(`Direct remote show/product?product_id=${targetId} failed:`, err.message)
  }

  // 4. Fallback to /product/:id from Node API
  try {
    const res = await fetch(`${NODE_API}/product/${targetId}`, {
      headers: { Accept: 'application/json' },
    })
    if (res.ok) {
      const json = await res.json()
      if (json.status && (json.data || json.product)) {
        return json.data || json.product
      }
    }
  } catch {
    // ignore
  }

  return null
}

/**
 * Build department taxonomy from categories and subcategories
 * Strictly maps subcategories by active category ID (no name-based merging of deleted categories)
 */
export function buildTaxonomy(categoriesData = [], subcategoriesData = []) {
  const categoryMap = new Map()

  // 1. Populate initial categories from API
  categoriesData.forEach((cat) => {
    const type = String(cat.type ?? cat.category_type ?? '0')
    const id = Number(cat.id)
    categoryMap.set(id, {
      id,
      name: cat.name || cat.category_name,
      type,
      image:
        formatImageUrl(cat.img_path) ||
        cat.image_url ||
        cat.cover_image ||
        cat.image ||
        'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=600&q=80',
      action: cat.action,
      subcategories: [],
    })
  })

  // Ensure active Unisex category 51 is present
  if (!categoryMap.has(51)) {
    categoryMap.set(51, {
      id: 51,
      name: 'Test',
      type: '4',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
      subcategories: [],
    })
  }

  // 2. Link ALL authentic subcategories from MySQL database
  // Auto-register parent category if it was not in categoriesData
  subcategoriesData.forEach((sub) => {
    const catId = Number(sub.category_id || sub.category?.id)
    if (!catId) return

    if (!categoryMap.has(catId)) {
      const catObj = sub.category || {}
      categoryMap.set(catId, {
        id: catId,
        name:
          catObj.name ||
          (sub.category_type === '1'
            ? 'Men Collection'
            : sub.category_type === '2'
            ? 'Women Collection'
            : sub.category_type === '3'
            ? 'Kids Collection'
            : 'Collection'),
        type: String(sub.category_type ?? catObj.type ?? '0'),
        image:
          formatImageUrl(catObj.img_path) ||
          formatImageUrl(sub.img_path) ||
          catObj.image_url ||
          sub.image_url ||
          'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=600&q=80',
        action: '0',
        subcategories: [],
      })
    }

    const targetCategory = categoryMap.get(catId)
    if (targetCategory && sub.name) {
      const exists = targetCategory.subcategories.some(
        (s) =>
          (s.name || s).toLowerCase().trim() === sub.name.toLowerCase().trim() ||
          (s.id && s.id === sub.id)
      )
      if (!exists) {
        targetCategory.subcategories.push({
          id: sub.id,
          name: sub.name.trim(),
          categoryId: catId,
          categoryName: targetCategory.name,
          categoryType: targetCategory.type,
          image:
            formatImageUrl(sub.img_path) ||
            sub.image_url ||
            sub.cover_image ||
            targetCategory.image,
        })
      }
    }
  })

  const allCategories = Array.from(categoryMap.values())

  const typeToDepartment = {
    '2': {
      id: 'womens',
      name: 'WOMENS',
      themeColor: '#ff007f', // Bespoke Magenta
      badge: 'Trending',
      featured: {
        tag: 'WOMENS LUXURY',
        title: 'Artisanal Weaves & Silhouettes',
        subtitle: 'Sarees, fusion coords, and western cuts direct from atelier.',
        cta: 'Explore Womens',
        image:
          allCategories.find((c) => c.type === '2')?.image ||
          'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
      },
    },
    '1': {
      id: 'mens',
      name: 'MENS',
      themeColor: '#8e24aa', // Bespoke Royal Purple
      badge: 'Popular',
      featured: {
        tag: 'MENS LUXURY',
        title: 'Modern Classic Fits',
        subtitle: 'Top wear, shirts, bottom wear & festive kurta sets.',
        cta: 'Shop Mens',
        image:
          allCategories.find((c) => c.type === '1')?.image ||
          'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80',
      },
    },
    '3': {
      id: 'kids',
      name: 'KIDS',
      themeColor: '#e91e63', // Bespoke Rose
      badge: 'Kids Fest',
      featured: {
        tag: 'LITTLE ATELIER',
        title: 'Boys & Girls Collections',
        subtitle: 'Breathable, gentle ethnic wear, dresses & uniforms.',
        cta: 'Shop Kids',
        image:
          allCategories.find((c) => c.type === '3')?.image ||
          'https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?auto=format&fit=crop&w=600&q=80',
      },
    },
    '0': {
      id: 'non-clothing',
      name: 'NON-CLOTHING',
      themeColor: '#d81b60', // Bespoke Deep Ruby
      badge: null,
      featured: {
        tag: 'LIFESTYLE & LIVING',
        title: 'Accessories & Drinkware',
        subtitle: 'Curated cups, bottles, lifestyle goods & accessories.',
        cta: 'Discover Lifestyle',
        image:
          allCategories.find((c) => c.type === '0')?.image ||
          'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=600&q=80',
      },
    },
    '4': {
      id: 'unisex-wear',
      name: 'UNISEX WEAR',
      themeColor: '#9c27b0', // Bespoke Violet
      badge: 'New Drop',
      featured: {
        tag: 'UNISEX EDITS',
        title: 'Streetwear & Boxy Fits',
        subtitle: 'Heavyweight graphic tees, hoodies, and signature drops.',
        cta: 'Explore Unisex',
        image:
          allCategories.find((c) => c.type === '4')?.image ||
          'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
      },
    },
  }

  // Canonical priority order of category IDs per department
  const typeOrder = {
    '2': [3, 14, 49, 53, 48, 54],
    '1': [24, 11, 9, 8, 44, 52],
    '3': [19, 18, 46, 45],
    '0': [50],
    '4': [51],
  }

  const departments = ['2', '1', '0', '3', '4'].map((typeKey) => {
    const meta = typeToDepartment[typeKey]
    const preferredOrder = typeOrder[typeKey] || []
    const categoriesOfType = allCategories.filter((c) => c.type === typeKey)

    categoriesOfType.sort((a, b) => {
      const idxA = preferredOrder.indexOf(a.id)
      const idxB = preferredOrder.indexOf(b.id)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return b.subcategories.length - a.subcategories.length
    })

    // Merge sections by normalized title to avoid broken fragment sections
    const sectionMap = new Map()
    categoriesOfType.forEach((cat) => {
      if (!cat.subcategories || cat.subcategories.length === 0) return
      const normalizedTitle = cat.name.trim()
      const key = normalizedTitle.toLowerCase()
      if (!sectionMap.has(key)) {
        sectionMap.set(key, {
          title: normalizedTitle,
          categoryId: cat.id,
          categoryImage: cat.image,
          items: [],
          subcategoriesData: [],
        })
      }
      const sec = sectionMap.get(key)
      cat.subcategories.forEach((sub) => {
        if (!sec.items.includes(sub.name)) {
          sec.items.push(sub.name)
          sec.subcategoriesData.push(sub)
        }
      })
    })

    const sections = Array.from(sectionMap.values())

    return {
      id: meta.id,
      name: meta.name,
      slug: meta.id,
      themeColor: meta.themeColor,
      badge: meta.badge,
      type: typeKey,
      sections,
      featured: meta.featured,
      categories: categoriesOfType,
    }
  })

  return {
    allCategories,
    departments,
  }
}

/**
 * Load all homepage sections in one batch for high-performance rendering
 */
export async function getHomePageData() {
  const [
    categories,
    subcategories,
    banners,
    spotlights,
    designers,
    currentDeals,
    superSaverDeals,
    products,
  ] = await Promise.allSettled([
    getCategories(),
    getSubcategories(),
    getAppBanners(),
    getSpotlights(),
    getDesigners(),
    getCurrentDeals(),
    getSuperSaverDeals(),
    getProducts(),
  ])

  const safeVal = (res, fallback = []) =>
    res.status === 'fulfilled' && Array.isArray(res.value) ? res.value : fallback

  const rawCats = safeVal(categories)
  const rawSubs = safeVal(subcategories)
  const taxonomy = buildTaxonomy(rawCats, rawSubs)

  return {
    categories: rawCats,
    subcategories: rawSubs,
    banners: safeVal(banners),
    spotlights: safeVal(spotlights),
    designers: safeVal(designers),
    currentDeals: safeVal(currentDeals),
    superSaverDeals: safeVal(superSaverDeals),
    products: safeVal(products),
    departments: NAVIGATION_CATEGORIES,
    allCategories: taxonomy.allCategories,
  }
}

export async function getFullTaxonomy() {
  const homeData = await getHomePageData()
  return {
    rawCategories: homeData.categories,
    rawSubcategories: homeData.subcategories,
    allCategories: homeData.allCategories,
    departments: homeData.departments,
  }
}

/**
 * ============================================================================
 * CUSTOMER AUTHENTICATION APIS (Stored directly in MySQL user_login / Customer)
 * ============================================================================
 */

export async function loginUser(identifier, password) {
  try {
    const payload = typeof identifier === 'object' ? identifier : { identifier, password }
    const res = await fetch(`${NODE_API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Error logging in:', err)
    return { status: false, message: err.message || 'Network error during login' }
  }
}

export const loginUserApi = loginUser
export const registerUserApi = registerUser
export const getProductListingByCategory = (catId) => getProducts({ category_id: catId })
export const getAllProducts = () => getProducts({})

export async function registerUser({ name, email, mobile, password }) {
  try {
    const res = await fetch(`${NODE_API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, mobile, password }),
    })
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Error registering:', err)
    return { status: false, message: err.message || 'Network error during registration' }
  }
}

export async function getUserProfile(userId) {
  try {
    const res = await fetch(`${NODE_API}/api/auth/profile/${userId}`)
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Error fetching profile:', err)
    return { status: false, message: err.message }
  }
}

export async function sendForgotPasswordOtpApi(identifier) {
  try {
    const cleanId = encodeURIComponent(String(identifier).trim())
    const res = await fetch(
      `${NODE_API}/api/user/forgot/password/otp?email=${cleanId}&mobile=${cleanId}&identifier=${cleanId}`
    )
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Error sending OTP:', err)
    return { status: false, message: err.message || 'Failed to send verification OTP' }
  }
}

export async function verifyForgotPasswordOtpApi({ identifier, otp }) {
  try {
    const cleanId = encodeURIComponent(String(identifier).trim())
    const cleanOtp = encodeURIComponent(String(otp).trim())
    const res = await fetch(
      `${NODE_API}/api/user/forgot/password/verify?email=${cleanId}&mobile=${cleanId}&identifier=${cleanId}&otp=${cleanOtp}`
    )
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Error verifying OTP:', err)
    return { status: false, message: err.message || 'Failed to verify OTP' }
  }
}

export async function resetPasswordWithOtpApi({ identifier, newPassword, otp }) {
  try {
    const cleanId = encodeURIComponent(String(identifier).trim())
    const cleanPass = encodeURIComponent(String(newPassword).trim())
    const cleanOtp = encodeURIComponent(String(otp).trim())
    const res = await fetch(
      `${NODE_API}/api/user/forgot/password/set?email=${cleanId}&mobile=${cleanId}&identifier=${cleanId}&new_password=${cleanPass}&otp=${cleanOtp}`
    )
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Error resetting password:', err)
    return { status: false, message: err.message || 'Failed to reset password' }
  }
}

/**
 * ============================================================================
 * WISHLIST / FAVOURITES APIS (Stored in MySQL user_favourites)
 * ============================================================================
 */

export async function getWishlist(userId) {
  if (!userId) return { status: false, data: [] }
  try {
    const res = await fetch(`${NODE_API}/api/wishlist?user_id=${userId}`)
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Error fetching wishlist:', err)
    return { status: false, data: [] }
  }
}

export async function getWishlistIds(userId) {
  if (!userId) return { status: false, data: [] }
  try {
    const res = await fetch(`${NODE_API}/api/wishlist/ids?user_id=${userId}`)
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Error fetching wishlist ids:', err)
    return { status: false, data: [] }
  }
}

export async function toggleWishlistApi({ userId, productId, priceId = null, size = null }) {
  if (!userId || !productId) return { status: false, message: 'Missing userId or productId' }
  try {
    const res = await fetch(`${NODE_API}/api/wishlist/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        product_id: productId,
        price_id: priceId,
        size,
      }),
    })
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Error toggling wishlist:', err)
    return { status: false, message: err.message }
  }
}

export async function removeFromWishlistApi({ userId, productId }) {
  if (!userId || !productId) return { status: false }
  try {
    const res = await fetch(`${NODE_API}/api/wishlist/remove?user_id=${userId}&product_id=${productId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, product_id: productId }),
    })
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Error removing from wishlist:', err)
    return { status: false, message: err.message }
  }
}

/**
 * ============================================================================
 * BAG / CART APIS (Stored in MySQL user_cart_items)
 * ============================================================================
 */

export async function getCart(userId) {
  if (!userId) return { status: false, data: [] }
  try {
    const res = await fetch(`${NODE_API}/api/cart?user_id=${userId}`)
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Error fetching cart:', err)
    return { status: false, data: [] }
  }
}

export async function addToCartApi({
  userId,
  productId,
  priceId = null,
  materialId = null,
  material_id = null,
  quantity = 1,
  size = null,
  vendorId = null,
  measurementDetails = null,
  addons = [],
}) {
  if (!userId || !productId) return { status: false, message: 'Missing userId or productId' }
  try {
    const res = await fetch(`${NODE_API}/api/cart/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        product_id: productId,
        price_id: priceId,
        material_id: materialId || material_id || null,
        quantity,
        cart_qty: quantity,
        size,
        vendor_id: vendorId,
        measurment_details: measurementDetails,
        addons,
      }),
    })
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Error adding to cart:', err)
    return { status: false, message: err.message }
  }
}

export async function updateCartQuantityApi({ userId, cartItemId, quantity }) {
  if (!cartItemId) return { status: false }
  try {
    const res = await fetch(`${NODE_API}/api/cart/update?user_id=${userId || ''}&cart_item_id=${cartItemId}&quantity=${quantity}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        cart_item_id: cartItemId,
        quantity,
        cart_qty: quantity,
      }),
    })
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Error updating cart quantity:', err)
    return { status: false, message: err.message }
  }
}

export async function removeFromCartApi({ userId, cartItemId }) {
  if (!cartItemId) return { status: false }
  try {
    const res = await fetch(`${NODE_API}/api/cart/remove?user_id=${userId || ''}&cart_item_id=${cartItemId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        cart_item_id: cartItemId,
      }),
    })
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Error removing from cart:', err)
    return { status: false, message: err.message }
  }
}

export async function clearCartApi(userId) {
  if (!userId) return { status: false }
  try {
    const res = await fetch(`${NODE_API}/api/cart/clear?user_id=${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Error clearing cart:', err)
    return { status: false, message: err.message }
  }
}

/**
 * ============================================================================
 * CUSTOMER ADDRESS APIS (view, add, edit, delete address)
 * ============================================================================
 */
function normalizeAddressPayload(data) {
  if (!data || typeof data !== 'object') return data
  const rawType = String(data.type ?? '0').trim().toUpperCase()
  const normalizedType = rawType === 'WORK' || rawType === '1' || rawType === 'OFFICE' ? '1' : '0'
  return {
    ...data,
    type: normalizedType,
  }
}

export async function getAddresses(userId) {
  if (!userId) return { status: false, data: [] }
  // Try local Node backend first
  try {
    const res = await fetch(`${NODE_API}/api/view/address?user_id=${userId}`)
    if (res.ok) {
      const json = await res.json()
      return { status: json.status === 'true' || json.status === true, data: json.data || [] }
    }
  } catch (err) {
    console.warn('Node API view address error, falling back:', err.message)
  }

  // Fallback to proxy / remote
  try {
    const res = await fetch(`${PROXY_URL}/view/address?user_id=${userId}`)
    if (res.ok) {
      const json = await res.json()
      return { status: json.status === 'true' || json.status === true, data: json.data || [] }
    }
  } catch {
    try {
      const res = await fetch(`${BASE_URL}/view/address?user_id=${userId}`)
      const json = await res.json()
      return { status: json.status === 'true' || json.status === true, data: json.data || [] }
    } catch (err) {
      console.error('Error fetching addresses:', err)
    }
  }
  return { status: false, data: [] }
}

export async function addAddressApi(addressData) {
  const payload = normalizeAddressPayload(addressData)
  
  // Try local Node backend first
  try {
    const res = await fetch(`${NODE_API}/api/add/address`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const json = await res.json()
      return json
    }
  } catch (err) {
    console.warn('Node API add address error, falling back:', err.message)
  }

  // Fallback to proxy / remote
  try {
    const res = await fetch(`${PROXY_URL}/add/address`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch {
    try {
      const res = await fetch(`${BASE_URL}/add/address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      return await res.json()
    } catch (err) {
      console.error('Error adding address:', err)
      return { status: false, message: err.message }
    }
  }
}

export async function editAddressApi(addressData) {
  const payload = normalizeAddressPayload(addressData)

  // Try local Node backend first
  try {
    const res = await fetch(`${NODE_API}/api/edit/address`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn('Node API edit address error, falling back:', err.message)
  }

  // Fallback to proxy / remote
  try {
    const res = await fetch(`${PROXY_URL}/edit/address`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch {
    try {
      const res = await fetch(`${BASE_URL}/edit/address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      return await res.json()
    } catch (err) {
      console.error('Error editing address:', err)
      return { status: false, message: err.message }
    }
  }
}

export async function deleteAddressApi(addressId, userId) {
  // Try local Node backend first
  try {
    const res = await fetch(`${NODE_API}/api/delete/address`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address_id: addressId, user_id: userId }),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.warn('Node API delete address error, falling back:', err.message)
  }

  // Fallback to proxy / remote
  try {
    const res = await fetch(`${PROXY_URL}/delete/address?address_id=${addressId}`, { method: 'POST' })
    return await res.json()
  } catch {
    try {
      const res = await fetch(`${BASE_URL}/delete/address?address_id=${addressId}`, { method: 'POST' })
      return await res.json()
    } catch (err) {
      console.error('Error deleting address:', err)
      return { status: false, message: err.message }
    }
  }
}

/**
 * ============================================================================
 * PROMO CODES / COUPONS
 * ============================================================================
 */
export async function getPromoCodes() {
  try {
    const res = await fetch(`${PROXY_URL}/promo-codes`)
    if (res.ok) {
      const json = await res.json()
      return { success: json.success ?? true, data: json.data || [] }
    }
  } catch {
    try {
      const res = await fetch(`${BASE_URL}/promo-codes`)
      const json = await res.json()
      return { success: json.success ?? true, data: json.data || [] }
    } catch (err) {
      console.error('Error fetching promocodes:', err)
    }
  }
  return { success: false, data: [] }
}

/**
 * ============================================================================
 * ORDERS & CHECKOUT (order/add, order/verify-payment, order/list, order/detail)
 * ============================================================================
 */
export async function placeOrderApi(orderPayload) {
  try {
    const res = await fetch(`${NODE_API}/api/order/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    })
    return await res.json()
  } catch {
    try {
      const res = await fetch(`${PROXY_URL}/order/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      })
      return await res.json()
    } catch (err) {
      console.error('Error placing order:', err)
      return { status: false, message: err.message }
    }
  }
}

export async function verifyPaymentApi(paymentData) {
  try {
    const res = await fetch(`${NODE_API}/api/order/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData),
    })
    return await res.json()
  } catch {
    try {
      const res = await fetch(`${PROXY_URL}/order/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      })
      return await res.json()
    } catch (err) {
      return { status: false, message: err.message }
    }
  }
}

export async function getUserOrders(userId, page = 1) {
  if (!userId) return { status: false, orders: [], pagination: null }
  try {
    const res = await fetch(`${NODE_API}/api/order/list?user_id=${userId}&page=${page}`)
    if (res.ok) {
      const json = await res.json()
      const rawOrders = json.orders || json.data || []
      return {
        status: json.status === 'true' || json.status === true,
        orders: rawOrders,
        pagination: json.pagination || { currentPage: page, total: rawOrders.length, lastPage: 1 },
      }
    }
  } catch {
    try {
      const res = await fetch(`${PROXY_URL}/order/list?user_id=${userId}&page=${page}`)
      const json = await res.json()
      const rawOrders = json.orders || json.data || []
      return {
        status: json.status === 'true' || json.status === true,
        orders: rawOrders,
        pagination: json.pagination || { currentPage: page, total: rawOrders.length, lastPage: 1 },
      }
    } catch (err) {
      console.error('Error fetching orders:', err)
    }
  }
  return { status: false, orders: [], pagination: null }
}

export async function getOrderDetails(saleOrderId) {
  if (!saleOrderId) return { status: false, data: null }
  try {
    const res = await fetch(`${NODE_API}/api/order/detail-mobile?sale_order_id=${saleOrderId}`)
    if (res.ok) {
      const json = await res.json()
      return { status: json.status === true || json.status === 'true', data: json.data }
    }
  } catch {
    try {
      const res = await fetch(`${PROXY_URL}/order/detail-mobile?sale_order_id=${saleOrderId}`)
      const json = await res.json()
      return { status: json.status === true || json.status === 'true', data: json.data }
    } catch (err) {
      console.error('Error fetching order details:', err)
    }
  }
  return { status: false, data: null }
}

export async function cancelOrderApi({ saleOrderId, userId, reason, cancelledBy = 'Customer' }) {
  try {
    const formData = new FormData()
    formData.append('sale_order_id', saleOrderId)
    formData.append('user_id', userId)
    formData.append('reason', reason)
    formData.append('cancelled_by', cancelledBy)

    const res = await fetch(`${NODE_API}/api/customer/order/cancel`, { method: 'POST', body: formData })
    return await res.json()
  } catch {
    try {
      const formData = new FormData()
      formData.append('sale_order_id', saleOrderId)
      formData.append('user_id', userId)
      formData.append('reason', reason)
      formData.append('cancelled_by', cancelledBy)

      const res = await fetch(`${PROXY_URL}/customer/order/cancel`, { method: 'POST', body: formData })
      return await res.json()
    } catch (err) {
      return { status: false, message: err.message }
    }
  }
}

export async function returnOrderApi({ saleOrderId, userId, reason, cancelledBy = 'Customer' }) {
  try {
    const formData = new FormData()
    formData.append('sale_order_id', saleOrderId)
    formData.append('user_id', userId)
    formData.append('reason', reason)
    formData.append('cancelled_by', cancelledBy)

    const res = await fetch(`${NODE_API}/api/customer/order/return`, { method: 'POST', body: formData })
    return await res.json()
  } catch {
    try {
      const formData = new FormData()
      formData.append('sale_order_id', saleOrderId)
      formData.append('user_id', userId)
      formData.append('reason', reason)
      formData.append('cancelled_by', cancelledBy)

      const res = await fetch(`${PROXY_URL}/customer/order/return`, { method: 'POST', body: formData })
      return await res.json()
    } catch (err) {
      return { status: false, message: err.message }
    }
  }
}

/**
 * ============================================================================
 * CUSTOM MEASUREMENTS APIS (Schema, Saved Profiles, Store)
 * ============================================================================
 */
export async function getMeasurementSchema(gender = 'FEMALE') {
  try {
    const res = await fetch(`${NODE_API}/api/customer-measurement/list?gender=${encodeURIComponent(gender)}`)
    if (res.ok) {
      const json = await res.json()
      return { status: json.status === true, data: json.data || [] }
    }
  } catch {
    try {
      const res = await fetch(`${PROXY_URL}/customer-measurement/list?gender=${encodeURIComponent(gender)}`)
      const json = await res.json()
      return { status: json.status === true, data: json.data || [] }
    } catch (err) {
      console.error('Error fetching measurement schema:', err)
    }
  }
  return { status: false, data: [] }
}

export async function getSavedMeasurementProfiles(userId) {
  if (!userId) return { status: false, data: [] }
  try {
    const res = await fetch(`${NODE_API}/api/customer-measurement/profiles?user_id=${userId}`)
    if (res.ok) {
      const json = await res.json()
      const rawList = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.data?.profiles)
        ? json.data.profiles
        : Array.isArray(json.profiles)
        ? json.profiles
        : []
      return { status: json.status === true || json.status === 'true', data: rawList }
    }
  } catch {
    try {
      const res = await fetch(`${PROXY_URL}/customer-measurement/profiles?user_id=${userId}`)
      const json = await res.json()
      const rawList = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.data?.profiles)
        ? json.data.profiles
        : Array.isArray(json.profiles)
        ? json.profiles
        : []
      return { status: json.status === true || json.status === 'true', data: rawList }
    } catch (err) {
      console.error('Error fetching measurement profiles:', err)
    }
  }
  return { status: false, data: [] }
}

export async function saveMeasurementProfile(data) {
  try {
    const res = await fetch(`${NODE_API}/api/customer-measurement/store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return await res.json()
  } catch {
    try {
      const res = await fetch(`${PROXY_URL}/customer-measurement/store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return await res.json()
    } catch (err) {
      return { status: false, message: err.message }
    }
  }
}

export async function deleteMeasurementProfile(profileId) {
  try {
    const res = await fetch(`${NODE_API}/api/customer-measurement/delete?profile_id=${profileId}`, { method: 'POST' })
    return await res.json()
  } catch {
    try {
      const res = await fetch(`${PROXY_URL}/customer-measurement/delete?profile_id=${profileId}`, { method: 'POST' })
      return await res.json()
    } catch (err) {
      return { status: false, message: err.message }
    }
  }
}

export async function storeCartMeasurementApi({ cartId, measurementDetails = [] }) {
  try {
    const formData = new FormData()
    formData.append('cart_id', cartId)
    measurementDetails.forEach((item, idx) => {
      formData.append(`measurment_details[${idx}][measurement_id]`, item.measurement_id || item.id)
      formData.append(`measurment_details[${idx}][value]`, item.value)
    })
    const res = await fetch(`${NODE_API}/api/user-cart/store-measurement`, { method: 'POST', body: formData })
    return await res.json()
  } catch {
    try {
      const formData = new FormData()
      formData.append('cart_id', cartId)
      measurementDetails.forEach((item, idx) => {
        formData.append(`measurment_details[${idx}][measurement_id]`, item.measurement_id || item.id)
        formData.append(`measurment_details[${idx}][value]`, item.value)
      })
      const res = await fetch(`${PROXY_URL}/user-cart/store-measurement`, { method: 'POST', body: formData })
      return await res.json()
    } catch (err) {
      return { status: false, message: err.message }
    }
  }
}

/**
 * ============================================================================
 * STORE / PRODUCT REVIEWS & RATINGS
 * ============================================================================
 */

/**
 * Dynamic Star Rating Color System:
 * - 1 to 2 Stars: Red
 * - 3 Stars: Orange
 * - 4 to 5 Stars: Green
 */
export function getStarColor(rating) {
  const score = Math.round(Number(rating) || 0)
  if (score <= 2) {
    return {
      starClass: 'text-red-500 fill-red-500',
      textClass: 'text-red-600',
      bgClass: 'bg-red-50',
      borderClass: 'border-red-200',
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
      cardBg: 'from-red-50/70 via-red-50/20 to-white border-red-200/80',
      colorName: 'red',
      hex: '#EF4444',
    }
  }
  if (score === 3) {
    return {
      starClass: 'text-orange-500 fill-orange-500',
      textClass: 'text-orange-600',
      bgClass: 'bg-orange-50',
      borderClass: 'border-orange-200',
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
      cardBg: 'from-orange-50/70 via-orange-50/20 to-white border-orange-200/80',
      colorName: 'orange',
      hex: '#F97316',
    }
  }
  return {
    starClass: 'text-emerald-500 fill-emerald-500',
    textClass: 'text-emerald-600',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cardBg: 'from-emerald-50/70 via-emerald-50/20 to-white border-emerald-200/80',
    colorName: 'green',
    hex: '#10B981',
  }
}

/**
 * Universal Review Submitter: Supports both new reviews and updates/resubmission.
 * Supports Sale Order items (/api/user/sale-order/review) and General reviews (/api/store_review),
 * as well as multipart AWS S3 photo uploads and deleted image tracking.
 */
export async function submitProductReview(params) {
  try {
    const userId = params.userId || params.user_id
    const productId = params.productId || params.product_id
    const saleOrderId = params.saleOrderId || params.sale_order_id
    const rating = params.rating !== undefined ? params.rating : params.ratings
    const review =
      params.review !== undefined
        ? params.review
        : params.comment !== undefined
        ? params.comment
        : params.comments
    const images = params.images || params.image || []
    const deletedImageIds = params.deletedImageIds || params.deleted_image_ids || []

    const hasFiles =
      Array.isArray(images) &&
      images.some(
        (img) =>
          (typeof File !== 'undefined' && img instanceof File) ||
          (typeof Blob !== 'undefined' && img instanceof Blob)
      )

    const targetUrl = saleOrderId
      ? `${NODE_API}/api/user/sale-order/review`
      : `${NODE_API}/api/store_review`

    let res
    if (hasFiles) {
      const formData = new FormData()
      if (userId) formData.append('user_id', String(userId))
      if (productId) formData.append('product_id', String(productId))
      if (saleOrderId) formData.append('sale_order_id', String(saleOrderId))
      if (rating !== undefined && rating !== null) {
        formData.append('ratings', String(rating))
        formData.append('rating', String(rating))
      }
      if (review !== undefined && review !== null) {
        formData.append('review', String(review))
        formData.append('comments', String(review))
      }
      images.forEach((img) => {
        if (
          (typeof File !== 'undefined' && img instanceof File) ||
          (typeof Blob !== 'undefined' && img instanceof Blob)
        ) {
          formData.append('images', img)
        }
      })
      if (deletedImageIds && (Array.isArray(deletedImageIds) ? deletedImageIds.length > 0 : true)) {
        formData.append(
          'deleted_image_ids',
          typeof deletedImageIds === 'string' ? deletedImageIds : JSON.stringify(deletedImageIds)
        )
      }
      res = await fetch(targetUrl, {
        method: 'POST',
        body: formData,
      })
    } else {
      res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          product_id: productId,
          sale_order_id: saleOrderId,
          ratings: rating,
          rating: rating,
          review: review,
          comments: review,
          comment: review,
          images: Array.isArray(images) ? images : images ? [images] : [],
          deleted_image_ids: deletedImageIds,
        }),
      })
    }

    const data = await res.json()
    return data
  } catch (err) {
    console.error('Error in submitProductReview:', err)
    return { status: false, message: err.message || 'Failed to submit review' }
  }
}

/**
 * Check if a product has customizable capability based on live API fields
 */
export function isProductCustomizable(product) {
  if (!product) return false
  return Boolean(
    product.is_customizable === true ||
    product.is_customizable === 1 ||
    String(product.is_customizable) === '1' ||
    String(product.is_customizable).toLowerCase() === 'true' ||
    product.is_customisable === true ||
    product.is_customisable === 1 ||
    String(product.is_customisable) === '1' ||
    String(product.is_customisable).toLowerCase() === 'true' ||
    product.product_type === 0 ||
    product.product_type === '0' ||
    product.order_type === 'Customizable' ||
    (Array.isArray(product.product_types) && product.product_types.includes('CUSTOMIZABLE')) ||
    (typeof product.product_type === 'string' && product.product_type.toUpperCase().includes('CUSTOM')) ||
    (Array.isArray(product.prices?.customizable_products) && product.prices.customizable_products.length > 0)
  )
}

/**
 * Authoritative unread notifications count from backend API
 */
export async function getUnreadNotificationCountApi({ recipientType = 'user', recipientId } = {}) {
  if (!recipientId) return 0
  try {
    const cleanId = String(recipientId).replace(/^(customer_|user_)/, '')
    const res = await fetch(`${NODE_API}/api/notifications/unread-count?recipient_type=${recipientType}&recipient_id=${cleanId}`)
    if (res.ok) {
      const json = await res.json()
      return json.unread_count ?? json.count ?? 0
    }
  } catch (err) {
    console.warn('Notice: error fetching unread notifications count:', err.message)
  }
  return 0
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsReadApi({ recipientType = 'user', recipientId } = {}) {
  if (!recipientId) return false
  try {
    const cleanId = String(recipientId).replace(/^(customer_|user_)/, '')
    const res = await fetch(`${NODE_API}/api/notifications/read-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_type: recipientType, recipient_id: cleanId }),
    })
    return res.ok
  } catch (err) {
    console.warn('Notice: error marking all notifications read:', err.message)
    return false
  }
}

/**
 * Get sizewise measurements for product price ID
 */
export async function getMeasurementsByPrice(priceId) {
  if (!priceId) return { status: false, data: [] }
  try {
    const res = await fetch(`${NODE_API}/api/measurements/by-price?price_id=${priceId}`)
    if (res.ok) {
      const json = await res.json()
      return json
    }
    // Fallback if accessed via sizewise endpoint
    const fallbackRes = await fetch(`${NODE_API}/api/product-measurements/sizewise/${priceId}`)
    if (fallbackRes.ok) {
      const json = await fallbackRes.json()
      return json
    }
  } catch (err) {
    console.warn('Notice: error fetching measurements by price:', err.message)
  }
  return { status: false, data: [] }
}

/**
 * Global Search Autocomplete Suggestions API
 */
export async function getSearchSuggestionsApi(query = '', signal = null) {
  const cleanQ = (query || '').trim()
  try {
    const url = `${NODE_API}/api/search/suggestions?q=${encodeURIComponent(cleanQ)}`
    const res = await fetch(url, {
      signal,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    if (json.status && json.data) {
      if (Array.isArray(json.data.products)) {
        json.data.products = json.data.products.filter(isProductActive)
      }
      return json.data
    }
    if (json.data && Array.isArray(json.data.products)) {
      json.data.products = json.data.products.filter(isProductActive)
    }
    return json.data || null
  } catch (err) {
    if (err.name === 'AbortError') throw err
    console.warn('Search suggestions API warning:', err.message)
    return null
  }
}

/**
 * Global Faceted Search Products API
 */
export async function getSearchProductsApi(params = {}, signal = null) {
  try {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        queryParams.append(key, val)
      }
    })

    const url = `${NODE_API}/api/search/products?${queryParams.toString()}`
    const res = await fetch(url, {
      signal,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    if (json.status && json.data) {
      if (Array.isArray(json.data.products)) {
        json.data.products = json.data.products.filter(isProductActive)
      }
      return json.data
    }
    if (json.data && Array.isArray(json.data.products)) {
      json.data.products = json.data.products.filter(isProductActive)
    }
    return json.data || null
  } catch (err) {
    if (err.name === 'AbortError') throw err
    console.warn('Search products API warning:', err.message)
    return null
  }
}

/**
 * Intelligent Product Recommendations
 * GET /api/products/:productId/recommendations
 */
export async function getProductRecommendationsApi(productId, options = {}) {
  if (!productId) return { status: false, recommendations: [] }
  const cleanId = String(productId).trim()
  const limit = options?.limit || 12
  const signal = options?.signal

  // 1. Primary: Node.js backend
  try {
    const url = `${NODE_API}/api/products/${cleanId}/recommendations?limit=${limit}`
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
    if (res.ok) {
      const json = await res.json()
      if (json && json.status && Array.isArray(json.recommendations)) {
        json.recommendations = json.recommendations.filter(isProductActive)
        return json
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') throw err
  }

  // 2. Fallback: query parameter path
  try {
    const url = `${NODE_API}/api/show/product/recommendations?product_id=${cleanId}&limit=${limit}`
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
    if (res.ok) {
      const json = await res.json()
      if (json && json.status && Array.isArray(json.recommendations)) {
        json.recommendations = json.recommendations.filter(isProductActive)
        return json
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') throw err
  }

  return { status: false, recommendations: [] }
}

/**
 * Apply promo code
 */
export async function applyPromoCodeApi({ code, userId, subtotal, itemCount }) {
  const payload = {
    code,
    user_id: userId,
    subtotal: Number(subtotal) || 0,
    item_count: Number(itemCount) || 1,
  }

  try {
    const res = await fetch(`${NODE_API}/api/promo-codes/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    return json
  } catch {
    try {
      const res = await fetch(`${PROXY_URL}/promo-codes/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      return json
    } catch (err) {
      console.error('Error applying promo code:', err)
      return {
        status: 'false',
        success: false,
        message: 'Unable to connect to promo code server.',
      }
    }
  }
}

/**
 * Delivery charge API
 */
export async function getDeliveryCharge() {
  try {
    const res = await fetch(`${NODE_API}/api/delivery-charge`)
    if (res.ok) {
      const json = await res.json()
      if (json.status && json.data && json.data.delivery_amount !== undefined) {
        return Number(json.data.delivery_amount)
      }
      if (json.data && json.data.delivery_charge !== undefined) {
        return Number(json.data.delivery_charge)
      }
    }
  } catch {
    // fallback
  }
  return 49
}

/**
 * Payment failed callback API
 */
export async function paymentFailedApi({ razorpay_order_id } = {}) {
  try {
    const res = await fetch(`${NODE_API}/api/payment-failed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ razorpay_order_id }),
    })
    return await res.json()
  } catch (e) {
    console.warn('paymentFailedApi notice:', e)
    return { status: false }
  }
}

/**
 * User order review details
 */
export async function getUserReviewDetailsApi({ saleOrderId, userId }) {
  const params = new URLSearchParams()
  if (saleOrderId) params.append('sale_order_id', saleOrderId)
  if (userId) params.append('user_id', userId)

  try {
    const res = await fetch(`${NODE_API}/api/user/sale-order/review?${params.toString()}`)
    if (res.ok) return await res.json()
  } catch {
    try {
      const res = await fetch(`${PROXY_URL}/user/sale-order/review?${params.toString()}`)
      if (res.ok) return await res.json()
    } catch (err) {
      console.error('Error fetching user review details:', err)
    }
  }
  return { status: false, data: [] }
}

/**
 * Delete user account
 */
export async function deleteUserAccountApi(userId) {
  try {
    const res = await fetch(`${NODE_API}/api/user/delete/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const json = await res.json()
    return json
  } catch (err) {
    console.error('Error deleting account:', err)
    return { status: 'false', message: err.message || 'Failed to delete account' }
  }
}

/**
 * Product sizewise measurements
 */
export async function getProductMeasurementsSizeWise(productId) {
  try {
    const res = await fetch(`${NODE_API}/api/product-measurements/sizewise/${productId}`)
    return await res.json()
  } catch (err) {
    console.warn('Notice: error fetching sizewise measurements:', err.message)
    return { status: false, data: null }
  }
}

/**
 * Update user profile
 */
export async function updateUserProfileApi(userId, data) {
  try {
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData
    const res = await fetch(`${NODE_API}/api/user/edit/${userId}`, {
      method: 'POST',
      headers: isFormData ? {} : { 'Content-Type': 'application/json' },
      body: isFormData ? data : JSON.stringify(data),
    })
    return await res.json()
  } catch (err) {
    return { status: 'false', message: err.message }
  }
}

/**
 * Chat history between user and another user (e.g. admin '1')
 */
export async function getChatHistoryApi(userId, otherUserId = '1') {
  try {
    const res = await fetch(`${NODE_API}/api/chat/${userId}/${otherUserId}`)
    const json = await res.json()
    return json?.data || json?.messages || json || []
  } catch {
    return []
  }
}

/**
 * Concierge chat history helper
 */
export async function getConciergeChatHistoryApi(userId) {
  return await getChatHistoryApi(userId, '1')
}

/**
 * Send chat message
 */
export async function sendChatMessageApi({ sender_id, receiver_id = '1', message, message_type = 'text', ticket_id, temp_id }) {
  try {
    const res = await fetch(`${NODE_API}/api/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_id: String(sender_id),
        receiver_id: String(receiver_id),
        message: String(message),
        message_type,
        ticket_id,
        temp_id,
      }),
    })
    return await res.json()
  } catch (err) {
    return { status: 'false', message: err.message }
  }
}

/**
 * Fetch notifications
 */
export async function getNotificationsApi({ recipientType = 'user', recipientId, isRead, page = 1, limit = 20 } = {}) {
  try {
    let url = `${NODE_API}/api/notifications?recipient_type=${recipientType}&recipient_id=${recipientId}&page=${page}&limit=${limit}`
    if (isRead !== undefined) {
      url += `&is_read=${isRead ? 1 : 0}`
    }
    const res = await fetch(url)
    return await res.json()
  } catch (err) {
    console.warn('Notice: error fetching notifications:', err.message)
    return { success: false, notifications: [] }
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationReadApi(id, { recipientType = 'user', recipientId } = {}) {
  try {
    const res = await fetch(`${NODE_API}/api/notifications/${id}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_type: recipientType, recipient_id: recipientId }),
    })
    return await res.json()
  } catch (err) {
    console.warn('Notice: error marking notification read:', err.message)
    return { success: false }
  }
}

/**
 * Order vendor chat history
 */
export async function getOrderVendorChatApi(saleOrderId) {
  try {
    const res = await fetch(`${NODE_API}/api/chat/order/${saleOrderId}`)
    return await res.json()
  } catch (err) {
    return { success: false, error: err.message, messages: [] }
  }
}

/**
 * Send message in order vendor chat
 */
export async function sendOrderVendorMessageApi({ saleOrderId, vendorId, customerId, message, filePath }) {
  try {
    const res = await fetch(`${NODE_API}/api/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sale_order_id: saleOrderId,
        saleOrderId,
        sender_id: customerId,
        receiver_id: vendorId,
        message,
        file_path: filePath,
        filePath,
      }),
    })
    return await res.json()
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * Upload chat attachment
 */
export async function uploadChatAttachmentApi(file) {
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${NODE_API}/api/chat/upload`, {
      method: 'POST',
      body: formData,
    })
    return await res.json()
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// ==========================================
// BESPOKE ECOMMERCE INVOICE SYSTEM APIS
// ==========================================

/**
 * Fetch or generate invoice(s) for a specific order
 */
export async function getOrderInvoicesApi(orderId, userId = null, saleOrderId = null) {
  try {
    let uId = null
    let sId = null
    if (typeof userId === 'object' && userId !== null) {
      uId = userId.userId || userId.user_id || getStoredUserId()
      sId = userId.saleOrderId || userId.sale_order_id || userId.sale_order || userId.sale_id || null
    } else {
      uId = userId || getStoredUserId()
      sId = saleOrderId || null
    }

    let targetUrl = ''
    if (sId) {
      targetUrl = `${NODE_API}/api/customer/orders/invoice?sale_order=${encodeURIComponent(sId)}`
      if (uId) targetUrl += `&user_id=${encodeURIComponent(uId)}`
    } else if (orderId) {
      const params = new URLSearchParams()
      if (uId) params.append('user_id', uId)
      const query = params.toString() ? `?${params.toString()}` : ''
      targetUrl = `${NODE_API}/api/customer/orders/${orderId}/invoice${query}`
    } else {
      targetUrl = `${NODE_API}/api/customer/orders/invoice`
      if (uId) targetUrl += `?user_id=${encodeURIComponent(uId)}`
    }

    const res = await fetch(targetUrl)
    const json = await res.json()
    return json
  } catch (err) {
    console.error('Error fetching order invoice:', err)
    return { status: false, message: err.message }
  }
}

/**
 * Fetch single invoice details by invoice ID
 */
export async function getInvoiceDetailsApi(invoiceId, userId = null, saleOrderId = null) {
  try {
    let uId = null
    let sId = null
    if (typeof userId === 'object' && userId !== null) {
      uId = userId.userId || userId.user_id || getStoredUserId()
      sId = userId.saleOrderId || userId.sale_order_id || userId.sale_id || null
    } else {
      uId = userId || getStoredUserId()
      sId = saleOrderId || null
    }

    const params = new URLSearchParams()
    if (sId) params.append('sale_order_id', sId)
    else if (uId) params.append('user_id', uId)

    const query = params.toString() ? `?${params.toString()}` : ''
    const res = await fetch(`${NODE_API}/api/customer/invoices/${invoiceId}${query}`)
    const json = await res.json()
    return json
  } catch (err) {
    console.error('Error fetching invoice details:', err)
    return { status: false, message: err.message }
  }
}

/**
 * Download Invoice PDF by invoice ID
 */
export async function downloadInvoicePdfApi(invoiceId, userId = null, defaultFilename = null, saleOrderId = null) {
  try {
    let uId = null
    let sId = null
    let filename = defaultFilename

    if (typeof userId === 'object' && userId !== null) {
      uId = userId.userId || userId.user_id || getStoredUserId()
      sId = userId.saleOrderId || userId.sale_order_id || userId.sale_order || userId.sale_id || null
    } else {
      uId = userId || getStoredUserId()
      sId = saleOrderId || null
    }

    if (typeof defaultFilename === 'object' && defaultFilename !== null) {
      sId = sId || defaultFilename.saleOrderId || defaultFilename.sale_order_id || defaultFilename.sale_order
      filename = defaultFilename.filename || null
    }

    let downloadUrl = ''
    if (sId) {
      downloadUrl = `${NODE_API}/api/customer/invoices/download?sale_order=${encodeURIComponent(sId)}`
      if (uId) downloadUrl += `&user_id=${encodeURIComponent(uId)}`
    } else {
      const params = new URLSearchParams()
      if (uId) params.append('user_id', uId)
      const query = params.toString() ? `?${params.toString()}` : ''
      downloadUrl = `${NODE_API}/api/customer/invoices/${invoiceId}/download${query}`
    }

    const res = await fetch(downloadUrl)
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || 'Unable to download invoice PDF.')
    }
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `BESPOKE_INVOICE_${invoiceId}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
    return { success: true }
  } catch (err) {
    console.error('Error downloading invoice PDF:', err)
    throw err
  }
}

/**
 * Download Invoice PDF by Order ID
 */
export async function downloadOrderInvoicePdfApi(orderId, sellerId = null, userId = null, defaultFilename = null, saleOrderId = null) {
  try {
    let uId = null
    let sId = saleOrderId || null
    if (typeof userId === 'object' && userId !== null) {
      uId = userId.userId || userId.user_id || getStoredUserId()
      sId = userId.saleOrderId || userId.sale_order_id || sId
    } else {
      uId = userId || getStoredUserId()
    }

    let downloadUrl = ''
    if (sId) {
      downloadUrl = `${NODE_API}/api/customer/invoices/download?sale_order=${encodeURIComponent(sId)}`
      if (uId) downloadUrl += `&user_id=${encodeURIComponent(uId)}`
    } else {
      const params = new URLSearchParams()
      if (uId) params.append('user_id', uId)
      if (sellerId) params.append('seller_id', sellerId)
      const queryStr = params.toString() ? `?${params.toString()}` : ''
      downloadUrl = `${NODE_API}/api/customer/orders/${orderId}/invoice/download${queryStr}`
    }

    const res = await fetch(downloadUrl)
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.message || 'Invoice is not available yet.')
    }
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = defaultFilename || `BESPOKE_ORDER_${orderId}_INVOICE.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
    return { success: true }
  } catch (err) {
    console.error('Error downloading order invoice PDF:', err)
    throw err
  }
}

/**
 * List customer invoice history with search and pagination
 */
export async function getCustomerInvoicesApi({ userId = null, page = 1, limit = 20, search = '', fromDate = '', toDate = '' } = {}) {
  try {
    const uId = userId || getStoredUserId()
    const params = new URLSearchParams({
      user_id: uId || '',
      page: String(page),
      limit: String(limit),
    })
    if (search) params.append('search', search)
    if (fromDate) params.append('fromDate', fromDate)
    if (toDate) params.append('toDate', toDate)

    const res = await fetch(`${NODE_API}/api/customer/invoices?${params.toString()}`)
    const json = await res.json()
    return json
  } catch (err) {
    console.error('Error fetching customer invoices:', err)
    return { status: false, message: err.message, data: { total: 0, invoices: [] } }
  }
}




