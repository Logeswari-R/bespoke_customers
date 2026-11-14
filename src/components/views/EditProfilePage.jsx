import React, { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft,
  Camera,
  User,
  Phone,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  X,
} from 'lucide-react'
import {
  getUserProfile,
  updateUserProfileApi,
  sendForgotPasswordOtpApi,
  verifyForgotPasswordOtpApi,
  formatImageUrl,
} from '../../services/api'

export default function EditProfilePage({ currentUser, onBack, onProfileUpdated }) {
  const [name, setName] = useState(currentUser?.username || currentUser?.name || '')
  const [mobile, setMobile] = useState(currentUser?.mobile || '')
  const [originalMobile, setOriginalMobile] = useState(currentUser?.mobile || '')
  const [email, setEmail] = useState(currentUser?.email || '')
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [base64Image, setBase64Image] = useState(null)

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)

  // Mobile Update OTP Modal State
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false)
  const [newMobileToVerify, setNewMobileToVerify] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [otpError, setOtpError] = useState(null)
  const [otpSuccess, setOtpSuccess] = useState(null)

  const fileInputRef = useRef(null)

  // Sync from currentUser prop if provided
  useEffect(() => {
    if (currentUser) {
      if (currentUser.username || currentUser.name) setName(currentUser.username || currentUser.name)
      if (currentUser.mobile) {
        setMobile(currentUser.mobile)
        setOriginalMobile(currentUser.mobile)
      }
      if (currentUser.email) setEmail(currentUser.email)
      if (currentUser.img_path || currentUser.avatar) {
        setAvatarPreview(formatImageUrl(currentUser.img_path || currentUser.avatar))
      }
    }
  }, [currentUser])

  // Fetch fresh profile from backend
  useEffect(() => {
    let ignore = false
    const userId = currentUser?.id
    if (!userId) return

    async function loadData() {
      setIsLoading(true)
      try {
        const res = await getUserProfile(userId)
        const userObj = res?.user || res?.data || res
        if (!ignore && userObj) {
          if (userObj.username || userObj.name) setName(userObj.username || userObj.name)
          if (userObj.mobile) {
            setMobile(userObj.mobile)
            setOriginalMobile(userObj.mobile)
          }
          if (userObj.email) setEmail(userObj.email)
          if (userObj.img_path || userObj.avatar) {
            setAvatarPreview(formatImageUrl(userObj.img_path || userObj.avatar))
          }
        }
      } catch (err) {
        console.error('Failed to load user profile:', err)
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    loadData()
    return () => {
      ignore = true
    }
  }, [currentUser?.id])

  // Handle local image file selection
  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', text: 'Please select a valid image file (PNG, JPG, WEBP).' })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', text: 'Image file exceeds maximum 5MB size limit.' })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      setAvatarPreview(result)
      setBase64Image(result)
    }
    reader.readAsDataURL(file)
  }

  // Open Mobile Update / Verification Dialog
  const handleOpenMobileUpdate = () => {
    setNewMobileToVerify(mobile)
    setOtpCode('')
    setOtpError(null)
    setOtpSuccess(null)
    setIsOtpModalOpen(true)
  }

  // Send OTP for mobile verification
  const handleSendMobileOtp = async () => {
    if (!newMobileToVerify || newMobileToVerify.trim().length < 8) {
      setOtpError('Please enter a valid mobile number (at least 8 digits).')
      return
    }
    setIsSendingOtp(true)
    setOtpError(null)
    try {
      const res = await sendForgotPasswordOtpApi(newMobileToVerify.trim())
      if (res.status === 'true' || res.status === true) {
        setOtpSuccess(res.message || `Verification code sent to ${newMobileToVerify.trim()}`)
      } else {
        setOtpError(res.message || 'Failed to dispatch verification OTP.')
      }
    } catch (err) {
      setOtpError(err.message || 'Error sending verification code.')
    } finally {
      setIsSendingOtp(false)
    }
  }

  // Verify OTP for mobile
  const handleVerifyMobileOtp = async () => {
    if (!otpCode || otpCode.trim().length < 4) {
      setOtpError('Please enter the full verification OTP.')
      return
    }
    setIsVerifyingOtp(true)
    setOtpError(null)
    try {
      const res = await verifyForgotPasswordOtpApi({
        identifier: newMobileToVerify.trim(),
        otp: otpCode.trim(),
      })
      if (res.status === 'true' || res.status === true) {
        setMobile(newMobileToVerify.trim())
        setOriginalMobile(newMobileToVerify.trim())
        setIsOtpModalOpen(false)
        setFeedback({
          type: 'success',
          text: 'Mobile number verified successfully! Click Save to apply.',
        })
      } else {
        setOtpError(res.message || 'Invalid or expired OTP. Please try again.')
      }
    } catch (err) {
      setOtpError(err.message || 'Error verifying OTP.')
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  // Save changes
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!currentUser?.id) return

    if (!name.trim()) {
      setFeedback({ type: 'error', text: 'Full Name is required.' })
      return
    }

    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setFeedback({ type: 'error', text: 'A valid email address is required.' })
      return
    }

    setIsSaving(true)
    setFeedback(null)

    const payload = {
      name: name.trim(),
      username: name.trim(),
      email: email.trim().toLowerCase(),
      mobile: mobile.trim(),
    }

    if (base64Image) {
      payload.image = base64Image
    }

    try {
      const res = await updateUserProfileApi(currentUser.id, payload)
      if (res.status === 'true' || res.status === true) {
        setFeedback({ type: 'success', text: 'Profile updated successfully!' })
        if (onProfileUpdated) {
          const updatedUser = {
            ...currentUser,
            name: name.trim(),
            username: name.trim(),
            email: email.trim().toLowerCase(),
            mobile: mobile.trim(),
            avatar: res.data?.[0]?.img_path || avatarPreview || currentUser.avatar,
            img_path: res.data?.[0]?.img_path || avatarPreview || currentUser.img_path,
          }
          onProfileUpdated(updatedUser)
        }
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to update profile.' })
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Network error updating profile.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 md:pb-12 text-neutral-800 font-sans">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-600 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
          Edit Profile
        </h1>

        <div className="w-10" />
      </div>

      <div className="max-w-md mx-auto px-4 sm:px-6 pt-6">
        {feedback && (
          <div
            className={`mb-5 p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-6 sm:p-8">
          {/* Large Circular Profile Image with Camera Button */}
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="relative group">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-pink-100 shadow-lg bg-pink-50 flex items-center justify-center">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-14 h-14 text-[#D6007A]" />
                )}
              </div>

              {/* Overlapping Camera / Pencil Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#D6007A] hover:bg-pink-600 text-white flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-105 active:scale-95"
                title="Change Profile Photo"
              >
                <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
            <p className="text-[11px] text-neutral-400 mt-3">
              Tap camera icon to update profile picture
            </p>
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSaveProfile} className="space-y-5">
            {/* User Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                Full Name <span className="text-[#D6007A]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50/70 border border-neutral-200 rounded-2xl text-xs sm:text-sm font-medium text-neutral-900 focus:bg-white focus:outline-none focus:border-[#D6007A] focus:ring-2 focus:ring-[#D6007A]/20 transition-all"
                />
              </div>
            </div>

            {/* Mobile Number with Update Action Button */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                Mobile Number
              </label>
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="Enter registered mobile number"
                    className="w-full pl-10 pr-4 py-3 bg-neutral-50/70 border border-neutral-200 rounded-2xl text-xs sm:text-sm font-medium text-neutral-900 focus:bg-white focus:outline-none focus:border-[#D6007A] focus:ring-2 focus:ring-[#D6007A]/20 transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleOpenMobileUpdate}
                  className="px-3.5 py-3 rounded-2xl text-xs font-bold text-[#D6007A] bg-pink-50 hover:bg-pink-100 border border-pink-200 cursor-pointer transition-colors whitespace-nowrap"
                >
                  Verify / Update
                </button>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">
                OTP verification is required when updating mobile number
              </p>
            </div>

            {/* Email ID */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                Email Address <span className="text-[#D6007A]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50/70 border border-neutral-200 rounded-2xl text-xs sm:text-sm font-medium text-neutral-900 focus:bg-white focus:outline-none focus:border-[#D6007A] focus:ring-2 focus:ring-[#D6007A]/20 transition-all"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3.5 px-6 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-[#D6007A] to-pink-600 hover:from-pink-600 hover:to-[#D6007A] disabled:opacity-60 shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <span>Save Profile</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Mobile Verification OTP Modal */}
      {isOtpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-100 text-left relative animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setIsOtpModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center text-[#D6007A] mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-neutral-900">
              Verify Mobile Number
            </h3>
            <p className="text-xs text-neutral-500 mt-1 mb-4">
              Enter your mobile number to receive a 6-digit verification code.
            </p>

            {otpError && (
              <div className="p-3 mb-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {otpError}
              </div>
            )}

            {otpSuccess && (
              <div className="p-3 mb-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
                {otpSuccess}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-neutral-500 mb-1">
                  New Mobile Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={newMobileToVerify}
                    onChange={(e) => setNewMobileToVerify(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 outline-none focus:border-[#D6007A]"
                  />
                  <button
                    type="button"
                    disabled={isSendingOtp}
                    onClick={handleSendMobileOtp}
                    className="px-3 py-2 bg-[#D6007A] text-white text-xs font-bold rounded-xl hover:bg-pink-600 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    {isSendingOtp ? 'Sending...' : 'Send OTP'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-neutral-500 mb-1">
                  Enter 6-Digit OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter OTP code"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-center tracking-widest text-neutral-900 outline-none focus:border-[#D6007A]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={isVerifyingOtp}
                  onClick={handleVerifyMobileOtp}
                  className="w-full py-2.5 bg-gradient-to-r from-[#D6007A] to-pink-600 text-white text-xs font-bold rounded-xl hover:opacity-90 disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {isVerifyingOtp ? 'Verifying OTP...' : 'Verify & Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

