import React, { useState, useRef, useEffect } from 'react'
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  AtSign,
  RotateCcw,
} from 'lucide-react'
import BrandLogo from './BrandLogo'
import {
  loginUserApi,
  registerUserApi,
  sendForgotPasswordOtpApi,
  verifyForgotPasswordOtpApi,
  resetPasswordWithOtpApi,
} from '../../services/api'

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
  onAuthSuccess,
}) {
  const [mode, setMode] = useState(initialMode || 'login')
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Login / Register state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    identifier: '',
  })

  // Forgot Password flow states
  const [forgotIdentifier, setForgotIdentifier] = useState('')
  const [sentToDisplay, setSentToDisplay] = useState('')
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [devOtpHint, setDevOtpHint] = useState('')
  const [countdown, setCountdown] = useState(30)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const otpInputRefs = useRef([])

  // 30s Countdown timer for OTP resend in Step 2
  useEffect(() => {
    if (mode !== 'forgot-verify') return

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [mode])

  // Focus the first OTP box when entering verify mode
  useEffect(() => {
    if (mode === 'forgot-verify') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus()
      }, 100)
    }
  }, [mode])

  if (!isOpen) return null

  const resetForgotState = () => {
    setForgotIdentifier('')
    setSentToDisplay('')
    setOtpDigits(['', '', '', '', '', ''])
    setDevOtpHint('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleClose = () => {
    setErrorMsg('')
    setSuccessMsg('')
    setShowPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
    setFormData({
      name: '',
      email: '',
      mobile: '',
      password: '',
      identifier: '',
    })
    resetForgotState()
    if (onClose) onClose()
  }

  const handleSwitchMode = (newMode) => {
    setMode(newMode)
    setErrorMsg('')
    setSuccessMsg('')
    setShowPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
    // Always start fresh and empty when navigating modes
    resetForgotState()
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errorMsg) setErrorMsg('')
  }

  // --- Step 1: Request OTP ---
  const handleRequestOtp = async (e) => {
    e.preventDefault()
    const cleanId = forgotIdentifier.trim()
    if (!cleanId) {
      setErrorMsg('Please enter your registered email or mobile number')
      return
    }

    setIsLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const res = await sendForgotPasswordOtpApi(cleanId)
      const isSuccess = res.status === true || res.status === 'true' || res.success === true

      if (isSuccess) {
        const target = res.email || res.mobile || cleanId
        setSentToDisplay(target)
        if (res.otp) {
          setDevOtpHint(String(res.otp))
        }
        setOtpDigits(['', '', '', '', '', ''])
        setSuccessMsg(res.message || 'Verification OTP sent successfully')
        setCountdown(30)
        setTimeout(() => {
          setSuccessMsg('')
          setMode('forgot-verify')
        }, 500)
      } else {
        throw new Error(res.message || 'User not found. Please check your email or mobile.')
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send OTP. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // --- Step 2: Handle OTP Digits & Resend ---
  const handleOtpChange = (index, value) => {
    if (errorMsg) setErrorMsg('')
    const cleanVal = value.replace(/\D/g, '')
    const digit = cleanVal.slice(-1)

    const updated = [...otpDigits]
    updated[index] = digit
    setOtpDigits(updated)

    // Auto advance to next input
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!paste) return

    const updated = [...otpDigits]
    paste.split('').forEach((char, i) => {
      if (i < 6) updated[i] = char
    })
    setOtpDigits(updated)

    const focusIdx = Math.min(paste.length, 5)
    otpInputRefs.current[focusIdx]?.focus()
  }

  const handleResendOtp = async () => {
    if (countdown > 0 || isLoading) return
    setIsLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const res = await sendForgotPasswordOtpApi(forgotIdentifier)
      const isSuccess = res.status === true || res.status === 'true' || res.success === true

      if (isSuccess) {
        if (res.otp) setDevOtpHint(String(res.otp))
        setCountdown(30)
        setSuccessMsg('A new OTP has been sent!')
        setTimeout(() => setSuccessMsg(''), 2500)
      } else {
        throw new Error(res.message || 'Failed to resend OTP')
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to resend OTP')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const fullOtp = otpDigits.join('').trim()
    if (fullOtp.length < 6) {
      setErrorMsg('Please enter the full 6-digit verification code')
      return
    }

    setIsLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const res = await verifyForgotPasswordOtpApi({
        identifier: forgotIdentifier,
        otp: fullOtp,
      })
      const isSuccess = res.status === true || res.status === 'true' || res.success === true

      if (isSuccess) {
        setSuccessMsg('OTP verified successfully!')
        setTimeout(() => {
          setSuccessMsg('')
          setMode('forgot-reset')
        }, 500)
      } else {
        throw new Error(res.message || 'Invalid verification code. Please try again.')
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to verify OTP')
    } finally {
      setIsLoading(false)
    }
  }

  // --- Step 3: Set New Password ---
  const handleResetPassword = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const fullOtp = otpDigits.join('').trim()
      const res = await resetPasswordWithOtpApi({
        identifier: forgotIdentifier,
        newPassword,
        otp: fullOtp,
      })
      const isSuccess = res.status === true || res.status === 'true' || res.success === true

      if (isSuccess) {
        setSuccessMsg('Password changed successfully! You can now sign in.')
        setFormData((prev) => ({
          ...prev,
          identifier: forgotIdentifier,
          password: '',
        }))
        resetForgotState()
        setTimeout(() => {
          setMode('login')
          setSuccessMsg('Password updated! Please enter your new password to sign in.')
        }, 1200)
      } else {
        throw new Error(res.message || 'Failed to reset password. Please try again.')
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reset password')
    } finally {
      setIsLoading(false)
    }
  }

  // --- Login / Register submit ---
  const handleSubmitAuth = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      if (mode === 'login') {
        const payload = {
          identifier: formData.identifier || formData.email,
          password: formData.password,
        }

        if (!payload.identifier || !payload.password) {
          throw new Error('Please enter your email or mobile and password')
        }

        const res = await loginUserApi(payload)
        const isSuccess = res.status === true || res.status === 'true' || res.success === true
        const authenticatedUser = res.user || res.data

        if (isSuccess && authenticatedUser) {
          setSuccessMsg(res.message || `Welcome back, ${authenticatedUser.name || authenticatedUser.username}!`)
          setTimeout(() => {
            if (onAuthSuccess) onAuthSuccess(authenticatedUser)
            onClose()
          }, 600)
        } else {
          throw new Error(res.message || 'Login failed. Please check your credentials.')
        }
      } else {
        // Register mode
        const payload = {
          name: formData.name,
          email: formData.email,
          mobile: formData.mobile,
          password: formData.password,
        }

        if (!payload.name || !payload.email || !payload.password) {
          throw new Error('Please fill in all required fields')
        }

        const res = await registerUserApi(payload)
        const isSuccess = res.status === true || res.status === 'true' || res.success === true
        const registeredUser =
          res.user || res.data || { name: payload.name, email: payload.email, mobile: payload.mobile }

        if (isSuccess) {
          setSuccessMsg(res.message || 'Registration successful! Welcome to Bespoke.')
          setTimeout(() => {
            if (onAuthSuccess) onAuthSuccess(registeredUser)
            onClose()
          }, 600)
        } else {
          throw new Error(res.message || 'Registration failed. Please try again.')
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const isForgotFlow =
    mode === 'forgot-request' || mode === 'forgot-verify' || mode === 'forgot-reset'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden transform animate-in zoom-in-95 duration-200">
        {/* Top Theme Ribbon */}
        <div className="h-1.5 w-full bg-theme-gradient" />

        <div className="p-6 sm:p-8">
          {/* =========================================================================
              FORGOT PASSWORD FLOW (Header + 3 Steps matching Flutter screenshots)
              ========================================================================= */}
          {isForgotFlow ? (
            <div>
              {/* Back navigation & Close */}
              <div className="flex items-center justify-between mb-5">
                <button
                  type="button"
                  onClick={() => {
                    if (mode === 'forgot-request') {
                      resetForgotState()
                      handleSwitchMode('login')
                    } else if (mode === 'forgot-verify') {
                      setOtpDigits(['', '', '', '', '', ''])
                      setDevOtpHint('')
                      setMode('forgot-request')
                    } else if (mode === 'forgot-reset') {
                      setNewPassword('')
                      setConfirmPassword('')
                      setMode('forgot-verify')
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-800 hover:text-theme-primary transition-colors cursor-pointer select-none"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                  <span>Forgot Password</span>
                </button>
                <button
                  onClick={handleClose}
                  type="button"
                  className="p-1.5 text-neutral-400 hover:text-black rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Bespoke Header */}
              <div className="text-center mb-6">
                <span className="text-base font-black tracking-[0.25em] text-[#D6007A] uppercase select-none">
                  BESPOKE
                </span>
                <h3 className="text-2xl font-black text-neutral-900 mt-2 tracking-tight">
                  {mode === 'forgot-request' && 'Reset Your Password'}
                  {mode === 'forgot-verify' && 'Verify Code'}
                  {mode === 'forgot-reset' && 'Set New Password'}
                </h3>
                <p className="text-xs text-neutral-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                  {mode === 'forgot-request' &&
                    'Enter your registered email or mobile number below to receive a verification OTP'}
                  {mode === 'forgot-verify' && (
                    <>
                      Verification code sent to
                      <span className="block font-semibold text-neutral-800 mt-0.5">
                        {sentToDisplay || forgotIdentifier}
                      </span>
                    </>
                  )}
                  {mode === 'forgot-reset' &&
                    'Create a strong password of at least 6 characters'}
                </p>
              </div>

              {/* Feedback Alerts */}
              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* STEP 1: Enter Email / Mobile */}
              {mode === 'forgot-request' && (
                <form onSubmit={handleRequestOtp} className="space-y-6">
                  <div className="relative">
                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D6007A]" />
                    <input
                      type="text"
                      autoFocus
                      required
                      value={forgotIdentifier}
                      onChange={(e) => {
                        setForgotIdentifier(e.target.value)
                        if (errorMsg) setErrorMsg('')
                      }}
                      placeholder="Email or Mobile Number"
                      className="w-full pl-12 pr-4 py-3.5 bg-neutral-100 rounded-2xl text-sm font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#D6007A]/25 border border-transparent focus:border-[#D6007A] transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#D6007A] to-[#9E1478] hover:from-[#c2006e] hover:to-[#881167] text-white text-sm font-bold shadow-[0_10px_25px_-5px_rgba(214,0,122,0.45)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Send OTP'
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: Verify Code (6 OTP digit boxes & 30s resend timer) */}
              {mode === 'forgot-verify' && (
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  {/* 6 Digit Inputs */}
                  <div className="flex justify-center gap-2 sm:gap-2.5">
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpInputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onPaste={handleOtpPaste}
                        className="w-11 h-14 sm:w-12 sm:h-14 text-center text-xl font-bold bg-neutral-100 rounded-2xl border border-transparent text-neutral-900 focus:outline-none focus:bg-white focus:border-[#D6007A] focus:ring-2 focus:ring-[#D6007A]/25 transition-all shadow-xs"
                      />
                    ))}
                  </div>

                  {/* Dev/Demo OTP Helper (useful when running locally without active mailbox) */}
                  {devOtpHint && (
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
                      <span>Testing OTP:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const digits = devOtpHint.split('').slice(0, 6)
                          setOtpDigits(digits)
                          otpInputRefs.current[5]?.focus()
                        }}
                        className="font-bold text-[#D6007A] hover:underline cursor-pointer bg-pink-50 px-2 py-0.5 rounded-md"
                      >
                        {devOtpHint} (Click to fill)
                      </button>
                    </div>
                  )}

                  {/* Resend Countdown */}
                  <div className="text-center text-xs text-neutral-500 space-y-1">
                    <p className="font-medium">Didn't receive code?</p>
                    {countdown > 0 ? (
                      <p className="font-bold text-neutral-800">
                        Resend in {countdown} s
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isLoading}
                        className="font-bold text-[#D6007A] hover:underline cursor-pointer transition-colors"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#D6007A] to-[#9E1478] hover:from-[#c2006e] hover:to-[#881167] text-white text-sm font-bold shadow-[0_10px_25px_-5px_rgba(214,0,122,0.45)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Verify'
                    )}
                  </button>
                </form>
              )}

              {/* STEP 3: Set New Password (with exact pink glow styling) */}
              {mode === 'forgot-reset' && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  {/* New Password with glowing border */}
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D6007A]" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      autoFocus
                      required
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value)
                        if (errorMsg) setErrorMsg('')
                      }}
                      placeholder="New Password"
                      className="w-full pl-12 pr-12 py-3.5 bg-neutral-50 border border-[#D6007A] ring-2 ring-[#D6007A]/40 shadow-[0_0_16px_rgba(214,0,122,0.28)] rounded-2xl text-sm font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-3 focus:ring-[#D6007A]/50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Confirm Password */}
                  <div className="relative">
                    <RotateCcw className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D6007A]" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (errorMsg) setErrorMsg('')
                      }}
                      placeholder="Confirm Password"
                      className="w-full pl-12 pr-12 py-3.5 bg-neutral-100 rounded-2xl text-sm font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-[#D6007A] focus:ring-2 focus:ring-[#D6007A]/25 border border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#D6007A] to-[#9E1478] hover:from-[#c2006e] hover:to-[#881167] text-white text-sm font-bold shadow-[0_10px_25px_-5px_rgba(214,0,122,0.45)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Reset Password'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* =========================================================================
                STANDARD SIGN IN / CREATE ACCOUNT MODAL
                ========================================================================= */
            <div>
              {/* Close Button */}
              <button
                onClick={handleClose}
                type="button"
                className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-black rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Brand Logo Header */}
              <div className="flex flex-col items-center text-center mb-6">
                <BrandLogo />
                <h3 className="text-xl font-extrabold text-neutral-900 mt-4 tracking-tight">
                  {mode === 'login' ? 'Sign in to your account' : 'Create your Bespoke account'}
                </h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-xs">
                  {mode === 'login'
                    ? 'Manage your orders, save items to your wishlist, and enjoy tailored shopping.'
                    : 'Join the Bespoke luxury fashion community for personalized couture and express delivery.'}
                </p>
              </div>

              {/* Mode Switch Tabs */}
              <div className="grid grid-cols-2 p-1 bg-neutral-100 rounded-xl mb-6 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => handleSwitchMode('login')}
                  className={`py-2 rounded-lg transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white text-theme-primary shadow-xs font-extrabold'
                      : 'text-neutral-500 hover:text-black'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchMode('register')}
                  className={`py-2 rounded-lg transition-all cursor-pointer ${
                    mode === 'register'
                      ? 'bg-white text-theme-primary shadow-xs font-extrabold'
                      : 'text-neutral-500 hover:text-black'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Feedback Alerts */}
              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmitAuth} className="space-y-4 text-xs">
                {mode === 'register' && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Full Name <span className="text-theme-primary">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g. Vijay Kumar"
                        className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)] transition-all"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                    {mode === 'login' ? 'Email or Mobile Number' : 'Email Address'}{' '}
                    <span className="text-theme-primary">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type={mode === 'login' ? 'text' : 'email'}
                      name={mode === 'login' ? 'identifier' : 'email'}
                      required
                      value={mode === 'login' ? formData.identifier : formData.email}
                      onChange={handleInputChange}
                      placeholder={mode === 'login' ? 'Enter email or mobile' : 'name@example.com'}
                      className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)] transition-all"
                    />
                  </div>
                </div>

                {mode === 'register' && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Mobile Number (Optional)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="tel"
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleInputChange}
                        placeholder="10-digit mobile number"
                        className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)] transition-all"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                      Password <span className="text-theme-primary">*</span>
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => handleSwitchMode('forgot-request')}
                        className="text-[11px] text-theme-primary hover:underline font-semibold cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter your password"
                      className="w-full pl-9 pr-10 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 btn-theme text-sm uppercase tracking-wider font-bold shadow-md hover:opacity-95 transition-opacity cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>{mode === 'login' ? 'Sign In to Bespoke' : 'Create My Account'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Quick Demo Credentials Tip */}
              <div className="mt-6 pt-4 border-t border-neutral-100 text-center">
                <span className="text-[11px] text-neutral-400">
                  {mode === 'login' ? (
                    <>
                      Demo user ready: <span className="font-semibold text-neutral-600">saravanansaran262@gmail.com</span> / <span className="font-semibold text-neutral-600">123456</span>
                    </>
                  ) : (
                    'By registering, you agree to Bespoke Terms & Privacy Policy.'
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
