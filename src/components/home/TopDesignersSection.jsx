import React, { useRef, useState, useEffect } from 'react'
import { Star, Sparkles, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

export default function TopDesignersSection({
  designers = [],
  onSelectDesigner,
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
  }, [designers])

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

  if (!designers || designers.length === 0) return null

  return (
    <section className="py-12 bg-[#0c0c10] text-white relative overflow-hidden border-y border-neutral-900">
      {/* Ambient background glow accents matching the logo gradient */}
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle, var(--theme-primary) 0%, var(--theme-secondary) 100%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header with Left & Right Scroller Controls */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 badge-theme mb-2.5">
              <Sparkles className="w-3 h-3 text-pink-200" />
              <span>Couture Atelier</span>
            </div>
            <h2
              onClick={onViewAll}
              className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white uppercase drop-shadow-sm transition-opacity ${
                onViewAll ? 'cursor-pointer hover:opacity-90' : ''
              }`}
            >
              Top <span className="text-theme-gradient">Designers</span>
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-normal mt-1.5 max-w-md">
              Unmatched silhouettes & handcrafted couture for a fresh signature start
            </p>
          </div>

          <div className="flex items-center gap-4">
            {onViewAll && (
              <button
                type="button"
                onClick={onViewAll}
                className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-pink-300 hover:text-white transition-colors cursor-pointer group"
              >
                <span>View All Designers</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            {/* Left & Right Scroller Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                aria-label="Previous designers"
                className={`p-2.5 rounded-full border transition-all cursor-pointer ${
                  canScrollLeft
                    ? 'border-white/20 bg-white/10 hover:bg-white/20 text-white shadow-xs hover:border-[var(--theme-primary)] hover:text-pink-300'
                    : 'border-white/5 bg-white/5 text-neutral-600 cursor-not-allowed opacity-40'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll('right')}
                disabled={!canScrollRight}
                aria-label="Next designers"
                className={`p-2.5 rounded-full border transition-all cursor-pointer ${
                  canScrollRight
                    ? 'border-white/20 bg-white/10 hover:bg-white/20 text-white shadow-xs hover:border-[var(--theme-primary)] hover:text-pink-300'
                    : 'border-white/5 bg-white/5 text-neutral-600 cursor-not-allowed opacity-40'
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
          {designers.map((designer) => (
            <div
              key={designer.id}
              onClick={() => onSelectDesigner && onSelectDesigner(designer)}
              className="group card-atelier relative overflow-hidden cursor-pointer flex flex-col justify-end shrink-0 w-[240px] sm:w-[260px] md:w-[280px] aspect-[3/4]"
            >
              {/* Designer Image */}
              <img
                src={designer.designer_image}
                alt={designer.designer_name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                onError={(e) => {
                  e.target.src =
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'
                }}
              />

              {/* Rating Badge at Top Right */}
              {designer.designer_rating && (
                <div className="absolute top-3 right-3 z-10">
                  <span className="inline-flex items-center gap-1 bg-black/75 backdrop-blur-md text-white font-bold text-xs px-2.5 py-1 rounded-full border border-white/10 shadow-lg">
                    <span>{designer.designer_rating}</span>
                    <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
                  </span>
                </div>
              )}

              {/* Verified Atelier Tag at Top Left */}
              <div className="absolute top-3 left-3 z-10">
                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur-xs text-neutral-900 px-2 py-0.5 rounded-md shadow-xs">
                  Verified
                </span>
              </div>

              {/* Gradient Dark Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 group-hover:opacity-95 transition-opacity" />

              {/* Designer Info at Bottom */}
              <div className="relative z-10 p-4 sm:p-5 text-white">
                <h3 className="text-base sm:text-lg font-bold tracking-tight line-clamp-1 group-hover:text-pink-300 transition-colors">
                  {designer.designer_name}
                </h3>
                <p className="text-xs text-neutral-300 font-medium mt-0.5 line-clamp-1">
                  {designer.designer_title || 'Haute Couture Designer'}
                </p>

                {/* Subtle explore prompt on hover */}
                <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-semibold text-pink-300 opacity-90 group-hover:opacity-100">
                  <span>View Atelier</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
