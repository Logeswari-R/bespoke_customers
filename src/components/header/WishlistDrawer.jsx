import React, { useEffect } from 'react'
import { X, Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react'
import { formatImageUrl } from '../../services/api'

export default function WishlistDrawer({
  isOpen,
  onClose,
  wishlistItems = [],
  onRemoveItem,
  onMoveToCart,
  onSelectProduct,
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 bg-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-theme-primary">
                <Heart className="w-4 h-4 fill-[var(--theme-primary)]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900 leading-tight">
                  Your Wishlist
                </h2>
                <span className="text-xs text-neutral-500 font-medium">
                  {wishlistItems.length} saved item{wishlistItems.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-black rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
              aria-label="Close wishlist"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {wishlistItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center text-theme-primary mb-4">
                  <Heart className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 mb-1">
                  Your Wishlist is Empty
                </h3>
                <p className="text-xs text-neutral-500 max-w-xs mb-6">
                  Save your favorite handcrafted items, traditional sarees and luxury fits to view them anytime.
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 btn-theme text-xs flex items-center gap-2"
                >
                  <span>Explore Collections</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100" role="list">
                {wishlistItems.map((item) => {
                  const prodId = item.product_id || item.id
                  const title = item.product_name || item.title || 'Bespoke Item'
                  const price = item.discount_price || item.price || item.actual_price || 499
                  const rawImg = item.image || item.image_path || item.main_image || item.img_path
                  const image = formatImageUrl(rawImg) || 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=600&q=80'

                  return (
                    <li key={item.wishlist_id || item.id} className="py-4 flex gap-4 group">
                      {/* Product Thumbnail */}
                      <div
                        onClick={() => {
                          if (onSelectProduct) onSelectProduct(prodId)
                          onClose()
                        }}
                        className="w-20 h-24 rounded-xl overflow-hidden bg-neutral-100 shrink-0 cursor-pointer border border-neutral-100 relative"
                      >
                        <img
                          src={image}
                          alt={title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=600&q=80'
                          }}
                        />
                      </div>

                      {/* Info & Actions */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4
                              onClick={() => {
                                if (onSelectProduct) onSelectProduct(prodId)
                                onClose()
                              }}
                              className="text-xs sm:text-sm font-bold text-neutral-900 truncate hover:text-theme-primary cursor-pointer transition-colors"
                            >
                              {title}
                            </h4>
                            <button
                              onClick={() => onRemoveItem(prodId)}
                              className="text-neutral-400 hover:text-red-500 p-1 rounded-md transition-colors cursor-pointer"
                              title="Remove from wishlist"
                              aria-label="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="text-[11px] text-neutral-500 font-medium block mt-0.5">
                            {item.vendor || 'Bespoke Atelier'}
                          </span>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-sm font-extrabold text-theme-primary">
                              ₹{price}
                            </span>
                            {item.actual_price && item.actual_price > price && (
                              <span className="text-xs text-neutral-400 line-through">
                                ₹{item.actual_price}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Move to Bag Button */}
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (onMoveToCart) onMoveToCart(item)
                            }}
                            className="w-full py-2 px-3 btn-theme text-xs flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Move to Bag</span>
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {wishlistItems.length > 0 && (
            <div className="p-4 border-t border-neutral-100 bg-neutral-50 text-center">
              <span className="text-[11px] text-neutral-500">
                Items in wishlist are saved directly to your account.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
