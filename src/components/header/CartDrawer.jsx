import React, { useEffect, useState } from 'react'
import {
  X,
  ShoppingBag,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Truck,
  Headphones,
  Gift,
  Scissors,
  Copy,
  Check,
  Tag,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { formatImageUrl, getDeliveryCharge, getPromoCodes } from '../../services/api'

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems = [],
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
}) {
  const [deliveryCharge, setDeliveryCharge] = useState(150)
  const [promoCodes, setPromoCodes] = useState([])
  const [copiedCode, setCopiedCode] = useState(null)
  const [promoIdx, setPromoIdx] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    let ignore = false
    getDeliveryCharge().then((amount) => {
      if (!ignore && typeof amount === 'number') {
        setDeliveryCharge(amount)
      }
    })
    return () => {
      ignore = true
    }
  }, [])

  // Fetch dynamic promo codes from API / DB
  useEffect(() => {
    let ignore = false
    getPromoCodes().then((res) => {
      if (!ignore && res?.data && Array.isArray(res.data)) {
        setPromoCodes(res.data)
      }
    }).catch(() => {})
    return () => {
      ignore = true
    }
  }, [isOpen])

  // Reset index if bounds change
  useEffect(() => {
    if (promoIdx >= promoCodes.length && promoCodes.length > 0) {
      setPromoIdx(0)
    }
  }, [promoCodes.length, promoIdx])

  // Automatic side-by-side transition every 4 seconds
  useEffect(() => {
    if (!isOpen || promoCodes.length <= 1 || isPaused) return
    const timer = setInterval(() => {
      setPromoIdx((prev) => (prev + 1) % promoCodes.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [isOpen, promoCodes.length, isPaused])

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

  const handleNextPromo = (e) => {
    e?.stopPropagation()
    if (promoCodes.length <= 1) return
    setPromoIdx((prev) => (prev + 1) % promoCodes.length)
  }

  const handlePrevPromo = (e) => {
    e?.stopPropagation()
    if (promoCodes.length <= 1) return
    setPromoIdx((prev) => (prev - 1 + promoCodes.length) % promoCodes.length)
  }

  const handleCopyCode = (code, e) => {
    e?.stopPropagation()
    if (!code) return
    try {
      localStorage.setItem('bespoke_copied_coupon', code)
    } catch {}
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2200)
    }
  }

  if (!isOpen) return null

  const itemCount = cartItems.reduce((acc, i) => acc + (i.quantity || 1), 0)
  const subtotal = cartItems.reduce(
    (acc, item) => acc + (Number(item.price) || 0) * (item.quantity || 1),
    0
  )
  const total = subtotal + (cartItems.length > 0 ? deliveryCharge : 0)

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Dimmed Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Drawer Container - Compact & Sleek Width */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-8">
        <div className="w-screen max-w-[365px] sm:max-w-[375px] bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300 rounded-l-2xl sm:rounded-l-3xl overflow-hidden">
          {/* 1. Header (Compact & Crisp) */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-b border-neutral-100 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-pink-50 flex items-center justify-center text-[#d6007a] shrink-0">
                <ShoppingBag className="w-3.5 h-3.5 stroke-[2.4]" />
              </div>
              <h2 className="text-sm sm:text-[15px] font-bold text-neutral-900 tracking-tight">
                Shopping Bag ({itemCount})
              </h2>
            </div>

            <div className="flex items-center gap-1">
              {cartItems.length > 0 && onClearCart && (
                <button
                  type="button"
                  onClick={onClearCart}
                  className="text-[10.5px] text-neutral-400 hover:text-rose-600 transition-colors font-semibold mr-1 cursor-pointer"
                  title="Clear all items from bag"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-neutral-400 hover:text-black rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
                aria-label="Close cart"
              >
                <X className="w-4.5 h-4.5 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* 2. Standard Delivery Charge Bar */}
          <div className="px-4 sm:px-5 py-2 bg-neutral-50/80 flex items-center justify-between text-xs border-b border-neutral-100 shrink-0">
            <span className="font-medium text-neutral-600">Standard Delivery Charge:</span>
            <span className="font-bold text-neutral-900">₹{deliveryCharge}</span>
          </div>

          {/* 3. Scrollable Body: Cart Items + Totals + Trust + Dynamic Side-by-Side Coupons Slider */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3.5 space-y-3.5">
            {cartItems.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-pink-50 flex items-center justify-center text-[#d6007a]">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 mb-1">
                  Your bag is empty
                </h3>
                <p className="text-xs text-neutral-500 max-w-xs mx-auto mb-5">
                  Explore our luxury collections and add your favorite bespoke pieces to your bag.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 btn-theme text-xs font-bold rounded-full shadow-xs cursor-pointer"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              <>
                {/* Cart Items List */}
                <div className="divide-y divide-neutral-100">
                  {cartItems.map((item) => {
                    const itemId = item.cart_item_id || item.id
                    const itemPrice = (Number(item.price) || 0) * (item.quantity || 1)
                    const isCustomizable =
                      item.is_customizable === 1 ||
                      String(item.is_customizable) === '1' ||
                      item.is_customizable === true ||
                      item.product_type === 0 ||
                      item.order_type === 'Customizable'

                    const variantText = [
                      item.color || item.material || '',
                      `Size: ${item.size || 'M'}`,
                    ]
                      .filter(Boolean)
                      .join(' | ')

                    return (
                      <div key={itemId} className="py-3 first:pt-0 flex gap-3 items-start">
                        {/* Product Image */}
                        <div className="relative w-16 h-20 sm:w-18 sm:h-22 shrink-0 rounded-xl overflow-hidden bg-pink-50/40 border border-neutral-150 shadow-2xs">
                          <img
                            src={
                              formatImageUrl(
                                item.image || item.image_path || item.main_image || item.img_path
                              ) ||
                              'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=600&q=80'
                            }
                            alt={item.title || item.product_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src =
                                'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=600&q=80'
                            }}
                          />
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                          <div>
                            {/* Title & Trash Row */}
                            <div className="flex items-start justify-between gap-1.5">
                              <h3 className="text-xs sm:text-[13px] font-bold text-neutral-900 truncate">
                                {item.title || item.product_name || 'Bespoke Item'}
                              </h3>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onRemoveItem(itemId)
                                }}
                                className="text-neutral-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer shrink-0"
                                aria-label="Remove item"
                                title="Remove from bag"
                              >
                                <Trash2 className="w-3.5 h-3.5 stroke-[1.8]" />
                              </button>
                            </div>

                            {/* Variant / Size */}
                            <p className="text-[11px] text-neutral-500 font-medium mt-0.5 truncate">
                              {variantText || 'Standard'}
                            </p>

                            {/* Customizable Tag if custom */}
                            {isCustomizable && (
                              <span className="inline-flex items-center gap-1 text-[8.5px] font-extrabold uppercase text-[#d6007a] bg-pink-50 px-1.5 py-0.5 rounded border border-pink-200/60 mt-1">
                                <Scissors className="w-2.5 h-2.5 stroke-[2.5]" />
                                <span>Customizable</span>
                              </span>
                            )}
                          </div>

                          {/* Stepper & Price Row */}
                          <div className="flex items-center justify-between mt-2 pt-1">
                            {/* Quantity Stepper Pill */}
                            <div className="inline-flex items-center border border-neutral-200 rounded-full bg-white px-2 py-0.5 shadow-2xs gap-2">
                              <button
                                type="button"
                                onClick={() => onUpdateQuantity(itemId, (item.quantity || 1) - 1)}
                                className="text-neutral-600 hover:text-black font-bold text-xs w-3.5 h-4 flex items-center justify-center cursor-pointer transition-transform active:scale-90 select-none"
                                aria-label="Decrease quantity"
                              >
                                −
                              </button>
                              <span className="text-[11px] font-bold text-neutral-900 min-w-[12px] text-center select-none">
                                {item.quantity || 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateQuantity(itemId, (item.quantity || 1) + 1)}
                                className="text-neutral-600 hover:text-black font-bold text-xs w-3.5 h-4 flex items-center justify-center cursor-pointer transition-transform active:scale-90 select-none"
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>

                            {/* Price */}
                            <span className="text-sm sm:text-[15px] font-black text-[#d6007a] tracking-tight">
                              ₹{itemPrice.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Subtotal & Delivery Breakdown */}
                <div className="pt-3 border-t border-neutral-100 space-y-1.5 text-xs">
                  <div className="flex justify-between text-neutral-600">
                    <span className="font-medium">Subtotal</span>
                    <span className="font-bold text-neutral-900">
                      ₹{subtotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span className="font-medium">Delivery Charge</span>
                    <span className="font-bold text-neutral-900">₹{deliveryCharge}</span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-baseline pt-2 border-t border-neutral-100">
                  <span className="text-sm sm:text-base font-black text-neutral-900">Total</span>
                  <span className="text-lg sm:text-xl font-black text-[#d6007a] tracking-tight">
                    ₹{total.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Proceed to Checkout Button */}
                <button
                  type="button"
                  onClick={onCheckout}
                  className="w-full h-10 sm:h-11 rounded-full bg-[#d6007a] hover:bg-[#b80068] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/20 hover:shadow-lg hover:shadow-pink-500/30 active:scale-[0.99] transition-all cursor-pointer mt-1"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>

                {/* Three Trust Features (Compact & Sleek) */}
                <div className="pt-2 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-pink-50 flex items-center justify-center text-[#d6007a] shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5 fill-pink-100 stroke-[#d6007a]" />
                    </div>
                    <div>
                      <p className="text-[11.5px] font-bold text-neutral-900 leading-tight">
                        Secure & Safe Payments
                      </p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        Your information is always protected.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-pink-50 flex items-center justify-center text-[#d6007a] shrink-0">
                      <Truck className="w-3.5 h-3.5 stroke-[#d6007a]" />
                    </div>
                    <div>
                      <p className="text-[11.5px] font-bold text-neutral-900 leading-tight">
                        Free Shipping
                      </p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        On qualifying orders above ₹1999.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-pink-50 flex items-center justify-center text-[#d6007a] shrink-0">
                      <Headphones className="w-3.5 h-3.5 stroke-[#d6007a]" />
                    </div>
                    <div>
                      <p className="text-[11.5px] font-bold text-neutral-900 leading-tight">
                        24/7 Support
                      </p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        Atelier concierge ready to assist.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Side-by-Side Auto-Changing Coupons Carousel */}
                {promoCodes && promoCodes.length > 0 && (
                  <div className="mt-4 pt-3.5 border-t border-neutral-100">
                    {/* Header with Title, Counter & Next/Prev Controls */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-[#d6007a]" />
                        <h4 className="text-xs font-bold text-neutral-900 tracking-tight">
                          Available Coupons ({promoCodes.length})
                        </h4>
                      </div>

                      {promoCodes.length > 1 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-neutral-400 font-bold">
                            {promoIdx + 1}/{promoCodes.length}
                          </span>
                          <button
                            type="button"
                            onClick={handlePrevPromo}
                            className="w-5 h-5 rounded-full border border-neutral-200 hover:border-[#d6007a] hover:text-[#d6007a] bg-white text-neutral-600 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                            aria-label="Previous coupon"
                            title="Previous coupon"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={handleNextPromo}
                            className="w-5 h-5 rounded-full border border-neutral-200 hover:border-[#d6007a] hover:text-[#d6007a] bg-white text-neutral-600 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                            aria-label="Next coupon"
                            title="Next coupon"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Side-by-Side Sliding Track Container */}
                    <div
                      className="relative overflow-hidden rounded-2xl group"
                      onMouseEnter={() => setIsPaused(true)}
                      onMouseLeave={() => setIsPaused(false)}
                    >
                      <div
                        className="flex transition-transform duration-500 ease-out"
                        style={{ transform: `translateX(-${promoIdx * 100}%)` }}
                      >
                        {promoCodes.map((promo, idx) => {
                          const discountVal = Number(promo.discount || promo.value || 0)
                          const isPct =
                            promo.discount_type === 'percentage' || promo.type === 'percentage'
                          const promoTitle = isPct ? `Get ${discountVal}% OFF` : `Flat ₹${discountVal} OFF`
                          const badgeText = isPct ? `${discountVal}% OFF` : `₹${discountVal} OFF`
                          const promoSubtext =
                            promo.description ||
                            (Number(promo.min_order_value) > 0
                              ? `Valid on orders above ₹${promo.min_order_value}`
                              : 'Applicable on your luxury order')
                          const isCopied = copiedCode === promo.code

                          return (
                            <div
                              key={promo.id || promo.code || idx}
                              onClick={() => handleCopyCode(promo.code)}
                              className="w-full shrink-0 p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-pink-50/85 via-pink-50/50 to-white border border-pink-100 hover:border-pink-300 transition-all cursor-pointer shadow-2xs relative select-none"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0 pr-1">
                                  <div className="w-7 h-7 rounded-xl bg-white flex items-center justify-center text-[#d6007a] shadow-2xs shrink-0">
                                    <Gift className="w-3.5 h-3.5 stroke-[2.2]" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-extrabold text-neutral-900 leading-tight truncate">
                                      {promoTitle}
                                    </p>
                                    <p className="text-[10px] text-neutral-500 truncate mt-0.5 max-w-[185px]">
                                      {promoSubtext}
                                    </p>
                                  </div>
                                </div>

                                {/* Discount Badge */}
                                <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded-full bg-pink-100 text-[#d6007a] shrink-0">
                                  {badgeText}
                                </span>
                              </div>

                              {/* Code Badge & Copy Action */}
                              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-pink-100/60">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-[10.5px] text-[#d6007a] bg-white px-2 py-0.5 rounded border border-pink-200 shadow-2xs">
                                    {promo.code}
                                  </span>
                                  {Number(promo.min_order_value) > 0 && (
                                    <span className="text-[9.5px] text-neutral-400">
                                      Min ₹{promo.min_order_value}
                                    </span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCopyCode(promo.code, e)
                                  }}
                                  className="text-[10px] font-bold text-neutral-700 hover:text-[#d6007a] flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-pink-50 transition-colors cursor-pointer border border-pink-200/80 shadow-2xs active:scale-95"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                                      <span className="text-emerald-700 font-bold">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-2.5 h-2.5 text-[#d6007a]" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Side Hover Navigation Overlay Arrows */}
                      {promoCodes.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={handlePrevPromo}
                            className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-5 h-5 rounded-full bg-white/95 hover:bg-white text-neutral-700 hover:text-[#d6007a] shadow-xs flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer border border-pink-200/80 active:scale-90"
                            aria-label="Previous slide"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={handleNextPromo}
                            className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-5 h-5 rounded-full bg-white/95 hover:bg-white text-neutral-700 hover:text-[#d6007a] shadow-xs flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer border border-pink-200/80 active:scale-90"
                            aria-label="Next slide"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Dots Indicator */}
                    {promoCodes.length > 1 && (
                      <div className="flex justify-center items-center gap-1 mt-2">
                        {promoCodes.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setPromoIdx(i)
                            }}
                            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                              i === promoIdx
                                ? 'w-4 bg-[#d6007a]'
                                : 'w-1.5 bg-neutral-200 hover:bg-neutral-300'
                            }`}
                            aria-label={`Go to coupon ${i + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
