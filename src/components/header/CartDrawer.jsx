import React, { useEffect } from 'react'
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight } from 'lucide-react'
import { formatImageUrl } from '../../services/api'

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems = [],
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
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

  const subtotal = cartItems.reduce(
    (acc, item) => acc + (Number(item.price) || 0) * (item.quantity || 1),
    0
  )
  const freeShippingThreshold = 499
  const distanceToFreeShipping = Math.max(0, freeShippingThreshold - subtotal)
  const shippingProgress = Math.min(
    100,
    Math.round((subtotal / freeShippingThreshold) * 100)
  )

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
          <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-theme-primary" />
              <h2 className="text-base font-bold text-neutral-900">
                Shopping Bag ({cartItems.reduce((acc, i) => acc + (i.quantity || 1), 0)})
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {cartItems.length > 0 && onClearCart && (
                <button
                  type="button"
                  onClick={onClearCart}
                  className="text-[11px] text-neutral-400 hover:text-rose-600 transition-colors font-semibold mr-1 cursor-pointer"
                  title="Clear all items from bag"
                >
                  Clear Bag
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-neutral-400 hover:text-black rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
                aria-label="Close cart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Free shipping banner */}
          <div className="px-6 py-3 bg-neutral-50 border-b border-neutral-100 text-xs">
            {distanceToFreeShipping > 0 ? (
              <div>
                <p className="text-neutral-700">
                  Add <span className="font-bold text-black">₹{distanceToFreeShipping}</span> more for <span className="font-semibold text-emerald-600">FREE Express Delivery</span>!
                </p>
                <div className="w-full h-1.5 bg-neutral-200 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-theme-gradient rounded-full transition-all duration-300"
                    style={{ width: `${shippingProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-emerald-700 font-medium flex items-center gap-1.5">
                🎉 Congratulations! You have unlocked FREE Express Delivery!
              </p>
            )}
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-neutral-100">
            {cartItems.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pink-50 flex items-center justify-center text-theme-primary">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 mb-1">
                  Your bag is empty
                </h3>
                <p className="text-xs text-neutral-500 max-w-xs mx-auto mb-6">
                  Explore our luxury collections and add your favorite bespoke pieces to your bag.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 btn-theme text-xs"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              cartItems.map((item) => {
                const itemId = item.cart_item_id || item.id
                return (
                  <div key={itemId} className="py-4 flex gap-4">
                    <img
                      src={
                        formatImageUrl(item.image || item.image_path || item.main_image || item.img_path) ||
                        'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=600&q=80'
                      }
                      alt={item.title || item.product_name}
                      className="w-20 h-24 object-cover rounded-lg bg-neutral-100 shrink-0 border border-neutral-100"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=600&q=80'
                      }}
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-bold text-neutral-900 truncate pr-2">
                            {item.title || item.product_name}
                          </h4>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onRemoveItem(itemId)
                            }}
                            className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            aria-label={`Remove ${item.title || item.product_name}`}
                            title="Remove from bag"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          {item.vendor || item.brand || 'Bespoke'} {item.size ? `• Size: ${item.size}` : ''}
                        </p>
                        {item.addons && item.addons.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.addons.map((a, idx) => (
                              <span
                                key={idx}
                                className="badge-theme-subtle text-[10px] py-0.5 px-1.5"
                              >
                                +{a.name} (+₹{a.amount})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden bg-neutral-50">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(itemId, (item.quantity || 1) - 1)}
                            className="p-1 hover:bg-neutral-200 text-neutral-600 transition-colors cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2.5 text-xs font-bold text-neutral-900">
                            {item.quantity || 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(itemId, (item.quantity || 1) + 1)}
                            className="p-1 hover:bg-neutral-200 text-neutral-600 transition-colors cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-extrabold text-theme-primary">
                            ₹{(Number(item.price) || 0) * (item.quantity || 1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer Checkout */}
          {cartItems.length > 0 && (
            <div className="p-6 border-t border-neutral-100 bg-neutral-50 space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-neutral-900">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Estimated Shipping</span>
                  <span className="font-semibold text-emerald-600">
                    {subtotal >= freeShippingThreshold ? 'FREE' : '₹99'}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-neutral-900 pt-2 border-t border-neutral-200">
                  <span>Total</span>
                  <span className="text-theme-primary font-black">
                    ₹{subtotal >= freeShippingThreshold ? subtotal : subtotal + 99}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onCheckout}
                className="w-full py-3.5 btn-theme text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
