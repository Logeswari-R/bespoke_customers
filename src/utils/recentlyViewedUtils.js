// Recently Viewed Products Storage Utilities
// Versioned localStorage caching with 180-day retention, complete history preservation,
// and user/guest account partition isolation.

const S3_BASE_URL = 'https://bespoke-2026.s3.ap-south-1.amazonaws.com'

/**
 * Format raw path or relative image into full S3 URL
 */
export function formatImageUrl(path) {
  if (!path || typeof path !== 'string') return null
  const trimmed = path.trim()
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed
  }
  const clean = trimmed.replace(/^\/+/, '')
  return `${S3_BASE_URL}/${clean}`
}

/**
 * Check if a product has customizable capability
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

export const RECENTLY_VIEWED_KEY_PREFIX = 'bespoke_recently_viewed_v1'
// Maximum items retained in local storage history (complete browsing history, not capped at 10)
export const MAX_HISTORY_STORAGE_ITEMS = 300
// Default limit for the horizontal carousel
export const CAROUSEL_LIMIT = 10
// 180-day retention period
export const RECENTLY_VIEWED_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000

/**
 * Returns partition-scoped storage key for guest or authenticated customer
 */
export function getRecentlyViewedStorageKey(userId = null) {
  if (userId) {
    return `${RECENTLY_VIEWED_KEY_PREFIX}_user_${userId}`
  }
  return `${RECENTLY_VIEWED_KEY_PREFIX}_guest`
}

/**
 * Safe localStorage reader with error handling for private browsing / blocked storage
 */
function safeGetItem(key) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage.getItem(key)
  } catch (err) {
    console.warn(`[RecentlyViewed] localStorage read error for ${key}:`, err.message)
    return null
  }
}

/**
 * Safe localStorage writer with quota error handling
 */
function safeSetItem(key, value) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false
    window.localStorage.setItem(key, value)
    return true
  } catch (err) {
    console.warn(`[RecentlyViewed] localStorage write error for ${key}:`, err.message)
    return false
  }
}

/**
 * Safe localStorage remover
 */
function safeRemoveItem(key) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    window.localStorage.removeItem(key)
  } catch (err) {
    console.warn(`[RecentlyViewed] localStorage remove error for ${key}:`, err.message)
  }
}

/**
 * Extract a compact, minimal snapshot containing only the fields necessary
 * for rendering the product card without storing bloated API responses.
 */
export function extractProductSnapshot(product) {
  if (!product || typeof product !== 'object') return null

  const pId = String(product.id || product.product_id || '').trim()
  if (!pId) return null

  // 1. Resolve Best Image
  let rawImg =
    product.lowest_price_main_image ||
    product.main_image ||
    product.image ||
    product.img_path ||
    product.product_materials?.[0]?.main_img_path ||
    product.product_materials?.[0]?.images?.[0]?.img_path ||
    product.materials?.[0]?.main_img_path ||
    product.materials?.[0]?.mat_img ||
    null

  const resolvedImage = formatImageUrl(rawImg) ||
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80'

  // 2. Resolve Title & Brand
  const title =
    product.product_name ||
    product.title ||
    product.name ||
    'Bespoke Creation'

  const brandName =
    product.shop_name ||
    product.vendor?.shop_name ||
    product.vendor_name ||
    product.vendor?.seller_name ||
    product.brand ||
    product.vendor?.brand_business_name ||
    'Bespoke Atelier'

  const brandLogo = formatImageUrl(product.vendor?.img_path || product.brand_logo)

  // 3. Resolve Pricing & Discount
  const priceNum = parseFloat(
    product.offer_price ||
    product.effective_price ||
    product.discount_price ||
    product.price ||
    product.actual_price ||
    499
  )

  const originalPriceNum = parseFloat(
    product.actual_price ||
    product.original_price ||
    priceNum
  )

  let discountPct = 0
  if (product.discount_percentage && Number(product.discount_percentage) > 0) {
    discountPct = Number(product.discount_percentage)
  } else if (originalPriceNum > priceNum && priceNum > 0) {
    discountPct = Math.round(((originalPriceNum - priceNum) / originalPriceNum) * 100)
  }

  // 4. Resolve Categories & Customizable status
  const isCustomizable = isProductCustomizable(product)
  const categoryName = product.category?.name || product.category_name || product.category || ''
  const subcategoryName = product.subcategory?.name || product.subcategory_name || product.subcategory || ''
  const rating = parseFloat(product.rating || product.total_average || 4.8)

  return {
    id: pId,
    product_id: pId,
    product_name: title,
    title,
    product_image: resolvedImage,
    image: resolvedImage,
    main_image: resolvedImage,
    brand_name: brandName,
    brand: brandName,
    brand_logo: brandLogo,
    vendor_name: brandName,
    vendor_id: product.vendor?.id || product.vendor_id || null,
    selling_price: priceNum,
    price: priceNum,
    original_price: originalPriceNum > priceNum ? originalPriceNum : null,
    discount_percentage: discountPct > 0 ? discountPct : null,
    is_customizable: isCustomizable,
    category_name: categoryName,
    subcategory_name: subcategoryName,
    rating,
    viewed_at: new Date().toISOString(),
  }
}

