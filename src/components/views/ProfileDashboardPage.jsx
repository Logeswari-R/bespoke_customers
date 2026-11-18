import React, { useState, useEffect } from 'react'
import {
  ShoppingBag,
  Ruler,
  User,
  MapPin,
  MessageCircle,
  Settings,
  Headphones,
  FileText,
  CreditCard,
  RotateCcw,
  ShieldCheck,
  LogOut,
  Trash2,
  ChevronRight,
  Bell,
  AlertTriangle,
  Loader2,
  Sparkles,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { getUserProfile, deleteUserAccountApi, formatImageUrl } from '../../services/api'

export default function ProfileDashboardPage({
  currentUser,
  onNavigate,
  onLogout,
  onOpenNotifications,
  onProfileSync,
}) {
  const [profileData, setProfileData] = useState(currentUser)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState(null)

  // Fetch fresh profile details from backend
  useEffect(() => {
    let ignore = false
    const userId = currentUser?.id
    if (!userId) return

    async function loadProfile() {
      try {
        const data = await getUserProfile(userId)
        if (!ignore && data) {
          setProfileData((prev) => ({ ...(prev || {}), ...data }))
          if (onProfileSync) {
            onProfileSync(data)
          }
        }
      } catch (err) {
        console.error('Failed to load fresh profile:', err)
      }
    }

    loadProfile()
    return () => {
      ignore = true
    }
  }, [currentUser?.id, onProfileSync])

  const displayName = profileData?.username || profileData?.name || currentUser?.username || currentUser?.name || 'Customer'
  const displayEmail = profileData?.email || currentUser?.email || ''
  const displayAvatar = formatImageUrl(profileData?.img_path || profileData?.avatar || currentUser?.avatar)

  // Handle Account Deletion
  const handleConfirmDelete = async () => {
    if (!currentUser?.id) return
    setIsDeleting(true)
    try {
      const res = await deleteUserAccountApi(currentUser.id)
      if (res.status === 'true' || res.status === true) {
        setFeedbackMsg({ type: 'success', text: 'Account deleted successfully. Logging you out...' })
        setTimeout(() => {
          onLogout()
        }, 1500)
      } else {
        setFeedbackMsg({ type: 'error', text: res.message || 'Failed to delete account. Please try again.' })
        setIsDeleting(false)
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Network error occurred while deleting account.' })
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 md:pb-12 text-neutral-800 font-sans">
      {/* 1. Mobile/Desktop Top App Bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#C00078]">
            BESPOKE
          </span>
          <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest text-[#D6007A] bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100">
            Luxury Atelier
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (onOpenNotifications ? onOpenNotifications() : onNavigate('settings'))}
            className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-600 hover:text-[#D6007A] hover:bg-pink-50 transition-colors relative cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#D6007A] rounded-full ring-2 ring-white animate-pulse" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 space-y-4">
        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* 2. Customer Greeting Card (Dark Charcoal Rounded Gradient) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#232526] to-[#414345] p-5 sm:p-6 text-white shadow-xl shadow-black/10">
          {/* Subtle background glow */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#D6007A]/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            {/* Circular Profile Avatar */}
            <div
              onClick={() => onNavigate('edit-profile')}
              className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white/90 shadow-md overflow-hidden bg-white/10 shrink-0 cursor-pointer group"
              title="Click to edit profile"
            >
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={displayName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#D6007A] to-pink-600 text-white">
                  <User className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
              )}
            </div>

            {/* Customer Greeting & Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white truncate">
                  Hi, {displayName} 👋
                </h2>
              </div>
              <p className="text-xs text-neutral-300 mt-1 truncate">
                {displayEmail || 'Bespoke Couture Member'}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-white/15 px-2.5 py-0.5 rounded-full backdrop-blur-xs text-white">
                  <Sparkles className="w-2.5 h-2.5 text-pink-300" />
                  Verified Atelier Member
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Primary Profile Menu Card */}
        <div className="bg-white rounded-3xl border border-neutral-100 shadow-xs overflow-hidden">
          {/* Item 1: Orders */}
          <button
            type="button"
            onClick={() => onNavigate('orders')}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-pink-50 flex items-center justify-center text-[#D6007A] group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-neutral-800">Orders</span>
                <p className="text-[11px] text-neutral-400">Track shipments & purchase history</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-[#D6007A] group-hover:translate-x-0.5 transition-all" />
          </button>

          <div className="border-t border-neutral-100/90 ml-16" />

          {/* Item 1c: Payments & Methods */}
          <button
            type="button"
            onClick={() => onNavigate('payments')}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-pink-50 flex items-center justify-center text-[#D6007A] group-hover:scale-105 transition-transform">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-neutral-800">Payments</span>
                <p className="text-[11px] text-neutral-400">Saved UPI IDs, cards & order payment history</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-[#D6007A] group-hover:translate-x-0.5 transition-all" />
          </button>

          <div className="border-t border-neutral-100/90 ml-16" />

          {/* Item 2: My Measurements */}
          <button
            type="button"
            onClick={() => onNavigate('measurements')}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-pink-50 flex items-center justify-center text-[#D6007A] group-hover:scale-105 transition-transform">
                <Ruler className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-neutral-800">My Measurements</span>
                <p className="text-[11px] text-neutral-400">Saved bespoke tailored size profiles</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-[#D6007A] group-hover:translate-x-0.5 transition-all" />
          </button>

          <div className="border-t border-neutral-100/90 ml-16" />

          {/* Item 2b: Browsing History */}
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-pink-50 flex items-center justify-center text-[#D6007A] group-hover:scale-105 transition-transform">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-neutral-800">History</span>
                <p className="text-[11px] text-neutral-400">Products you've recently explored</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-[#D6007A] group-hover:translate-x-0.5 transition-all" />
          </button>

          <div className="border-t border-neutral-100/90 ml-16" />

          {/* Item 3: Edit Profile */}
          <button
            type="button"
            onClick={() => onNavigate('edit-profile')}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-pink-50 flex items-center justify-center text-[#D6007A] group-hover:scale-105 transition-transform">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-neutral-800">Edit Profile</span>
                <p className="text-[11px] text-neutral-400">Name, mobile, email & avatar</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-[#D6007A] group-hover:translate-x-0.5 transition-all" />
          </button>

          <div className="border-t border-neutral-100/90 ml-16" />

          {/* Item 4: Saved Addresses */}
          <button
            type="button"
            onClick={() => onNavigate('addresses')}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-pink-50 flex items-center justify-center text-[#D6007A] group-hover:scale-105 transition-transform">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-neutral-800">Saved Addresses</span>
                <p className="text-[11px] text-neutral-400">Manage delivery & billing locations</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-[#D6007A] group-hover:translate-x-0.5 transition-all" />
          </button>

          <div className="border-t border-neutral-100/90 ml-16" />

          {/* Item 5: Chats */}
          <button
            type="button"
            onClick={() => onNavigate('chats')}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-pink-50 flex items-center justify-center text-[#D6007A] group-hover:scale-105 transition-transform">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-neutral-800">Chats</span>
                <p className="text-[11px] text-neutral-400">Concierge & designer messages</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold bg-[#D6007A] text-white px-2 py-0.5 rounded-full">
                Active
              </span>
              <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-[#D6007A] group-hover:translate-x-0.5 transition-all" />
            </div>
          </button>

          <div className="border-t border-neutral-100/90 ml-16" />

          {/* Item 5b: Notifications */}
          <button
            type="button"
            onClick={() => (onOpenNotifications ? onOpenNotifications() : onNavigate('notifications'))}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-105 transition-transform">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-neutral-800">Notifications</span>
                <p className="text-[11px] text-neutral-400">Order alerts, concierge & delivery updates</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-[#D6007A] group-hover:translate-x-0.5 transition-all" />
          </button>

          <div className="border-t border-neutral-100/90 ml-16" />

          {/* Item 6: Settings */}
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-pink-50 flex items-center justify-center text-[#D6007A] group-hover:scale-105 transition-transform">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-neutral-800">Settings</span>
                <p className="text-[11px] text-neutral-400">Push notifications & preferences</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-[#D6007A] group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>

        {/* 4. Support and Information Card */}
        <div className="bg-white rounded-3xl border border-neutral-100 shadow-xs overflow-hidden">
          {/* Customer Care */}
          <button
            type="button"
            onClick={() => onNavigate('contact-us')}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-700 group-hover:scale-105 transition-transform">
                <Headphones className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-neutral-800">Customer Care</span>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-[#D6007A] group-hover:translate-x-0.5 transition-all" />
          </button>

          <div className="border-t border-neutral-100/90 ml-16" />

          {/* Terms & Conditions */}
          <button
            type="button"
            onClick={() => onNavigate('terms')}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-700 group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-neutral-800">Terms & Conditions</span>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-[#D6007A] group-hover:translate-x-0.5 transition-all" />
          </button>

          <div className="border-t border-neutral-100/90 ml-16" />

          {/* Returns & Refunds Policy */}
          <button
            type="button"
            onClick={() => onNavigate('refund-policy')}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-700 group-hover:scale-105 transition-transform">
                <RotateCcw className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-neutral-800">Returns & Refunds Policy</span>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-[#D6007A] group-hover:translate-x-0.5 transition-all" />
          </button>

          <div className="border-t border-neutral-100/90 ml-16" />

          {/* We Respect Your Privacy */}
          <button
            type="button"
            onClick={() => onNavigate('privacy')}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-700 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-neutral-800">We Respect Your Privacy</span>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-[#D6007A] group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>

        {/* 5. Account Actions: Logout */}
        <div className="bg-white rounded-3xl border border-neutral-100 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-rose-50/50 active:bg-rose-50 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-105 transition-transform">
                <LogOut className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-rose-600">Logout</span>
            </div>
            <LogOut className="w-4 h-4 text-rose-600 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* 6. Account Actions: Delete Account */}
        <div className="bg-white rounded-3xl border border-neutral-100 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-rose-50/50 active:bg-rose-50 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-105 transition-transform">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold text-rose-600">Delete Account</span>
                <p className="text-[11px] text-rose-400">Permanently deactivate your Bespoke account</p>
              </div>
            </div>
            <Trash2 className="w-4 h-4 text-rose-600 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Logout Confirmation Dialog Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-100 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mx-auto mb-4">
              <LogOut className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">
              Are you sure you want to sign out?
            </h3>
            <p className="text-xs text-neutral-500 mt-2 mb-6">
              You will need to sign in again to view your tailored orders, measurements, and saved addresses.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false)
                  onLogout()
                }}
                className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm cursor-pointer transition-colors"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Dialog Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-100 text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-base font-bold text-neutral-900">
                Delete Bespoke Account
              </h3>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              This action is permanent and cannot be undone. Deleting your account will immediately:
            </p>

            <ul className="mt-2 space-y-1.5 text-xs text-neutral-500 list-disc list-inside">
              <li>Permanently deactivate your profile access</li>
              <li>Clear saved measurement cards and tailored sizing</li>
              <li>Remove your saved delivery addresses and preferences</li>
            </ul>

            <div className="mt-4 p-3 bg-rose-50/60 rounded-2xl border border-rose-100 text-[11px] text-rose-700">
              Please click <strong>Confirm Account Deletion</strong> below to proceed.
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2 shadow-sm cursor-pointer transition-colors"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Confirm Account Deletion</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
