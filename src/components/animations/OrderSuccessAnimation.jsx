import React, { useEffect, useRef } from 'react'
import { CheckCircle2, ArrowRight, Package } from 'lucide-react'
import LottieAnimation from './LottieAnimation'
import orderSuccessAnimationData from '../../../lottiefiles/Success.json'

/**
 * OrderSuccessAnimation
 * Displays the Success.json Lottie animation when an order is authoritatively confirmed by backend.
 * 
 * Props:
 * - isOpen: boolean
 * - onComplete: callback function to continue/navigate
 * - orderId: string/number
 * - totalAmount: number
 * - itemsCount: number
 * - autoProceedDelayMs: number (optional auto-proceed delay, default 3600ms)
 * - isInline: boolean (if true, renders inside page layout without fixed overlay)
 */
export default function OrderSuccessAnimation({
  isOpen = true,
  onComplete,
  orderId = '',
  totalAmount = 0,
  itemsCount = 1,
  autoProceedDelayMs = 3800,
  isInline = false,
}) {
  const timerRef = useRef(null)

  useEffect(() => {
    if (isOpen && autoProceedDelayMs && !isInline && onComplete) {
      timerRef.current = setTimeout(() => {
        onComplete()
      }, autoProceedDelayMs)
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isOpen, autoProceedDelayMs, isInline, onComplete])

  if (!isOpen && !isInline) return null

  const handleAnimationFinish = () => {
    if (onComplete && !isInline) {
      setTimeout(() => {
        onComplete()
      }, 500)
    }
  }

  const content = (
    <div className="flex flex-col items-center text-center">
      {/* Lottie Success Animation Container */}
      <div className="w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center overflow-hidden">
        <LottieAnimation
          animationData={orderSuccessAnimationData}
          loop={false}
          autoplay={true}
          onComplete={handleAnimationFinish}
          ariaLabel="Order confirmed animation"
          fallbackComponent={
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-10 h-10" />
            </div>
          }
          className="w-full h-full"
        />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
        <Package className="w-3.5 h-3.5 text-emerald-600" />
        <span>Order Confirmed</span>
      </div>

      <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
        Your Order Has Been Placed Successfully!
      </h2>

      {orderId && (
        <p className="text-sm font-semibold text-neutral-700 mt-1">
          Order Reference: <span className="font-mono text-[var(--theme-primary)] font-bold">#{orderId}</span>
        </p>
      )}

      {totalAmount > 0 && (
        <p className="text-xs text-neutral-500 mt-1">
          Total Paid: <span className="font-bold text-neutral-800">₹{totalAmount}</span>
          {itemsCount > 0 && ` • ${itemsCount} ${itemsCount === 1 ? 'item' : 'items'}`}
        </p>
      )}

      <p className="text-xs text-neutral-500 mt-2 max-w-sm">
        Our master atelier has received your measurements and instructions. We will notify you once crafting commences.
      </p>

      {onComplete && !isInline && (
        <button
          type="button"
          onClick={onComplete}
          className="mt-6 w-full py-3 btn-theme text-xs uppercase tracking-wider rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>View Order Details</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )

  if (isInline) {
    return <div className="w-full flex justify-center">{content}</div>
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Order Placed Successfully"
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-neutral-100 text-center flex flex-col items-center animate-in zoom-in-95 duration-200">
        {content}
      </div>
    </div>
  )
}

