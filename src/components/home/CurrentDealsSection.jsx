import React, { useRef, useState, useEffect } from 'react'
import { Tag, ChevronLeft, ChevronRight } from 'lucide-react'

export default function CurrentDealsSection({
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

  // Fallback demo images for items without image
  const fallbackImages = {
    417: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80',
    418: 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&fit=crop&w=600&q=80',
  }

  const getDealCategoryName = (catId) => {
    switch (String(catId)) {
      case '44':
        return 'Menswear'
      case '46':
        return 'Girls Clothing'
      case '45':
        return 'Boys Clothing'
      case '48':
        return 'Indian & Fusion Wear'
      default:
        return 'Designer Fashion'
    }
  }

  const getPrice = (deal) => {
    if (deal.price) return deal.price
    if (deal.product?.id === 417) return '1288.00'
    if (deal.product?.id === 418) return '1000.00'
    return '999.00'
  }

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
              <span className="text-theme-gradient">Top Current Deals</span>
            </h2>
            <span className="badge-theme-subtle text-[9px] uppercase tracking-wider py-0.5 px-2">
              Limited Drop
            </span>
          </div>

          <div className="flex items-center gap-3">
            {onViewAll && (
              <button
                type="button"
                onClick={onViewAll}
                className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-theme-primary hover:text-theme-secondary transition-colors cursor-pointer group"
              >
                <span>View All Deals</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            <span className="text-[10px] font-bold text-neutral-400 border border-neutral-200 px-2 py-0.5 rounded-full tracking-widest uppercase hidden md:inline-block">
              Exclusive
            </span>

            {/* Left & Right Scroller Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                aria-label="Previous deals"
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
                aria-label="Next deals"
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
          {deals.map((deal) => {
            const product = deal.product || {}
            const image =
              product.main_image ||
              product.material_images?.[0]?.img_path ||
              fallbackImages[product.id] ||
              'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80'
            const price = getPrice(deal)

            return (
              <div
                key={deal.id}
                onClick={() => onSelectDeal && onSelectDeal(deal)}
                className="group relative bg-neutral-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-end shrink-0 w-[240px] sm:w-[260px] md:w-[280px] aspect-[3/4]"
              >
                {/* Product Image */}
                <img
                  src={image}
                  alt={product.product_name || deal.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-106"
                  onError={(e) => {
                    e.target.src =
                      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80'
                  }}
                />

                {/* Theme Gradient Offer Badge at Top Right */}
                <div className="absolute top-2.5 right-2.5 z-10">
                  <span className="badge-theme text-[10px] py-1 px-2.5 shadow-md">
                    <Tag className="w-2.5 h-2.5" />
                    Special Offer
                  </span>
                </div>

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

                {/* Bottom Product Details */}
                <div className="relative z-10 p-4 text-white">
                  <h3 className="text-sm font-bold line-clamp-1 group-hover:text-pink-200 transition-colors">
                    {product.product_name || deal.name}
                  </h3>
                  <p className="text-xs text-neutral-300 capitalize mt-0.5 font-medium">
                    {getDealCategoryName(product.category)}
                  </p>
                  <div className="mt-2 text-sm sm:text-base font-black text-white flex items-baseline gap-1">
                    <span>₹{price}</span>
                    <span className="text-[10px] text-pink-300 font-semibold uppercase">Bespoke Best</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
