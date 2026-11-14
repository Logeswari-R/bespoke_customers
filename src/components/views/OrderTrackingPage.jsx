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
  Star,
  RotateCcw,
  Edit3,
  Sparkles,
  Clock,
  Calendar,
  Circle,
  Check,
  FileText,
  Download,
  Printer,
  Building2,
  Loader2,
} from 'lucide-react'
import {
  getOrderDetails,
  cancelOrderApi,
  returnOrderApi,
  formatImageUrl,
  getStarColor,
  getOrderInvoicesApi,
  downloadInvoicePdfApi,
} from '../../services/api'
import { PageLoadingAnimation } from '../animations'
import WriteReviewModal from '../common/WriteReviewModal'
import InvoiceModal from '../common/InvoiceModal'

// Formats real backend timestamp ("YYYY-MM-DD HH:mm:ss" or ISO) into readable date & time
function formatStageDateTime(dateStr) {
  if (!dateStr) return null
  try {
    const cleaned = String(dateStr).trim().replace(' ', 'T')
    const d = new Date(cleaned)
    if (isNaN(d.getTime())) return String(dateStr)
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return String(dateStr)
  }
}

// Maps stage status and stage title to luxury theme styling and icons
function getStageConfig(stageItem) {
  const stageName = String(stageItem?.stage || '').trim()
  const stageLower = stageName.toLowerCase()
  const statusLower = String(stageItem?.status || '').toLowerCase().trim()
  const isCompleted = Boolean(stageItem?.is_completed || statusLower === 'completed')

  const isCancelled =
    statusLower === 'cancelled' ||
    stageLower.includes('cancel') ||
    stageLower.includes('decline')

  const isReturned =
    stageLower.includes('return') ||
    stageLower.includes('collected')

  const isRefund =
    stageLower.includes('refund')

  if (isCancelled) {
    return {
      type: 'cancelled',
      badgeLabel: 'Cancelled',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      dotClass: 'bg-rose-600 text-white ring-4 ring-rose-100 shadow-xs',
      titleClass: 'text-rose-950 font-bold',
      icon: XCircle,
    }
  }

  if (isReturned) {
    if (isCompleted) {
      return {
        type: 'returned-done',
        badgeLabel: 'Completed',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        dotClass: 'bg-amber-600 text-white ring-4 ring-amber-100 shadow-xs',
        titleClass: 'text-amber-950 font-bold',
        icon: RotateCcw,
      }
    }
    return {
      type: 'returned-pending',
      badgeLabel: statusLower === 'in_progress' ? 'In Progress' : 'Pending',
      badgeClass: 'bg-neutral-100 text-neutral-600 border-neutral-200',
      dotClass: 'bg-amber-50 text-amber-600 border border-amber-300',
      titleClass: 'text-neutral-700 font-semibold',
      icon: RotateCcw,
    }
  }

  if (isRefund) {
    if (isCompleted) {
      return {
        type: 'refund-done',
        badgeLabel: 'Refunded',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotClass: 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-xs',
        titleClass: 'text-emerald-950 font-bold',
        icon: CheckCircle2,
      }
    }
    return {
      type: 'refund-pending',
      badgeLabel: 'Processing',
      badgeClass: 'bg-pink-50 text-[var(--theme-primary)] border-pink-200',
      dotClass: 'bg-pink-50 text-[var(--theme-primary)] border border-pink-300',
      titleClass: 'text-neutral-700 font-semibold',
      icon: Clock,
    }
  }

  if (isCompleted) {
    return {
      type: 'completed',
      badgeLabel: 'Completed',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-xs',
      titleClass: 'text-neutral-900 font-bold',
      icon: CheckCircle2,
    }
  }

  if (statusLower === 'in_progress') {
    return {
      type: 'in_progress',
      badgeLabel: 'In Progress',
      badgeClass: 'bg-pink-50 text-[var(--theme-primary)] border-pink-200 font-bold',
      dotClass: 'bg-[var(--theme-primary)] text-white ring-4 ring-pink-200 shadow-xs animate-pulse',
      titleClass: 'text-[var(--theme-primary)] font-bold',
      icon: Clock,
    }
  }

  // Pending / Scheduled
  return {
    type: 'pending',
    badgeLabel: 'Scheduled',
    badgeClass: 'bg-neutral-50 text-neutral-400 border-neutral-200',
    dotClass: 'bg-neutral-100 text-neutral-400 border border-neutral-200',
    titleClass: 'text-neutral-400 font-medium',
    icon: Circle,
  }
}

