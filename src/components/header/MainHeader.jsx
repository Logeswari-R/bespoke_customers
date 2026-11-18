import React, { useState } from 'react'
import {
  Menu,
  Heart,
  ShoppingBag,
  Search,
  X,
} from 'lucide-react'
import SearchBar from './SearchBar'
import UserMenu from './UserMenu'
import BrandLogo from './BrandLogo'

export default function MainHeader({
  searchQuery,
  setSearchQuery,
  onSelectSearch,
  onOpenMobileMenu,
  onOpenCart,
  wishlistCount = 0,
  cartCount = 0,
  onOpenWishlist,
  onLogoClick,
  currentUser = null,
  onOpenAuthModal,
  onLogout,
  products = [],
  onOpenOrders,
  onOpenAddresses,
  onOpenMeasurements,
  onOpenNotifications,
  onOpenInvoices,
  onOpenPayments,
  onOpenSupport,
  onOpenProfile,
  onOpenHistory,
  unreadNotificationsCount = null,
}) {
  const [showMobileSearch, setShowMobileSearch] = useState(false)

  return (
    <div className="bg-white border-b border-neutral-100 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4 lg:gap-8">
          {/* Left: Mobile hamburger menu & Official Brand Logo */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="md:hidden p-2 -ml-2 text-neutral-700 hover:text-black rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
              aria-label="Open mobile navigation menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Brand Logo with Emblem & Cursive Tagline */}
            <BrandLogo onClick={onLogoClick} />
          </div>

          {/* Center: Search Bar (Desktop) */}
          <div className="hidden md:flex flex-1 justify-center max-w-xl">
            <SearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSelectSearch={onSelectSearch}
              products={products}
            />
          </div>

          {/* Right Action Icons: Mobile Search Toggle, Account, Wishlist, Cart */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Mobile Search Toggle */}
            <button
              type="button"
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="md:hidden p-2 text-neutral-700 hover:text-black hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
              aria-label="Toggle mobile search"
            >
              {showMobileSearch ? (
                <X className="w-5 h-5" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </button>

            {/* Account Profile Popover */}
            <UserMenu
              currentUser={currentUser}
              onOpenAuthModal={onOpenAuthModal}
              onLogout={onLogout}
              onOpenWishlist={onOpenWishlist}
              onOpenOrders={onOpenOrders}
              onOpenAddresses={onOpenAddresses}
              onOpenMeasurements={onOpenMeasurements}
              onOpenNotifications={onOpenNotifications}
              onOpenInvoices={onOpenInvoices}
              onOpenPayments={onOpenPayments}
              onOpenSupport={onOpenSupport}
              onOpenProfile={onOpenProfile}
              onOpenHistory={onOpenHistory}
              unreadNotificationsCount={unreadNotificationsCount}
            />

            {/* Wishlist Icon */}
            <button
              type="button"
              onClick={onOpenWishlist}
              className="flex flex-col items-center justify-center p-1 sm:p-1.5 text-neutral-700 hover:text-black transition-colors relative cursor-pointer group"
              aria-label="View Wishlist"
            >
              <div className="relative">
                <Heart className="w-5 h-5 group-hover:scale-105 transition-transform" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 bg-[#C00078] text-white text-[10px] font-semibold rounded-full flex items-center justify-center shadow-xs">
                    {wishlistCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold tracking-tight mt-0.5 hidden lg:block">
                Wishlist
              </span>
            </button>

            {/* Shopping Bag / Cart Icon */}
            <button
              type="button"
              onClick={onOpenCart}
              className="flex flex-col items-center justify-center p-1 sm:p-1.5 text-neutral-700 hover:text-black transition-colors relative cursor-pointer group"
              aria-label="View Shopping Bag"
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5 group-hover:scale-105 transition-transform" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 bg-[#C00078] text-white text-[10px] font-semibold rounded-full flex items-center justify-center shadow-xs animate-in zoom-in-75">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold tracking-tight mt-0.5 hidden lg:block">
                Bag
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Search Overlay Bar */}
        {showMobileSearch && (
          <div className="md:hidden pb-3 pt-1 border-t border-neutral-100 animate-in fade-in slide-in-from-top-1">
            <SearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSelectSearch={onSelectSearch}
              products={products}
              isMobile={true}
              onCloseMobileSearch={() => setShowMobileSearch(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

