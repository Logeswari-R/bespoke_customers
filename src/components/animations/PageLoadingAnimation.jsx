import React from 'react'
import LottieAnimation from './LottieAnimation'
import loadingAnimationData from '../../../lottiefiles/loading.json'

/**
 * PageLoadingAnimation
 * Reusable Bespoke loading indicator powered by the loading.json Lottie animation.
 * 
 * Props:
 * - fullScreen: boolean (renders fixed overlay covering entire viewport)
 * - message: string (e.g. 'Crafting your bespoke experience...')
 * - subMessage: string
 * - size: number | string (width & height of animation, default 160)
 * - minHeight: string (for inline mode, default 'min-h-[50vh]')
 * - className: string
 */
export default function PageLoadingAnimation({
  fullScreen = false,
  message = 'Crafting your Bespoke experience...',
  subMessage = 'Connecting to master ateliers & live collections',
  size = 150,
  minHeight = 'min-h-[50vh]',
  className = '',
}) {
  const content = (
    <div className="flex flex-col items-center justify-center text-center p-6 select-none">
      {/* Lottie Loading Animation Container */}
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{ width: size, height: size }}
      >
        <LottieAnimation
          animationData={loadingAnimationData}
          loop={true}
          autoplay={true}
          ariaLabel="Loading content"
          fallbackText="Loading Bespoke..."
          className="w-full h-full"
        />
      </div>

      {message && (
        <h3 className="mt-3 text-sm font-bold text-neutral-800 tracking-wide">
          {message}
        </h3>
      )}

      {subMessage && (
        <p className="mt-1 text-xs text-neutral-500 font-light max-w-xs">
          {subMessage}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-white/85 backdrop-blur-sm animate-in fade-in duration-200 ${className}`}
        role="status"
        aria-live="polite"
        aria-label={message}
      >
        <div className="bg-white/95 p-8 rounded-3xl shadow-xl border border-neutral-100/80">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`w-full ${minHeight} flex items-center justify-center bg-white ${className}`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {content}
    </div>
  )
}

