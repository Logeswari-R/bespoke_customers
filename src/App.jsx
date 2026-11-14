import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react'
import Header from './components/header/Header'
import AuthModal from './components/header/AuthModal'
import LoginPromptModal from './components/common/LoginPromptModal'
import { useAuth } from './context/AuthContext'
import AppBannersSlider from './components/home/AppBannersSlider'
import CategoriesSection from './components/home/CategoriesSection'
import SpotlightShopsSection from './components/home/SpotlightShopsSection'
import TopDesignersSection from './components/home/TopDesignersSection'
import CurrentDealsSection from './components/home/CurrentDealsSection'
import SuperSaverDealsSection from './components/home/SuperSaverDealsSection'
import ExploreProductsSection from './components/home/ExploreProductsSection'
import BottomTabBar from './components/home/BottomTabBar'

// Lazy-loaded route views for optimal performance & code splitting
const ProductDetailPage = lazy(() => import('./components/views/ProductDetailPage'))
const CategoryPage = lazy(() => import('./components/views/CategoryPage'))
const DesignerPage = lazy(() => import('./components/views/DesignerPage'))
const ShopPage = lazy(() => import('./components/views/ShopPage'))
const SearchResultsPage = lazy(() => import('./components/views/SearchResultsPage'))
const DealsPage = lazy(() => import('./components/views/DealsPage'))
const DesignersListingPage = lazy(() => import('./components/views/DesignersListingPage'))
const CategoriesListingPage = lazy(() => import('./components/views/CategoriesListingPage'))
const ShopsListingPage = lazy(() => import('./components/views/ShopsListingPage'))
const CheckoutPage = lazy(() => import('./components/views/CheckoutPage'))
const OrderConfirmedPage = lazy(() => import('./components/views/OrderConfirmedPage'))
const OrdersPage = lazy(() => import('./components/views/OrdersPage'))
const OrderTrackingPage = lazy(() => import('./components/views/OrderTrackingPage'))
const AddressesPage = lazy(() => import('./components/views/AddressesPage'))
const MeasurementsPage = lazy(() => import('./components/views/MeasurementsPage'))
const ProfileDashboardPage = lazy(() => import('./components/views/ProfileDashboardPage'))
const EditProfilePage = lazy(() => import('./components/views/EditProfilePage'))
const ChatsPage = lazy(() => import('./components/views/ChatsPage'))
const OrderVendorChatPage = lazy(() => import('./components/views/OrderVendorChatPage'))
const SettingsPage = lazy(() => import('./components/views/SettingsPage'))
const NotificationsPage = lazy(() => import('./components/views/NotificationsPage'))
const ContactUsPage = lazy(() => import('./components/views/ContactUsPage'))
const TermsPage = lazy(() => import('./components/views/TermsPage'))
const RefundPolicyPage = lazy(() => import('./components/views/RefundPolicyPage'))
const PrivacyPolicyPage = lazy(() => import('./components/views/PrivacyPolicyPage'))
const BrowsingHistoryPage = lazy(() => import('./components/views/BrowsingHistoryPage'))
const InvoicesPage = lazy(() => import('./components/views/InvoicesPage'))
const PaymentsPage = lazy(() => import('./components/views/PaymentsPage'))

