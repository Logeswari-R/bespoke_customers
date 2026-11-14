import React, { useRef, useState, useEffect } from 'react'
import { Star, Sparkles, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'

export default function TopDesignersSection({
  designers = [],
  onSelectDesigner,
  onViewAll,
  variant = 'bespoke', // 'bespoke' | 'white'
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
      const scrollAmount = 240
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
      setTimeout(checkScroll, 350)
    }
  }

  if (!designers || designers.length === 0) return null

  const isBespoke = variant === 'bespoke'

  return (
    <section
      className={`py-10 relative overflow-hidden transition-colors duration-300 ${
        isBespoke
          ? 'bg-gradient-to-br from-[#9E1478] via-[#D6007A] to-[#B80068] border-y border-white/20 shadow-inner'
          : 'bg-white border-b border-neutral-100'
      }`}
    >
      {/* Background Architectural Cuts & Ambient Glow Design */}
      {isBespoke ? (
        <>
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-black/15 blur-3xl pointer-events-none" />
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
        </>
      ) : (
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full blur-[140px] pointer-events-none opacity-25"
          style={{
            background: 'radial-gradient(circle, #fce7f3 0%, #fdf2f8 100%)',
          }}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header with Left & Right Scroller Controls */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h2
                onClick={onViewAll}
                className={`text-xl sm:text-2xl font-black tracking-tight transition-opacity ${
                  isBespoke ? 'text-white drop-shadow-xs' : 'font-extrabold text-neutral-900'
                } ${onViewAll ? 'cursor-pointer hover:opacity-90' : ''}`}
              >
                {isBespoke ? (
                  <>
                    Top <span className="text-pink-200">Designers</span>
                  </>
                ) : (
                  <>
                    Top <span className="text-theme-gradient">Designers</span>
                  </>
                )}
              </h2>
              {/* Cut-Corner Asymmetric Atelier Badge */}
              <span
                className={`text-[9px] uppercase tracking-wider py-0.5 px-2.5 rounded-tl-xl rounded-br-xl rounded-tr-xs rounded-bl-xs font-bold border shadow-xs ${
                  isBespoke
                    ? 'text-white bg-white/20 backdrop-blur-md border-white/30'
                    : 'badge-theme-subtle border-pink-200 text-[#D6007A]'
                }`}
              >
                Couture Atelier
              </span>
            </div>
            <p className={`text-xs ${isBespoke ? 'text-pink-100 font-medium' : 'text-neutral-500 font-normal'}`}>
              Unmatched silhouettes & handcrafted couture for a fresh signature start
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onViewAll && (
              <button
                type="button"
                onClick={onViewAll}
                className={`hidden sm:inline-flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer group ${
                  isBespoke
                    ? 'text-white hover:text-pink-100 drop-shadow-2xs'
                    : 'text-theme-primary hover:text-theme-secondary'
                }`}
              >
                <span>View All Designers</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            <span
              className={`text-[10px] font-bold border px-2 py-0.5 rounded-full tracking-widest uppercase hidden md:inline-block ${
                isBespoke
                  ? 'text-pink-100 border-white/30 bg-white/10 backdrop-blur-xs'
                  : 'text-neutral-400 border-neutral-200'
              }`}
            >
              Exclusive
            </span>

            {/* Left & Right Scroller Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                aria-label="Previous designers"
                className={`p-2 rounded-full border transition-all cursor-pointer ${
                  isBespoke
                    ? canScrollLeft
                      ? 'border-white/40 bg-white/20 hover:bg-white text-white hover:text-[#D6007A] shadow-md active:scale-95 backdrop-blur-md'
                      : 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed opacity-40'
                    : canScrollLeft
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
                aria-label="Next designers"
                className={`p-2 rounded-full border transition-all cursor-pointer ${
                  isBespoke
                    ? canScrollRight
                      ? 'border-white/40 bg-white/20 hover:bg-white text-white hover:text-[#D6007A] shadow-md active:scale-95 backdrop-blur-md'
                      : 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed opacity-40'
                    : canScrollRight
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
          {designers.map((designer) => (
            <div
              key={designer.id}
              onClick={() => onSelectDesigner && onSelectDesigner(designer)}
              className={`group relative rounded-3xl rounded-tr-lg overflow-hidden transition-all duration-500 cursor-pointer flex flex-col justify-end shrink-0 w-[190px] sm:w-[210px] md:w-[225px] aspect-[3/4] hover:-translate-y-1.5 bg-neutral-100 ${
                isBespoke
                  ? 'border-2 border-white/25 hover:border-white shadow-lg hover:shadow-2xl'
                  : 'border border-neutral-200/80 hover:border-pink-400/80 shadow-xs hover:shadow-xl'
              }`}
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
                <div className="absolute top-2.5 right-2.5 z-10">
                  <span className="inline-flex items-center gap-1 bg-black/60 backdrop-blur-md text-white font-bold text-[10px] px-2 py-0.5 rounded-md border border-white/15 shadow-2xs">
                    <span>{Number(designer.designer_rating) ? Number(designer.designer_rating).toFixed(1) : designer.designer_rating}</span>
                    <Star className="w-2.5 h-2.5 fill-amber-400 stroke-amber-400" />
                  </span>
                </div>
              )}

              {/* Verified Atelier Tag at Top Left */}
              <div className="absolute top-2.5 left-2.5 z-10">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur-md text-neutral-900 px-2 py-0.5 rounded-md shadow-2xs border border-white/70">
                  <Sparkles className="w-2.5 h-2.5 text-theme-primary" />
                  <span>Verified</span>
                </span>
              </div>

              {/* Smooth Dark Gradient Vignette for Legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent transition-opacity group-hover:from-black/90" />

              {/* Designer Info at Bottom */}
              <div className="relative z-10 p-3.5 sm:p-4 text-white">
                <h3 className="text-sm sm:text-base font-bold tracking-tight line-clamp-1 capitalize group-hover:text-pink-200 transition-colors">
                  {designer.designer_name}
                </h3>
                <p className="text-[11px] text-pink-200/90 font-medium mt-0.5 line-clamp-1 capitalize">
                  {designer.designer_title || 'Haute Couture Designer'}
                </p>

                {/* Refined explore prompt pill */}
                <div className="mt-2.5 py-1 px-2.5 rounded-lg bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-between text-[10.5px] font-bold text-white group-hover:bg-white group-hover:text-neutral-900 group-hover:border-white transition-all shadow-xs">
                  <span>Explore Atelier</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