/**
 * Retrieve ALL cached recently viewed products for a given user or guest.
 * Automatically purges corrupted and expired (>180 days) entries.
 * Note: Returns full history, not limited to 10 items.
 */
export function getRecentlyViewedProducts(userId = null) {
  const key = getRecentlyViewedStorageKey(userId)
  const raw = safeGetItem(key)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const now = Date.now()
    let hasExpired = false

    const validList = parsed.filter((item) => {
      if (!item || !item.id) return false
      if (!item.viewed_at) return true
      const itemTime = new Date(item.viewed_at).getTime()
      if (isNaN(itemTime)) return false
      const isExpired = now - itemTime > RECENTLY_VIEWED_MAX_AGE_MS
      if (isExpired) hasExpired = true
      return !isExpired
    })

    // If any expired records were filtered out, sync back to storage
    if (hasExpired) {
      safeSetItem(key, JSON.stringify(validList))
    }

    return validList
  } catch (err) {
    console.warn(`[RecentlyViewed] Error parsing cache for ${key}, resetting:`, err)
    safeRemoveItem(key)
    return []
  }
}

/**
 * Retrieve exactly the latest N recently viewed products (default: 10).
 * Specifically designed for the horizontal carousel.
 */
export function getLatestRecentlyViewedProducts(limit = 10, userId = null) {
  const all = getRecentlyViewedProducts(userId)
  return all.slice(0, Math.max(1, limit))
}

/**
 * Add or update a product in the complete recently viewed collection.
 * - If already viewed, removes the duplicate and moves product to index 0 with an updated timestamp.
 * - DOES NOT limit collection to 10 products; retains full browsing history up to MAX_HISTORY_STORAGE_ITEMS (300).
 * - Dispatches a window event so all mounted components (carousel & history page) update in real-time.
 */
export function addRecentlyViewedProduct(product, userId = null) {
  const snapshot = extractProductSnapshot(product)
  if (!snapshot) return getRecentlyViewedProducts(userId)

  const key = getRecentlyViewedStorageKey(userId)
  const existingList = getRecentlyViewedProducts(userId)

  // Remove existing entry for the same product to prevent duplicates
  const filtered = existingList.filter((item) => String(item.id) !== String(snapshot.id))

  // Prepend the latest viewed snapshot to index 0 (retaining full history up to 300 items)
  const updatedList = [snapshot, ...filtered].slice(0, MAX_HISTORY_STORAGE_ITEMS)

  // Save to localStorage
  safeSetItem(key, JSON.stringify(updatedList))

  // Notify active listeners across the app
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('bespoke_recently_viewed_updated', {
        detail: { userId, list: updatedList },
      })
    )
  }

  return updatedList
}

/**
 * Remove a specific product from recently viewed history
 */
export function removeRecentlyViewedProduct(productId, userId = null) {
  if (!productId) return []
  const key = getRecentlyViewedStorageKey(userId)
  const existingList = getRecentlyViewedProducts(userId)
  const updatedList = existingList.filter(
    (item) => String(item.id) !== String(productId) && String(item.product_id) !== String(productId)
  )

  safeSetItem(key, JSON.stringify(updatedList))

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('bespoke_recently_viewed_updated', {
        detail: { userId, list: updatedList },
      })
    )
  }

  return updatedList
}

/**
 * Clear all recently viewed products for a specific user or guest
 */
export function clearRecentlyViewedProducts(userId = null) {
  const key = getRecentlyViewedStorageKey(userId)
  safeRemoveItem(key)

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('bespoke_recently_viewed_updated', {
        detail: { userId, list: [] },
      })
    )
  }
}

/**
 * Migrate guest history into authenticated user history upon login.
 * Preserves timestamps, de-duplicates by product ID, and updates storage.
 */
export function migrateGuestHistoryToUser(userId) {
  if (!userId) return []
  const guestKey = getRecentlyViewedStorageKey(null)
  const guestHistory = getRecentlyViewedProducts(null)
  if (!guestHistory || guestHistory.length === 0) {
    return getRecentlyViewedProducts(userId)
  }

  const userKey = getRecentlyViewedStorageKey(userId)
  const userHistory = getRecentlyViewedProducts(userId)

  const seenIds = new Set(userHistory.map((item) => String(item.id)))
  const merged = [...userHistory]

  for (const item of guestHistory) {
    if (!seenIds.has(String(item.id))) {
      seenIds.add(String(item.id))
      merged.push(item)
    }
  }

  // Sort by latest viewed_at
  merged.sort((a, b) => new Date(b.viewed_at || 0) - new Date(a.viewed_at || 0))
  const finalMerged = merged.slice(0, MAX_HISTORY_STORAGE_ITEMS)

  safeSetItem(userKey, JSON.stringify(finalMerged))
  safeRemoveItem(guestKey)

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('bespoke_recently_viewed_updated', {
        detail: { userId, list: finalMerged },
      })
    )
  }

  return finalMerged
}
