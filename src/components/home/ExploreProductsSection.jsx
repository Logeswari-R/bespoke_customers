import React from 'react'
import { Heart, ShoppingBag } from 'lucide-react'

export default function ExploreProductsSection({
  products = [],
  wishlistIds = [],
  onToggleWishlist,
  onAddToCart,
  onSelectProduct,
}) {
  if (!products || products.length === 0) return null

  return (
    <section className="py-10 bg-neutral-50/70 border-b border-neutral-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-900">
              Explore More <span className="text-theme-gradient">Creations</span>
            </h2>
            <span className="badge-theme-subtle text-[9px] uppercase tracking-wider py-0.5 px-2">
              Atelier Direct
            </span>
          </div>
          <span className="text-xs text-neutral-500 font-medium">
            {products.length} Curated Styles
          </span>
        </div>

        {/* 2-Column Mobile, 4-Column Desktop Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((product) => {
            const isWishlisted = wishlistIds.map(Number).includes(Number(product.id))
            const price = product.discount_price || product.actual_price || product.price
            const originalPrice = product.actual_price || product.original_price

            return (
              <div
                key={product.id}
                onClick={() => onSelectProduct && onSelectProduct(product)}
                className="group card-luxury overflow-hidden flex flex-col cursor-pointer"
              >
                {/* Product Image */}
                <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
                  <img
                    src={product.image || product.img_path}
                    alt={product.product_name || product.title}
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-106"
                    onError={(e) => {
                      e.target.src =
                        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80'
                    }}
                  />

                  {/* Wishlist Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (onToggleWishlist) onToggleWishlist(product)
                    }}
                    className={`absolute top-2.5 right-2.5 p-2 rounded-full transition-all cursor-pointer shadow-sm ${
                      isWishlisted
                        ? 'bg-pink-50 text-theme-primary'
                        : 'bg-white/90 text-neutral-600 hover:text-black hover:bg-white'
                    }`}
                    aria-label="Toggle Wishlist"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        isWishlisted ? 'fill-[var(--theme-primary)] stroke-[var(--theme-primary)]' : ''
                      }`}
                    />
                  </button>

                  {/* Quick Add Overlay on Desktop */}
                  <div className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 hidden sm:block">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onAddToCart) onAddToCart(product)
                      }}
                      className="w-full py-2.5 btn-theme text-xs uppercase tracking-wider shadow-md gap-1.5"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Add to Bag</span>
                    </button>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-neutral-900 group-hover:text-theme-primary transition-colors line-clamp-1 capitalize">
                      {product.product_name || product.title}
                    </h3>
                    <p className="text-[11px] text-neutral-500 font-medium mt-0.5">
                      {product.vendor_name || 'Bespoke Studio'}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm sm:text-base font-extrabold text-theme-primary">
                        ₹{price}
                      </span>
                      {originalPrice && Number(originalPrice) > Number(price) && (
                        <span className="text-[11px] text-neutral-400 line-through">
                          ₹{originalPrice}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onAddToCart) onAddToCart(product)
                      }}
                      className="sm:hidden p-2 bg-theme-gradient text-white rounded-lg cursor-pointer shadow-xs"
                      aria-label="Add to cart"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                    </button>
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
