import React, { useRef, useState, useEffect } from 'react'
import { Sparkles, Zap, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

export default function SuperSaverDealsSection({
  deals = [],
  onSelectDeal,
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
  }, [deals])

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
      setTimeout(checkScroll, 350)
    }
  }

  if (!deals || deals.length === 0) return null

  return (
    <section className="py-12 bg-gradient-to-b from-neutral-50 via-pink-50/25 to-neutral-50 border-b border-neutral-200/70 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Left-Right Scroller Controls */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 badge-theme mb-2">
              <Zap className="w-3 h-3 text-amber-200 fill-amber-200" />
              <span>Limited Celebration Offer</span>
            </div>
            <h2
              onClick={onViewAll}
              className={`text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-wider text-neutral-900 transition-opacity ${
                onViewAll ? 'cursor-pointer hover:opacity-90' : ''
              }`}
            >
              Super <span className="text-theme-gradient">Saver Deals</span>
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 font-medium mt-1 max-w-md">
              Handcrafted luxury silhouettes and artisanal styles at privileged festive rates
            </p>
          </div>

          <div className="flex items-center gap-4">
            {onViewAll && (
              <button
                type="button"
                onClick={onViewAll}
                className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-theme-primary hover:text-theme-secondary transition-colors cursor-pointer group"
              >
                <span>View All Super Savers</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            {/* Left & Right Scroller Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                aria-label="Previous super savers"
                className={`p-2.5 rounded-full border transition-all cursor-pointer ${
                  canScrollLeft
                    ? 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 shadow-xs hover:border-[var(--theme-primary)] hover:text-theme-primary'
                    : 'border-neutral-200/50 bg-neutral-100 text-neutral-300 cursor-not-allowed opacity-50'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll('right')}
                disabled={!canScrollRight}
                aria-label="Next super savers"
                className={`p-2.5 rounded-full border transition-all cursor-pointer ${
                  canScrollRight
                    ? 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 shadow-xs hover:border-[var(--theme-primary)] hover:text-theme-primary'
                    : 'border-neutral-200/50 bg-neutral-100 text-neutral-300 cursor-not-allowed opacity-50'
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
          {deals.map((deal) => {
            const product = deal.product || {}
            const image =
              product.main_image ||
              product.material_images?.[0]?.img_path ||
              'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80'

            return (
              <div
                key={deal.id}
                onClick={() => onSelectDeal && onSelectDeal(deal)}
                className="group card-luxury overflow-hidden cursor-pointer flex flex-col justify-between shrink-0 w-[240px] sm:w-[260px] md:w-[280px]"
              >
                {/* Product Image Box */}
                <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
                  <img
                    src={image}
                    alt={deal.title || product.product_name}
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-106"
                    onError={(e) => {
                      e.target.src =
                        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80'
                    }}
                  />

                  {/* Top Flash Tag */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className="badge-theme text-[10px] shadow-sm py-1 px-2.5">
                      <Sparkles className="w-2.5 h-2.5" />
                      Special Deal
                    </span>
                  </div>
                </div>

                {/* Info Bar underneath */}
                <div className="p-3.5 bg-neutral-900 flex items-center justify-between text-white border-b border-neutral-800">
                  <span className="text-xs sm:text-sm font-bold truncate pr-2 group-hover:text-pink-300 transition-colors">
                    {deal.title || product.product_name}
                  </span>
                  <span className="bg-theme-gradient text-white font-black text-xs px-2.5 py-1 rounded-full shadow-xs shrink-0">
                    {deal.price}
                  </span>
                </div>

                {/* Brand Logo Pill */}
                <div className="p-3 bg-white flex items-center justify-center min-h-[46px]">
                  {deal.brand_logo ? (
                    <img
                      src={deal.brand_logo}
                      alt="Brand Logo"
                      className="h-5 sm:h-6 max-w-[120px] object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  ) : (
                    <span className="text-[11px] font-black uppercase text-neutral-800 tracking-wider flex items-center gap-1 group-hover:text-theme-primary transition-colors">
                      <span>Bespoke Curated</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
