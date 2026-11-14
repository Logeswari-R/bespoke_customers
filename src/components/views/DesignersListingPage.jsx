import React, { useState, useEffect } from 'react'
import { ArrowLeft, Star, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react'
import { getDesigners } from '../../services/api'
import { PageLoadingAnimation } from '../animations'
import { notifyContentReady } from '../../utils/scrollRestoration'

export default function DesignersListingPage({
  onBack,
  onSelectDesigner,
}) {
  const [designers, setDesigners] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    async function loadDesigners() {
      setIsLoading(true)
      try {
        const data = await getDesigners()
        if (!ignore && Array.isArray(data)) {
          setDesigners(data)
        }
      } catch (err) {
        console.error('Failed to load designers from API:', err)
      } finally {
        if (!ignore) {
          setIsLoading(false)
          notifyContentReady()
        }
      }
    }
    loadDesigners()
    return () => {
      ignore = true
    }
  }, [])

  return (
    <div className="bg-[#0c0c10] text-white min-h-screen pb-20">
      {/* Top Breadcrumb Bar */}
      <div className="border-b border-neutral-900 bg-black/40 backdrop-blur-md py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 font-bold text-pink-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home Feed</span>
          </button>
          <span className="text-neutral-400 font-medium">
            Home &rsaquo;{' '}
            <span className="font-bold text-white uppercase">Top Designers</span>
          </span>
        </div>
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden py-12 sm:py-16 border-b border-neutral-900">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] pointer-events-none opacity-25"
          style={{
            background:
              'radial-gradient(circle, var(--theme-primary) 0%, var(--theme-secondary) 100%)',
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 badge-theme mb-3">
            <Sparkles className="w-3.5 h-3.5 text-pink-200" />
            <span>Master Couturiers & Ateliers</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white drop-shadow-md">
            Top <span className="text-theme-gradient">Designers</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 font-normal mt-2 max-w-xl">
            Unmatched silhouettes, handcrafted couture, and custom tailoring direct from
            celebrated fashion designers.
          </p>
        </div>
      </div>

      {/* Designers Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {isLoading ? (
          <PageLoadingAnimation
            message="Loading master designers..."
            subMessage="Connecting to renowned atelier creators"
            minHeight="min-h-[40vh]"
            className="bg-transparent"
          />
        ) : designers.length === 0 ? (
          <div className="min-h-[30vh] flex flex-col items-center justify-center bg-white/5 rounded-2xl border border-white/10 p-8 text-center">
            <Sparkles className="w-12 h-12 text-neutral-600 mb-3" />
            <h3 className="text-base font-bold text-white">No designers found</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm">
              Please check back soon as new ateliers join the Bespoke collective.
            </p>
            <button
              onClick={onBack}
              className="mt-4 px-4 py-2 btn-theme text-xs cursor-pointer"
            >
              Explore Homepage
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {designers.map((designer) => (
              <div
                key={designer.id}
                onClick={() => onSelectDesigner && onSelectDesigner(designer)}
                className="group card-atelier relative overflow-hidden cursor-pointer flex flex-col justify-end aspect-[3/4] border border-white/10 hover:border-pink-500/50 transition-all rounded-2xl"
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
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur-xs text-neutral-900 px-2 py-0.5 rounded-md shadow-xs">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Verified Atelier
                  </span>
                </div>

                {/* Gradient Dark Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent opacity-90 group-hover:opacity-95 transition-opacity" />

                {/* Designer Info at Bottom */}
                <div className="relative z-10 p-5 text-white">
                  <h3 className="text-lg font-bold tracking-tight line-clamp-1 group-hover:text-pink-300 transition-colors">
                    {designer.designer_name}
                  </h3>
                  <p className="text-xs text-neutral-300 font-medium mt-0.5 line-clamp-1">
                    {designer.designer_title || 'Haute Couture Couturier'}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-pink-300 group-hover:text-pink-200">
                    <span>Explore Atelier Collection</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

