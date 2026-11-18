import React, { useState, useEffect } from 'react'
import { ArrowLeft, Star, Heart, ShoppingBag, Sparkles, Zap, Check, Scissors } from 'lucide-react'
import { getDesignerDetails, getProducts, isProductCustomizable } from '../../services/api'
import { notifyContentReady } from '../../utils/scrollRestoration'

export default function DesignerPage({
  designer,
  onBack,
  onSelectProduct,
  onAddToCart,
  wishlistIds = [],
  onToggleWishlist,
  cartItems = [],
  onOpenCart,
  onBuyNow,
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
        const targetVendorId = details?.id || details?.designer_id || designerId

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
            // Fetch strictly for this designer's vendor_id
            const vendorProds = await getProducts({ vendor_id: targetVendorId })
            if (!ignore) {
              const matched = Array.isArray(vendorProds)
                ? vendorProds.filter(
                    (p) => String(p.vendor_id) === String(targetVendorId)
                  )
                : []
              setProducts(matched)
            }
          }
        } else {
          // Fallback if details endpoint unavailable: query strictly by vendor_id
          const vendorProds = await getProducts({ vendor_id: targetVendorId })
          if (!ignore) {
            const matched = Array.isArray(vendorProds)
              ? vendorProds.filter(
                  (p) => String(p.vendor_id) === String(targetVendorId)
                )
              : []
            setProducts(matched)
          }
        }
      } catch (err) {
        console.error('Error fetching designer details:', err)
        if (!ignore) setProducts([])
      } finally {
        if (!ignore) {
          setIsLoading(false)
          notifyContentReady()
        }
      }
    }

    fetchDesignerInfoAndProducts()

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
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
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
        ) : products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-pink-100 p-12 text-center max-w-md mx-auto shadow-xs">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-pink-50 flex items-center justify-center text-[var(--theme-primary)]">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 mb-1">
              New Collection Arriving Soon
            </h3>
            <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
              {designerName} is handcrafting bespoke silhouettes for this atelier collection. Check back soon for exclusive drops.
            </p>
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-2.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
            >
              Explore Other Designers
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3 sm:gap-4">
            {products.map((p) => {
              const isWishlisted = wishlistIds.map(Number).includes(Number(p.id))
              const price = p.discount_price || p.price || p.actual_price || 499
              const originalPrice = p.original_price || p.actual_price || p.price || price
              const img =
                p.image ||
                p.img_path ||
                p.main_image ||
                (Array.isArray(p.images) && p.images[0]) ||
                'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=600&q=80'

              const isCustomizable = isProductCustomizable(p)
              const discountPct =
                p.discount_percentage > 0
                  ? p.discount_percentage
                  : originalPrice > price && originalPrice > 0
                  ? Math.round(((originalPrice - price) / originalPrice) * 100)
                  : 0

              return (
                <div
                  key={p.id}
                  onClick={() => onSelectProduct(p)}
                  className="group card-luxury overflow-hidden flex flex-col cursor-pointer"
                >
                  <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
                    <img
                      src={img}
                      alt={p.product_name || p.name || 'Product'}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-106"
                      onError={(e) => {
                        e.target.src =
                          'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=600&q=80'
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

                    {/* Small Offer Percentage Badge */}
                    {discountPct > 0 && (
                      <div className="absolute top-2 right-9 z-10 pointer-events-none">
                        <span className="bg-[#C00078] text-white text-[8.5px] font-extrabold tracking-tight px-1.5 py-0.5 rounded shadow-2xs">
                          {discountPct}% OFF
                        </span>
                      </div>
                    )}

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

                  {/* Product Info Section (Redesigned with Strict Alignment & Tokens) */}
                  <div className="p-4 flex-1 flex flex-col justify-between bg-white text-left">
                    <div className="flex-1 flex flex-col">
                      {/* Row 1: Product name on left corner & Custom badge on right corner */}
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className="text-[16px] font-semibold text-[#24212A] leading-snug line-clamp-2 text-left group-hover:text-[#C00078] transition-colors break-words flex-1"
                          title={p.product_name || p.name || 'Curated Silhouette'}
                        >
                          {p.product_name || p.name || 'Curated Silhouette'}
                        </h3>

                        {isCustomizable && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C00078] bg-[#FFF1F8] border border-[#F8D4E8] px-2 py-0.5 rounded-[6px] shrink-0 select-none mt-0.5">
                            <Scissors className="w-2.5 h-2.5 text-[#C00078]" />
                            <span>CUSTOM</span>
                          </span>
                        )}
                      </div>

                      {/* Row 2: Vendor / shop name */}
                      <p
                        className="text-[13.5px] font-normal text-[#77717C] text-left truncate mt-1"
                        title={p.vendor_name || designerName}
                      >
                        {p.vendor_name || designerName}
                      </p>
                    </div>

                    {/* 4. Subtle divider & 5. Horizontal Price Layout */}
                    <div className="border-t border-[#F0E5EC] mt-3 pt-3 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-[20px] font-bold text-[#C00078] leading-none">
                          ₹{price}
                        </span>
                        {Number(originalPrice) > Number(price) ? (
                          <span className="text-[13.5px] font-normal text-[#999999] line-through leading-none">
                            ₹{originalPrice}
                          </span>
                        ) : null}
                        {discountPct > 0 && (
                          <span className="inline-flex items-center text-[10.5px] font-bold text-[#C00078] bg-[#FFF1F8] border border-[#F8D4E8] px-1.5 py-0.5 rounded-[5px] leading-none">
                            {discountPct}% OFF
                          </span>
                        )}
                      </div>

                      {(() => {
                        const prodId = Number(p.product_id || p.id)
                        const targetMatId = p.material_id || p.variant_id || p.selectedMaterialId || null
                        const isInCart = cartItems.some((c) => {
                          const sameProd = Number(c.product_id || c.product?.id || c.id) === prodId
                          if (!sameProd) return false
                          if (targetMatId) {
                            const itemMatId = c.material_id || c.materialId || null
                            if (itemMatId && String(itemMatId) !== String(targetMatId)) return false
                          }
                          return true
                        })
                        return (
                          <div className="flex items-center gap-1.5">
                            {isInCart ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (onOpenCart) onOpenCart()
                                }}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg cursor-pointer shadow-2xs flex items-center gap-1 transition-colors"
                                title="In Bag - Go to Bag"
                              >
                                <Check className="w-3 h-3" />
                                <span className="hidden sm:inline">In Bag</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onAddToCart(p)
                                }}
                                className="p-1.5 bg-[#C00078] hover:bg-[#A80069] text-white rounded-lg cursor-pointer shadow-2xs flex items-center justify-center transition-colors"
                                aria-label="Add to bag"
                                title="Add to Bag"
                              >
                                <ShoppingBag className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (onBuyNow) {
                                  onBuyNow(p)
                                } else if (onSelectProduct) {
                                  onSelectProduct(p)
                                }
                              }}
                              className="px-2.5 py-1 bg-[#222222] hover:bg-[#111111] text-white text-[11px] font-bold rounded-lg cursor-pointer shadow-2xs flex items-center gap-1 transition-colors"
                              title="Buy Now"
                            >
                              <Zap className="w-3 h-3 text-amber-400" />
                              <span>Buy</span>
                            </button>
                          </div>
                        )
                      })()}
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
