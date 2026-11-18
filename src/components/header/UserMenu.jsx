import React, { useState, useRef, useEffect } from 'react'
import {
  User,
  Package,
  Heart,
  HelpCircle,
  LogOut,
  ChevronRight,
  MapPin,
  Ruler,
  Bell,
  Clock,
  CreditCard,
} from 'lucide-react'
import { formatImageUrl, getUnreadNotificationCountApi } from '../../services/api'

export default function UserMenu({
  currentUser = null,
  onOpenAuthModal,
  onLogout,
  onOpenWishlist,
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
  const [isOpen, setIsOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [internalUnreadCount, setInternalUnreadCount] = useState(
    unreadNotificationsCount !== null && unreadNotificationsCount !== undefined
      ? Number(unreadNotificationsCount) || 0
      : 0
  )
  const menuRef = useRef(null)
  const closeTimeoutRef = useRef(null)

  useEffect(() => {
    if (unreadNotificationsCount !== null && unreadNotificationsCount !== undefined) {
      setInternalUnreadCount(Number(unreadNotificationsCount) || 0)
    }
  }, [unreadNotificationsCount])

  const unreadCount = internalUnreadCount

  useEffect(() => {
    const targetUserId = currentUser?.id || currentUser?.user_id
    if (!targetUserId) {
      setInternalUnreadCount(0)
      return
    }

    let isMounted = true
    const fetchUnread = async () => {
      try {
        const count = await getUnreadNotificationCountApi({
          recipientType: 'user',
          recipientId: targetUserId,
        })
        if (isMounted) setInternalUnreadCount(count || 0)
      } catch {
        // non-blocking
      }
    }

    fetchUnread()
    const timer = setInterval(fetchUnread, 30000)
    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [currentUser?.id, currentUser?.user_id])

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    const targetUserId = currentUser?.id || currentUser?.user_id
    if (targetUserId) {
      getUnreadNotificationCountApi({ recipientType: 'user', recipientId: targetUserId })
        .then((count) => setInternalUnreadCount(Number(count) || 0))
        .catch(() => {})
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
  const userAvatar = formatImageUrl(
    currentUser?.img_path ||
    currentUser?.avatar ||
    currentUser?.image ||
    currentUser?.profile_image ||
    currentUser?.user_image
  )

  useEffect(() => {
    setImgError(false)
  }, [userAvatar])

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
          {userAvatar && !imgError ? (
            <img
              src={userAvatar}
              alt={displayName}
              onError={() => setImgError(true)}
              className="w-6 h-6 rounded-full object-cover ring-1 ring-neutral-200 group-hover:ring-[#D6007A] transition-all shadow-2xs"
            />
          ) : (
            <User className="w-5 h-5 group-hover:scale-105 transition-transform" />
          )}
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
          className="absolute right-0 top-full pt-1.5 w-56 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* Invisible hover bridge to eliminate any gap between trigger and popover */}
          <div className="absolute -top-3 left-0 right-0 h-4 bg-transparent pointer-events-auto" />

          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-neutral-100 overflow-hidden ring-1 ring-black/5">
            {currentUser ? (
              /* Compact Logged In Header */
              <div
                onClick={() => {
                  setIsOpen(false)
                  if (onOpenProfile) onOpenProfile()
                }}
                className="p-3 bg-gradient-to-r from-pink-50/70 via-purple-50/30 to-neutral-50 border-b border-neutral-100 cursor-pointer hover:bg-pink-50 transition-colors group"
                title="View Profile Dashboard"
              >
                <div className="flex items-center gap-2.5">
                  {userAvatar && !imgError ? (
                    <img
                      src={userAvatar}
                      alt={displayName}
                      onError={() => setImgError(true)}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-pink-300 shadow-2xs shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#D6007A] to-[#9E1478] text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-neutral-900 truncate group-hover:text-[#D6007A] transition-colors leading-tight">
                      {displayName}
                    </h4>
                    <p className="text-[10px] text-neutral-500 group-hover:text-[#D6007A] transition-colors truncate mt-0.5 flex items-center gap-0.5 font-medium">
                      <span>View Profile</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Compact Logged Out Header */
              <div className="p-3 bg-neutral-50/80 border-b border-neutral-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-neutral-900">Welcome</span>
                  <span className="text-[10px] text-neutral-400">Guest</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      if (onOpenAuthModal) onOpenAuthModal('login')
                    }}
                    className="py-1.5 px-2 bg-neutral-900 hover:bg-black text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer text-center"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      if (onOpenAuthModal) onOpenAuthModal('register')
                    }}
                    className="py-1.5 px-2 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-800 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer text-center"
                  >
                    Register
                  </button>
                </div>
              </div>
            )}

            {/* Compact Menu Items */}
            <div className="p-1.5 space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  if (onOpenOrders) onOpenOrders()
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-700 hover:text-[#D6007A] hover:bg-pink-50/60 transition-colors text-left cursor-pointer group"
              >
                <Package className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#D6007A] transition-colors shrink-0" />
                <span>Orders</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  if (onOpenWishlist) onOpenWishlist()
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-700 hover:text-[#D6007A] hover:bg-pink-50/60 transition-colors text-left cursor-pointer group"
              >
                <Heart className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#D6007A] transition-colors shrink-0" />
                <span>Wishlist</span>
              </button>

              {currentUser && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      if (onOpenMeasurements) onOpenMeasurements()
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-700 hover:text-[#D6007A] hover:bg-pink-50/60 transition-colors text-left cursor-pointer group"
                  >
                    <Ruler className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#D6007A] transition-colors shrink-0" />
                    <span>Measurements</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      if (onOpenAddresses) onOpenAddresses()
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-700 hover:text-[#D6007A] hover:bg-pink-50/60 transition-colors text-left cursor-pointer group"
                  >
                    <MapPin className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#D6007A] transition-colors shrink-0" />
                    <span>Addresses</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      if (onOpenNotifications) onOpenNotifications()
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-700 hover:text-[#D6007A] hover:bg-pink-50/60 transition-colors text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Bell className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#D6007A] transition-colors shrink-0" />
                      <span>Notifications</span>
                    </div>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-pink-100 text-[#D6007A] rounded-full leading-none">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      if (onOpenPayments) onOpenPayments()
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-700 hover:text-[#D6007A] hover:bg-pink-50/60 transition-colors text-left cursor-pointer group"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#D6007A] transition-colors shrink-0" />
                    <span>Payments</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  if (onOpenHistory) onOpenHistory()
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-700 hover:text-[#D6007A] hover:bg-pink-50/60 transition-colors text-left cursor-pointer group"
              >
                <Clock className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#D6007A] transition-colors shrink-0" />
                <span>History</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  if (onOpenSupport) onOpenSupport()
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-700 hover:text-[#D6007A] hover:bg-pink-50/60 transition-colors text-left cursor-pointer group"
              >
                <HelpCircle className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#D6007A] transition-colors shrink-0" />
                <span>Help & Support</span>
              </button>

              {currentUser && (
                <>
                  <div className="my-1 border-t border-neutral-100" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      if (onLogout) onLogout()
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors text-left cursor-pointer group"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500 group-hover:text-rose-600 transition-colors shrink-0" />
                    <span>Sign Out</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
