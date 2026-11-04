import React, { useRef, useState, useEffect } from 'react'
import { Sparkles, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

export default function SpotlightShopsSection({
  spotlights = [],
  onSelectShop,
  onViewAll,
}) {
  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 10)
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10)
    }
  }

  useEffect(() => {
    checkScroll()
    const handleResize = () => checkScroll()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [spotlights])

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 320
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
      setTimeout(checkScroll, 350)
    }
  }

  if (!spotlights || spotlights.length === 0) return null

  return (
    <section className="py-8 bg-white border-b border-neutral-100 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header with Left-Right Scroller Controls */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <h2
              onClick={onViewAll}
              className={`text-xl sm:text-2xl font-extrabold tracking-tight transition-opacity ${
                onViewAll ? 'cursor-pointer hover:opacity-90' : ''
              }`}
            >
              <span className="text-theme-gradient">Shops In Spotlight</span>
            </h2>
            <span className="badge-theme-subtle text-[9px] uppercase tracking-wider py-0.5 px-2">
              Boutiques
            </span>
          </div>

          <div className="flex items-center gap-3">
            {onViewAll && (
              <button
                type="button"
                onClick={onViewAll}
                className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-theme-primary hover:text-theme-secondary transition-colors cursor-pointer group"
              >
                <span>View All Boutiques</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            <span className="text-[10px] font-bold text-neutral-400 border border-neutral-200 px-2 py-0.5 rounded-full tracking-widest uppercase hidden md:inline-block">
              Sponsored
            </span>

            {/* Left & Right Scroller Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                aria-label="Scroll left"
                className={`p-2 rounded-full border transition-all cursor-pointer ${
                  canScrollLeft
                    ? 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 shadow-xs hover:border-[var(--theme-primary)] hover:text-theme-primary'
                    : 'border-neutral-100 bg-neutral-50 text-neutral-300 cursor-not-allowed opacity-50'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll('right')}
                disabled={!canScrollRight}
                aria-label="Scroll right"
                className={`p-2 rounded-full border transition-all cursor-pointer ${
                  canScrollRight
                    ? 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 shadow-xs hover:border-[var(--theme-primary)] hover:text-theme-primary'
                    : 'border-neutral-100 bg-neutral-50 text-neutral-300 cursor-not-allowed opacity-50'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Single Row Horizontal Scroller (Left-to-Right) */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex items-stretch gap-4 sm:gap-6 overflow-x-auto pb-4 no-scrollbar scroll-smooth flex-nowrap -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {spotlights.map((shop) => (
            <div
              key={shop.id}
              onClick={() => onSelectShop && onSelectShop(shop)}
              className="group relative shrink-0 w-[260px] sm:w-[280px] md:w-[300px] h-[360px] sm:h-[400px] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-end border border-neutral-100"
            >
              {/* Boutique Background Image */}
              <img
                src={shop.background_image}
                alt={shop.title || shop.shop_name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-106"
                onError={(e) => {
                  e.target.src =
                    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80'
                }}
              />

              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

              {/* Top Atelier Badge */}
              <div className="absolute top-3 left-3 z-10">
                <span className="inline-flex items-center gap-1 bg-black/60 backdrop-blur-md text-white font-medium text-[10px] px-2.5 py-1 rounded-full border border-white/10">
                  <Sparkles className="w-2.5 h-2.5 text-pink-300" />
                  Atelier
                </span>
              </div>

              {/* Content Overlay */}
              <div className="relative z-10 p-4 sm:p-5 w-full flex flex-col items-center text-center">
                <span className="text-xs uppercase tracking-widest text-pink-200 font-semibold">
                  Starting
                </span>
                <span className="text-base sm:text-lg font-black text-white tracking-wide drop-shadow-sm mb-0.5">
                  ₹{shop.price}
                </span>
                <span className="text-xs text-neutral-300 font-medium line-clamp-1 mb-3.5">
                  {shop.title || shop.shop_name}
                </span>

                {/* White Logo Pill at bottom */}
                <div className="w-full bg-white/95 backdrop-blur-xs rounded-xl py-2 px-3 shadow-md flex items-center justify-center transition-transform group-hover:scale-102 border border-neutral-100">
                  {shop.brand_logo ? (
                    <img
                      src={shop.brand_logo}
                      alt={shop.title}
                      className="h-5 sm:h-7 max-w-[140px] object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  ) : (
                    <span className="font-serif font-black tracking-widest text-neutral-900 text-xs uppercase flex items-center gap-1">
                      <span>{shop.title}</span>
                      <ArrowRight className="w-3 h-3 text-theme-primary" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
