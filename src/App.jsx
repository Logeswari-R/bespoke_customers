import React, { useState, useEffect } from 'react'
import Header from './components/header/Header'
import AuthModal from './components/header/AuthModal'
import AppBannersSlider from './components/home/AppBannersSlider'
import CategoriesSection from './components/home/CategoriesSection'
import SpotlightShopsSection from './components/home/SpotlightShopsSection'
import TopDesignersSection from './components/home/TopDesignersSection'
import CurrentDealsSection from './components/home/CurrentDealsSection'
import SuperSaverDealsSection from './components/home/SuperSaverDealsSection'
import ExploreProductsSection from './components/home/ExploreProductsSection'
import BottomTabBar from './components/home/BottomTabBar'
import ProductDetailPage from './components/views/ProductDetailPage'
import CategoryPage from './components/views/CategoryPage'
import DesignerPage from './components/views/DesignerPage'
import ShopPage from './components/views/ShopPage'
import DealsPage from './components/views/DealsPage'
import DesignersListingPage from './components/views/DesignersListingPage'
import CategoriesListingPage from './components/views/CategoriesListingPage'
import ShopsListingPage from './components/views/ShopsListingPage'
import CheckoutPage from './components/views/CheckoutPage'
import OrderConfirmedPage from './components/views/OrderConfirmedPage'
import OrdersPage from './components/views/OrdersPage'
import OrderTrackingPage from './components/views/OrderTrackingPage'
import AddressesPage from './components/views/AddressesPage'
import MeasurementsPage from './components/views/MeasurementsPage'
import BrandLogo from './components/header/BrandLogo'
import {
  getHomePageData,
  getWishlist,
  getWishlistIds,
  toggleWishlistApi,
  removeFromWishlistApi,
  getCart,
  addToCartApi,
  updateCartQuantityApi,
  removeFromCartApi,
  clearCartApi,
  formatImageUrl,
} from './services/api'
import {
  ShieldCheck,
  RefreshCw,
  Truck,
  CreditCard,
} from 'lucide-react'
import { getUrlForViewState, parseUrlToViewState } from './utils/navigation'

