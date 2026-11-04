import React from 'react'

export default function BrandLogo({ onClick, className = '', variant = 'default' }) {
  const isDark = variant === 'dark'
  const isImageOnly = variant === 'image' || variant === 'image-only'

  if (isImageOnly) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.99] select-none ${className}`}
        aria-label="Bespoke - Only for you"
      >
        <img
          src="/logo.png"
          alt="Bespoke - Only for you"
          className="h-11 sm:h-12 w-auto object-contain rounded-xl bg-black shadow-sm"
        />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 cursor-pointer group text-left transition-transform hover:scale-[1.02] active:scale-[0.99] select-none ${className}`}
      aria-label="Bespoke - Only for you"
    >
      {/* Official Bespoke Emblem Logo Tile using logo.png */}
      <div className="relative h-11 sm:h-12 aspect-square rounded-2xl overflow-hidden bg-black p-0.5 shadow-md border border-neutral-800/80 group-hover:border-[var(--theme-primary)] transition-colors shrink-0">
        <img
          src="/logo.png"
          alt="Bespoke Emblem"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Brand Wordmark & Cursive Tagline matching the logo */}
      <div className="flex flex-col justify-center">
        <span
          className={`font-sans font-black text-xl sm:text-2xl tracking-tight leading-none ${
            isDark ? 'text-white' : 'text-theme-gradient'
          }`}
        >
          Bespoke
        </span>
        <span
          className="italic text-xs sm:text-[13px] text-theme-accent font-bold tracking-wide mt-0.5 leading-none"
          style={{ fontFamily: "'Dancing Script', cursive" }}
        >
          Only for you
        </span>
      </div>
    </button>
  )
}
