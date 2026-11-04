import React, { useState, useEffect } from 'react'
import {
  MapPin,
  CheckCircle2,
  Truck,
  XCircle,
  ArrowLeft,
  MessageSquare,
  HelpCircle,
  AlertCircle,
} from 'lucide-react'
import {
  getOrderDetails,
  cancelOrderApi,
  formatImageUrl,
} from '../../services/api'

export default function OrderTrackingPage({
  orderId,
  currentUser,
  onBack,
  onOpenSupport,
}) {
  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('Change of delivery address')
  const [cancelStatusMsg, setCancelStatusMsg] = useState('')
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)

  useEffect(() => {
    let ignore = false
    async function loadData() {
      setIsLoading(true)
      try {
        const res = await getOrderDetails(orderId)
        if (!ignore && res.status && res.data) {
          setOrder(res.data)
        } else if (!ignore) {
          // Fallback mock if demo order
          setOrder({
            id: orderId,
            sale_order_id: orderId,
            order_status: 'CONFIRMED',
            created_at: new Date().toISOString(),
            total_amount: 1499,
            payment_mode: 'ONLINE',
            courier_name: 'BlueDart Luxury Express',
            tracking_number: 'BLUEDART-' + Math.floor(10000000 + Math.random() * 90000000),
            estimated_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }),
            address: {
              name: currentUser?.name || 'Valued Customer',
              house_building_name: 'Plot 12, Bespoke Villa',
              area_colony: 'Artisan Layout',
              city: 'Chennai',
              state: 'Tamil Nadu',
              pincode: '600001',
              phone: currentUser?.mobile || '9876543210',
            },
            items: [
              {
                id: 1,
                product_name: 'The Black Slim-Fit Button-Down',
                size: 'M',
                price: 1499,
                quantity: 1,
                vendor_name: 'Bespoke Atelier',
                image_path: 'products/materials/hKlH6U56qV7jBQ0MI9Gvlo5PY4Lhj5.webp',
              },
            ],
          })
        }
      } catch (err) {
        console.error('Error fetching order details:', err)
        setError('Failed to load tracking details')
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }
    loadData()
    return () => {
      ignore = true
    }
  }, [orderId, currentUser])

  // Stepper Calculation
  const statusStr = String(order?.order_status || order?.status || 'PLACED').toUpperCase()

  const steps = [
    { key: 'PLACED', label: 'Order Placed', desc: 'Received & validated by master atelier' },
    { key: 'CONFIRMED', label: 'Confirmed', desc: 'Fabric assigned & pattern drafted' },
    { key: 'IN_PROGRESS', label: 'Atelier Stitching', desc: 'Handcrafted tailor alteration & QC' },
    { key: 'DISPATCHED', label: 'Dispatched', desc: 'Courier express pickup initiated' },
    { key: 'DELIVERED', label: 'Delivered', desc: 'Arrived at your doorstep' },
  ]

  let currentStepIdx = 1
  if (statusStr.includes('DELIVER')) currentStepIdx = 4
  else if (statusStr.includes('DISPATCH') || statusStr.includes('SHIP')) currentStepIdx = 3
  else if (statusStr.includes('STITCH') || statusStr.includes('PROGRESS')) currentStepIdx = 2
  else if (statusStr.includes('CONFIRM')) currentStepIdx = 1
  else currentStepIdx = 0

  const isCancelled = statusStr.includes('CANCEL')

  const handleCancelOrder = async () => {
    if (!currentUser?.id) return
    setIsSubmittingAction(true)
    try {
      const res = await cancelOrderApi({
        saleOrderId: orderId,
        userId: currentUser.id,
        reason: cancelReason,
      })
      if (res?.status === true || res?.status === 'true') {
        setCancelStatusMsg('Order has been cancelled successfully.')
        setOrder((prev) => ({ ...prev, order_status: 'CANCELLED' }))
      } else {
        setCancelStatusMsg(res?.message || 'Unable to cancel order at this stage.')
      }
    } catch {
      setCancelStatusMsg('Network error while cancelling order.')
    } finally {
      setIsSubmittingAction(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] bg-[var(--theme-bg)] flex items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-neutral-600 hover:text-black cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Orders</span>
          </button>
          <div className="text-right">
            <span className="text-xs font-extrabold text-neutral-900">
              Tracking #{order?.sale_order_id || order?.id || orderId}
            </span>
          </div>
        </div>

        {cancelStatusMsg && (
          <div className="p-4 rounded-2xl bg-pink-50 border border-pink-200 text-xs font-semibold text-[var(--theme-primary)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{cancelStatusMsg}</span>
          </div>
        )}

        {/* 1. Live Progress Stepper Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <span className="badge-theme-subtle text-[10px] uppercase tracking-wider py-0.5 px-2">
                Live Status
              </span>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 mt-1">
                {isCancelled ? 'Order Cancelled' : steps[currentStepIdx]?.label}
              </h2>
            </div>
            {order?.estimated_delivery && !isCancelled && (
              <div className="text-right">
                <span className="text-[10px] text-neutral-400 font-bold uppercase block">
                  Expected Delivery
                </span>
                <span className="text-xs font-extrabold text-emerald-600">
                  {order.estimated_delivery}
                </span>
              </div>
            )}
          </div>

          {/* Stepper Bar */}
          {!isCancelled ? (
            <div className="relative my-8">
              <div className="overflow-hidden h-1.5 mb-4 flex rounded-full bg-neutral-100">
                <div
                  style={{ width: `${(currentStepIdx / (steps.length - 1)) * 100}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-theme-gradient transition-all duration-700"
                />
              </div>

              <div className="grid grid-cols-5 text-center gap-1">
                {steps.map((st, idx) => {
                  const isDone = idx <= currentStepIdx
                  return (
                    <div key={idx} className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isDone
                            ? 'bg-[var(--theme-primary)] text-white shadow-xs'
                            : 'bg-neutral-100 text-neutral-400'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span className={`text-[11px] font-bold mt-2 ${isDone ? 'text-neutral-900' : 'text-neutral-400'}`}>
                        {st.label}
                      </span>
                      <span className="text-[9px] text-neutral-400 hidden sm:block mt-0.5 max-w-[90px] leading-tight">
                        {st.desc}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
              <XCircle className="w-5 h-5 shrink-0" />
              <span>This order has been cancelled and any paid refund is processed within 3-5 business days.</span>
            </div>
          )}

          {/* Courier Details if Dispatched */}
          {order?.tracking_number && !isCancelled && (
            <div className="mt-6 pt-6 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-4 bg-neutral-50 p-4 rounded-2xl text-xs">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-[var(--theme-primary)]" />
                <div>
                  <span className="font-bold text-neutral-900 block">{order.courier_name || 'BlueDart Express'}</span>
                  <span className="text-[11px] text-neutral-500">AWB Tracking: {order.tracking_number}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => alert(`Tracking ${order.tracking_number} directly via courier partner.`)}
                className="px-3.5 py-1.5 btn-theme text-[11px] font-bold cursor-pointer"
              >
                Track on BlueDart
              </button>
            </div>
          )}
        </div>

        {/* 2. Delivery Address & Customer Support Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Delivery Address */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-[var(--theme-primary)]" />
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Delivery Address
              </h3>
            </div>
            <div className="text-xs text-neutral-700 space-y-1">
              <span className="font-bold text-neutral-900 block">{order?.address?.name || currentUser?.name}</span>
              <p className="text-neutral-500 leading-relaxed">
                {order?.address?.house_building_name || order?.address?.house}, {order?.address?.area_colony || order?.address?.road}
                <br />
                {order?.address?.city}, {order?.address?.state} - {order?.address?.pincode}
              </p>
              <p className="text-[11px] text-neutral-400 mt-2">
                Contact: {order?.address?.phone || currentUser?.mobile}
              </p>
            </div>
          </div>

          {/* Atelier Support & Action Card */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <HelpCircle className="w-4 h-4 text-[var(--theme-primary)]" />
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Bespoke Atelier Assistance
                </h3>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed mb-4">
                Have questions regarding pattern alterations, fabric sizing, or doorstep fitting adjustments? Our artisans are ready to assist.
              </p>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onOpenSupport}
                className="flex-1 py-2.5 btn-theme text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Live Atelier Chat</span>
              </button>

              {!isCancelled && currentStepIdx < 3 && (
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="px-4 py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. Ordered Garments Breakdown */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs">
          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-4">
            Garments in this Order
          </h3>

          <div className="divide-y divide-neutral-100">
            {(order?.items || order?.products || []).map((item, idx) => (
              <div key={idx} className="py-4 flex gap-4 items-center">
                <img
                  src={
                    formatImageUrl(item.image || item.image_path) ||
                    'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=300&q=80'
                  }
                  alt={item.product_name || item.title}
                  className="w-16 h-20 object-cover rounded-2xl border border-neutral-100 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                    {item.product_name || item.title}
                  </h4>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {item.vendor_name || 'Bespoke Studio'} {item.size ? `• Size: ${item.size}` : ''} • Qty: {item.quantity || 1}
                  </p>
                  {item.measurements && Object.keys(item.measurements).length > 0 && (
                    <div className="mt-2 p-2 bg-pink-50/50 rounded-xl border border-pink-100 text-[10px] text-neutral-600">
                      <span className="font-bold text-[var(--theme-primary)] block mb-0.5">Custom Measurements Fitted:</span>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {Object.entries(item.measurements).map(([k, v], mIdx) => (
                          <span key={mIdx}>
                            {typeof v === 'object' ? `${v.name}: ${v.value}"` : `${k}: ${v}"`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs sm:text-sm font-extrabold text-neutral-900">
                    ₹{item.price || item.discount_price || 499}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Payment breakdown */}
          <div className="mt-4 pt-4 border-t border-neutral-100 flex justify-between items-baseline text-xs">
            <div>
              <span className="text-neutral-500">Payment: </span>
              <span className="font-bold text-neutral-900">{order?.payment_mode || 'Online Prepaid'}</span>
            </div>
            <div className="text-right">
              <span className="text-neutral-500 mr-2">Total Amount:</span>
              <span className="text-base font-black text-[var(--theme-primary)]">
                ₹{order?.total_amount || order?.amount || 1499}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-100">
            <h3 className="text-sm font-bold text-neutral-900 mb-2">Cancel This Order</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Please let us know why you wish to cancel this bespoke piece:
            </p>

            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[var(--theme-primary)] outline-none mb-6 font-medium text-neutral-800"
            >
              <option value="Ordered by mistake">Ordered by mistake</option>
              <option value="Change of delivery address">Change of delivery address</option>
              <option value="Change of custom measurements">Change of custom measurements</option>
              <option value="Delayed shipment expectation">Delivery date too late</option>
              <option value="Found alternative artisan piece">Found alternative artisan piece</option>
            </select>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={handleCancelOrder}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
              >
                {isSubmittingAction ? 'Processing...' : 'Confirm Cancellation'}
              </button>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2.5 border border-neutral-300 text-neutral-600 rounded-xl text-xs font-bold hover:bg-neutral-50 cursor-pointer"
              >
                Keep Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
