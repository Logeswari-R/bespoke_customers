import React, { useState, useEffect, useRef, useMemo } from 'react'
import { LottieSvg } from 'lottie-react'

/**
 * Reusable, production-grade Lottie animation wrapper
 * Supports:
 * - Loop or play-once behavior
 * - Autoplay & speed control
 * - Completion callback
 * - Responsive sizing & CSS classes
 * - Accessible fallback and prefers-reduced-motion detection
 * - Error boundary safe fallback
 */
export default function LottieAnimation({
  animationData,
  loop = true,
  autoplay = true,
  onComplete,
  className = '',
  style = {},
  width,
  height,
  speed = 1,
  ariaLabel = 'Interactive animation',
  fallbackText = 'Loading...',
  fallbackComponent,
}) {
  const [hasError, setHasError] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const lottieRef = useRef(null)

  // Listen to prefers-reduced-motion media query
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e) => setPrefersReducedMotion(e.matches)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handler)
      return () => mediaQuery.removeListener(handler)
    }
  }, [])

  // Update animation speed when ref is available
  useEffect(() => {
    if (lottieRef.current && speed !== 1) {
      try {
        lottieRef.current.setSpeed(speed)
      } catch (e) {
        // Safe fallback
      }
    }
  }, [speed])

  // If no animation data provided or runtime error encountered
  if (!animationData || hasError) {
    if (fallbackComponent) return fallbackComponent
    return (
      <div
        className={`flex items-center justify-center text-xs text-neutral-400 ${className}`}
        style={{ width, height, ...style }}
        role="img"
        aria-label={ariaLabel}
      >
        <span>{fallbackText}</span>
      </div>
    )
  }

  // If user prefers reduced motion, render non-animated or paused fallback
  if (prefersReducedMotion) {
    if (fallbackComponent) return fallbackComponent
    return (
      <div
        className={`flex items-center justify-center p-4 text-xs font-medium text-neutral-600 ${className}`}
        style={{ width, height, ...style }}
        role="img"
        aria-label={ariaLabel}
      >
        <span>{fallbackText}</span>
      </div>
    )
  }

  const mergedStyle = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...style,
  }

  const subscriptions = useMemo(() => {
    if (!onComplete) return undefined
    return {
      complete: onComplete,
    }
  }, [onComplete])

  try {
    return (
      <div
        className={`inline-flex items-center justify-center overflow-hidden ${className}`}
        style={mergedStyle}
        role="img"
        aria-label={ariaLabel}
      >
        <LottieSvg
          lottieRef={lottieRef}
          src={animationData}
          loop={loop}
          autoplay={autoplay}
          speed={speed}
          subscriptions={subscriptions}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    )
  } catch (err) {
    console.error('Lottie animation render error:', err)
    setHasError(true)
    return (
      <div
        className={`flex items-center justify-center text-xs text-neutral-400 ${className}`}
        style={mergedStyle}
      >
        <span>{fallbackText}</span>
      </div>
    )
  }
}
