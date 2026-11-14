import React, { useEffect } from 'react'
import { Lock, LogIn, X, Sparkles } from 'lucide-react'

/**
 * Reusable Login Prompt Dialog
 * Displayed when an unauthenticated guest attempts an account-dependent action.
 * Features:
 * - Exact required prompt: "Please login to continue."
 * - Two buttons: "Login" and "Cancel"
 * - Login opens the existing AuthModal
 * - Cancel dismisses the dialog preserving the current page and user selection state
 * - Full accessibility: ESC key handler, click-outside backdrop, focus retention
 */
export default function LoginPromptModal({
  isOpen,
  onClose,
  onLogin,
  title = 'Authentication Required',
  message = 'Please login to continue.',
  actionDescription = '',
}) {
  // Handle ESC key to dismiss dialog safely
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-prompt-title"
      aria-describedby="login-prompt-desc"
    >
      {/* Click-outside backdrop */}
      <div
        className="fixed inset-0 bg-transparent cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-neutral-100 z-10 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button in corner */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-black rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header Icon */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-50 via-rose-50 to-purple-50 text-[var(--theme-primary)] flex items-center justify-center mb-4 border border-pink-100/80 shadow-xs">
            <Lock className="w-7 h-7 stroke-[2.2]" />
          </div>

          {/* Title */}
          <div className="flex items-center gap-1.5 justify-center mb-1.5">
            <h3
              id="login-prompt-title"
              className="text-lg sm:text-xl font-extrabold text-neutral-900 tracking-tight"
            >
              {title}
            </h3>
            <Sparkles className="w-4 h-4 text-theme-primary" />
          </div>

          {/* Exact required message: "Please login to continue." */}
          <p
            id="login-prompt-desc"
            className="text-sm sm:text-base font-bold text-neutral-800 mt-1"
          >
            {message}
          </p>

          {/* Optional context subtitle */}
          <p className="text-xs text-neutral-500 mt-2 max-w-xs leading-relaxed">
            {actionDescription
              ? `Sign in or create an account to ${actionDescription}. Your active browsing selections will be preserved.`
              : 'Sign in to access your bag, saved wishlist, bespoke measurements, and order history.'}
          </p>
        </div>

        {/* Two Buttons: Login & Cancel */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 pt-2">
          {/* Cancel Button */}
          <button
            type="button"
            onClick={onClose}
            className="order-2 sm:order-1 flex-1 py-3 px-4 border border-neutral-300 hover:border-neutral-400 text-neutral-700 hover:text-neutral-900 bg-white rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer text-center"
          >
            Cancel
          </button>

          {/* Login Button */}
          <button
            type="button"
            onClick={() => {
              onClose()
              if (onLogin) onLogin()
            }}
            className="order-1 sm:order-2 flex-1 py-3 px-4 btn-theme text-xs sm:text-sm font-extrabold tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98"
          >
            <LogIn className="w-4 h-4" />
            <span>Login</span>
          </button>
        </div>
      </div>
    </div>
  )
}

