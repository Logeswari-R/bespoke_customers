import React, { useState, useEffect } from 'react'
import { ArrowLeft, Tag, Zap, Sparkles, ChevronRight } from 'lucide-react'
import { getCurrentDeals, getSuperSaverDeals } from '../../services/api'

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
        if (!ignore) setIsLoading(false)
      }
    }
    loadDeals()
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return () => {
      ignore = true
    }
  }, [type, isSuperSaver])

  const pageTitle = isSuperSaver ? 'Super Saver Deals' : 'Top Current Deals'
  const pageSubtitle = isSuperSaver
    ? 'Handcrafted luxury silhouettes and artisanal styles at privileged festive rates'
    : 'Exclusive limited drops and special prices curated straight from master ateliers'

  return (
    <div className="bg-neutral-50/70 min-h-screen pb-16">
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
          <div className="min-h-[40vh] flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-xs font-semibold text-neutral-500">
              Loading latest deals from API...
            </p>
          </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {deals.map((deal) => {
              const product = deal.product || {}
              const prodId = deal.product_id || product.id || deal.id
              const image =
                deal.image ||
                deal.main_image ||
                product.main_image ||
                product.image ||
                product.material_images?.[0]?.img_path ||
                'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80'
              const title = deal.name || product.product_name || deal.product_name || 'Bespoke Deal Item'
              const price = deal.price || product.actual_price || deal.actual_price || '999.00'

              return (
                <div
                  key={deal.id || prodId}
                  onClick={() =>
                    onSelectProduct({
                      ...product,
                      ...deal,
                      id: prodId,
                      product_id: prodId,
                    })
                  }
                  className="group relative bg-neutral-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-end aspect-[3/4]"
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

                  {/* Offer Badge */}
                  <div className="absolute top-2.5 right-2.5 z-10">
                    <span className="badge-theme text-[10px] py-1 px-2.5 shadow-md">
                      <Tag className="w-2.5 h-2.5" />
                      Special Offer
                    </span>
                  </div>

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
        )}
      </div>
    </div>
  )
}
