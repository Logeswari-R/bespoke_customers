import React, { useState, useRef, useEffect } from 'react'
import {
  User,
  Package,
  Heart,
  HelpCircle,
  LogIn,
  LogOut,
  ChevronRight,
  ShieldCheck,
  MapPin,
  Ruler,
} from 'lucide-react'

export default function UserMenu({
  currentUser = null,
  onOpenAuthModal,
  onLogout,
  onOpenWishlist,
  onOpenOrders,
  onOpenAddresses,
  onOpenMeasurements,
  onOpenSupport,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)
  const closeTimeoutRef = useRef(null)

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
    }
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 250) // 250ms buffer so moving cursor from icon to menu never closes unexpectedly
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    }
  }, [])

  const displayName = currentUser?.username || currentUser?.name || 'Customer'
  const displayEmail = currentUser?.email || currentUser?.mobile || ''

  return (
    <div
      ref={menuRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex flex-col items-center justify-center p-1 text-neutral-700 hover:text-black transition-colors cursor-pointer group"
        aria-label="User Account"
        aria-expanded={isOpen}
      >
        <div className="relative">
          <User className="w-5 h-5 group-hover:scale-105 transition-transform" />
          {currentUser && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white" />
          )}
        </div>
        <span className="text-[10px] font-bold tracking-tight mt-0.5 hidden lg:block truncate max-w-[64px]">
          {currentUser ? displayName.split(' ')[0] : 'Profile'}
        </span>
      </button>

      {/* Account Popover Menu - Positioned immediately adjacent to the icon with an invisible bridge */}
      {isOpen && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="absolute right-0 top-full pt-1.5 w-72 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* Invisible hover bridge to eliminate any gap between trigger and popover */}
          <div className="absolute -top-3 left-0 right-0 h-4 bg-transparent pointer-events-auto" />

          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden">
            {currentUser ? (
              /* Logged In Header */
              <div className="p-4 bg-gradient-to-br from-pink-50/60 via-purple-50/40 to-neutral-50 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-theme-gradient text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-neutral-900 truncate">
                      {displayName}
                    </h4>
                    <p className="text-xs text-neutral-500 truncate mt-0.5">
                      {displayEmail}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-neutral-200/50 flex items-center justify-between text-[11px] text-neutral-600 font-medium">
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Account
                  </span>
                  <span className="text-neutral-400">ID #{currentUser.id}</span>
                </div>
              </div>
            ) : (
              /* Logged Out Welcome Header */
              <div className="p-4 bg-gradient-to-br from-neutral-50 to-neutral-100 border-b border-neutral-100">
                <h4 className="text-sm font-bold text-neutral-900">Welcome to Bespoke</h4>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Access your orders, wishlist & recommendations
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      if (onOpenAuthModal) onOpenAuthModal('login')
                    }}
                    className="flex-1 py-1.5 px-3 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      if (onOpenAuthModal) onOpenAuthModal('register')
                    }}
                    className="flex-1 py-1.5 px-3 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Register
                  </button>
                </div>
              </div>
            )}

            <div className="py-2 text-xs divide-y divide-neutral-50">
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    if (onOpenOrders) onOpenOrders()
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-neutral-50 text-neutral-700 hover:text-black transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Package className="w-4 h-4 text-neutral-500" />
                    <span className="font-medium">My Orders & Returns</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    if (onOpenWishlist) onOpenWishlist()
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-neutral-50 text-neutral-700 hover:text-black transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Heart className="w-4 h-4 text-neutral-500" />
                    <span className="font-medium">Wishlist</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    if (onOpenAddresses) onOpenAddresses()
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-neutral-50 text-neutral-700 hover:text-black transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-neutral-500" />
                    <span className="font-medium">Delivery Addresses</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    if (onOpenMeasurements) onOpenMeasurements()
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-neutral-50 text-neutral-700 hover:text-black transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Ruler className="w-4 h-4 text-neutral-500" />
                    <span className="font-medium">Custom Measurements</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />
                </button>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    if (onOpenSupport) onOpenSupport()
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-neutral-50 text-neutral-700 hover:text-black transition-colors text-left cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-neutral-500" />
                  <span className="font-medium">Atelier Support & FAQs</span>
                </button>
              </div>

              {currentUser && (
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      if (onLogout) onLogout()
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-pink-50 text-red-600 transition-colors text-left cursor-pointer font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
