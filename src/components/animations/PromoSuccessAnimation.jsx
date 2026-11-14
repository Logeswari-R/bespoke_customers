import React, { useEffect, useRef } from 'react'
import { Sparkles, Check, X } from 'lucide-react'
import LottieAnimation from './LottieAnimation'
import promoAnimationData from '../../../lottiefiles/promoSucces.json'

/**
 * PromoSuccessAnimation
 * Displays the promoSucces.json Lottie animation when a coupon code is successfully validated.
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: function called when animation finishes or user dismisses
 * - promoCode: string (e.g. 'FESTIVE50')
 * - discountAmount: number (e.g. 150)
 * - autoCloseDelayMs: number (fallback auto-close timeout in ms, default 3200)
 */
export default function PromoSuccessAnimation({
  isOpen,
  onClose,
  promoCode = '',
  discountAmount = 0,
  autoCloseDelayMs = 3400,
}) {
  const timerRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      // Fallback auto-close timer ensures overlay doesn't hang if onComplete is skipped
      timerRef.current = setTimeout(() => {
        if (onClose) onClose()
      }, autoCloseDelayMs)
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isOpen, autoCloseDelayMs, onClose])

  if (!isOpen) return null

  const handleAnimationComplete = () => {
    // Add brief buffer for customer to absorb the savings before closing
    setTimeout(() => {
      if (onClose) onClose()
    }, 400)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Coupon applied successfully"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-neutral-100 text-center flex flex-col items-center animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-all cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Lottie Promo Animation Container */}
        <div className="w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center overflow-hidden">
          <LottieAnimation
            animationData={promoAnimationData}
            loop={false}
            autoplay={true}
            onComplete={handleAnimationComplete}
            ariaLabel="Promotional coupon celebration"
            fallbackText="🎉 Coupon Applied!"
            className="w-full h-full"
          />
        </div>

        {/* Success Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Coupon Applied!</span>
        </div>

        {/* Title */}
        <h3 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
          Woohoo! You Saved
        </h3>

        {/* Saved Rupee Amount */}
        {discountAmount > 0 ? (
          <div className="text-3xl sm:text-4xl font-extrabold text-[var(--theme-primary)] my-1 tracking-tight">
            ₹{discountAmount}
          </div>
        ) : (
          <div className="text-2xl font-extrabold text-[var(--theme-primary)] my-1">
            Special Offer Unlocked
          </div>
        )}

        {/* Applied Coupon Pill */}
        {promoCode && (
          <p className="text-xs text-neutral-500 mt-1">
            Promo code <span className="font-mono font-bold text-neutral-800 uppercase px-2 py-0.5 bg-neutral-100 rounded-md border border-neutral-200">{promoCode}</span> has been applied to your bag.
          </p>
        )}

        {/* Continue Button */}
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full py-3 btn-theme text-xs uppercase tracking-wider rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>Continue to Checkout</span>
        </button>
      </div>
    </div>
  )
}

