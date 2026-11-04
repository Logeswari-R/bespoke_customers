// API Service for Bespoke E-Commerce Platform
// Node.js Backend (bespokeBackend): http://localhost:8080
// Laravel Remote API: http://43.204.68.67/bespoke/public/api/

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
  return await fetchEndpoint('/current-deals')
}

/**
 * 7. Super Saver Deals
 */
export async function getSuperSaverDeals() {
  return await fetchEndpoint('/supersaver-deals')
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
      if (json.status && Array.isArray(json.data) && json.data.length > 0) {
        return json.data
      }
    }
  } catch (nodeErr) {
    console.warn('Node API products fetch failed, falling back to remote endpoint:', nodeErr.message)
  }

  // Fallback to Laravel endpoints
  try {
    return await fetchEndpoint('/product/list?per_page=50')
  } catch {
    try {
      return await fetchEndpoint('/products?per_page=50')
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

  // Ensure active Unisex category 51 is present if in subcategories
  if (!categoryMap.has(51)) {
    categoryMap.set(51, {
      id: 51,
      name: 'Test',
      type: '4',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
      subcategories: [],
    })
  }

  // Strictly link subcategories to their exact active category ID
  subcategoriesData.forEach((sub) => {
    const catId = Number(sub.category_id || sub.category?.id)
    if (!categoryMap.has(catId)) {
      // Ignore subcategories belonging to old/deleted categories
      return
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

  const departments = ['2', '1', '0', '3', '4'].map((typeKey) => {
    const meta = typeToDepartment[typeKey]
    const categoriesOfType = allCategories.filter((c) => c.type === typeKey)

    // Strictly keep only categories that have authentic subcategories from the API
    const sections = categoriesOfType
      .filter((cat) => cat.subcategories && cat.subcategories.length > 0)
      .map((cat) => ({
        title: cat.name,
        categoryId: cat.id,
        categoryImage: cat.image,
        items: cat.subcategories.map((s) => s.name),
        subcategoriesData: cat.subcategories,
      }))

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
    departments: taxonomy.departments,
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
      return { status: json.status === true, data: json.data || [] }
    }
  } catch {
    try {
      const res = await fetch(`${PROXY_URL}/customer-measurement/profiles?user_id=${userId}`)
      const json = await res.json()
      return { status: json.status === true, data: json.data || [] }
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
 * STORE / PRODUCT REVIEWS
 * ============================================================================
 */
export async function submitProductReview({ userId, productId, rating, comment }) {
  try {
    const res = await fetch(`${NODE_API}/api/store_review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        product_id: productId,
        rating,
        comment,
      }),
    })
    return await res.json()
  } catch {
    try {
      const res = await fetch(`${PROXY_URL}/store_review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          product_id: productId,
          rating,
          comment,
        }),
      })
      return await res.json()
    } catch (err) {
      return { status: false, message: err.message }
    }
  }
}


