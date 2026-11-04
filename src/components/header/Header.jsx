import React, { useState, useRef, useEffect, useCallback } from 'react'
import TopBar from './TopBar'
import MainHeader from './MainHeader'
import Navbar from './Navbar'
import MegaMenu from './MegaMenu'
import MobileMenu from './MobileMenu'
import CartDrawer from './CartDrawer'
import WishlistDrawer from './WishlistDrawer'
import TrackOrderModal from './TrackOrderModal'
import CustomerSupportModal from './CustomerSupportModal'

export default function Header({
  navigationCategories,
  selectedCategory,
  onSelectCategory,
  onSelectSubcategory,
  onSearch,
  cartItems = [],
  onUpdateCartQuantity,
  onRemoveCartItem,
  onClearCart,
  wishlistItems = [],
  wishlistIds = [],
  onOpenWishlist,
  onRemoveWishlistItem,
  onMoveWishlistToCart,
  onSelectProduct,
  onLogoClick,
  currentUser = null,
  onOpenAuthModal,
  onLogout,
  products = [],
  onOpenOrders,
  onOpenAddresses,
  onOpenMeasurements,
  onOpenSupport,
  onCheckout,
  isCartOpen: externalCartOpen,
  setIsCartOpen: externalSetCartOpen,
  isWishlistOpen: externalWishlistOpen,
  setIsWishlistOpen: externalSetWishlistOpen,
}) {
  // Mega menu hover state
  const [activeCategory, setActiveCategory] = useState(null)
  const hoverTimeoutRef = useRef(null)

  // Modals & Drawers state (internal fallback if not controlled externally)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [internalCartOpen, setInternalCartOpen] = useState(false)
  const [internalWishlistOpen, setInternalWishlistOpen] = useState(false)
  const [isTrackOrderOpen, setIsTrackOrderOpen] = useState(false)
  const [isSupportOpen, setIsSupportOpen] = useState(false)

  const isCartOpen = externalCartOpen !== undefined ? externalCartOpen : internalCartOpen
  const setIsCartOpen = externalSetCartOpen || setInternalCartOpen

  const isWishlistOpen = externalWishlistOpen !== undefined ? externalWishlistOpen : internalWishlistOpen
  const setIsWishlistOpen = externalSetWishlistOpen || setInternalWishlistOpen

  const handleTriggerWishlist = () => {
    if (onOpenWishlist) onOpenWishlist()
    setIsWishlistOpen(true)
  }

  // Search query state
  const [searchQuery, setSearchQuery] = useState('')

  // Sticky header shadow on scroll
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close everything on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveCategory(null)
        setIsMobileMenuOpen(false)
        setIsCartOpen(false)
        setIsWishlistOpen(false)
        setIsTrackOrderOpen(false)
        setIsSupportOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setIsCartOpen, setIsWishlistOpen])

  // Hover handlers with debounce / buffer so moving to dropdown doesn't flicker or close
  const handleCategoryHover = useCallback((cat) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setActiveCategory(cat)
  }, [])

  const handleNavMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveCategory(null)
    }, 180) // 180ms buffer window
  }, [])

  const handleDropdownMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
  }, [])

  const handleDropdownMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveCategory(null)
    }, 150)
  }, [])

  const handleCategoryClick = (cat) => {
    // If click happens, also update parent selection and close dropdown
    setActiveCategory(null)
    if (onSelectCategory) {
      onSelectCategory(cat)
    }
  }

  const handleSubcategorySelect = (item) => {
    setActiveCategory(null)
    if (onSelectSubcategory) {
      onSelectSubcategory(item)
    }
  }

  const handleSearchSelect = (searchPayload) => {
    if (onSearch) {
      onSearch(searchPayload)
    }
  }

  return (
    <header
      className={`sticky top-0 z-40 w-full bg-white transition-shadow duration-300 ${
        isScrolled ? 'shadow-md border-neutral-200' : 'shadow-xs border-neutral-100'
      }`}
    >
      {/* 1. Top Utility Bar */}
      <TopBar
        onOpenTrackOrder={onOpenOrders || (() => setIsTrackOrderOpen(true))}
        onOpenSupport={onOpenSupport || (() => setIsSupportOpen(true))}
      />

      {/* 2. Main Header */}
      <MainHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSelectSearch={handleSearchSelect}
        products={products}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
        wishlistCount={wishlistIds.length || wishlistItems.length}
        cartCount={cartItems.reduce((acc, i) => acc + (i.quantity || 1), 0)}
        onOpenWishlist={handleTriggerWishlist}
        onLogoClick={onLogoClick}
        currentUser={currentUser}
        onOpenAuthModal={onOpenAuthModal}
        onLogout={onLogout}
        onOpenOrders={onOpenOrders}
        onOpenAddresses={onOpenAddresses}
        onOpenMeasurements={onOpenMeasurements}
        onOpenSupport={onOpenSupport || (() => setIsSupportOpen(true))}
      />

      {/* 3. Category Navigation Bar (Desktop) */}
      <Navbar
        categories={navigationCategories}
        activeCategory={activeCategory}
        selectedCategory={selectedCategory}
        onCategoryHover={handleCategoryHover}
        onCategoryClick={handleCategoryClick}
        onNavMouseLeave={handleNavMouseLeave}
      />

      {/* 4. Full-width Interactive Mega Menu Dropdown */}
      <MegaMenu
        category={activeCategory}
        isOpen={Boolean(activeCategory)}
        onMouseEnter={handleDropdownMouseEnter}
        onMouseLeave={handleDropdownMouseLeave}
        onSelectSubcategory={handleSubcategorySelect}
      />

      {/* 5. Mobile Navigation Drawer */}
      <MobileMenu
        categories={navigationCategories}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onSelectCategory={handleCategoryClick}
        onSelectSubcategory={handleSubcategorySelect}
        onOpenCart={() => setIsCartOpen(true)}
        wishlistCount={wishlistIds.length || wishlistItems.length}
        cartCount={cartItems.reduce((acc, i) => acc + (i.quantity || 1), 0)}
        onOpenTrackOrder={() => setIsTrackOrderOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)}
      />

      {/* 6. Shopping Bag Slide-Over Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={onUpdateCartQuantity}
        onRemoveItem={onRemoveCartItem}
        onClearCart={onClearCart}
        onCheckout={() => {
          setIsCartOpen(false)
          if (onCheckout) onCheckout()
        }}
      />

      {/* 6b. Luxury Wishlist Slide-Over Drawer */}
      <WishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlistItems={wishlistItems}
        onRemoveItem={onRemoveWishlistItem}
        onMoveToCart={onMoveWishlistToCart}
        onSelectProduct={onSelectProduct}
      />

      {/* 7. Track Order Modal */}
      <TrackOrderModal
        isOpen={isTrackOrderOpen}
        onClose={() => setIsTrackOrderOpen(false)}
      />

      {/* 8. Customer Support Modal */}
      <CustomerSupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />
    </header>
  )
}

