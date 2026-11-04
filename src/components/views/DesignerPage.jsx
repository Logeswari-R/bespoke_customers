import React, { useState, useEffect } from 'react'
import { ArrowLeft, Star, Heart, ShoppingBag, Sparkles } from 'lucide-react'
import { getDesignerDetails, getProducts } from '../../services/api'

export default function DesignerPage({
  designer,
  onBack,
  onSelectProduct,
  onAddToCart,
  wishlistIds = [],
  onToggleWishlist,
}) {
  const [designerData, setDesignerData] = useState(designer)
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const designerId = designer?.designer_id || designer?.id

  useEffect(() => {
    let ignore = false

    async function fetchDesignerInfoAndProducts() {
      if (!designerId) return
      setIsLoading(true)

      try {
        const details = await getDesignerDetails(designerId)
        if (!ignore && details) {
          setDesignerData((prev) => ({
            ...prev,
            id: details.id || prev?.id || designerId,
            designer_id: details.id || prev?.designer_id || designerId,
            designer_name:
              details.shop_name ||
              details.designer_name ||
              prev?.designer_name ||
              'Bespoke Couturier',
            designer_image:
              details.img_path ||
              details.designer_image ||
              prev?.designer_image ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
            designer_title:
              details.title ||
              details.designer_title ||
              prev?.designer_title ||
              'Haute Couture Atelier',
            designer_rating:
              details.rating ||
              details.designer_rating ||
              prev?.designer_rating ||
              '5.0',
            description: details.description || prev?.description,
          }))

          if (Array.isArray(details.products) && details.products.length > 0) {
            setProducts(details.products)
          } else {
            const allProds = await getProducts({ limit: 16 })
            if (!ignore) setProducts(allProds || [])
          }
        } else {
          const allProds = await getProducts({ limit: 16 })
          if (!ignore) setProducts(allProds || [])
        }
      } catch (err) {
        console.error('Error fetching designer details:', err)
        const allProds = await getProducts({ limit: 16 })
        if (!ignore) setProducts(allProds || [])
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    fetchDesignerInfoAndProducts()
    window.scrollTo({ top: 0, behavior: 'smooth' })

    return () => {
      ignore = true
    }
  }, [designerId])

  const currentDesigner = designerData || designer || {}
  const designerName = currentDesigner.designer_name || 'Bespoke Couturier'
  const designerImage =
    currentDesigner.designer_image ||
    currentDesigner.img_path ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'
  const designerTitle =
    currentDesigner.designer_title ||
    currentDesigner.title ||
    'Haute Couture & Bespoke Fashion'
  const designerRating =
    currentDesigner.designer_rating || currentDesigner.rating || '5.0'

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
            Home &rsaquo; Top Designers &rsaquo;{' '}
            <span className="font-bold text-neutral-900">{designerName}</span>
          </span>
        </div>
      </div>

      {/* Designer Profile Header - Haute Couture Atelier Styling */}
      <div className="bg-[#0c0c10] text-white py-12 sm:py-16 relative overflow-hidden border-b border-neutral-900">
        <div
          className="absolute -top-32 right-1/4 w-[500px] h-[300px] rounded-full blur-[120px] pointer-events-none opacity-25"
          style={{
            background:
              'radial-gradient(circle, var(--theme-primary) 0%, var(--theme-secondary) 100%)',
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left relative z-10">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl shrink-0 bg-neutral-900 p-0.5">
            <img
              src={designerImage}
              alt={designerName}
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                e.target.src =
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'
              }}
            />
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
              <span className="badge-theme text-[10px]">
                <Sparkles className="w-2.5 h-2.5" />
                Verified Couturier
              </span>
              {designerRating && (
                <span className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-md text-white text-xs font-bold px-2.5 py-0.5 rounded-full border border-white/10">
                  <span>{designerRating}</span>
                  <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {designerName}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-lg">
              Specializing in {designerTitle}. Handcrafted precision direct from
              verified ateliers.
            </p>
          </div>
        </div>
      </div>

      {/* Designer Products */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h2 className="text-lg sm:text-xl font-bold text-neutral-900 mb-6">
          Curated Pieces by {designerName} ({products.length})
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="aspect-[3/4] bg-neutral-200 animate-pulse rounded-2xl"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((p) => {
              const isWishlisted = wishlistIds.map(Number).includes(Number(p.id))
              const price = p.discount_price || p.actual_price || 499
              const img =
                p.image ||
                p.img_path ||
                p.main_image ||
                'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=600&q=80'

              return (
                <div
                  key={p.id}
                  onClick={() => onSelectProduct(p)}
                  className="group card-luxury overflow-hidden flex flex-col cursor-pointer"
                >
                  <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
                    <img
                      src={img}
                      alt={p.product_name}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-106"
                      onError={(e) => {
                        e.target.src =
                          'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=600&q=80'
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onToggleWishlist) onToggleWishlist(p)
                      }}
                      className="absolute top-2.5 right-2.5 p-2 rounded-full bg-white/90 shadow-sm"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isWishlisted
                            ? 'fill-[var(--theme-primary)] stroke-[var(--theme-primary)]'
                            : 'text-neutral-600'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-neutral-900 group-hover:text-theme-primary transition-colors line-clamp-1">
                        {p.product_name}
                      </h3>
                      <p className="text-[11px] text-neutral-500">{designerName}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                      <span className="text-sm sm:text-base font-extrabold text-theme-primary">
                        ₹{price}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAddToCart(p)
                        }}
                        className="p-2 bg-theme-gradient text-white rounded-lg cursor-pointer shadow-xs"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                      </button>
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