import BrandLogo from './components/header/BrandLogo'
import { NAVIGATION_CATEGORIES } from './data/navigationData'
import RecentlyViewedSection from './components/common/RecentlyViewedSection'
import { useRecentlyViewed } from './hooks/useRecentlyViewed'
import { PageLoadingAnimation } from './components/animations'
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
  saveMeasurementProfile,
  formatImageUrl,
  getUnreadNotificationCountApi,
  markAllNotificationsReadApi,
  isProductActive,
} from './services/api'
import { io } from 'socket.io-client'
import {
  ShieldCheck,
  RefreshCw,
  Truck,
  CreditCard,
  MessageSquare,
  Bell,
  X,
} from 'lucide-react'
import { getUrlForViewState, parseUrlToViewState } from './utils/navigation'
import {
  initScrollRestoration,
  prepareNavigation,
  handlePopStateNavigation,
  notifyContentReady,
} from './utils/scrollRestoration'

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
    departments: NAVIGATION_CATEGORIES,
    allCategories: [],
  })
  const [isLoadingApi, setIsLoadingApi] = useState(true)

  // Mobile Bottom Tab State
  const [activeBottomTab, setActiveBottomTab] = useState('home')

  // Centralized Authentication State from AuthContext
  const {
    currentUser,
    setCurrentUser,
    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    isLoginPromptOpen,
    loginPromptOptions,
    openLoginPrompt,
    closeLoginPrompt,
    consumePendingAction,
    logout,
    updateUser,
  } = useAuth()

  // Concurrency guard to ensure pending action executes exactly once
  const isExecutingPendingActionRef = React.useRef(false)

  // Drawers State
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isWishlistOpen, setIsWishlistOpen] = useState(false)

  // Live Recently Viewed Items for Dynamic Alternating Section Color Rhythm
  const { latest10 } = useRecentlyViewed(currentUser?.id, { limit: 10 })
  const hasRecentlyViewed = Array.isArray(latest10) && latest10.filter(isProductActive).length > 0

  // Live Cart Items (Synchronized with MySQL user_cart_items for authenticated user)
  const [cartItems, setCartItems] = useState([])

  // Live Wishlist Items & IDs (Synchronized with MySQL user_favourites for authenticated user)
  const [wishlistItems, setWishlistItems] = useState([])
  const [wishlistIds, setWishlistIds] = useState([])

  // Live Notifications & Real-time Support Toast State
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)
  const [incomingSupportToast, setIncomingSupportToast] = useState(null)

  // Auto-dismiss support toast after 8 seconds
  useEffect(() => {
    if (!incomingSupportToast) return
    const timer = setTimeout(() => setIncomingSupportToast(null), 8000)
    return () => clearTimeout(timer)
  }, [incomingSupportToast])

  // Track viewState in a ref to keep socket listeners stable across view changes
  const viewStateRef = useRef(viewState)
  useEffect(() => {
    viewStateRef.current = viewState
  }, [viewState])

  const lastToastTextRef = useRef('')
  const lastToastTimeRef = useRef(0)

  const targetUserId = currentUser?.id || currentUser?.user_id || null

  // Authoritative unread notifications count synchronization from MySQL DB
  const refreshUnread = useCallback(async () => {
    if (!targetUserId) {
      setUnreadNotificationsCount(0)
      return
    }
    try {
      const count = await getUnreadNotificationCountApi({
        recipientType: 'user',
        recipientId: targetUserId,
      })
      setUnreadNotificationsCount(Number(count) || 0)
    } catch {
      // non-blocking
    }
  }, [targetUserId])

  // Global Realtime WebSocket listener for instant Admin notifications & replies (Only for authenticated customers)
  useEffect(() => {
    if (!targetUserId) {
      setUnreadNotificationsCount(0)
      return
    }

    // Initial fetch of true unread count from database
    refreshUnread()

    const rawWsUrl =
      import.meta.env.VITE_WEBSOCKET_URL ||
      import.meta.env.VITE_NODE_API ||
      'http://localhost:8080'
    const socketUrl = String(rawWsUrl).trim().replace(/\/+$/, '')

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
      console.log('⚡ [Global App] Socket connected for customer:', targetUserId)
      socket.emit('register', String(targetUserId))
      socket.emit('join_room', String(targetUserId))
      socket.emit('join_room', `customer_${targetUserId}`)
    })

    const handleNotification = (notif) => {
      console.log('🔔 [Global App] Real-time notification received:', notif)
      // Authoritatively update count from MySQL database
      refreshUnread()

      if (viewStateRef.current?.type !== 'chats') {
        const toastMsg = notif?.message || notif?.title || 'New reply received from support'
        const now = Date.now()
        if (toastMsg === lastToastTextRef.current && (now - lastToastTimeRef.current) < 4000) {
          return
        }
        lastToastTextRef.current = toastMsg
        lastToastTimeRef.current = now

        setIncomingSupportToast({
          title: notif?.title || 'Bespoke Concierge Support',
          message: notif?.message || 'New reply received from support',
        })
      }
    }

    const handleMessage = (data) => {
      if (!data) return
      const senderId = String(data.sender_id || data.senderId || '')
      const senderType = String(data.sender_type || data.senderType || '').toLowerCase()
      const isAdmin = senderId === '1' || senderType === 'admin'

      if (isAdmin) {
        console.log('📨 [Global App] Admin chat reply received:', data)
        // Authoritatively update count from MySQL database
        refreshUnread()

        if (viewStateRef.current?.type !== 'chats') {
          const rawText = String(data.message || data.text || 'New message from support')
          const toastMsg = `Admin: "${rawText}"`
          const now = Date.now()
          if (rawText === lastToastTextRef.current && (now - lastToastTimeRef.current) < 4000) {
            return
          }
          lastToastTextRef.current = rawText
          lastToastTimeRef.current = now

          setIncomingSupportToast({
            title: 'Bespoke Concierge Support',
            message: toastMsg,
          })
        }
      }
    }

    socket.on('notification:new', handleNotification)
    socket.on('support_notification:new', handleNotification)
    socket.on('receive_ticket_message', handleMessage)
    socket.on('receive_message', handleMessage)

    return () => {
      socket.off('notification:new', handleNotification)
      socket.off('support_notification:new', handleNotification)
      socket.off('receive_ticket_message', handleMessage)
      socket.off('receive_message', handleMessage)
      socket.disconnect()
    }
  }, [targetUserId, refreshUnread])

  // Synchronize Cart and Wishlist from MySQL Backend on mount and user change
  useEffect(() => {
    let ignore = false
    const userId = currentUser?.id

    if (!userId) {
      setCartItems([])
      setWishlistItems([])
      setWishlistIds([])
      return
    }

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

  // Initialize smart layout-aware scroll restoration
  useEffect(() => {
    const cleanup = initScrollRestoration()
    return () => {
      if (cleanup) cleanup()
    }
  }, [])

  // Load all homepage data on mount
  useEffect(() => {
    let ignore = false
    async function init() {
      setIsLoadingApi(true)
      try {
        const data = await getHomePageData()
        if (!ignore) {
          setHomeData({
            ...data,
            departments: NAVIGATION_CATEGORIES,
          })
          setIsLoadingApi(false)
          notifyContentReady('/')
        }
      } catch (err) {
        console.error('Failed to load homepage data from API:', err)
        if (!ignore) {
          setIsLoadingApi(false)
          notifyContentReady('/')
        }
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
    const currentUrl =
      typeof window !== 'undefined'
        ? window.location.pathname + window.location.search
        : '/'

    // Capture and cache scroll position of departure route, prepare target
    prepareNavigation(currentUrl, targetUrl, replace)

    if (typeof window !== 'undefined' && window.history) {
      if (replace) {
        window.history.replaceState({ type, data }, '', targetUrl)
      } else if (currentUrl !== targetUrl) {
        window.history.pushState({ type, data }, '', targetUrl)
      }
    }
    setViewState({ type, data })
    if (['profile', 'edit-profile', 'orders', 'order-tracking', 'order-vendor-chat', 'measurements', 'addresses', 'chats', 'settings', 'contact-us', 'terms', 'privacy', 'refund-policy', 'history', 'payments', 'invoices'].includes(type)) {
      setActiveBottomTab('profile')
    } else if (type === 'home') {
      setActiveBottomTab('home')
    } else if (type === 'shop' || type === 'shops') {
      setActiveBottomTab('store')
    }

    // New intentional navigation begins fresh at top
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }

  // Listen to browser URL changes via popstate (Back/Forward navigation)
  useEffect(() => {
    const handlePopState = (e) => {
      const currentUrl = window.location.pathname + window.location.search
      handlePopStateNavigation(currentUrl)

      if (e.state?.type) {
        setViewState({ type: e.state.type, data: e.state.data })
        if (['profile', 'edit-profile', 'orders', 'order-tracking', 'order-vendor-chat', 'measurements', 'addresses', 'chats', 'settings', 'contact-us', 'terms', 'privacy', 'refund-policy', 'history', 'payments', 'invoices'].includes(e.state.type)) {
          setActiveBottomTab('profile')
        } else if (e.state.type === 'home') {
          setActiveBottomTab('home')
        } else if (e.state.type === 'shop' || e.state.type === 'shops') {
          setActiveBottomTab('store')
        }
        return
      }
      const parsed = parseUrlToViewState(window.location.pathname, window.location.search)
      setViewState(parsed)
      if (['profile', 'edit-profile', 'orders', 'order-tracking', 'order-vendor-chat', 'measurements', 'addresses', 'chats', 'settings', 'contact-us', 'terms', 'privacy', 'refund-policy', 'history', 'payments', 'invoices'].includes(parsed?.type)) {
        setActiveBottomTab('profile')
      } else if (parsed?.type === 'home') {
        setActiveBottomTab('home')
      } else if (parsed?.type === 'shop' || parsed?.type === 'shops') {
          setActiveBottomTab('store')
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Synchronize cart view state with drawer
  useEffect(() => {
    if (viewState.type === 'cart') {
      setIsCartOpen(true)
    }
  }, [viewState.type])

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
      selectedMaterialId: productObj.selectedMaterialId || productObj.variant_id || productObj.material_id,
      selectedMaterialIdx: productObj.selectedMaterialIdx,
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
    // Unique boutique ID from spotlight (e.g. 16 for Zivara, 17 for DreamWeave, 12 for test, 18 for Lunara)
    const shopId = shop?.id || shop?.shop_id || shop
    const shopObj =
      typeof shop === 'object' && shop !== null
        ? { ...shop, id: shopId }
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
      const q = (searchPayload.query || '').trim()
      if (q) {
        navigateTo('search', { query: q })
      }
    }
  }

  const handleBackToHome = () => {
    navigateTo('home', null)
    setActiveBottomTab('home')
  }

  // Smart back navigation (utilizes browser history stack with intelligent contextual fallback)
  const handleBack = () => {
    // 1. If user has browser history entries in this tab, execute window.history.back()
    if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
      window.history.back()
      return
    }

    // 2. Intelligent contextual fallback if landing directly on deep links with no prior history stack
    if (viewState.type === 'order-vendor-chat') {
      const ordId =
        viewState.data?.saleOrderId ||
        viewState.data?.sale_order_id ||
        viewState.data?.orderId ||
        viewState.data?.id ||
        (typeof window !== 'undefined'
          ? window.location.pathname.match(/\/(?:orders?|order-tracking)\/([a-zA-Z0-9_-]+)/i)?.[1]
          : null)
      if (ordId) {
        navigateTo('order-tracking', { orderId: ordId })
      } else {
        navigateTo('orders', null)
      }
    } else if (viewState.type === 'order-tracking') {
      navigateTo('orders', null)
    } else if (['edit-profile', 'addresses', 'measurements', 'settings', 'chats', 'notifications', 'history', 'payments', 'invoices'].includes(viewState.type)) {
      navigateTo('profile', null)
    } else if (viewState.type === 'checkout') {
      navigateTo('cart', null)
    } else {
      handleBackToHome()
    }
  }

  const handleOpenCheckout = () => {
    setIsCartOpen(false)
    if (!currentUser) {
      openLoginPrompt({
        title: 'Sign In Required',
        message: 'Please login to continue.',
        actionDescription: 'proceed to checkout',
        pendingAction: {
          type: 'CHECKOUT',
          pageUrl: window.location.href,
        },
      })
      return
    }
    navigateTo('checkout', null)
  }

  const handleOrderSuccess = (orderData) => {
    handleClearCart()
    navigateTo('order-confirmed', orderData)
  }

  const handleOpenOrders = () => {
    if (!currentUser) {
      openLoginPrompt({
        title: 'Sign In Required',
        message: 'Please login to continue.',
        actionDescription: 'view your orders & tracking',
        pendingAction: {
          type: 'NAVIGATE',
          targetView: 'orders',
          pageUrl: window.location.href,
        },
      })
      return
    }
    navigateTo('orders', null)
  }

  const handleOpenOrderTracking = (orderId) => {
    if (!currentUser) {
      openLoginPrompt({
        title: 'Sign In Required',
        message: 'Please login to continue.',
        actionDescription: 'track your bespoke order',
        pendingAction: {
          type: 'NAVIGATE',
          targetView: 'order-tracking',
          targetData: { orderId },
          pageUrl: window.location.href,
        },
      })
      return
    }
    navigateTo('order-tracking', { orderId })
  }

  const handleOpenAddresses = () => {
    if (!currentUser) {
      openLoginPrompt({
        title: 'Sign In Required',
        message: 'Please login to continue.',
        actionDescription: 'manage your delivery addresses',
        pendingAction: {
          type: 'NAVIGATE',
          targetView: 'addresses',
          pageUrl: window.location.href,
        },
      })
      return
    }
    navigateTo('addresses', null)
  }

  const handleOpenMeasurements = () => {
    if (!currentUser) {
      openLoginPrompt({
        title: 'Sign In Required',
        message: 'Please login to continue.',
        actionDescription: 'manage your custom measurements',
        pendingAction: {
          type: 'NAVIGATE',
          targetView: 'measurements',
          pageUrl: window.location.href,
        },
      })
      return
    }
    navigateTo('measurements', null)
  }

  const handleOpenWishlist = () => {
    if (!currentUser) {
      openLoginPrompt({
        title: 'Sign In Required',
        message: 'Please login to continue.',
        actionDescription: 'view your saved wishlist',
        pendingAction: {
          type: 'NAVIGATE',
          targetView: 'wishlist',
          pageUrl: window.location.href,
        },
      })
      return
    }
    setIsWishlistOpen(true)
  }

  const handleOpenProfile = () => {
    if (!currentUser) {
      openLoginPrompt({
        title: 'Sign In Required',
        message: 'Please login to continue.',
        actionDescription: 'access your bespoke profile & orders',
        pendingAction: {
          type: 'VIEW_PROFILE',
          pageUrl: window.location.href,
        },
      })
      return
    }
    navigateTo('profile', null)
    setActiveBottomTab('profile')
  }

  const handleOpenHistory = () => {
    navigateTo('history', null)
  }

  const handleOpenEditProfile = () => {
    if (!currentUser) {
      openLoginPrompt({
        title: 'Sign In Required',
        message: 'Please login to continue.',
        actionDescription: 'edit your profile details',
        pendingAction: {
          type: 'NAVIGATE',
          targetView: 'edit-profile',
          pageUrl: window.location.href,
        },
      })
      return
    }
    navigateTo('edit-profile', null)
    setActiveBottomTab('profile')
  }

  const handleOpenChats = () => {
    setIncomingSupportToast(null)
    if (!currentUser) {
      openLoginPrompt({
        title: 'Sign In Required',
        message: 'Please login to continue.',
        actionDescription: 'connect with atelier concierge',
        pendingAction: {
          type: 'NAVIGATE',
          targetView: 'chats',
          pageUrl: window.location.href,
        },
      })
      return
    }
    setUnreadNotificationsCount(0)
    const activeUid = currentUser.id || currentUser.user_id
    if (activeUid) {
      markAllNotificationsReadApi({ recipientType: 'user', recipientId: activeUid }).catch(() => {})
    }
    navigateTo('chats', null)
    setActiveBottomTab('profile')
  }

  const handleOpenOrderVendorChat = (orderData) => {
    if (!currentUser) {
      openLoginPrompt({
        title: 'Sign In Required',
        message: 'Please login to continue.',
        actionDescription: 'chat with atelier artisan',
        pendingAction: {
          type: 'NAVIGATE',
          targetView: 'order-vendor-chat',
          data: orderData,
          pageUrl: window.location.href,
        },
      })
      return
    }
    navigateTo('order-vendor-chat', orderData)
    setActiveBottomTab('profile')
  }

  const handleOpenNotifications = () => {
    setIncomingSupportToast(null)
    if (!currentUser) {
      openLoginPrompt({
        title: 'Sign In Required',
        message: 'Please login to continue.',
        actionDescription: 'view your notifications',
        pendingAction: {
          type: 'NAVIGATE',
          targetView: 'notifications',
          pageUrl: window.location.href,
        },
      })
      return
    }
    setUnreadNotificationsCount(0)
    const activeUid = currentUser.id || currentUser.user_id
    if (activeUid) {
      markAllNotificationsReadApi({ recipientType: 'user', recipientId: activeUid }).catch(() => {})
    }
    navigateTo('notifications', null)
    setActiveBottomTab('profile')
  }

  const handleOpenInvoices = () => {
    if (!currentUser) {
      openLoginPrompt({
        title: 'Sign In Required',
        message: 'Please login to continue.',
        actionDescription: 'view your invoices',
        pendingAction: {
          type: 'NAVIGATE',
          targetView: 'invoices',
          pageUrl: window.location.href,
        },
      })
      return
    }
    navigateTo('invoices', null)
    setActiveBottomTab('profile')
  }

  const handleOpenPayments = () => {
    if (!currentUser) {
      openLoginPrompt({
        title: 'Sign In Required',
        message: 'Please login to continue.',
        actionDescription: 'view your saved payments',
        pendingAction: {
          type: 'NAVIGATE',
          targetView: 'payments',
          pageUrl: window.location.href,
        },
      })
      return
    }
    navigateTo('payments', null)
    setActiveBottomTab('profile')
  }

  const handleOpenSettings = () => {
    navigateTo('settings', null)
    setActiveBottomTab('profile')
  }

  const handleOpenContactUs = () => {
    navigateTo('contact-us', null)
    setActiveBottomTab('profile')
  }

  const handleOpenTerms = () => {
    navigateTo('terms', null)
  }

  const handleOpenRefundPolicy = () => {
    navigateTo('refund-policy', null)
  }

  const handleOpenPrivacy = () => {
    navigateTo('privacy', null)
  }

  // Cart Actions - Guarded: Requires customer login before executing
  const handleAddToCart = async (product, quantity = 1, size = null, overrideUser = null, openDrawer = true) => {
    const user = overrideUser || currentUser
    if (!user) {
      openLoginPrompt({
        title: 'Sign In Required',
        message: 'Please login to continue.',
        actionDescription: 'add items to your bag',
        pendingAction: {
          type: 'ADD_TO_CART',
          productId: product.product_id || product.id,
          productName: product.product_name || product.title || 'Bespoke Item',
          priceId: product.price_id || product.priceId || (Array.isArray(product.prices) && product.prices[0]?.id) || null,
          size: size || product.size || 'Standard',
          quantity: Number(quantity || product.quantity || 1),
          addons: product.addons || [],
          alteration: product.alteration || false,
          materialId: product.materialId || null,
          material: product.material || null,
          product,
          pageUrl: window.location.href,
        },
      })
      return
    }

    const userId = user.id
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

    const isCustom = Boolean(
      product.is_customizable ||
      product.is_customisable === '1' ||
      product.is_customisable === 1 ||
      product.product_type === 0 ||
      product.order_type === 'Customizable' ||
      (product.measurements && product.measurements.length > 0)
    )

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
      is_customizable: isCustom ? 1 : 0,
      is_customisable: isCustom ? '1' : '0',
      product_type: isCustom ? 0 : 1,
      order_type: isCustom ? 'Customizable' : 'Ready Made',
      measurements: product.measurements || product.custom_measurements || [],
      custom_measurements: product.custom_measurements || product.measurements || null,
      measurement_summary: product.measurement_summary || null,
      measurment_details: product.measurment_details || product.measurements || [],
    }

    setCartItems((prev) => {
      const idx = prev.findIndex(
        (i) => Number(i.product_id || i.id) === productId && i.size === finalSize
      )
      if (idx > -1) {
        const nextCart = [...prev]
        nextCart[idx] = {
          ...nextCart[idx],
          quantity: (nextCart[idx].quantity || 1) + finalQty,
          ...optimisticItem,
        }
        return nextCart
      }
      return [optimisticItem, ...prev]
    })

    if (openDrawer) {
      setIsCartOpen(true)
    }

    try {
      await addToCartApi({
        userId,
        productId,
        priceId,
        quantity: finalQty,
        size: finalSize,
        vendorId,
        addons: product.addons || [],
        measurementDetails: product.measurment_details || product.measurements || product.alteration || null,
      })
      const res = await getCart(userId)
      if (res?.status && Array.isArray(res.data)) {
        setCartItems(res.data)
      }
    } catch (err) {
      console.error('Failed to add to cart:', err)
    }
  }

  const handleBuyNow = async (product) => {
    if (!product) return

    // If customizable or needs option selection, navigate to PDP
    const isCustom = Boolean(
      product.is_customizable ||
      product.is_customisable === '1' ||
      product.is_customisable === 1 ||
      product.product_type === 0 ||
      product.order_type === 'Customizable' ||
      (Array.isArray(product.product_types) && product.product_types.includes('CUSTOMIZABLE'))
    )

    if (isCustom) {
      handleOpenProduct(product)
      return
    }

    if (!currentUser) {
      openLoginPrompt({
        title: 'Sign In Required',
        message: 'Please login to continue.',
        actionDescription: 'proceed to Buy Now with this item',
        pendingAction: {
          type: 'BUY_NOW',
          productId: product.product_id || product.id,
          productName: product.product_name || product.title || 'Bespoke Item',
          product,
          pageUrl: window.location.href,
        },
      })
      return
    }

    const prodId = Number(product.product_id || product.id)
    const exists = cartItems.some((i) => Number(i.product_id || i.product?.id || i.id) === prodId)
    if (!exists) {
      await handleAddToCart(product, 1, null, null, false)
    }
    handleOpenCheckout()
  }

  const handleUpdateCartQuantity = async (cartItemId, newQty) => {
    if (!cartItemId && cartItemId !== 0) return

    const targetId = String(
      typeof cartItemId === 'object'
        ? cartItemId?.cart_item_id || cartItemId?.id || cartItemId?.product_id
        : cartItemId
    )

    if (newQty <= 0) {
      await handleRemoveCartItem(targetId)
      return
    }

    // 1. Immediately update UI state (works seamlessly for all users)
    setCartItems((prev) =>
      prev.map((i) => {
        const itemCartId = String(i.cart_item_id || '')
        const itemId = String(i.id || '')
        const itemProdId = String(i.product_id || '')
        if (itemCartId === targetId || itemId === targetId || itemProdId === targetId) {
          return { ...i, quantity: newQty }
        }
        return i
      })
    )

    // 2. If user is logged in, sync with database
    const userId = currentUser?.id
    if (userId) {
      try {
        await updateCartQuantityApi({
          userId,
          cartItemId: targetId,
          quantity: newQty,
        })
        const res = await getCart(userId)
        if (res?.status && Array.isArray(res.data)) {
          setCartItems(res.data)
        }
      } catch (err) {
        console.error('Failed to update cart quantity on backend:', err)
      }
    }
  }

  const handleRemoveCartItem = async (cartItemId) => {
    if (!cartItemId && cartItemId !== 0) return

    const targetId = String(
      typeof cartItemId === 'object'
        ? cartItemId?.cart_item_id || cartItemId?.id || cartItemId?.product_id
        : cartItemId
    )

    // 1. Immediately update UI state (works for both guests and authenticated users)
    setCartItems((prev) =>
      prev.filter((i) => {
        const itemCartId = String(i.cart_item_id || '')
        const itemId = String(i.id || '')
        const itemProdId = String(i.product_id || '')
        return itemCartId !== targetId && itemId !== targetId && itemProdId !== targetId
      })
    )

    // 2. If logged in, also deactivate from MySQL user_cart_items
    const userId = currentUser?.id
    if (userId) {
      try {
        await removeFromCartApi({
          userId,
          cartItemId: targetId,
        })
        const res = await getCart(userId)
        if (res?.status && Array.isArray(res.data)) {
          setCartItems(res.data)
        }
      } catch (err) {
        console.error('Failed to remove cart item from backend:', err)
      }
    }
  }

  const handleClearCart = async () => {
    // 1. Immediately empty UI state
    setCartItems([])

    // 2. If logged in, clear all active items in MySQL database
    const userId = currentUser?.id
    if (userId) {
      try {
        await clearCartApi(userId)
        const res = await getCart(userId)
        if (res?.status && Array.isArray(res.data)) {
          setCartItems(res.data)
        } else {
          setCartItems([])
        }
      } catch (err) {
        console.error('Failed to clear cart on backend:', err)
      }
    }
  }

  // Wishlist Actions - Guarded: Requires customer login before executing
  const handleToggleWishlist = async (productOrId, overrideUser = null) => {
    const user = overrideUser || currentUser
    const productId = Number(
      typeof productOrId === 'object' && productOrId !== null
        ? productOrId.product_id || productOrId.id
        : productOrId
    )

    if (!user) {
      openLoginPrompt({
        title: 'Sign In Required',
        message: 'Please login to continue.',
        actionDescription: 'save items to your wishlist',
        pendingAction: {
          type: 'TOGGLE_WISHLIST',
          productId,
          product: typeof productOrId === 'object' ? productOrId : { id: productId },
          pageUrl: window.location.href,
        },
      })
      return
    }

    const userId = user.id
    if (!productId) return

    const isCurrentlySaved = wishlistIds.includes(productId)

    if (isCurrentlySaved) {
      const newIds = wishlistIds.filter((id) => id !== productId)
      const newItems = wishlistItems.filter(
        (item) => Number(item.product_id || item.id) !== productId
      )
      setWishlistIds(newIds)
      setWishlistItems(newItems)
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
    }

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

  const handleRemoveWishlistItem = async (productIdOrId) => {
    if (!currentUser) {
      openLoginPrompt({
        title: 'Sign In Required',
        message: 'Please login to continue.',
        actionDescription: 'manage your wishlist',
      })
      return
    }

    const userId = currentUser.id
    const productId = Number(productIdOrId)
    const newIds = wishlistIds.filter((id) => id !== productId)
    const newItems = wishlistItems.filter(
      (item) => Number(item.product_id || item.id) !== productId
    )
    setWishlistIds(newIds)
    setWishlistItems(newItems)

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

  const handleMoveWishlistToCart = async (item) => {
    if (!currentUser) {
      openLoginPrompt({
        title: 'Sign In Required',
        message: 'Please login to continue.',
        actionDescription: 'move items to your bag',
        pendingAction: {
          type: 'ADD_TO_CART',
          productId: item.product_id || item.id,
          productName: item.product_name || item.title || 'Bespoke Item',
          product: item,
          quantity: 1,
          size: item.size || 'Standard',
          pageUrl: window.location.href,
        },
      })
      return
    }
    await handleAddToCart(item)
    await handleRemoveWishlistItem(item.product_id || item.id)
  }

  // Authentication Handlers
  const handleOpenAuth = (mode = 'login') => {
    openAuthModal(mode)
  }

  // Centralized Post-Login Action Continuation / Return-to-Action Executor
  const resumeAction = async (action, user) => {
    if (!action || !action.type || !user) return
    if (isExecutingPendingActionRef.current) return
    isExecutingPendingActionRef.current = true

    try {
      switch (action.type) {
        case 'ADD_TO_CART': {
          const productToAdd = action.product || {
            id: action.productId,
            product_id: action.productId,
            title: action.productName,
            product_name: action.productName,
            price_id: action.priceId,
            size: action.size,
            quantity: action.quantity,
            addons: action.addons,
            alteration: action.alteration,
            materialId: action.materialId,
            material: action.material,
          }
          await handleAddToCart(productToAdd, action.quantity || 1, action.size || null, user)
          break
        }

        case 'BUY_NOW': {
          const productToAdd = action.product || {
            id: action.productId,
            product_id: action.productId,
            title: action.productName,
            product_name: action.productName,
            price_id: action.priceId,
            size: action.size,
            quantity: action.quantity,
            addons: action.addons,
            alteration: action.alteration,
            materialId: action.materialId,
            material: action.material,
          }
          // 1. Add to cart with authenticated user
          await handleAddToCart(productToAdd, action.quantity || 1, action.size || null, user)
          // 2. Navigate straight to checkout page with item ready (do NOT redirect to cart page!)
          navigateTo('checkout', null)
          break
        }

        case 'TOGGLE_WISHLIST': {
          const prod = action.productId || action.product
          await handleToggleWishlist(prod, user)
          break
        }

        case 'CHECKOUT': {
          navigateTo('checkout', null)
          break
        }

        case 'VIEW_PROFILE': {
          navigateTo('orders', null)
          break
        }

        case 'NAVIGATE': {
          if (action.targetView === 'wishlist') {
            setIsWishlistOpen(true)
          } else if (action.targetView) {
            navigateTo(action.targetView, action.targetData || null)
          }
          break
        }

        case 'SAVE_MEASUREMENTS': {
          if (action.measurementData) {
            try {
              const payload = {
                user_id: user.id,
                profile_name: action.measurementData.profileName,
                gender: action.measurementData.selectedGender,
                measurements: Object.entries(action.measurementData.measurementValues || {}).map(
                  ([id, val]) => ({
                    measurement_id: id,
                    value: val,
                  })
                ),
              }
              await saveMeasurementProfile(payload)
              navigateTo('measurements', null)
            } catch (e) {
              console.error('Failed auto-saving measurements after login:', e)
              navigateTo('measurements', { initialData: action.measurementData })
            }
          } else {
            navigateTo('measurements', null)
          }
          break
        }

        case 'ADD_REVIEW': {
          if (action.productId) {
            navigateTo('product', {
              id: action.productId,
              autoOpenReview: true,
              initialReviewData: action.reviewData || null,
            })
          }
          break
        }

        default:
          console.warn('Unknown pending action type:', action.type)
          break
      }
    } catch (err) {
      console.error('Failed executing post-login resumed action:', err)
    } finally {
      isExecutingPendingActionRef.current = false
    }
  }

  const handleAuthSuccess = async (user) => {
    setCurrentUser(user)
    closeAuthModal()
    try {
      localStorage.setItem('bespoke_user', JSON.stringify(user))
    } catch (e) {
      console.error('Failed saving user to storage', e)
    }

    // 1. Synchronize user cart & wishlist from backend
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

    // 2. Consume and resume the pending action (if any)
    const action = consumePendingAction()
    if (action) {
      await resumeAction(action, user)
    }
  }

  const handleLogout = () => {
    logout()
    setCartItems([])
    setWishlistItems([])
    setWishlistIds([])
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
      if (!currentUser) {
        openLoginPrompt({
          title: 'Sign In Required',
          message: 'Please login to continue.',
          actionDescription: 'view your saved favourites',
          pendingAction: {
            type: 'NAVIGATE',
            targetView: 'wishlist',
            pageUrl: window.location.href,
          },
        })
      } else {
        setIsWishlistOpen(true)
      }
    } else if (tabId === 'profile') {
      if (!currentUser) {
        openLoginPrompt({
          title: 'Sign In Required',
          message: 'Please login to continue.',
          actionDescription: 'access your bespoke profile & orders',
          pendingAction: {
            type: 'VIEW_PROFILE',
            pageUrl: window.location.href,
          },
        })
      } else {
        handleOpenProfile()
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
        onOpenWishlist={handleOpenWishlist}
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
        onOpenNotifications={handleOpenNotifications}
        onOpenInvoices={handleOpenInvoices}
        onOpenPayments={handleOpenPayments}
        onOpenProfile={handleOpenProfile}
        onOpenHistory={handleOpenHistory}
        onOpenSupport={handleOpenChats}
        onCheckout={handleOpenCheckout}
        unreadNotificationsCount={unreadNotificationsCount}
        isCartOpen={isCartOpen}
        setIsCartOpen={(val) => {
          setIsCartOpen(val)
          if (!val && viewState.type === 'cart') {
            handleBack()
          }
        }}
        isWishlistOpen={isWishlistOpen}
        setIsWishlistOpen={setIsWishlistOpen}
      />

      {/* Main Content Area based on ViewState */}
      <main className="flex-1">
        <Suspense fallback={<PageLoadingAnimation message="Preparing atelier collection..." minHeight="min-h-[60vh]" />}>
          {isLoadingApi && viewState.type === 'home' ? (
          <PageLoadingAnimation
            message="Loading latest collections..."
            subMessage="Connecting to master ateliers & live inventory"
            minHeight="min-h-[60vh]"
          />
        ) : viewState.type === 'checkout' ? (
          /* Dedicated Checkout & Payment Page */
          <CheckoutPage
            currentUser={currentUser}
            cartItems={cartItems}
            onBack={handleBack}
            onOrderSuccess={handleOrderSuccess}
            onOpenAuth={handleOpenAuth}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveCartItem}
            onNavigate={(dest) => {
              if (dest === 'chats') handleOpenChats()
              else if (dest === 'measurements') handleOpenMeasurements()
              else if (dest === 'addresses') handleOpenAddresses()
              else if (dest === 'shop') handleOpenShop()
              else navigateTo(dest)
            }}
          />
        ) : viewState.type === 'order-confirmed' ? (
          /* Order Confirmation Celebration */
          <OrderConfirmedPage
            orderData={viewState.data}
            onContinueShopping={handleBackToHome}
            onTrackOrder={handleOpenOrderTracking}
          />
        ) : viewState.type === 'profile' ? (
          /* Bespoke Profile Dashboard */
          <ProfileDashboardPage
            currentUser={currentUser}
            onProfileSync={updateUser}
            onNavigate={(dest) => {
              if (dest === 'orders') handleOpenOrders()
              else if (dest === 'measurements') handleOpenMeasurements()
              else if (dest === 'edit-profile') handleOpenEditProfile()
              else if (dest === 'addresses') handleOpenAddresses()
              else if (dest === 'chats') handleOpenChats()
              else if (dest === 'notifications') handleOpenNotifications()
              else if (dest === 'invoices') handleOpenInvoices()
              else if (dest === 'payments') handleOpenPayments()
              else if (dest === 'settings') handleOpenSettings()
              else if (dest === 'contact-us') handleOpenContactUs()
              else if (dest === 'terms') handleOpenTerms()
              else if (dest === 'refund-policy') handleOpenRefundPolicy()
              else if (dest === 'privacy') handleOpenPrivacy()
              else if (dest === 'history') handleOpenHistory()
            }}
            onLogout={handleLogout}
            onOpenNotifications={handleOpenNotifications}
          />
        ) : viewState.type === 'edit-profile' ? (
          /* Edit Customer Profile */
          <EditProfilePage
            currentUser={currentUser}
            onBack={handleBack}
            onProfileUpdated={(updated) => {
              updateUser(updated)
            }}
          />
        ) : viewState.type === 'chats' ? (
          /* Concierge & Support Chat */
          <ChatsPage
            currentUser={currentUser}
            onBack={handleBack}
          />
        ) : viewState.type === 'notifications' ? (
          /* Customer Notifications Feed */
          <NotificationsPage
            currentUser={currentUser}
            onBack={handleBack}
            onNavigate={(dest) => {
              if (dest === 'chats') handleOpenChats()
              else if (dest === 'orders') handleOpenOrders()
              else if (dest === 'settings') handleOpenSettings()
            }}
            onOpenChats={handleOpenChats}
            onOpenOrderTracking={handleOpenOrderTracking}
            onOpenOrders={handleOpenOrders}
          />
        ) : viewState.type === 'invoices' ? (
          /* Customer Invoices & Receipts History */
          <InvoicesPage
            currentUser={currentUser}
            onBack={handleBack}
            onNavigate={navigateTo}
          />
        ) : viewState.type === 'payments' ? (
          /* Customer Saved Payments & Order Payment Records */
          <PaymentsPage
            currentUser={currentUser}
            onBack={handleBack}
            onNavigate={navigateTo}
            onOpenOrders={handleOpenOrders}
          />
        ) : viewState.type === 'settings' ? (
          /* Push Notifications & Settings */
          <SettingsPage
            currentUser={currentUser}
            onBack={handleBack}
          />
        ) : viewState.type === 'contact-us' ? (
          /* Customer Care & Contact */
          <ContactUsPage
            onBack={handleBack}
          />
        ) : viewState.type === 'terms' ? (
          /* Terms & Conditions */
          <TermsPage
            onBack={handleBack}
          />
        ) : viewState.type === 'refund-policy' ? (
          /* Returns & Refunds Policy */
          <RefundPolicyPage
            onBack={handleBack}
          />
        ) : viewState.type === 'privacy' ? (
          /* Privacy Policy */
          <PrivacyPolicyPage
            onBack={handleBack}
          />
        ) : viewState.type === 'history' ? (
          /* Complete Customer Browsing History */
          <BrowsingHistoryPage
            currentUser={currentUser}
            onBack={handleBack}
            onSelectProduct={handleOpenProduct}
            onAddToCart={handleAddToCart}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            cartItems={cartItems}
            onOpenCart={() => setIsCartOpen(true)}
            onBuyNow={handleBuyNow}
            onExploreProducts={handleBackToHome}
          />
        ) : viewState.type === 'orders' ? (
          /* Customer Orders History */
          <OrdersPage
            currentUser={currentUser}
            onBack={handleBack}
            onSelectOrder={handleOpenOrderTracking}
            onOpenAuth={handleOpenAuth}
            onContinueShopping={handleBackToHome}
            onOpenSupport={handleOpenChats}
            onOpenVendorChat={handleOpenOrderVendorChat}
            onSelectProduct={handleOpenProduct}
          />
        ) : viewState.type === 'order-tracking' ? (
          /* Live Order Tracking Timeline */
          <OrderTrackingPage
            key={`ord-${viewState.data?.orderId || viewState.data?.id || window.location.pathname}`}
            orderId={viewState.data?.orderId || viewState.data?.id}
            currentUser={currentUser}
            onBack={handleBack}
            onOpenSupport={handleOpenChats}
            onOpenVendorChat={handleOpenOrderVendorChat}
          />
        ) : viewState.type === 'order-vendor-chat' ? (
          /* Order-Specific Artisan/Vendor Chat */
          <OrderVendorChatPage
            key={`ord-chat-${viewState.data?.saleOrderId || viewState.data?.sale_order_id || viewState.data?.orderId || viewState.data?.id}`}
            saleOrderId={viewState.data?.saleOrderId || viewState.data?.sale_order_id || viewState.data?.orderId || viewState.data?.id}
            initialOrder={viewState.data}
            currentUser={currentUser}
            onBack={handleBack}
          />
        ) : viewState.type === 'addresses' ? (
          /* Delivery Addresses Manager */
          <AddressesPage
            currentUser={currentUser}
            onBack={handleBack}
            onOpenAuth={handleOpenAuth}
            selectMode={viewState.data?.selectMode}
            onSelectAddress={viewState.data?.onSelectAddress}
          />
        ) : viewState.type === 'measurements' ? (
          /* Custom Tailoring Measurements */
          <MeasurementsPage
            currentUser={currentUser}
            onBack={handleBack}
            onOpenAuth={handleOpenAuth}
            onOpenLoginPrompt={openLoginPrompt}
            initialData={viewState.data?.initialData || null}
            selectMode={viewState.data?.selectMode}
            onSelectProfile={viewState.data?.onSelectProfile}
          />
        ) : viewState.type === 'product' ? (
          /* Dedicated Product Detail Page */
          <ProductDetailPage
            key={`pdp-${viewState.data?.id || viewState.data?.product_id || window.location.pathname}`}
            productId={viewState.data?.id || viewState.data?.product_id}
            initialProduct={viewState.data}
            currentUser={currentUser}
            onBack={handleBack}
            onAddToCart={handleAddToCart}
            onSelectProduct={handleOpenProduct}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            onOpenLoginPrompt={openLoginPrompt}
            onOpenAuth={openAuthModal}
            onOpenCheckout={handleOpenCheckout}
            cartItems={cartItems}
            onOpenCart={() => setIsCartOpen(true)}
            onOpenHistory={handleOpenHistory}
          />
        ) : viewState.type === 'category' ? (
          /* Dedicated Category & Subcategories Page */
          <CategoryPage
            key={`cat-${viewState.data?.id || viewState.data?.category_id || window.location.pathname}`}
            category={viewState.data}
            departments={homeData.departments}
            allCategories={homeData.allCategories}
            onNavigateCategory={handleOpenCategory}
            onNavigateSubcategory={handleOpenSubcategory}
            onBack={handleBack}
            onSelectProduct={handleOpenProduct}
            onAddToCart={handleAddToCart}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            cartItems={cartItems}
            onOpenCart={() => setIsCartOpen(true)}
            onBuyNow={handleBuyNow}
          />
        ) : viewState.type === 'designer' ? (
          /* Dedicated Designer Page */
          <DesignerPage
            key={`des-${viewState.data?.id || viewState.data?.designer_id || window.location.pathname}`}
            designer={viewState.data}
            onBack={handleBack}
            onSelectProduct={handleOpenProduct}
            onAddToCart={handleAddToCart}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            cartItems={cartItems}
            onOpenCart={() => setIsCartOpen(true)}
            onBuyNow={handleBuyNow}
          />
        ) : viewState.type === 'deals' ? (
          /* Dedicated Top Current Deals Page */
          <DealsPage
            key="deals-current"
            type="current-deals"
            onBack={handleBack}
            onSelectProduct={handleOpenProduct}
          />
        ) : viewState.type === 'super-saver-deals' ? (
          /* Dedicated Super Saver Deals Page */
          <DealsPage
            key="deals-super-saver"
            type="super-saver-deals"
            onBack={handleBack}
            onSelectProduct={handleOpenProduct}
          />
        ) : viewState.type === 'designers' ? (
          /* Dedicated Top Designers Listing Page */
          <DesignersListingPage
            key="listing-designers"
            onBack={handleBack}
            onSelectDesigner={handleOpenDesigner}
          />
        ) : viewState.type === 'categories' ? (
          /* Dedicated All Categories Listing Page */
          <CategoriesListingPage
            key="listing-categories"
            onBack={handleBack}
            onSelectCategory={handleOpenCategory}
            onSelectSubcategory={handleOpenSubcategory}
          />
        ) : viewState.type === 'shops' ? (
          /* Dedicated Boutiques Listing Page */
          <ShopsListingPage
            key="listing-shops"
            onBack={handleBack}
            onSelectShop={handleOpenShop}
          />
        ) : viewState.type === 'shop' ? (
          /* Dedicated Boutique Shop Page */
          <ShopPage
            key={`shop-${viewState.data?.id || viewState.data?.shop_id || window.location.pathname}`}
            shop={viewState.data}
            onBack={handleBack}
            onSelectProduct={handleOpenProduct}
            onAddToCart={handleAddToCart}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            cartItems={cartItems}
            onOpenCart={() => setIsCartOpen(true)}
            onBuyNow={handleBuyNow}
          />
        ) : viewState.type === 'search' ? (
          /* Dedicated Global Search Results Page */
          <SearchResultsPage
            key={`search-${viewState.data?.query || viewState.data?.q || 'all'}`}
            query={viewState.data?.query || viewState.data?.q || ''}
            products={homeData.products}
            allCategories={homeData.allCategories}
            onBack={handleBack}
            onSelectProduct={handleOpenProduct}
            onAddToCart={handleAddToCart}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            cartItems={cartItems}
            onOpenCart={() => setIsCartOpen(true)}
            onBuyNow={handleBuyNow}
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

            {/* Section 2b: Recently Viewed Products Carousel */}
            <RecentlyViewedSection
              userId={currentUser?.id}
              variant="bespoke"
              onSelectProduct={handleOpenProduct}
              onAddToCart={handleAddToCart}
              wishlistIds={wishlistIds}
              onToggleWishlist={handleToggleWishlist}
              cartItems={cartItems}
              onOpenCart={() => setIsCartOpen(true)}
              onBuyNow={handleBuyNow}
              onOpenHistory={handleOpenHistory}
            />

            {/* Section 3: Shops In Spotlight (Screenshot 1 & 2) */}
            <SpotlightShopsSection
              spotlights={homeData.spotlights}
              variant={hasRecentlyViewed ? 'white' : 'bespoke'}
              onSelectShop={handleOpenShop}
              onViewAll={handleOpenAllShops}
            />

            {/* Section 4: Top Designers (Screenshot 2) */}
            <TopDesignersSection
              designers={homeData.designers}
              variant={hasRecentlyViewed ? 'bespoke' : 'white'}
              onSelectDesigner={handleOpenDesigner}
              onViewAll={handleOpenAllDesigners}
            />

            {/* Section 5: Top Current Deals (Screenshot 2) */}
            <CurrentDealsSection
              deals={homeData.currentDeals}
              variant={hasRecentlyViewed ? 'white' : 'bespoke'}
              onSelectDeal={(deal) => {
                const prodId = deal.product_id || deal.product?.id || deal.id
                handleOpenProduct({
                  ...(deal.product || {}),
                  ...deal,
                  vendor_name: deal.vendor_name || deal.vendor?.shop_name,
                  vendor: deal.vendor,
                  id: prodId,
                  product_id: prodId,
                })
              }}
              onViewAll={handleOpenAllDeals}
            />

            {/* Section 6: SUPER SAVER DEALS (Screenshot 3) */}
            <SuperSaverDealsSection
              deals={homeData.superSaverDeals}
              variant={hasRecentlyViewed ? 'bespoke' : 'white'}
              onSelectDeal={(deal) => {
                const prodId = deal.product_id || deal.product?.id || deal.id
                handleOpenProduct({
                  ...(deal.product || {}),
                  ...deal,
                  vendor_name: deal.vendor_name || deal.vendor?.shop_name,
                  vendor: deal.vendor,
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
              cartItems={cartItems}
              onOpenCart={() => setIsCartOpen(true)}
              onBuyNow={handleBuyNow}
            />
          </div>
        )}
        </Suspense>
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
                UPI, Cards, NetBanking, Wallets
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer (Hidden on live chat views for dedicated full-height experience) */}
      {!['chats', 'order-vendor-chat'].includes(viewState.type) && (
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
      )}

      {/* Mobile Bottom Tab Bar */}
      <BottomTabBar
        activeTab={activeBottomTab}
        onTabChange={handleBottomTabChange}
        cartCount={cartItems.reduce((acc, i) => acc + (i.quantity || 1), 0)}
        wishlistCount={wishlistIds.length}
        userAvatar={formatImageUrl(currentUser?.img_path || currentUser?.avatar)}
      />

      {/* Reusable Login Prompt Dialog ("Please login to continue.") */}
      <LoginPromptModal
        isOpen={isLoginPromptOpen}
        onClose={() => closeLoginPrompt(true)}
        onLogin={() => {
          closeLoginPrompt(false)
          openAuthModal('login')
        }}
        title={loginPromptOptions.title}
        message={loginPromptOptions.message}
        actionDescription={loginPromptOptions.actionDescription}
      />

      {/* Customer Authentication Modal (Sign In / Register / Forgot Password) */}
      <AuthModal
        key={`${authModalMode}-${isAuthModalOpen}`}
        isOpen={isAuthModalOpen}
        onClose={() => closeAuthModal(true)}
        initialMode={authModalMode}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Real-time Support Chat & Notification Floating Toast Banner */}
      {incomingSupportToast && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-20 right-4 z-50 max-w-sm w-full bg-neutral-900/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-neutral-700/80 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#D6007A] to-pink-500 flex items-center justify-center shrink-0 shadow-md">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h5 className="text-xs font-bold text-pink-400">
                {incomingSupportToast.title || 'Bespoke Support'}
              </h5>
              <button
                type="button"
                onClick={() => setIncomingSupportToast(null)}
                className="text-neutral-400 hover:text-white p-0.5 rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
                aria-label="Dismiss toast"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-neutral-200 mt-1 line-clamp-2 font-medium">
              {incomingSupportToast.message}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIncomingSupportToast(null)
                  handleOpenChats()
                }}
                className="px-3 py-1 bg-gradient-to-r from-[#D6007A] to-pink-600 hover:from-[#b50067] hover:to-pink-700 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer shadow-xs active:scale-95"
              >
                Open Chat
              </button>
              <button
                type="button"
                onClick={() => setIncomingSupportToast(null)}
                className="px-2 py-1 text-neutral-400 hover:text-white text-[11px] font-medium transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}
