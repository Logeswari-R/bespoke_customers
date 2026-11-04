/**
 * Navigation and URL Routing Utilities for Bespoke Frontend
 */

export function getUrlForViewState(type, data) {
  if (type === 'home' || !type) return '/'
  if (type === 'product') {
    const pId = data?.product_id || data?.id
    return pId ? `/product/${pId}` : '/'
  }
  if (type === 'designer') {
    const dId = data?.designer_id || data?.id
    return dId ? `/designer/${dId}` : '/designers'
  }
  if (type === 'designers') return '/designers'
  if (type === 'category') {
    const cId = data?.category_id || data?.id || 44
    const sub = data?.selectedSubcategory
    return sub ? `/category/${cId}?sub=${encodeURIComponent(sub)}` : `/category/${cId}`
  }
  if (type === 'categories') return '/categories'
  if (type === 'shop') {
    const sId = data?.shop_id || data?.id
    return sId ? `/shop/${sId}` : '/shops'
  }
  if (type === 'shops') return '/shops'
  if (type === 'deals') return '/deals'
  if (type === 'super-saver-deals') return '/super-saver-deals'
  if (type === 'checkout') return '/checkout'
  if (type === 'orders') return '/orders'
  if (type === 'order-tracking') {
    const oId = data?.orderId || data?.id
    return oId ? `/orders/${oId}` : '/orders'
  }
  if (type === 'order-confirmed') return '/order-confirmed'
  if (type === 'addresses') return '/addresses'
  if (type === 'measurements') return '/measurements'
  if (type === 'search') {
    return `/search?q=${encodeURIComponent(data?.query || '')}`
  }
  return '/'
}

export function parseUrlToViewState(pathname = '/', search = '') {
  const cleanPath = (pathname || '/').replace(/\/+$/, '') || '/'
  const params = new URLSearchParams(search || '')

  // 1. Product: /product/:id or ?product=...
  const prodMatch = cleanPath.match(/^\/product\/([a-zA-Z0-9_-]+)/i)
  const queryProd =
    params.get('product') ||
    params.get('id') ||
    params.get('productId') ||
    params.get('product_id')
  if (prodMatch && prodMatch[1]) {
    return { type: 'product', data: { id: prodMatch[1], product_id: prodMatch[1] } }
  }
  if (queryProd) {
    return { type: 'product', data: { id: queryProd, product_id: queryProd } }
  }

  // 2. Designer: /designer/:id or ?designer=...
  const designerMatch = cleanPath.match(/^\/designer\/([a-zA-Z0-9_-]+)/i)
  const queryDesigner = params.get('designer') || params.get('designer_id')
  if (designerMatch && designerMatch[1]) {
    return { type: 'designer', data: { id: designerMatch[1], designer_id: designerMatch[1] } }
  }
  if (queryDesigner) {
    return { type: 'designer', data: { id: queryDesigner, designer_id: queryDesigner } }
  }

  // 3. Designers listing: /designers or /top-designers
  if (cleanPath === '/designers' || cleanPath === '/top-designers') {
    return { type: 'designers', data: null }
  }

  // 4. Category: /category/:id
  const catMatch = cleanPath.match(/^\/category\/([a-zA-Z0-9_-]+)/i)
  if (catMatch && catMatch[1]) {
    const sub = params.get('sub') || params.get('subcategory') || null
    return {
      type: 'category',
      data: { id: catMatch[1], selectedSubcategory: sub },
    }
  }

  // 5. Categories listing: /categories
  if (cleanPath === '/categories') {
    return { type: 'categories', data: null }
  }

  // 6. Shop: /shop/:id or /boutique/:id
  const shopMatch = cleanPath.match(/^\/(?:shop|boutique)\/([a-zA-Z0-9_-]+)/i)
  if (shopMatch && shopMatch[1]) {
    return { type: 'shop', data: { id: shopMatch[1], shop_id: shopMatch[1] } }
  }

  // 7. Shops listing: /shops or /spotlights or /boutiques
  if (cleanPath === '/shops' || cleanPath === '/spotlights' || cleanPath === '/boutiques') {
    return { type: 'shops', data: null }
  }

  // 8. Deals: /deals or /current-deals
  if (cleanPath === '/deals' || cleanPath === '/current-deals' || cleanPath === '/currentdeals') {
    return { type: 'deals', data: null }
  }

  // 9. Super Saver Deals: /super-saver-deals or /supersaver-deals
  if (
    cleanPath === '/super-saver-deals' ||
    cleanPath === '/supersaver-deals' ||
    cleanPath === '/supersavedeals'
  ) {
    return { type: 'super-saver-deals', data: null }
  }

  // 10. Checkout: /checkout
  if (cleanPath === '/checkout') {
    return { type: 'checkout', data: null }
  }

  // 11. Orders & Tracking: /orders or /orders/:id or /order-tracking/:id
  const orderTrackMatch = cleanPath.match(/^\/(?:orders?|order-tracking)\/([a-zA-Z0-9_-]+)/i)
  if (orderTrackMatch && orderTrackMatch[1] && orderTrackMatch[1] !== 'history') {
    return { type: 'order-tracking', data: { orderId: orderTrackMatch[1] } }
  }
  if (cleanPath === '/orders' || cleanPath === '/my-orders') {
    return { type: 'orders', data: null }
  }

  // 12. Order Confirmed: /order-confirmed
  if (cleanPath === '/order-confirmed') {
    return { type: 'order-confirmed', data: null }
  }

  // 13. Addresses: /addresses
  if (cleanPath === '/addresses') {
    return { type: 'addresses', data: null }
  }

  // 14. Measurements: /measurements
  if (cleanPath === '/measurements') {
    return { type: 'measurements', data: null }
  }

  // 15. Search: /search
  if (cleanPath === '/search' || params.get('q')) {
    const q = params.get('q') || ''
    return {
      type: 'category',
      data: { id: 44, name: `Search: "${q}"`, isSearch: true, searchQuery: q, subcategories: [] },
    }
  }

  return { type: 'home', data: null }
}