export default function App() {
  // Navigation & View State (Synchronized with Browser URL)
  const [viewState, setViewState] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseUrlToViewState(window.location.pathname, window.location.search)
    }
    return { type: 'home', data: null }
  })

  // Live API Homepage Data State
  const [homeData, setHomeData] = useState({
    categories: [],
    subcategories: [],
    banners: [],
    spotlights: [],
    designers: [],
    currentDeals: [],
    superSaverDeals: [],
    products: [],
    departments: [],
    allCategories: [],
  })
  const [isLoadingApi, setIsLoadingApi] = useState(true)

  // Mobile Bottom Tab State
  const [activeBottomTab, setActiveBottomTab] = useState('home')

  // Current Logged-in Customer User (Persisted to localStorage, null if guest)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('bespoke_user')
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error('Failed reading user from storage', e)
    }
    return null
  })

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState('login')

  // Drawers State
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isWishlistOpen, setIsWishlistOpen] = useState(false)

  // Live Cart Items (Guest storage or backend MySQL `user_cart_items`)
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('bespoke_guest_cart')
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error('Failed reading guest cart from storage', e)
    }
    return []
  })

  // Live Wishlist Items & IDs (Guest storage or backend MySQL `user_favourites`)
  const [wishlistItems, setWishlistItems] = useState(() => {
    try {
      const saved = localStorage.getItem('bespoke_guest_wishlist')
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error('Failed reading guest wishlist from storage', e)
    }
    return []
  })
  const [wishlistIds, setWishlistIds] = useState(() => {
    try {
      const saved = localStorage.getItem('bespoke_guest_wishlist_ids')
      if (saved) return JSON.parse(saved).map(Number)
    } catch (e) {
      console.error('Failed reading guest wishlist ids from storage', e)
    }
    return []
  })

  // Helper to persist guest cart if user is not authenticated
  const saveGuestCart = (newCart) => {
    try {
      localStorage.setItem('bespoke_guest_cart', JSON.stringify(newCart))
    } catch (e) {
      console.error('Error saving guest cart:', e)
    }
  }

  // Helper to persist guest wishlist if user is not authenticated
  const saveGuestWishlist = (newItems, newIds) => {
    try {
      localStorage.setItem('bespoke_guest_wishlist', JSON.stringify(newItems))
      localStorage.setItem('bespoke_guest_wishlist_ids', JSON.stringify(newIds))
    } catch (e) {
      console.error('Error saving guest wishlist:', e)
    }
  }

  // Synchronize Cart and Wishlist from MySQL Backend on mount and user change
  useEffect(() => {
    let ignore = false
    const userId = currentUser?.id

    if (!userId) return

    async function loadUserData() {
      try {
        const [cartRes, wishRes, wishIdsRes] = await Promise.allSettled([
          getCart(userId),
          getWishlist(userId),
          getWishlistIds(userId),
        ])
        if (ignore) return

        if (
          cartRes.status === 'fulfilled' &&
          cartRes.value?.status &&
          Array.isArray(cartRes.value?.data)
        ) {
          setCartItems(cartRes.value.data)
        }
        if (
          wishRes.status === 'fulfilled' &&
          wishRes.value?.status &&
          Array.isArray(wishRes.value?.data)
        ) {
          setWishlistItems(wishRes.value.data)
        }
        if (
          wishIdsRes.status === 'fulfilled' &&
          wishIdsRes.value?.status &&
          Array.isArray(wishIdsRes.value?.data)
        ) {
          setWishlistIds(wishIdsRes.value.data.map(Number))
        } else if (
          wishRes.status === 'fulfilled' &&
          wishRes.value?.status &&
          Array.isArray(wishRes.value?.data)
        ) {
          setWishlistIds(wishRes.value.data.map((item) => Number(item.product_id || item.id)))
        }
      } catch (err) {
        console.error('Error syncing user data:', err)
      }
    }

    loadUserData()
    return () => {
      ignore = true
    }
  }, [currentUser?.id])

  // Load all homepage data on mount
  useEffect(() => {
    let ignore = false
    async function init() {
      setIsLoadingApi(true)
      try {
        const data = await getHomePageData()
        if (!ignore) {
          setHomeData(data)
          setIsLoadingApi(false)
        }
      } catch (err) {
        console.error('Failed to load homepage data from API:', err)
        if (!ignore) setIsLoadingApi(false)
      }
    }
    init()
    return () => {
      ignore = true
    }
  }, [])

  // Central URL Router & View State Dispatcher
  const navigateTo = (type, data = null, replace = false) => {
    const targetUrl = getUrlForViewState(type, data)
    if (typeof window !== 'undefined' && window.history) {
      if (replace) {
        window.history.replaceState({ type, data }, '', targetUrl)
      } else if (window.location.pathname + window.location.search !== targetUrl) {
        window.history.pushState({ type, data }, '', targetUrl)
      }
    }
    setViewState({ type, data })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Listen to browser URL changes via popstate (Back/Forward navigation)
  useEffect(() => {
    const handlePopState = (e) => {
      if (e.state?.type) {
        setViewState({ type: e.state.type, data: e.state.data })
        return
      }
      const parsed = parseUrlToViewState(window.location.pathname, window.location.search)
      setViewState(parsed)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Handler for opening product details & updating URL (/product/:id)
  const handleOpenProduct = (productOrId) => {
    let productNumber = null
    let productObj = null

    if (typeof productOrId === 'object' && productOrId !== null) {
      productNumber =
        productOrId.product_id ||
        productOrId.id ||
        productOrId.product?.id ||
        productOrId.product?.product_id
      productObj = productOrId
    } else {
      productNumber = productOrId
      productObj = { id: productNumber }
    }

    navigateTo('product', {
      ...productObj,
      id: productNumber,
      product_id: productNumber,
    })
  }

  // Handlers for Navigating to Views (Driven by Live API & Browser Routes)
  const handleOpenCategory = (cat) => {
    const catId = cat?.id || cat?.category_id || 44
    navigateTo('category', {
      ...(typeof cat === 'object' ? cat : {}),
      id: catId,
    })
  }

  const handleOpenSubcategory = ({ category, categoryId, subcategory }) => {
    const foundCat =
      homeData.allCategories.find(
        (c) => c.name === category || c.id === categoryId
      ) || { id: categoryId || 44, name: category || 'Collection', subcategories: [] }

    navigateTo('category', {
      ...foundCat,
      id: categoryId || foundCat.id || 44,
      selectedSubcategory: subcategory,
    })
  }

  const handleOpenAllCategories = () => {
    navigateTo('categories', null)
  }

  const handleOpenDesigner = (designer) => {
    const designerId = designer?.designer_id || designer?.id || designer
    const designerObj =
      typeof designer === 'object' && designer !== null
        ? designer
        : { id: designerId, designer_id: designerId }
    navigateTo('designer', designerObj)
  }

  const handleOpenAllDesigners = () => {
    navigateTo('designers', null)
  }

  const handleOpenAllDeals = () => {
    navigateTo('deals', null)
  }

  const handleOpenSuperSaverDeals = () => {
    navigateTo('super-saver-deals', null)
  }

  const handleOpenShop = (shop) => {
    const shopId = shop?.shop_id || shop?.id || shop
    const shopObj =
      typeof shop === 'object' && shop !== null
        ? shop
        : { id: shopId, shop_id: shopId }
    navigateTo('shop', shopObj)
  }

  const handleOpenAllShops = () => {
    navigateTo('shops', null)
  }

  const handleSearch = (searchPayload) => {
    if (searchPayload.type === 'product') {
      handleOpenProduct(searchPayload.product)
    } else if (searchPayload.type === 'subcategory') {
      handleOpenSubcategory({
        category: searchPayload.category,
        subcategory: searchPayload.subcategory,
      })
    } else if (searchPayload.type === 'query') {
      const q = searchPayload.query.toLowerCase()
      const matchCat = homeData.allCategories.find((c) =>
        c.name.toLowerCase().includes(q)
      )
      if (matchCat) {
        handleOpenCategory(matchCat)
      } else {
        const matchProd = homeData.products.find((p) =>
          p.product_name?.toLowerCase().includes(q)
        )
        if (matchProd) {
          handleOpenProduct(matchProd)
        } else {
          navigateTo('search', { query: searchPayload.query })
        }
      }
    }
  }

  const handleBackToHome = () => {
    navigateTo('home', null)
    setActiveBottomTab('home')
  }

  const handleOpenCheckout = () => {
    navigateTo('checkout', null)
  }

  const handleOrderSuccess = (orderData) => {
    handleClearCart()
    navigateTo('order-confirmed', orderData)
  }

  const handleOpenOrders = () => {
    navigateTo('orders', null)
  }

  const handleOpenOrderTracking = (orderId) => {
    navigateTo('order-tracking', { orderId })
  }

  const handleOpenAddresses = () => {
    navigateTo('addresses', null)
  }

  const handleOpenMeasurements = () => {
    navigateTo('measurements', null)
  }

  // Cart Actions - Stored in MySQL `user_cart_items` if logged in, or local guest cart if guest
  const handleAddToCart = async (product, quantity = 1, size = null) => {
    const userId = currentUser?.id || null
    const productId = Number(product.product_id || product.id)
    const priceId = product.price_id || product.priceId || (Array.isArray(product.prices) && product.prices[0]?.id) || null
    const finalSize = size || product.size || 'Standard'
    const finalQty = Number(quantity || product.quantity || 1)
    const vendorId = product.vendor_id || product.vendorId || null
    const unitPrice = Number(product.discount_price || product.price || product.actual_price || 499)
    const uniqueId = Date.now() + Math.floor(Math.random() * 1000)

    const rawImg =
      product.image ||
      product.img_path ||
      product.main_image ||
      product.image_path ||
      (Array.isArray(product.images) && product.images[0])
    const formattedImg =
      formatImageUrl(rawImg) ||
      'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=600&q=80'

    const optimisticItem = {
      cart_item_id: uniqueId,
      id: uniqueId,
      product_id: productId,
      price_id: priceId,
      quantity: finalQty,
      price: unitPrice,
      actual_price: Number(product.actual_price || unitPrice),
      discount_price: unitPrice,
      title: product.product_name || product.title || 'Bespoke Item',
      product_name: product.product_name || product.title || 'Bespoke Item',
      image: formattedImg,
      image_path: rawImg,
      vendor: product.vendor || product.vendor_name || 'Bespoke Atelier',
      size: finalSize,
      addons: product.addons || [],
    }

    setCartItems((prev) => {
      const idx = prev.findIndex(
        (i) => Number(i.product_id || i.id) === productId && i.size === finalSize
      )
      let nextCart
      if (idx > -1) {
        nextCart = [...prev]
        nextCart[idx] = {
          ...nextCart[idx],
          quantity: (nextCart[idx].quantity || 1) + finalQty,
        }
      } else {
        nextCart = [optimisticItem, ...prev]
      }
      if (!userId) {
        saveGuestCart(nextCart)
      }
      return nextCart
    })

    setIsCartOpen(true)

    if (userId) {
      try {
        await addToCartApi({
          userId,
          productId,
          priceId,
          quantity: finalQty,
          size: finalSize,
          vendorId,
          addons: product.addons || [],
          measurementDetails: product.alteration || product.measurment_details || null,
        })
        const res = await getCart(userId)
        if (res?.status && Array.isArray(res.data)) {
          setCartItems(res.data)
        }
      } catch (err) {
        console.error('Failed to add to cart:', err)
      }
    }
  }

  const handleUpdateCartQuantity = async (cartItemId, newQty) => {
    const userId = currentUser?.id || null
    if (newQty <= 0) {
      await handleRemoveCartItem(cartItemId)
      return
    }

    setCartItems((prev) => {
      const nextCart = prev.map((i) =>
        i.cart_item_id === cartItemId || i.id === cartItemId
          ? { ...i, quantity: newQty }
          : i
      )
      if (!userId) {
        saveGuestCart(nextCart)
      }
      return nextCart
    })

    if (userId) {
      try {
        await updateCartQuantityApi({
          userId,
          cartItemId,
          quantity: newQty,
        })
        const res = await getCart(userId)
        if (res?.status && Array.isArray(res.data)) {
          setCartItems(res.data)
        }
      } catch (err) {
        console.error('Failed to update cart quantity:', err)
      }
    }
  }

  const handleRemoveCartItem = async (cartItemId) => {
    const userId = currentUser?.id || null
    setCartItems((prev) => {
      const nextCart = prev.filter(
        (i) => i.cart_item_id !== cartItemId && i.id !== cartItemId
      )
      if (!userId) {
        saveGuestCart(nextCart)
      }
      return nextCart
    })

    if (userId) {
      try {
        await removeFromCartApi({
          userId,
          cartItemId,
        })
        const res = await getCart(userId)
        if (res?.status && Array.isArray(res.data)) {
          setCartItems(res.data)
        }
      } catch (err) {
        console.error('Failed to remove cart item:', err)
      }
    }
  }

  const handleClearCart = async () => {
    const userId = currentUser?.id || null
    setCartItems([])
    if (!userId) {
      try {
        localStorage.removeItem('bespoke_guest_cart')
      } catch {
        // ignore
      }
    } else {
      try {
        await clearCartApi(userId)
        const res = await getCart(userId)
        if (res?.status && Array.isArray(res.data)) {
          setCartItems(res.data)
        }
      } catch (err) {
        console.error('Failed to clear cart:', err)
      }
    }
  }

  // Wishlist Actions - Stored in MySQL `user_favourites` if logged in, or local guest wishlist if guest
  const handleToggleWishlist = async (productOrId) => {
    const userId = currentUser?.id || null
    const productId = Number(
      typeof productOrId === 'object' && productOrId !== null
        ? productOrId.product_id || productOrId.id
        : productOrId
    )
    if (!productId) return

    const isCurrentlySaved = wishlistIds.includes(productId)

    if (isCurrentlySaved) {
      const newIds = wishlistIds.filter((id) => id !== productId)
      const newItems = wishlistItems.filter(
        (item) => Number(item.product_id || item.id) !== productId
      )
      setWishlistIds(newIds)
      setWishlistItems(newItems)
      if (!userId) {
        saveGuestWishlist(newItems, newIds)
      }
    } else {
      const newIds = [...wishlistIds, productId]
      let itemToAdd = null
      if (typeof productOrId === 'object' && productOrId !== null) {
        itemToAdd = productOrId
      } else {
        itemToAdd = homeData.products.find((p) => Number(p.id) === productId) || {
          id: productId,
          product_id: productId,
          product_name: 'Bespoke Item',
          price: 499,
        }
      }
      const newItems = [itemToAdd, ...wishlistItems]
      setWishlistIds(newIds)
      setWishlistItems(newItems)
      if (!userId) {
        saveGuestWishlist(newItems, newIds)
      }
    }

    if (userId) {
      try {
        await toggleWishlistApi({
          userId,
          productId,
        })
        const [wishRes, wishIdsRes] = await Promise.all([
          getWishlist(userId),
          getWishlistIds(userId),
        ])
        if (wishRes?.status && Array.isArray(wishRes.data)) {
          setWishlistItems(wishRes.data)
        }
        if (wishIdsRes?.status && Array.isArray(wishIdsRes.data)) {
          setWishlistIds(wishIdsRes.data.map(Number))
        }
      } catch (err) {
        console.error('Failed to toggle wishlist:', err)
      }
    }
  }

  const handleRemoveWishlistItem = async (productIdOrId) => {
    const userId = currentUser?.id || null
    const productId = Number(productIdOrId)
    const newIds = wishlistIds.filter((id) => id !== productId)
    const newItems = wishlistItems.filter(
      (item) => Number(item.product_id || item.id) !== productId
    )
    setWishlistIds(newIds)
    setWishlistItems(newItems)

    if (!userId) {
      saveGuestWishlist(newItems, newIds)
    } else {
      try {
        await removeFromWishlistApi({ userId, productId })
        const [wishRes, wishIdsRes] = await Promise.all([
          getWishlist(userId),
          getWishlistIds(userId),
        ])
        if (wishRes?.status && Array.isArray(wishRes.data)) {
          setWishlistItems(wishRes.data)
        }
        if (wishIdsRes?.status && Array.isArray(wishIdsRes.data)) {
          setWishlistIds(wishIdsRes.data.map(Number))
        }
      } catch (err) {
        console.error('Failed to remove from wishlist:', err)
      }
    }
  }

  const handleMoveWishlistToCart = async (item) => {
    await handleAddToCart(item)
    await handleRemoveWishlistItem(item.product_id || item.id)
  }

  // Authentication Handlers
  const handleOpenAuth = (mode = 'login') => {
    setAuthModalMode(mode)
    setIsAuthModalOpen(true)
  }

  const handleAuthSuccess = async (user) => {
    setCurrentUser(user)
    setIsAuthModalOpen(false)
    try {
      localStorage.setItem('bespoke_user', JSON.stringify(user))
    } catch (e) {
      console.error('Failed saving user to storage', e)
    }

    // Immediately route to homepage on sign in / registration
    handleBackToHome()

    if (user?.id) {
      try {
        const [cartRes, wishRes, wishIdsRes] = await Promise.allSettled([
          getCart(user.id),
          getWishlist(user.id),
          getWishlistIds(user.id),
        ])
        if (
          cartRes.status === 'fulfilled' &&
          cartRes.value?.status &&
          Array.isArray(cartRes.value?.data)
        ) {
          setCartItems(cartRes.value.data)
        }
        if (
          wishRes.status === 'fulfilled' &&
          wishRes.value?.status &&
          Array.isArray(wishRes.value?.data)
        ) {
          setWishlistItems(wishRes.value.data)
        }
        if (
          wishIdsRes.status === 'fulfilled' &&
          wishIdsRes.value?.status &&
          Array.isArray(wishIdsRes.value?.data)
        ) {
          setWishlistIds(wishIdsRes.value.data.map(Number))
        }
      } catch (err) {
        console.error('Error loading user data after login:', err)
      }
    }
  }

  const handleLogout = () => {
    try {
      localStorage.removeItem('bespoke_user')
      localStorage.removeItem('bespoke_guest_cart')
      localStorage.removeItem('bespoke_guest_wishlist')
      localStorage.removeItem('bespoke_guest_wishlist_ids')
    } catch (e) {
      console.error('Failed clearing storage', e)
    }
    setCurrentUser(null)
    setCartItems([])
    setWishlistItems([])
    setWishlistIds([])
    setAuthModalMode('login')
    setIsAuthModalOpen(false)
    handleBackToHome()
  }

  // Bottom Mobile Navigation
  const handleBottomTabChange = (tabId) => {
    setActiveBottomTab(tabId)
    if (tabId === 'home') {
      handleBackToHome()
    } else if (tabId === 'bag') {
      setIsCartOpen(true)
    } else if (tabId === 'favourites') {
      setIsWishlistOpen(true)
    } else if (tabId === 'profile') {
      if (currentUser) {
        setIsAuthModalOpen(false)
        handleOpenAuth('login')
      } else {
        handleOpenAuth('login')
      }
    } else if (tabId === 'store') {
      if (homeData.spotlights.length > 0) {
        handleOpenShop(homeData.spotlights[0])
      }
    }
  }

  // Use the live API categories in the top navigation bar
  const navCategories =
    homeData.departments && homeData.departments.length > 0
      ? homeData.departments
      : homeData.categories

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 font-sans pb-14 md:pb-0">
      {/* 1. Header with Categories & Mega Menu */}
      <Header
        navigationCategories={navCategories}
        selectedCategory={
          viewState.type === 'category' ? viewState.data?.name : null
        }
        onSelectCategory={handleOpenCategory}
        onSelectSubcategory={handleOpenSubcategory}
        onSearch={handleSearch}
        cartItems={cartItems}
        onUpdateCartQuantity={handleUpdateCartQuantity}
        onRemoveCartItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        wishlistItems={wishlistItems}
        wishlistIds={wishlistIds}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onRemoveWishlistItem={handleRemoveWishlistItem}
        onMoveWishlistToCart={handleMoveWishlistToCart}
        onSelectProduct={handleOpenProduct}
        onLogoClick={handleBackToHome}
        currentUser={currentUser}
        onOpenAuthModal={handleOpenAuth}
        onLogout={handleLogout}
        products={homeData.products}
        onOpenOrders={handleOpenOrders}
        onOpenAddresses={handleOpenAddresses}
        onOpenMeasurements={handleOpenMeasurements}
        onCheckout={handleOpenCheckout}
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        isWishlistOpen={isWishlistOpen}
        setIsWishlistOpen={setIsWishlistOpen}
      />

      {/* Main Content Area based on ViewState */}
      <main className="flex-1">
        {isLoadingApi && viewState.type === 'home' ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 bg-white">
            <div className="w-10 h-10 border-4 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-xs font-semibold text-neutral-500">
              Loading latest collections from API...
            </p>
          </div>
        ) : viewState.type === 'checkout' ? (
          /* Dedicated Checkout & Payment Page */
          <CheckoutPage
            currentUser={currentUser}
            cartItems={cartItems}
            onBack={handleBackToHome}
            onOrderSuccess={handleOrderSuccess}
            onOpenAuth={handleOpenAuth}
          />
        ) : viewState.type === 'order-confirmed' ? (
          /* Order Confirmation Celebration */
          <OrderConfirmedPage
            orderData={viewState.data}
            onContinueShopping={handleBackToHome}
            onTrackOrder={handleOpenOrderTracking}
          />
        ) : viewState.type === 'orders' ? (
          /* Customer Orders History */
          <OrdersPage
            currentUser={currentUser}
            onBack={handleBackToHome}
            onSelectOrder={handleOpenOrderTracking}
            onOpenAuth={handleOpenAuth}
            onContinueShopping={handleBackToHome}
          />
        ) : viewState.type === 'order-tracking' ? (
          /* Live Order Tracking Timeline */
          <OrderTrackingPage
            orderId={viewState.data?.orderId || viewState.data?.id}
            currentUser={currentUser}
            onBack={handleOpenOrders}
            onOpenSupport={() => alert('Opening live chat with atelier assistant...')}
          />
        ) : viewState.type === 'addresses' ? (
          /* Delivery Addresses Manager */
          <AddressesPage
            currentUser={currentUser}
            onBack={handleBackToHome}
            onOpenAuth={handleOpenAuth}
          />
        ) : viewState.type === 'measurements' ? (
          /* Custom Tailoring Measurements */
          <MeasurementsPage
            currentUser={currentUser}
            onBack={handleBackToHome}
            onOpenAuth={handleOpenAuth}
          />
        ) : viewState.type === 'product' ? (
          /* Dedicated Product Detail Page */
          <ProductDetailPage
            productId={viewState.data?.id || viewState.data?.product_id}
            initialProduct={viewState.data}
            currentUser={currentUser}
            onBack={handleBackToHome}
            onAddToCart={handleAddToCart}
            onSelectProduct={handleOpenProduct}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
          />
        ) : viewState.type === 'category' ? (
          /* Dedicated Category & Subcategories Page */
          <CategoryPage
            category={viewState.data}
            onBack={handleBackToHome}
            onSelectProduct={handleOpenProduct}
            onAddToCart={handleAddToCart}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
          />
        ) : viewState.type === 'designer' ? (
          /* Dedicated Designer Page */
          <DesignerPage
            designer={viewState.data}
            onBack={handleBackToHome}
            onSelectProduct={handleOpenProduct}
            onAddToCart={handleAddToCart}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
          />
        ) : viewState.type === 'deals' ? (
          /* Dedicated Top Current Deals Page */
          <DealsPage
            type="current-deals"
            onBack={handleBackToHome}
            onSelectProduct={handleOpenProduct}
          />
        ) : viewState.type === 'super-saver-deals' ? (
          /* Dedicated Super Saver Deals Page */
          <DealsPage
            type="super-saver-deals"
            onBack={handleBackToHome}
            onSelectProduct={handleOpenProduct}
          />
        ) : viewState.type === 'designers' ? (
          /* Dedicated Top Designers Listing Page */
          <DesignersListingPage
            onBack={handleBackToHome}
            onSelectDesigner={handleOpenDesigner}
          />
        ) : viewState.type === 'categories' ? (
          /* Dedicated All Categories Listing Page */
          <CategoriesListingPage
            onBack={handleBackToHome}
            onSelectCategory={handleOpenCategory}
            onSelectSubcategory={handleOpenSubcategory}
          />
        ) : viewState.type === 'shops' ? (
          /* Dedicated Boutiques Listing Page */
          <ShopsListingPage
            onBack={handleBackToHome}
            onSelectShop={handleOpenShop}
          />
        ) : viewState.type === 'shop' ? (
          /* Dedicated Boutique Shop Page */
          <ShopPage
            shop={viewState.data}
            onBack={handleBackToHome}
            onSelectProduct={handleOpenProduct}
            onAddToCart={handleAddToCart}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
          />
        ) : (
          /* Homepage: Exact Order-wise Sections Matching Screenshots 1–4 */
          <div className="space-y-0">
            {/* Section 1: App Banners Slider (From API: app-banners) */}
            <AppBannersSlider
              banners={homeData.banners}
              onSelectBanner={(banner) => {
                if (banner.navigate === '1' && banner.searchfield_id) {
                  // Navigate to product by product number from API
                  handleOpenProduct(banner.searchfield_id)
                } else if (banner.navigate === '2' && banner.searchfield_id) {
                  // Navigate to shop / vendor by ID from API
                  handleOpenShop({
                    id: banner.searchfield_id,
                    shop_id: banner.searchfield_id,
                    title: banner.searchfield_text,
                    shop_name: banner.searchfield_text,
                  })
                }
              }}
            />

            {/* Section 2: Categories Section (Matching Flutter category/view) */}
            <CategoriesSection
              categories={homeData.categories}
              onSelectCategory={handleOpenCategory}
              onViewAll={handleOpenAllCategories}
            />

            {/* Section 3: Shops In Spotlight (Screenshot 1 & 2) */}
            <SpotlightShopsSection
              spotlights={homeData.spotlights}
              onSelectShop={handleOpenShop}
              onViewAll={handleOpenAllShops}
            />

            {/* Section 4: Top Designers (Screenshot 2) */}
            <TopDesignersSection
              designers={homeData.designers}
              onSelectDesigner={handleOpenDesigner}
              onViewAll={handleOpenAllDesigners}
            />

            {/* Section 5: Top Current Deals (Screenshot 2) */}
            <CurrentDealsSection
              deals={homeData.currentDeals}
              onSelectDeal={(deal) => {
                const prodId = deal.product_id || deal.product?.id || deal.id
                handleOpenProduct({
                  ...(deal.product || {}),
                  ...deal,
                  id: prodId,
                  product_id: prodId,
                })
              }}
              onViewAll={handleOpenAllDeals}
            />

            {/* Section 6: SUPER SAVER DEALS (Screenshot 3) */}
            <SuperSaverDealsSection
              deals={homeData.superSaverDeals}
              onSelectDeal={(deal) => {
                const prodId = deal.product_id || deal.product?.id || deal.id
                handleOpenProduct({
                  ...(deal.product || {}),
                  ...deal,
                  id: prodId,
                  product_id: prodId,
                })
              }}
              onViewAll={handleOpenSuperSaverDeals}
            />

            {/* Section 7: Explore More Products (Screenshot 4) */}
            <ExploreProductsSection
              products={homeData.products}
              wishlistIds={wishlistIds}
              onToggleWishlist={handleToggleWishlist}
              onAddToCart={handleAddToCart}
              onSelectProduct={handleOpenProduct}
            />
          </div>
        )}
      </main>

      {/* Trust & Guarantee Bar */}
      <section className="border-t border-neutral-100 bg-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center text-theme-primary mb-3 border border-pink-100 shadow-xs">
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                Free Express Delivery
              </h4>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                On orders above ₹499 across India
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center text-theme-primary mb-3 border border-pink-100 shadow-xs">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                30-Day Hassle-Free Returns
              </h4>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Instant doorstep pickup & refund
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center text-theme-primary mb-3 border border-pink-100 shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                100% Genuine Atelier Wear
              </h4>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Certified premium craftsmanship
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center text-theme-primary mb-3 border border-pink-100 shadow-xs">
                <CreditCard className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                Secure Encrypted Checkout
              </h4>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                UPI, Cards, NetBanking, COD
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-950 text-neutral-400 text-xs border-t border-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <BrandLogo variant="dark" onClick={handleBackToHome} />
              <p className="text-neutral-400 text-xs leading-relaxed max-w-xs mt-2">
                Celebrate Style, Celebrate Bespoke. Modern fashion, custom tailoring,
                and lifestyle collections directly from verified atelier boutiques.
              </p>
            </div>

            <div>
              <h5 className="font-bold uppercase tracking-wider text-white mb-3">
                Live Categories
              </h5>
              <ul className="space-y-2">
                {homeData.categories.slice(0, 6).map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => handleOpenCategory(c)}
                      className="hover:text-white transition-colors cursor-pointer capitalize text-left"
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="font-bold uppercase tracking-wider text-white mb-3">
                Featured Boutiques
              </h5>
              <ul className="space-y-2">
                {homeData.spotlights.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => handleOpenShop(s)}
                      className="hover:text-white transition-colors cursor-pointer text-left"
                    >
                      {s.title || s.shop_name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="font-bold uppercase tracking-wider text-white mb-3">
                Contact & Support
              </h5>
              <p className="text-neutral-400 text-xs mb-2">
                Need help with your bespoke tailoring or order tracking?
              </p>
              <p className="font-bold text-white text-xs">+91 (800) 237-7653</p>
              <p className="text-neutral-500 text-[11px] mt-1">support@bespoke-fashion.com</p>
              <p className="text-[11px] text-neutral-500 mt-4">
                &copy; 2026 Bespoke Atelier Ltd. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Tab Bar */}
      <BottomTabBar
        activeTab={activeBottomTab}
        onTabChange={handleBottomTabChange}
        cartCount={cartItems.reduce((acc, i) => acc + (i.quantity || 1), 0)}
        wishlistCount={wishlistIds.length}
      />

      {/* Customer Authentication Modal (Sign In / Register) */}
      <AuthModal
        key={`${authModalMode}-${isAuthModalOpen}`}
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  )
}
