import React from 'react'
import { CheckCircle2, Package, MapPin, ShoppingBag } from 'lucide-react'
import { formatImageUrl } from '../../services/api'
import { LottieAnimation } from '../animations'
import orderSuccessAnimationData from '../../../lottiefiles/Success.json'

export default function OrderConfirmedPage({
  orderData,
  onContinueShopping,
  onTrackOrder,
}) {
  const orderId = orderData?.orderId || 'BSPK-CONFIRMED'
  const items = orderData?.items || []
  const address = orderData?.address || {}
  const totalAmount = orderData?.totalAmount || 0
  const paymentMode = orderData?.paymentMode || 'ONLINE'

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-3xl p-8 sm:p-10 border border-neutral-100 shadow-xl text-center">
        {/* Animated Lottie Success Emblem */}
        <div className="w-28 h-28 sm:w-32 sm:h-32 mx-auto mb-2 flex items-center justify-center overflow-hidden">
          <LottieAnimation
            animationData={orderSuccessAnimationData}
            loop={false}
            autoplay={true}
            ariaLabel="Order confirmed celebration"
            fallbackComponent={
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            }
            className="w-full h-full"
          />
        </div>

        <span className="badge-theme-subtle text-[11px] uppercase tracking-wider py-1 px-3">
          Order Confirmed
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 mt-3">
          Thank you for choosing Bespoke!
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-2 max-w-md mx-auto leading-relaxed">
          Your order <span className="font-bold text-neutral-800">#{orderId}</span> has been received by our master atelier. We will notify you once crafting & alteration begins.
        </p>

        {/* Order Details Card */}
        <div className="mt-8 p-5 rounded-2xl bg-neutral-50 border border-neutral-200/70 text-left space-y-4">
          <div className="flex justify-between items-center text-xs pb-3 border-b border-neutral-200/60">
            <div>
              <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider block">
                Order ID
              </span>
              <span className="font-extrabold text-neutral-900">{orderId}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider block">
                Total Paid
              </span>
              <span className="font-extrabold text-[var(--theme-primary)]">
                ₹{totalAmount} ({paymentMode})
              </span>
            </div>
          </div>

          {/* Delivery Address */}
          {address.name && (
            <div className="flex gap-2.5 items-start text-xs text-neutral-600">
              <MapPin className="w-4 h-4 text-[var(--theme-primary)] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-neutral-900">{address.name}</span>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  {address.house_building_name || address.house}, {address.area_colony || address.road}, {address.city} - {address.pincode}
                </p>
              </div>
            </div>
          )}

          {/* Item Thumbnails */}
          {items.length > 0 && (
            <div className="pt-2 border-t border-neutral-200/60">
              <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider block mb-2">
                Items in this order ({items.length})
              </span>
              <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-neutral-200 shrink-0">
                    <img
                      src={
                        formatImageUrl(item.image || item.image_path) ||
                        'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=200&q=80'
                      }
                      alt={item.title || item.product_name}
                      className="w-10 h-12 object-cover rounded-lg border border-neutral-100"
                    />
                    <div className="pr-2 max-w-[120px]">
                      <h4 className="text-[11px] font-bold text-neutral-900 truncate">
                        {item.title || item.product_name}
                      </h4>
                      <span className="text-[10px] text-neutral-400">Qty: {item.quantity || 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => onTrackOrder && onTrackOrder(orderId)}
            className="flex-1 py-3.5 btn-theme text-xs font-bold uppercase tracking-wider shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <Package className="w-4 h-4" />
            <span>Track Order Status</span>
          </button>
          <button
            type="button"
            onClick={onContinueShopping}
            className="flex-1 py-3.5 border border-neutral-300 text-neutral-700 rounded-2xl text-xs font-bold hover:bg-neutral-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Continue Shopping</span>
          </button>
        </div>
      </div>
    </div>
  )
}