export default function OrderTrackingPage({
  orderId,
  currentUser,
  onBack,
  onOpenSupport,
  onOpenVendorChat,
}) {
  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('Change of delivery address')
  const [cancelStatusMsg, setCancelStatusMsg] = useState('')
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [returnReason, setReturnReason] = useState('Product size or fitting mismatch')
  const [returnStatusMsg, setReturnStatusMsg] = useState('')
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)
  const [reviewingItem, setReviewingItem] = useState(null)
  const [orderInvoices, setOrderInvoices] = useState([])
  const [isInvoiceLoading, setIsInvoiceLoading] = useState(false)
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [activeInvoiceForModal, setActiveInvoiceForModal] = useState(null)
  const [downloadingInvId, setDownloadingInvId] = useState(null)

  // Fetch official invoice records for this order
  useEffect(() => {
    const rawOrderId = order?.order_id || order?.id || orderId
    const userId = currentUser?.id || currentUser?.user_id
    if (!rawOrderId || !userId) return

    let isMounted = true
    setIsInvoiceLoading(true)

    getOrderInvoicesApi(rawOrderId, userId)
      .then((res) => {
        if (!isMounted) return
        if (res?.invoices && res.invoices.length > 0) {
          setOrderInvoices(res.invoices)
        } else {
          setOrderInvoices([])
        }
      })
      .catch((err) => {
        if (!isMounted) return
        console.warn('Notice loading order invoices in tracking view:', err)
        setOrderInvoices([])
      })
      .finally(() => {
        if (isMounted) setIsInvoiceLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [order?.order_id, order?.id, orderId, currentUser])

  const handleDownloadInvoice = async (inv) => {
    if (!inv?.id) return
    setDownloadingInvId(inv.id)
    try {
      const userId = currentUser?.id || currentUser?.user_id
      const sanitizedNum = (inv.invoice_number || `INV_${inv.id}`).replace(/[^a-zA-Z0-9_-]/g, '_')
      await downloadInvoicePdfApi(inv.id, userId, `BESPOKE_INV_${sanitizedNum}.pdf`)
    } catch (err) {
      alert(err.message || 'Failed to download invoice PDF.')
    } finally {
      setDownloadingInvId(null)
    }
  }

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
  const currentStatus =
    order?.current_status ||
    order?.current_status_label ||
    order?.order_status ||
    order?.status ||
    order?.order_history ||
    'Order Placed'

  const statusStr = String(currentStatus).toUpperCase()
  const rawStatusNum = parseInt(order?.order_status, 10)
  const historyStr = String(order?.order_history || '').toUpperCase()

  // 1. High-level status flags
  const isReturned =
    order?.is_returned === true ||
    order?.cancelled_type === 'return' ||
    Boolean(order?.return_details) ||
    statusStr.includes('RETURN') ||
    historyStr.includes('RETURN') ||
    rawStatusNum === 8

  const isDelivered =
    order?.is_delivered === true ||
    statusStr.includes('DELIVER') ||
    historyStr.includes('DELIVER') ||
    rawStatusNum === 5 ||
    (Array.isArray(order?.order_cycle) &&
      order.order_cycle.some(
        (c) =>
          (c.stage === 'Delivered' || String(c.stage || '').includes('Deliver')) &&
          (c.status === 'completed' || c.is_completed === true)
      ))

  const isCancelled =
    !isDelivered &&
    !isReturned &&
    order?.cancelled_type !== 'return' &&
    (Boolean(order?.cancelled_at) ||
      order?.is_cancelled === true ||
      statusStr.includes('CANCEL') ||
      statusStr.includes('DECLINE') ||
      (statusStr.includes('REFUND') && !isReturned) ||
      historyStr.includes('CANCEL') ||
      historyStr.includes('DECLINE') ||
      (historyStr.includes('REFUND') && !isReturned) ||
      rawStatusNum === 4)

  const isDispatched =
    !isCancelled &&
    !isDelivered &&
    !isReturned &&
    (statusStr.includes('DISPATCH') ||
      statusStr.includes('SHIP') ||
      statusStr.includes('HUB') ||
      historyStr.includes('DISPATCH') ||
      historyStr.includes('READY_TO_SHIP') ||
      rawStatusNum === 3 ||
      rawStatusNum === 6 ||
      rawStatusNum === 7)

  // 2. Stepper Position (0 = Placed, 1 = Confirmed, 2 = Stitching, 3 = Dispatched, 4 = Delivered)
  const steps = [
    { key: 'PLACED', label: 'Order Placed', desc: 'Received & validated by master atelier' },
    { key: 'CONFIRMED', label: 'Confirmed', desc: 'Fabric assigned & pattern drafted' },
    { key: 'IN_PROGRESS', label: 'Atelier Stitching', desc: 'Handcrafted tailor alteration & QC' },
    { key: 'DISPATCHED', label: 'Dispatched', desc: 'Courier express pickup initiated' },
    { key: 'DELIVERED', label: 'Delivered', desc: 'Arrived at your doorstep' },
  ]

  let currentStepIdx = 0
  if (isDelivered) currentStepIdx = 4
  else if (isDispatched) currentStepIdx = 3
  else if (statusStr.includes('STITCH') || statusStr.includes('PROGRESS') || statusStr.includes('READY')) currentStepIdx = 2
  else if (statusStr.includes('CONFIRM') || statusStr.includes('APPROV') || rawStatusNum === 1) currentStepIdx = 1
  else currentStepIdx = 0

  // 2b. Real-Time Order Stages (Reads real database order_cycle stages from API)
  const orderStages = (() => {
    if (Array.isArray(order?.order_cycle) && order.order_cycle.length > 0) {
      return order.order_cycle
    }
    // Fallback progression if order_cycle is empty or demo
    if (isCancelled) {
      return [
        {
          stage: 'Order Placed',
          status: 'completed',
          is_completed: true,
          date: order?.created_at || null,
          remark: 'Order Placed Successfully',
        },
        {
          stage: 'Order Cancelled',
          status: 'cancelled',
          is_completed: true,
          date: order?.cancelled_at || null,
          remark: order?.cancel_remark || 'Order Cancelled',
        },
        ...(order?.refund || statusStr.includes('REFUND')
          ? [
              {
                stage: 'Refund Processed',
                status: 'completed',
                is_completed: true,
                date: order?.refund?.created_at || null,
                remark: `Refund of ₹${order?.refund?.amount || order?.total_amount || 0} processed`,
              },
            ]
          : []),
      ]
    }
    if (isReturned) {
      return [
        {
          stage: 'Order Placed',
          status: 'completed',
          is_completed: true,
          date: order?.created_at || null,
          remark: 'Order Placed Successfully',
        },
        {
          stage: 'Delivered',
          status: 'completed',
          is_completed: true,
          date: null,
          remark: 'Package Delivered',
        },
        {
          stage: 'Returned',
          status: 'completed',
          is_completed: true,
          date: order?.return_details?.return_initiated_date || null,
          remark: order?.return_details?.return_reason || 'Return Requested by Customer',
        },
        {
          stage: 'Product Collected',
          status:
            Boolean(order?.return_details?.return_product_collected_date) ||
            statusStr.includes('COLLECT') ||
            statusStr.includes('REFUND') ||
            Boolean(order?.refund)
              ? 'completed'
              : 'pending',
          is_completed:
            Boolean(order?.return_details?.return_product_collected_date) ||
            statusStr.includes('COLLECT') ||
            statusStr.includes('REFUND') ||
            Boolean(order?.refund),
          date: order?.return_details?.return_product_collected_date || null,
          remark: 'Returned Item Collected by Courier',
        },
        {
          stage: 'Refund Processed',
          status:
            Boolean(order?.return_details?.refund_processed_date) ||
            statusStr.includes('REFUND') ||
            Boolean(order?.refund)
              ? 'completed'
              : 'pending',
          is_completed:
            Boolean(order?.return_details?.refund_processed_date) ||
            statusStr.includes('REFUND') ||
            Boolean(order?.refund),
          date: order?.return_details?.refund_processed_date || null,
          remark: 'Refund Processed Successfully',
        },
      ]
    }
    return steps.map((s, idx) => ({
      stage: s.label,
      status: idx <= currentStepIdx ? 'completed' : idx === currentStepIdx + 1 ? 'in_progress' : 'pending',
      is_completed: idx <= currentStepIdx,
      date: idx === 0 ? order?.created_at : null,
      remark: s.desc,
    }))
  })()

  // 3. Action eligibility:
  // Pre-delivery: Show Cancel Order ONLY when NOT delivered, NOT dispatched, NOT cancelled, NOT returned
  const canCancel =
    !isCancelled &&
    !isDelivered &&
    !isReturned &&
    !isDispatched &&
    currentStepIdx < 3 &&
    order?.cancel !== false &&
    order?.cancel_status !== false

  // Post-delivery: Show Return Order when DELIVERED and NOT returned and NOT cancelled
  const canReturn =
    isDelivered &&
    !isReturned &&
    !isCancelled &&
    order?.return !== false &&
    order?.return_status !== false

  const handleCancelOrder = async () => {
    if (!currentUser?.id) return
    setIsSubmittingAction(true)
    try {
      const resolvedSaleOrderId = order?.sale_order_id || order?.id || orderId
      const resolvedOrderId = order?.order_id || orderId
      const res = await cancelOrderApi({
        saleOrderId: resolvedSaleOrderId,
        orderId: resolvedOrderId,
        userId: currentUser.id,
        reason: cancelReason,
      })
      if (res?.status === true || res?.status === 'true' || res?.success === true) {
        setIsCancelModalOpen(false)
        const refundMsg = res?.data?.refund ? ` (Refund ${res.data.refund.refund_status || 'initiated'})` : ''
        setCancelStatusMsg((res?.message || 'Order has been cancelled successfully.') + refundMsg)
        setOrder((prev) => ({
          ...prev,
          order_status: 'CANCELLED',
          status: 'Cancelled',
          current_status: 'Cancelled',
          cancel_status: false,
          cancel: false,
        }))
        // Refresh full order details to reflect the updated timeline and refund status
        try {
          const refreshed = await getOrderDetails(resolvedSaleOrderId || resolvedOrderId)
          if (refreshed?.status && refreshed?.data) {
            setOrder(refreshed.data)
          }
        } catch (e) {
          console.warn('Failed to refresh order details after cancel:', e)
        }
      } else {
        setCancelStatusMsg(res?.message || 'Unable to cancel order at this stage.')
      }
    } catch {
      setCancelStatusMsg('Network error while cancelling order.')
    } finally {
      setIsSubmittingAction(false)
    }
  }

  const handleReturnOrder = async () => {
    if (!currentUser?.id) return
    setIsSubmittingAction(true)
    try {
      const resolvedSaleOrderId = order?.sale_order_id || order?.id || orderId
      const resolvedOrderId = order?.order_id || orderId
      const res = await returnOrderApi({
        saleOrderId: resolvedSaleOrderId,
        orderId: resolvedOrderId,
        userId: currentUser.id,
        reason: returnReason,
      })
      if (res?.status === true || res?.status === 'true' || res?.success === true) {
        setIsReturnModalOpen(false)
        setReturnStatusMsg(res?.message || 'Return request submitted successfully. Doorstep pickup will be scheduled.')
        setOrder((prev) => ({
          ...prev,
          order_status: 'RETURNED',
          status: 'Returned',
          current_status: 'Returned',
          return_status: false,
          return: false,
        }))
        try {
          const refreshed = await getOrderDetails(resolvedSaleOrderId || resolvedOrderId)
          if (refreshed?.status && refreshed?.data) {
            setOrder(refreshed.data)
          }
        } catch (e) {
          console.warn('Failed to refresh order details after return:', e)
        }
      } else {
        setReturnStatusMsg(res?.message || 'Unable to submit return request at this stage.')
      }
    } catch {
      setReturnStatusMsg('Network error while submitting return request.')
    } finally {
      setIsSubmittingAction(false)
    }
  }

  if (isLoading) {
    return (
      <PageLoadingAnimation
        message="Tracking your bespoke order..."
        subMessage="Contacting atelier tailoring milestones & delivery partners"
        minHeight="min-h-[70vh]"
      />
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
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-extrabold text-neutral-900">
              Tracking #{order?.sale_order_id || order?.id || orderId}
            </span>
            {(order?.is_customisable !== undefined || order?.product_type) && (
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md inline-flex items-center gap-1.5 shadow-2xs ${
                  String(order?.is_customisable) === '1' || String(order?.product_type).toLowerCase().includes('custom')
                    ? 'bg-pink-50 text-[var(--theme-primary)] border border-pink-200/60'
                    : 'bg-neutral-100 text-neutral-600 border border-neutral-200/60'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    String(order?.is_customisable) === '1' || String(order?.product_type).toLowerCase().includes('custom')
                      ? 'bg-[var(--theme-primary)]'
                      : 'bg-neutral-400'
                  }`}
                />
                {String(order?.is_customisable) === '1' || String(order?.product_type).toLowerCase().includes('custom')
                  ? 'Customizable'
                  : 'Ready Made'}
              </span>
            )}
          </div>
        </div>

        {cancelStatusMsg && (
          <div className="p-4 rounded-2xl bg-pink-50 border border-pink-200 text-xs font-semibold text-[var(--theme-primary)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{cancelStatusMsg}</span>
          </div>
        )}

        {returnStatusMsg && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-amber-600" />
            <span>{returnStatusMsg}</span>
          </div>
        )}

        {/* 1. Live Progress Stepper & Milestones Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs">
          {/* Header with Live Status & Date */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-6 border-b border-neutral-100">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider py-0.5 px-2.5 rounded-full border ${
                    isCancelled
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : isReturned
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : isDelivered
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'badge-theme-subtle'
                  }`}
                >
                  {isCancelled
                    ? 'Cancelled'
                    : isReturned
                    ? 'Return Active'
                    : isDelivered
                    ? 'Delivered'
                    : 'Live Tracking'}
                </span>
                {order?.order_id && (
                  <span className="text-[11px] font-mono text-neutral-400 font-semibold">
                    #{order.order_id}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 mt-1.5 flex items-center gap-2">
                {isCancelled
                  ? statusStr.includes('REFUND')
                    ? 'Order Cancelled & Refund Settled'
                    : 'Order Cancelled'
                  : isReturned
                  ? 'Return Request in Progress'
                  : isDelivered
                  ? 'Order Delivered Successfully'
                  : currentStatus}
              </h2>
            </div>

            {/* Timing Metadata on Right */}
            <div className="text-right">
              {isCancelled ? (
                <div>
                  <span className="text-[10px] text-neutral-400 font-bold uppercase block">
                    Cancelled Date
                  </span>
                  <span className="text-xs font-bold text-rose-600">
                    {formatStageDateTime(
                      order?.cancelled_at ||
                      orderStages.find((s) => String(s.stage).toLowerCase().includes('cancel'))?.date ||
                      order?.created_at
                    ) || 'Cancelled'}
                  </span>
                </div>
              ) : isDelivered ? (
                <div>
                  <span className="text-[10px] text-neutral-400 font-bold uppercase block">
                    Delivered On
                  </span>
                  <span className="text-xs font-extrabold text-emerald-600">
                    {formatStageDateTime(
                      orderStages.find((s) => String(s.stage).toLowerCase().includes('deliver'))?.date
                    ) || 'Completed'}
                  </span>
                </div>
              ) : order?.estimated_delivery ? (
                <div>
                  <span className="text-[10px] text-neutral-400 font-bold uppercase block">
                    Expected Delivery
                  </span>
                  <span className="text-xs font-extrabold text-emerald-600">
                    {order.estimated_delivery}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Contextual Banner for Cancelled or Returned Orders */}
          {isCancelled && (
            <div className="mb-6 p-4 sm:p-5 bg-rose-50/80 border border-rose-200/90 rounded-2xl text-xs text-rose-700 flex flex-col gap-2">
              <div className="flex items-center gap-2 font-bold text-rose-900 text-sm">
                <XCircle className="w-5 h-5 shrink-0 text-rose-600" />
                <span>
                  {order?.refund || statusStr.includes('REFUND')
                    ? 'Order Cancelled & Refund Processed'
                    : 'Order Cancelled'}
                </span>
              </div>
              {order?.refund ? (
                <div className="text-xs text-rose-800 pl-7 space-y-1">
                  <p>
                    Refund of <strong className="font-black text-rose-950">₹{order.refund.amount}</strong> has been {order.refund.refund_status || 'settled'}.
                  </p>
                  <p className="text-[11px] text-rose-600">
                    Razorpay Reference ID:{' '}
                    <span className="font-mono bg-rose-100 text-rose-900 px-1.5 py-0.5 rounded font-bold">
                      {order.refund.transaction_id || `REF-${order.refund.id}`}
                    </span>
                  </p>
                </div>
              ) : (
                <p className="text-xs text-rose-600 pl-7 leading-relaxed">
                  This order has been cancelled and any paid refund is processed back to original payment mode within 3-5 business days.
                </p>
              )}
              {order?.cancel_remark && (
                <div className="mt-1 pl-7 text-[11px] text-rose-800/80 italic font-medium">
                  Cancellation Reason: &ldquo;{order.cancel_remark}&rdquo;
                </div>
              )}
            </div>
          )}

          {isReturned && (
            <div className="mb-6 p-4 sm:p-5 bg-amber-50/80 border border-amber-200/90 rounded-2xl text-xs text-amber-900 flex flex-col gap-2">
              <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
                <RotateCcw className="w-5 h-5 shrink-0 text-amber-600" />
                <span>Return Request Active</span>
              </div>
              <p className="text-xs text-amber-800 pl-7 leading-relaxed">
                {order?.return_details?.return_reason
                  ? `Return Reason: "${order.return_details.return_reason}". Our logistics partner will pick up the garment for quality inspection, after which your refund will be processed.`
                  : 'Your return request has been submitted. Our logistics partner will pick up the garment for quality inspection, after which your refund will be processed.'}
              </p>
            </div>
          )}

          {/* Real Stages Horizontal Progression Stepper */}
          <div className="relative my-6 px-1">
            {/* Background connecting track line (desktop & tablet) */}
            <div className="hidden sm:block absolute top-4 left-6 right-6 h-1 bg-neutral-100 -z-0 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-700 ${
                  isCancelled
                    ? 'bg-rose-500'
                    : isReturned
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{
                  width: `${
                    orderStages.length <= 1
                      ? 100
                      : Math.min(
                          100,
                          Math.max(
                            0,
                            ((orderStages.filter(
                              (s) => s.is_completed || s.status === 'completed' || s.status === 'cancelled'
                            ).length - 1) /
                              (orderStages.length - 1)) *
                              100
                          )
                        )
                  }%`,
                }}
              />
            </div>

            {/* Stepper Node Items */}
            <div
              className={`flex items-start justify-between gap-2 overflow-x-auto pb-2 scrollbar-none sm:grid ${
                orderStages.length === 2
                  ? 'sm:grid-cols-2'
                  : orderStages.length === 3
                  ? 'sm:grid-cols-3'
                  : orderStages.length === 4
                  ? 'sm:grid-cols-4'
                  : orderStages.length === 5
                  ? 'sm:grid-cols-5'
                  : orderStages.length === 6
                  ? 'sm:grid-cols-6'
                  : orderStages.length === 7
                  ? 'sm:grid-cols-7'
                  : 'sm:grid-cols-8'
              }`}
            >
              {orderStages.map((st, idx) => {
                const cfg = getStageConfig(st)
                const StageIcon = cfg.icon
                const formattedDate = formatStageDateTime(st.date)

                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center text-center relative z-10 min-w-[90px] sm:min-w-0 px-1"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${cfg.dotClass}`}
                      title={`${st.stage}: ${cfg.badgeLabel}`}
                    >
                      <StageIcon className="w-4 h-4" />
                    </div>
                    <span className={`text-[11px] font-bold mt-2 leading-tight ${cfg.titleClass}`}>
                      {st.stage}
                    </span>
                    {formattedDate ? (
                      <span className="text-[10px] text-neutral-500 font-medium mt-0.5">
                        {formattedDate.split(',')[0]}
                      </span>
                    ) : (
                      <span className="text-[9px] text-neutral-400 mt-0.5">
                        {cfg.badgeLabel}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Detailed Real Data Activity Timeline (Vertical Log) */}
          <div className="mt-8 pt-6 border-t border-neutral-100">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--theme-primary)]" />
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Order Progression & Activity Log
                </h3>
              </div>
              <span className="text-[11px] text-neutral-500 font-semibold bg-neutral-100 px-2.5 py-0.5 rounded-full">
                {orderStages.filter((s) => s.is_completed || s.status === 'completed' || s.status === 'cancelled').length} of {orderStages.length} Milestones Reached
              </span>
            </div>

            <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-neutral-200">
              {orderStages.map((st, idx) => {
                const cfg = getStageConfig(st)
                const StageIcon = cfg.icon
                const formattedDate = formatStageDateTime(st.date)

                return (
                  <div key={idx} className="relative group">
                    {/* Node on vertical timeline track */}
                    <div
                      className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all ${cfg.dotClass}`}
                    >
                      <StageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>

                    {/* Milestone Card */}
                    <div
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                        st.status === 'cancelled'
                          ? 'bg-rose-50/60 border-rose-200/90'
                          : st.stage === 'Returned'
                          ? 'bg-amber-50/60 border-amber-200/90'
                          : st.is_completed || st.status === 'completed'
                          ? 'bg-neutral-50/70 border-neutral-200/80 hover:bg-white hover:shadow-xs'
                          : 'bg-white border-neutral-200/60 opacity-60'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs sm:text-sm font-bold ${cfg.titleClass}`}>
                            {st.stage}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}>
                            {cfg.badgeLabel}
                          </span>
                        </div>

                        {/* Real Date & Time */}
                        {formattedDate ? (
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-700 bg-white px-2.5 py-1 rounded-lg border border-neutral-200/70 shadow-2xs">
                            <Calendar className="w-3 h-3 text-neutral-400" />
                            <span>{formattedDate}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-neutral-400 font-medium italic">
                            Pending milestone update
                          </span>
                        )}
                      </div>

                      {/* Real Remark / Message */}
                      {st.remark && (
                        <div className="mt-2 text-xs text-neutral-600 flex items-start gap-1.5">
                          <span className="text-neutral-400 select-none">•</span>
                          <span className="leading-relaxed font-medium">
                            {st.remark}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

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
            {(() => {
              const addr = order?.deliveried_address || order?.delivery_address || order?.address || {}
              const customerName = addr.name || currentUser?.name || 'Valued Customer'
              const phone = addr.phone || addr.mobile || currentUser?.mobile || 'N/A'
              const formattedAddress =
                addr.full_address ||
                [
                  addr.house_building_name || addr.house,
                  addr.area_colony || addr.road,
                  addr.city,
                  addr.state ? `${addr.state}${addr.pincode ? ` - ${addr.pincode}` : ''}` : addr.pincode,
                ]
                  .filter(Boolean)
                  .join(', ') || 'Address on file'

              return (
                <div className="text-xs text-neutral-700 space-y-1">
                  <span className="font-bold text-neutral-900 block">{customerName}</span>
                  <p className="text-neutral-500 leading-relaxed">{formattedAddress}</p>
                  <p className="text-[11px] text-neutral-400 mt-2">Contact: {phone}</p>
                </div>
              )
            })()}
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

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (onOpenVendorChat) {
                    onOpenVendorChat({
                      saleOrderId: order?.sale_order_id || order?.id || orderId,
                      sale_order_id: order?.sale_order_id || order?.id || orderId,
                      orderId: order?.id || orderId,
                      order_id: order?.order_id,
                      orderCode: order?.order_id,
                      product_name: order?.product_name || order?.items?.[0]?.product_name,
                      product_image: order?.product_image || order?.items?.[0]?.product_image,
                      size: order?.size || order?.items?.[0]?.size,
                      quantity: order?.quantity || order?.items?.[0]?.quantity,
                      status: order?.status || order?.order_status,
                      order_status: order?.status || order?.order_status,
                      vendor_id: order?.vendor_id || order?.vendor?.id,
                      vendor: order?.vendor,
                      vendor_shop_name: order?.vendor?.shop_name || order?.vendor?.name,
                    })
                  } else if (onOpenSupport) {
                    onOpenSupport()
                  }
                }}
                className="flex-1 py-2.5 btn-theme text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs min-w-[130px]"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Live Atelier Chat</span>
              </button>

              {/* Pre-delivery: Show Cancel Order */}
              {canCancel && (
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="px-4 py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel Order
                </button>
              )}

              {/* Post-delivery: Show Return Order */}
              {canReturn && (
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(true)}
                  className="px-4 py-2.5 border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Return Order</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* INVOICE DETAILS & DOCUMENTATION */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center text-[#C00078]">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Invoice Details & Documentation
                </h3>
                <p className="text-[11px] text-neutral-400">
                  GST-compliant tax invoices and seller dispatch records
                </p>
              </div>
            </div>

            {orderInvoices.length > 0 && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-pink-50 text-[#C00078] border border-pink-200">
                {orderInvoices.length} {orderInvoices.length === 1 ? 'Seller Invoice Issued' : 'Multi-Seller Invoices'}
              </span>
            )}
          </div>

          {isInvoiceLoading ? (
            <div className="p-6 flex items-center justify-center gap-2 text-xs font-bold text-neutral-500">
              <Loader2 className="w-4 h-4 animate-spin text-[#C00078]" />
              <span>Fetching invoice records...</span>
            </div>
          ) : orderInvoices.length === 0 ? (
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <span className="font-bold text-neutral-800">Invoice is not available yet.</span>
                  <p className="text-[11px] text-neutral-400">Invoices are issued once payment is confirmed or order is placed.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orderInvoices.map((inv, idx) => {
                const invDate = inv.invoice_date
                  ? new Date(inv.invoice_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Recently'

                return (
                  <div
                    key={inv.id || idx}
                    className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/40 hover:bg-neutral-50 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono font-bold text-xs text-neutral-900">
                          {inv.invoice_number}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-pink-50 text-[#C00078] border border-pink-200 uppercase">
                          {inv.document_title || 'TAX INVOICE'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-600">
                        <div>
                          <span className="text-neutral-400 block text-[9px] uppercase font-bold">Seller / Boutique</span>
                          <span className="font-bold text-neutral-800">
                            {inv.seller_shop_name_snapshot || inv.seller_name_snapshot}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-400 block text-[9px] uppercase font-bold">Invoice Date</span>
                          <span className="font-medium text-neutral-800">{invDate}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 block text-[9px] uppercase font-bold">Payment Status</span>
                          <span className="font-bold text-emerald-700">{inv.payment_status || 'PAID'}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 block text-[9px] uppercase font-bold">Total Amount</span>
                          <span className="font-black text-[#C00078]">₹{Number(inv.grand_total || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-neutral-200/60">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveInvoiceForModal(inv)
                          setInvoiceModalOpen(true)
                        }}
                        className="flex-1 py-1.5 px-3 bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#C00078]" />
                        <span>View Invoice</span>
                      </button>

                      <button
                        type="button"
                        disabled={downloadingInvId === inv.id}
                        onClick={() => handleDownloadInvoice(inv)}
                        className="flex-1 py-1.5 px-3 bg-[#C00078] hover:bg-[#a00064] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all disabled:opacity-50"
                      >
                        {downloadingInvId === inv.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>Download PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveInvoiceForModal(inv)
                          setInvoiceModalOpen(true)
                        }}
                        className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl cursor-pointer transition-colors"
                        title="Print Invoice"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 3. Ordered Garments Breakdown */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs">
          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-4">
            Garments in this Order
          </h3>

          <div className="divide-y divide-neutral-100">
            {(Array.isArray(order?.items) && order.items.length > 0
              ? order.items
              : Array.isArray(order?.products) && order.products.length > 0
              ? order.products
              : order?.sale_order_id || order?.product_name
              ? [order]
              : []
            ).map((item, idx) => {
              const saleOrderId = item.sale_order_id || item.id || order.sale_order_id || orderId
              const isItemCancelled =
                Boolean(isCancelled) ||
                order?.is_cancelled === true ||
                String(order?.order_status || order?.status || '').toUpperCase().includes('CANCEL') ||
                String(order?.order_status || order?.status || '').toUpperCase().includes('DECLINE') ||
                item.is_cancelled === true ||
                String(item.order_status || item.status || '').toUpperCase().includes('CANCEL') ||
                String(item.order_status || item.status || '').toUpperCase().includes('DECLINE')

              const isItemReturned =
                !isItemCancelled &&
                !isCancelled &&
                (isReturned ||
                  item.is_returned === true ||
                  statusStr.includes('RETURN') ||
                  String(item.order_status || item.status || '').toUpperCase().includes('RETURN') ||
                  Boolean(order?.return_details) ||
                  Boolean(item?.return_details))

              const isItemDelivered =
                !isItemCancelled &&
                !isCancelled &&
                (isDelivered ||
                  currentStepIdx >= 4 ||
                  statusStr.includes('DELIVER') ||
                  String(order?.current_status || '').toUpperCase().includes('DELIVER') ||
                  String(order?.current_status_label || '').toUpperCase().includes('DELIVER') ||
                  String(item.order_status || item.status || '').toUpperCase().includes('DELIVER') ||
                  item.is_delivered === true)

              // Reviews allowed ONLY for Successful (Delivered) or Returned orders — NEVER for Cancelled orders
              const isEligibleForReview =
                !isItemCancelled && !isCancelled && (isItemDelivered || isItemReturned)

              const existingReview = item.review || order.review || null
              const hasReviewed = Boolean(existingReview && existingReview.ratings)

              const isCustomizable = Boolean(
                String(item.is_customisable) === '1' ||
                String(item.is_customizable) === '1' ||
                item.is_customisable === 1 ||
                item.is_customizable === true ||
                String(item.product_type).toLowerCase().includes('custom') ||
                String(order?.is_customisable) === '1' ||
                String(order?.is_customizable) === '1' ||
                (item.measurements && Object.keys(item.measurements).length > 0) ||
                (item.measurment_details && (Array.isArray(item.measurment_details) ? item.measurment_details.length > 0 : Object.keys(item.measurment_details).length > 0)) ||
                (order?.measurment_details && (Array.isArray(order?.measurment_details) ? order?.measurment_details.length > 0 : Object.keys(order?.measurment_details).length > 0))
              )

              return (
                <div key={idx} className="py-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <img
                    src={
                      formatImageUrl(item.product_image || item.image || item.image_path) ||
                      'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=300&q=80'
                    }
                    alt={item.product_name || item.title}
                    className="w-16 h-20 object-cover rounded-2xl border border-neutral-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md inline-flex items-center gap-1.5 shadow-2xs ${
                          isCustomizable
                            ? 'bg-pink-50 text-[var(--theme-primary)] border border-pink-200/60'
                            : 'bg-neutral-100 text-neutral-600 border border-neutral-200/60'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isCustomizable ? 'bg-[var(--theme-primary)]' : 'bg-neutral-400'}`} />
                        {isCustomizable ? 'Customizable' : 'Ready Made'}
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                      {item.product_name || item.title || 'Bespoke Atelier Garment'}
                    </h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {item.product_material_name || item.material_name || item.vendor_name || 'Bespoke Studio'}{' '}
                      {item.size ? `• Size: ${item.size}` : ''} • Qty: {item.quantity || 1}
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
                  <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto gap-2">
                    <span className="text-xs sm:text-sm font-extrabold text-neutral-900">
                      ₹{item.price_details?.discounted_price ??
                        item.price_details?.item_price ??
                        item.discount_price ??
                        item.item_price ??
                        item.price ??
                        item.total_amount ??
                        item.amount ??
                        order?.price_details?.discounted_price ??
                        order?.price_details?.item_price ??
                        order?.total_amount ??
                        order?.amount ??
                        0}
                    </span>

                    {!isItemCancelled && !isCancelled && (isEligibleForReview || hasReviewed) && (() => {
                      const score = Number(existingReview?.ratings || existingReview?.rating || 5)
                      const starInfo = getStarColor(score)
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setReviewingItem({
                              saleOrderId,
                              productId: item.product_id || order.product_id,
                              productName: item.product_name || item.title || 'Bespoke Garment',
                              productImage: item.product_image || item.image || item.image_path,
                              isEditMode: hasReviewed,
                              initialRating: existingReview?.ratings || existingReview?.rating || 5,
                              initialReview: existingReview?.review || existingReview?.comments || '',
                              initialImages: existingReview?.images || [],
                            })
                          }}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs ${
                            hasReviewed
                              ? `${starInfo.bgClass} ${starInfo.borderClass} ${starInfo.textClass} border hover:opacity-90`
                              : 'border border-[var(--theme-primary)]/40 bg-pink-50/50 text-[var(--theme-primary)] hover:bg-[var(--theme-primary)] hover:text-white'
                          }`}
                        >
                          {hasReviewed ? (
                            <>
                              <Star className={`w-3 h-3 ${starInfo.starClass}`} />
                              <span>{score}★ • Edit Review</span>
                            </>
                          ) : (
                            <>
                              <Star className="w-3 h-3 text-[var(--theme-primary)]" />
                              <span>Write Review</span>
                            </>
                          )}
                        </button>
                      )
                    })()}
                  </div>

                  {/* Dedicated Review Section for Successful / Returned Product (NEVER Cancelled) */}
                  {!isItemCancelled && !isCancelled && !hasReviewed && isEligibleForReview && (() => {
                    const isReturnedProduct = isItemReturned

                    return (
                      <div
                        className={`mt-3 p-3.5 sm:p-4 rounded-2xl border transition-all shadow-2xs ${
                          isReturnedProduct
                            ? 'bg-gradient-to-r from-amber-50/70 via-orange-50/30 to-white border-amber-200/90'
                            : 'bg-gradient-to-r from-emerald-50/70 via-teal-50/30 to-white border-emerald-200/90'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <span
                              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                                isReturnedProduct
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              }`}
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              {isReturnedProduct ? 'Returned Product Feedback' : 'Delivered Product Review'}
                            </span>
                            <h4 className="text-xs font-bold text-neutral-900">
                              {isReturnedProduct
                                ? 'How was your experience with this returned garment?'
                                : 'Rate your bespoke fitting & fabric quality'}
                            </h4>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setReviewingItem({
                                saleOrderId,
                                productId: item.product_id || order.product_id,
                                productName: item.product_name || item.title || 'Bespoke Garment',
                                productImage: item.product_image || item.image || item.image_path,
                                isEditMode: false,
                                initialRating: 5,
                                initialReview: '',
                                initialImages: [],
                              })
                            }}
                            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-white shrink-0 ${
                              isReturnedProduct
                                ? 'bg-amber-600 hover:bg-amber-700'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Write Review</span>
                          </button>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Dedicated Existing Review Card if already reviewed */}
                  {!isItemCancelled && hasReviewed && (() => {
                    const score = Number(existingReview?.ratings || existingReview?.rating || 5)
                    const starInfo = getStarColor(score)
                    return (
                      <div className={`mt-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r ${starInfo.cardBg} shadow-2xs`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3.5 h-3.5 ${
                                    s <= score ? starInfo.starClass : 'fill-neutral-200 text-neutral-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className={`text-xs font-black ${starInfo.textClass}`}>
                              {score}.0 out of 5 Stars
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setReviewingItem({
                                saleOrderId,
                                productId: item.product_id || order.product_id,
                                productName: item.product_name || item.title || 'Bespoke Garment',
                                productImage: item.product_image || item.image || item.image_path,
                                isEditMode: true,
                                initialRating: score,
                                initialReview: existingReview?.review || existingReview?.comments || '',
                                initialImages: existingReview?.images || [],
                              })
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3 text-neutral-600" />
                            <span>Edit</span>
                          </button>
                        </div>
                        {existingReview?.review && (
                          <p className="text-xs text-neutral-700 font-medium mt-2 bg-white/80 p-2.5 rounded-xl border border-neutral-200/80">
                            "{existingReview.review}"
                          </p>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>

          {/* Payment breakdown */}
          {(() => {
            const resolvedTotal =
              order?.price_details?.total_amount ??
              order?.total_amount ??
              order?.amount ??
              order?.price ??
              order?.items?.[0]?.total_amount ??
              order?.items?.[0]?.price ??
              0

            return (
              <div className="mt-4 pt-4 border-t border-neutral-100 space-y-2 text-xs">
                {order?.price_details && (
                  <div className="space-y-1.5 pb-2 border-b border-neutral-100 text-neutral-600">
                    <div className="flex justify-between items-center">
                      <span>Item Subtotal ({order.quantity || 1} item)</span>
                      <span className="font-semibold text-neutral-900">
                        ₹{order.price_details.actual_price ? (order.price_details.actual_price * (order.quantity || 1)) : (order.price_details.item_price || resolvedTotal)}
                      </span>
                    </div>
                    {order.price_details.discount > 0 && (
                      <div className="flex justify-between items-center text-emerald-600">
                        <span>Discount Savings</span>
                        <span className="font-semibold">-₹{order.price_details.discount}</span>
                      </div>
                    )}
                    {order.price_details.addon_amount > 0 && (
                      <div className="flex justify-between items-center">
                        <span>Artisan Addons</span>
                        <span className="font-semibold text-neutral-900">₹{order.price_details.addon_amount}</span>
                      </div>
                    )}
                    {order.price_details.alter_amount > 0 && (
                      <div className="flex justify-between items-center">
                        <span>Custom Alterations</span>
                        <span className="font-semibold text-neutral-900">₹{order.price_details.alter_amount}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span>Delivery Charges</span>
                      <span className="font-semibold text-neutral-900">
                        {order.price_details.delivery_charges > 0
                          ? `₹${order.price_details.delivery_charges}`
                          : 'FREE'}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-1">
                  <div>
                    <span className="text-neutral-500">Payment: </span>
                    <span className="font-bold text-neutral-900">{order?.payment_mode || 'Online Prepaid'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-neutral-500 mr-2">Total Amount:</span>
                    <span className="text-base font-black text-[var(--theme-primary)]">
                      ₹{resolvedTotal}
                    </span>
                  </div>
                </div>
              </div>
            )
          })()}
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

      {/* Return Order Modal */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-100">
            <div className="flex items-center gap-2 mb-2 text-neutral-900">
              <RotateCcw className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-bold">Request Order Return</h3>
            </div>
            <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
              Bespoke garments can be returned within 14 days of delivery. Our courier partner will pick up the item from your doorstep for inspection.
            </p>

            <label className="text-[11px] font-bold text-neutral-700 block mb-1">
              Select Reason for Return
            </label>
            <select
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[var(--theme-primary)] outline-none mb-6 font-medium text-neutral-800"
            >
              <option value="Product size or fitting mismatch">Product size or fitting mismatch</option>
              <option value="Defective / Damaged product received">Defective / Damaged product received</option>
              <option value="Product different from image / description">Product different from image / description</option>
              <option value="Quality not as expected">Quality not as expected</option>
              <option value="Received wrong item">Received wrong item</option>
              <option value="Ordered by mistake">Ordered by mistake</option>
              <option value="Other">Other</option>
            </select>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={handleReturnOrder}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmittingAction ? 'Submitting...' : 'Confirm Return Request'}
              </button>
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                className="px-4 py-2.5 border border-neutral-300 text-neutral-600 rounded-xl text-xs font-bold hover:bg-neutral-50 cursor-pointer"
              >
                Keep Garment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal for Order Item */}
      {reviewingItem && (
        <WriteReviewModal
          isOpen={Boolean(reviewingItem)}
          onClose={() => setReviewingItem(null)}
          saleOrderId={reviewingItem.saleOrderId}
          productId={reviewingItem.productId}
          productName={reviewingItem.productName}
          productImage={reviewingItem.productImage}
          currentUser={currentUser}
          isEditMode={Boolean(reviewingItem.isEditMode)}
          initialRating={reviewingItem.initialRating}
          initialReview={reviewingItem.initialReview}
          initialImages={reviewingItem.initialImages}
          onSuccess={(savedData) => {
            setOrder((prev) => ({
              ...prev,
              review: savedData,
            }))
            setReviewingItem(null)
          }}
        />
      )}

      {/* Official Tax Invoice & Documentation Modal */}
      {invoiceModalOpen && (
        <InvoiceModal
          isOpen={invoiceModalOpen}
          onClose={() => {
            setInvoiceModalOpen(false)
            setActiveInvoiceForModal(null)
          }}
          invoice={activeInvoiceForModal}
          orderId={order?.order_id || order?.id || orderId}
          currentUser={currentUser}
        />
      )}
    </div>
  )
}
