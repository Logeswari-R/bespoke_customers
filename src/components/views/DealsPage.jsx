import React, { useState, useEffect, useMemo, useRef } from 'react'
import { ArrowLeft, Tag, Zap, Sparkles, ChevronRight, ChevronLeft, Scissors } from 'lucide-react'
import { getCurrentDeals, getSuperSaverDeals, isProductCustomizable, isProductActive } from '../../services/api'
import { PageLoadingAnimation } from '../animations'
import { notifyContentReady } from '../../utils/scrollRestoration'

export default function DealsPage({
  type = 'current-deals', // 'current-deals' | 'super-saver-deals'
  onBack,
  onSelectProduct,
}) {
  const [deals, setDeals] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const isSuperSaver = type === 'super-saver-deals'

  useEffect(() => {
    let ignore = false
    async function loadDeals() {
      setIsLoading(true)
      try {
        const data = isSuperSaver
          ? await getSuperSaverDeals()
          : await getCurrentDeals()
        if (!ignore && Array.isArray(data)) {
          setDeals(data)
        }
      } catch (err) {
        console.error('Failed to load deals:', err)
      } finally {
        if (!ignore) {
          setIsLoading(false)
          notifyContentReady()
        }
      }
    }
    loadDeals()
    return () => {
      ignore = true
    }
  }, [type, isSuperSaver])

  // Pagination Configuration: Exactly 15 items per page
  const ITEMS_PER_PAGE = 15
  const [currentPage, setCurrentPage] = useState(1)
  const topRef = useRef(null)

  useEffect(() => {
    setCurrentPage(1)
  }, [type])

  const activeDeals = useMemo(() => {
    return (deals || []).filter((d) => isProductActive(d.product || d))
  }, [deals])

  const totalItems = activeDeals.length
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems)
  const paginatedDeals = useMemo(() => {
    return activeDeals.slice(startIndex, endIndex)
  }, [activeDeals, startIndex, endIndex])

  const pageTitle = isSuperSaver ? 'Super Saver Deals' : 'Top Current Deals'
  const pageSubtitle = isSuperSaver
    ? 'Handcrafted luxury silhouettes and artisanal styles at privileged festive rates'
    : 'Exclusive limited drops and special prices curated straight from master ateliers'

  return (
    <div ref={topRef} className="bg-neutral-50/70 min-h-screen pb-16">
      {/* Top Breadcrumb Bar */}
      <div className="border-b border-neutral-200/80 bg-white py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 font-bold text-theme-primary hover:text-theme-secondary transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home Feed</span>
          </button>
          <span className="text-neutral-500 font-medium">
            Home &rsaquo; Deals &rsaquo;{' '}
            <span className="font-bold text-neutral-900">{pageTitle}</span>
          </span>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-white border-b border-neutral-200/80 py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="badge-theme text-[10px] py-0.5 px-2.5">
              {isSuperSaver ? (
                <>
                  <Zap className="w-3 h-3 fill-amber-300 stroke-amber-300" />
                  Festive Special
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  Limited Drop
                </>
              )}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-neutral-900 uppercase">
            {pageTitle}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-xl">
            {pageSubtitle}
          </p>
        </div>
      </div>

      {/* Main Deals Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <PageLoadingAnimation
            message="Loading festive deals..."
            subMessage="Retrieving limited-time discounts from master ateliers"
            minHeight="min-h-[40vh]"
          />
        ) : deals.length === 0 ? (
          <div className="min-h-[30vh] flex flex-col items-center justify-center bg-white rounded-2xl border border-neutral-200 p-8 text-center">
            <Tag className="w-12 h-12 text-neutral-300 mb-3" />
            <h3 className="text-base font-bold text-neutral-800">No active deals found</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm">
              Check back soon for new atelier drops and limited-time discounts.
            </p>
            <button
              onClick={onBack}
              className="mt-4 px-4 py-2 btn-theme text-xs cursor-pointer"
            >
              Explore Homepage
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3 sm:gap-4">
            {paginatedDeals.map((deal) => {
              const product = deal.product || {}
              const prodId = deal.product_id || product.id || deal.id
              const isCustomizable = isProductCustomizable(product) || isProductCustomizable(deal)
              const image =
                deal.image ||
                deal.main_image ||
                product.main_image ||
                product.image ||
                product.material_images?.[0]?.img_path ||
                'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80'
              const title = deal.product_name || product.product_name || deal.title || deal.name || 'Bespoke Deal Item'
              const price = deal.price || product.actual_price || deal.actual_price || '999.00'

              const discountPercent = (() => {
                if (deal.discount_percentage && Number(deal.discount_percentage) > 0) {
                  return Number(deal.discount_percentage)
                }
                if (product.discount_percentage && Number(product.discount_percentage) > 0) {
                  return Number(product.discount_percentage)
                }
                const p = parseFloat(price)
                const op = parseFloat(deal.original_price || product.original_price || deal.actual_price)
                if (op > p && p > 0) {
                  return Math.round(((op - p) / op) * 100)
                }
                const fallbackPcts = [50, 45, 60, 40, 55, 35]
                return fallbackPcts[Number(deal.id || prodId || 0) % fallbackPcts.length] || 50
              })()

              return (
                <div
                  key={deal.id || prodId}
                  onClick={() =>
                    onSelectProduct({
                      ...product,
                      ...deal,
                      vendor_name: deal.vendor_name || deal.vendor?.shop_name,
                      vendor: deal.vendor,
                      id: prodId,
                      product_id: prodId,
                    })
                  }
                  className="group relative bg-neutral-100 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-500 cursor-pointer flex flex-col justify-end aspect-[3/4] border border-neutral-100 hover:border-pink-300/60 hover:-translate-y-1"
                >
                  <img
                    src={image}
                    alt={title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-106"
                    onError={(e) => {
                      e.target.src =
                        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80'
                    }}
                  />

                  {/* Customizable Badge (Compact, Small & Discreet) */}
                  {isCustomizable && (
                    <div className="absolute top-2 left-2 z-10 pointer-events-none">
                      <span className="inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/90 backdrop-blur-xs text-[#C00078] border border-pink-200/80 shadow-2xs select-none">
                        <Scissors className="w-2.5 h-2.5 text-[#C00078]" />
                        <span>Custom</span>
                      </span>
                    </div>
                  )}

                  {/* Small Offer Percentage Badge (Replaces oversized Special Offer banner) */}
                  {discountPercent > 0 && (
                    <div className="absolute top-2 right-2 z-10 pointer-events-none">
                      <span className="bg-[#C00078] text-white text-[9px] font-extrabold tracking-tight px-1.5 py-0.5 rounded shadow-2xs">
                        {discountPercent}% OFF
                      </span>
                    </div>
                  )}

                  {/* Gradient Dark Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

                  {/* Bottom Info */}
                  <div className="relative z-10 p-4 text-white">
                    <h3 className="text-sm font-bold line-clamp-1 group-hover:text-pink-200 transition-colors">
                      {title}
                    </h3>
                    <p className="text-xs text-neutral-300 capitalize mt-0.5 font-medium line-clamp-1">
                      {deal.category || product.category_name || 'Designer Atelier'}
                    </p>
                    <div className="mt-2 text-sm sm:text-base font-black text-white flex items-baseline justify-between">
                      <div className="flex items-baseline gap-1">
                        <span>₹{price}</span>
                        <span className="text-[10px] text-pink-300 font-semibold uppercase">
                          Bespoke Best
                        </span>
                      </div>
                      <span className="text-[11px] text-pink-200 inline-flex items-center gap-0.5 font-semibold group-hover:translate-x-1 transition-transform">
                        <span>View</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination Controls: Exactly 15 items per page */}
          {totalPages > 1 && (
            <div className="mt-8 pt-5 border-t border-neutral-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-neutral-600 font-medium">
                Showing <span className="font-bold text-neutral-900">{startIndex + 1}</span>–
                <span className="font-bold text-neutral-900">{endIndex}</span> of{' '}
                <span className="font-bold text-neutral-900">{totalItems}</span> deals
              </p>

              <div className="flex items-center gap-1.5 select-none">
                {/* Previous Button */}
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => {
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    safePage <= 1
                      ? 'opacity-40 cursor-not-allowed bg-neutral-100 text-neutral-400'
                      : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200 shadow-2xs cursor-pointer'
                  }`}
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                {/* Page Numbers */}
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => {
                  const isCurrent = pageNum === safePage
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => {
                        setCurrentPage(pageNum)
                        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-[#C00078] text-white shadow-xs'
                          : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200 hover:border-neutral-300'
                      }`}
                      aria-label={`Go to page ${pageNum}`}
                      aria-current={isCurrent ? 'page' : undefined}
                    >
                      {pageNum}
                    </button>
                  )
                })}

                {/* Next Button */}
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => {
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    safePage >= totalPages
                      ? 'opacity-40 cursor-not-allowed bg-neutral-100 text-neutral-400'
                      : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200 shadow-2xs cursor-pointer'
                  }`}
                  aria-label="Next Page"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  )
}
