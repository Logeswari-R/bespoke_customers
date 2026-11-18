import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Package,
  ChevronRight,
  Clock,
  CheckCircle,
  CheckCircle2,
  Truck,
  XCircle,
  Search,
  ArrowLeft,
  Calendar,
  Bookmark,
  Star,
  Edit3,
  Pen,
  RotateCcw,
  MessageSquare,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Check,
  FileText,
  Sparkles,
  SlidersHorizontal,
  X,
  Filter,
} from 'lucide-react'
import {
  getUserOrders,
  getUserReviewDetailsApi,
  formatImageUrl,
  getStarColor,
} from '../../services/api'
import WriteReviewModal from '../common/WriteReviewModal'
import InvoiceModal from '../common/InvoiceModal'

const STATUS_OPTIONS = [
  'On the way',
  'Delivered',
  'Cancelled',
  'Returned',
]

const TIME_OPTIONS = [
  'Last 30 days',
  '2024',
  '2023',
  'Older',
]

function getOrderStatusCategories(order) {
  const statusStr = String(
    order.order_status || order.status || order.order_history_with_date || ''
  ).toUpperCase()
  const historyStr = String(order.order_history || '').toUpperCase()
  const cancelledType = String(order.cancelled_type || '').toLowerCase()
  const rawStatusNum = parseInt(order.order_status, 10)

  const isReturned = Boolean(
    order.is_returned === true ||
    (cancelledType === 'return' && Boolean(order.cancelled_at)) ||
    Boolean(order.return_details) ||
    statusStr.includes('RETURN') ||
    historyStr.includes('RETURN') ||
    rawStatusNum === 8
  )

  const isDelivered = Boolean(
    !isReturned &&
    (order.is_delivered === true ||
      rawStatusNum === 5 ||
      statusStr.includes('DELIVER') ||
      historyStr.includes('DELIVER'))
  )

  const isCancelled = Boolean(
    !isReturned &&
    !isDelivered &&
    (order.is_cancelled === true ||
      Boolean(order.cancelled_at) ||
      (cancelledType === 'cancel' && Boolean(order.cancelled_at)) ||
      rawStatusNum === 4 ||
      statusStr.includes('CANCEL') ||
      statusStr.includes('DECLINE') ||
      historyStr.includes('CANCEL') ||
      historyStr.includes('DECLINE'))
  )

  const categories = []
  if (isDelivered) categories.push('Delivered')
  if (isReturned) categories.push('Returned')
  if (isCancelled) categories.push('Cancelled')
  if (!isCancelled && !isReturned && !isDelivered) {
    categories.push('On the way')
  }

  return categories
}

function getOrderTimeCategories(order) {
  const dateStr = order.created_at || order.c_date || order.date || order.order_date
  if (!dateStr) return ['Older']

  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ['Older']

    const now = new Date()
    const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    const year = d.getFullYear()

    const categories = []

    if (diffDays >= 0 && diffDays <= 30) {
      categories.push('Last 30 days')
    }

    if (year === 2024) {
      categories.push('2024')
    } else if (year === 2023) {
      categories.push('2023')
    } else if (year < 2023) {
      categories.push('Older')
    }

    if (categories.length === 0 && year < 2024) {
      categories.push('Older')
    }

    return categories
  } catch {
    return ['Older']
  }
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return String(dateStr)
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return String(dateStr)
  }
}

export default function OrdersPage({
  currentUser,
  onBack,
  onSelectOrder,
  onOpenAuth,
  onContinueShopping,
  onOpenSupport,
  onOpenVendorChat,
  onSelectProduct,
}) {
  const [orders, setOrders] = useState([])
  const [userReviewsMap, setUserReviewsMap] = useState({})
  const [isLoading, setIsLoading] = useState(() => Boolean(currentUser?.id))
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [selectedStatuses, setSelectedStatuses] = useState([])
  const [selectedTimeFilters, setSelectedTimeFilters] = useState([])
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [reviewingItem, setReviewingItem] = useState(null)
  const [invoiceOrderId, setInvoiceOrderId] = useState(null)
  const [invoiceSaleOrderId, setInvoiceSaleOrderId] = useState(null)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)

  const loadOrdersAndReviews = useCallback(async () => {
    const userId = currentUser?.id || currentUser?.user_id
    if (!userId) return

    setIsLoading(true)
    setPage(1)
    try {
      const [ordersRes, reviewsRes] = await Promise.allSettled([
        getUserOrders(userId, 1),
        getUserReviewDetailsApi({ userId }),
      ])

      if (
        ordersRes.status === 'fulfilled' &&
        ordersRes.value &&
        (ordersRes.value.status === true || ordersRes.value.status === 'true') &&
        Array.isArray(ordersRes.value.orders)
      ) {
        setOrders(ordersRes.value.orders)
        if (ordersRes.value.pagination) {
          setPagination(ordersRes.value.pagination)
        }
      }

      if (
        reviewsRes.status === 'fulfilled' &&
        reviewsRes.value &&
        (reviewsRes.value.status === true || reviewsRes.value.status === 'true') &&
        Array.isArray(reviewsRes.value.data)
      ) {
        const rMap = {}
        reviewsRes.value.data.forEach((rev) => {
          if (rev.sale_order_id) {
            rMap[rev.sale_order_id] = rev
          }
        })
        setUserReviewsMap(rMap)
      }
    } catch (err) {
      console.error('Failed to load orders or user reviews:', err)
    } finally {
      setIsLoading(false)
    }
  }, [currentUser?.id, currentUser?.user_id])

  const handleLoadMore = async () => {
    const userId = currentUser?.id || currentUser?.user_id
    if (!userId || isLoadingMore) return
    const maxPage = pagination?.lastPage || pagination?.totalPages || 1
    if (page >= maxPage) return

    setIsLoadingMore(true)
    try {
      const nextPage = page + 1
      const res = await getUserOrders(userId, nextPage)
      if (res && Array.isArray(res.orders) && res.orders.length > 0) {
        setOrders((prev) => {
          const existingIds = new Set(prev.map((o) => o.id || o.sale_order_id))
          const fresh = res.orders.filter((o) => !existingIds.has(o.id || o.sale_order_id))
          return [...prev, ...fresh]
        })
        setPage(nextPage)
        if (res.pagination) {
          setPagination(res.pagination)
        }
      }
    } catch (err) {
      console.warn('Failed loading more orders:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    loadOrdersAndReviews()
  }, [loadOrdersAndReviews])

  if (!currentUser) {
    return (
      <div className="min-h-[70vh] bg-[var(--theme-bg)] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center text-[var(--theme-primary)] mx-auto mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900">Sign in to View Orders</h2>
          <p className="text-xs text-neutral-500 mt-2 mb-6">
            Log in to track your bespoke garments, view past purchase invoices, and write reviews for delivered items.
          </p>
          <button
            type="button"
            onClick={() => onOpenAuth && onOpenAuth('login')}
            className="w-full py-3 btn-theme text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            Sign In / Register
          </button>
        </div>
      </div>
    )
  }

  const toggleStatusFilter = (status) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  const toggleTimeFilter = (time) => {
    setSelectedTimeFilters((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    )
  }

  const clearAllFilters = () => {
    setSelectedStatuses([])
    setSelectedTimeFilters([])
    setSearchQuery('')
  }

  const activeFilterCount = selectedStatuses.length + selectedTimeFilters.length

  const statusCounts = useMemo(() => {
    const counts = {
      'On the way': 0,
      'Delivered': 0,
      'Cancelled': 0,
      'Returned': 0,
    }
    orders.forEach((o) => {
      const cats = getOrderStatusCategories(o)
      cats.forEach((c) => {
        if (counts[c] !== undefined) counts[c]++
      })
    })
    return counts
  }, [orders])

  const timeCounts = useMemo(() => {
    const counts = {
      'Last 30 days': 0,
      '2024': 0,
      '2023': 0,
      'Older': 0,
    }
    orders.forEach((o) => {
      const cats = getOrderTimeCategories(o)
      cats.forEach((c) => {
        if (counts[c] !== undefined) counts[c]++
      })
    })
    return counts
  }, [orders])

  // Filter orders by checkboxes (Status & Time) and search query
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const idMatch = String(
          order.id || order.sale_order_id || order.order_id || order.sale_id || ''
        ).toLowerCase().includes(q)
        const nameMatch = (order.products || order.items || [order]).some((p) =>
          String(p.product_name || p.title || p.product_material_name || '').toLowerCase().includes(q)
        )
        if (!idMatch && !nameMatch) return false
      }

      // 2. Order Status filter
      if (selectedStatuses.length > 0) {
        const cats = getOrderStatusCategories(order)
        const matchesAnyStatus = selectedStatuses.some((st) => cats.includes(st))
        if (!matchesAnyStatus) return false
      }

      // 3. Order Time filter
      if (selectedTimeFilters.length > 0) {
        const times = getOrderTimeCategories(order)
        const matchesAnyTime = selectedTimeFilters.some((tf) => times.includes(tf))
        if (!matchesAnyTime) return false
      }

      return true
    })
  }, [orders, searchQuery, selectedStatuses, selectedTimeFilters])

  const getStatusBadge = (statusStr, order = {}) => {
    const s = String(statusStr || order.order_status || order.status || 'PLACED').toUpperCase()
    const historyStr = String(order.order_history || '').toUpperCase()
    const cancelledType = String(order.cancelled_type || '').toLowerCase()
    const rawStatusNum = parseInt(order.order_status, 10)

    const isReturned = Boolean(
      order.is_returned === true ||
      (cancelledType === 'return' && Boolean(order.cancelled_at)) ||
      Boolean(order.return_details) ||
      s.includes('RETURN') ||
      historyStr.includes('RETURN') ||
      rawStatusNum === 8
    )

    const isDelivered = Boolean(
      !isReturned &&
      (order.is_delivered === true ||
        rawStatusNum === 5 ||
        s.includes('DELIVER') ||
        historyStr.includes('DELIVER'))
    )

    const isCancelled = Boolean(
      !isReturned &&
      !isDelivered &&
      (order.is_cancelled === true ||
        Boolean(order.cancelled_at) ||
        (cancelledType === 'cancel' && Boolean(order.cancelled_at)) ||
        rawStatusNum === 4 ||
        s.includes('CANCEL') ||
        s.includes('DECLINE') ||
        historyStr.includes('CANCEL') ||
        historyStr.includes('DECLINE'))
    )

    if (isReturned) {
      return (
        <span className="bg-amber-50 text-amber-800 border border-amber-200/90 text-[10.5px] font-semibold py-0.5 px-2 rounded-full flex items-center gap-1 shadow-2xs">
          <RotateCcw className="w-3 h-3 text-amber-600" />
          <span>Return Processed</span>
        </span>
      )
    }

    if (isCancelled) {
      const isRefunded = Boolean(
        (order.refund && ['completed', 'processed', 'success'].includes(String(order.refund.refund_status || '').toLowerCase())) ||
        ((order.is_cancelled || Boolean(order.cancelled_at)) && (s.includes('REFUND') || historyStr.includes('REFUND')))
      )
      return (
        <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10.5px] font-semibold py-0.5 px-2 rounded-full flex items-center gap-1 shadow-2xs">
          <XCircle className="w-3 h-3 text-rose-600" />
          <span>{isRefunded ? 'Refund Processed' : 'Cancelled'}</span>
        </span>
      )
    }

    if (isDelivered) {
      return (
        <span className="bg-[#E8F8EE] text-[#059669] border border-[#C2F0D2] text-[10.5px] font-semibold py-0.5 px-2 rounded-full flex items-center gap-1 shadow-2xs">
          <CheckCircle2 className="w-3 h-3 text-[#059669]" />
          <span>Delivered</span>
        </span>
      )
    }

    if (s.includes('DISPATCH') || (s.includes('SHIP') && !s.includes('READY')) || rawStatusNum === 3 || rawStatusNum === 6 || rawStatusNum === 7) {
      return (
        <span className="bg-cyan-50 text-cyan-800 border border-cyan-200 text-[10.5px] font-semibold py-0.5 px-2 rounded-full flex items-center gap-1 shadow-2xs">
          <Truck className="w-3 h-3 text-cyan-600" />
          <span>Dispatched</span>
        </span>
      )
    }

    if (s.includes('READY') || rawStatusNum === 2) {
      return (
        <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10.5px] font-semibold py-0.5 px-2 rounded-full flex items-center gap-1 shadow-2xs">
          <Package className="w-3 h-3 text-blue-600" />
          <span>Ready to Ship</span>
        </span>
      )
    }

    if (s.includes('CONFIRM') || s.includes('APPROV') || rawStatusNum === 1) {
      return (
        <span className="bg-[#FFF5FA] text-[#C00078] border border-[#F0E5EC] text-[10.5px] font-semibold py-0.5 px-2 rounded-full flex items-center gap-1 shadow-2xs">
          <Clock className="w-3 h-3 text-[#C00078]" />
          <span>Order Confirmed</span>
        </span>
      )
    }

    if (s.includes('PLACE') || s.includes('PLACED') || rawStatusNum === 0) {
      return (
        <span className="bg-[#FFF5FA] text-[#C00078] border border-[#F0E5EC] text-[10.5px] font-semibold py-0.5 px-2 rounded-full flex items-center gap-1 shadow-2xs">
          <Clock className="w-3 h-3 text-[#C00078]" />
          <span>Order Placed</span>
        </span>
      )
    }

    return (
      <span className="bg-[#FFF5FA] text-[#C00078] border border-[#F0E5EC] text-[10.5px] font-semibold py-0.5 px-2 rounded-full flex items-center gap-1 shadow-2xs">
        <Clock className="w-3 h-3 text-[#C00078]" />
        <span>In Crafting</span>
      </span>
    )
  }

  const openReviewModal = (prod, order, isEdit = false, existingRev = null) => {
    const saleOrderId = prod.sale_order_id || prod.id || order.sale_order_id || order.id
    setReviewingItem({
      saleOrderId,
      productId: prod.product_id || order.product_id,
      productName: prod.product_name || prod.title || 'Bespoke Garment',
      productImage:
        prod.product_image ||
        prod.image ||
        prod.image_path ||
        prod.main_image,
      isEditMode: isEdit,
      initialRating: existingRev?.ratings || existingRev?.rating || 5,
      initialReview: existingRev?.review || existingRev?.comments || '',
      initialImages: existingRev?.images || [],
    })
  }

  return (
    <div className="min-h-screen bg-[#FAF9F8] py-6 sm:py-8 px-4 sm:px-6 lg:px-8 pb-20">
      <div className="max-w-7xl mx-auto">
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#F0E5EC]">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#77717C] hover:text-[#24212A] cursor-pointer transition-colors mb-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#C00078]" />
              <span>Back to Shopping</span>
            </button>
            <h1 className="text-[24px] sm:text-[28px] font-semibold text-[#24212A] tracking-normal">
              My Orders & Atelier History
            </h1>
          </div>

          <div className="text-[12px] text-[#77717C] font-normal self-start sm:self-auto">
            <span>{orders.length} total orders recorded</span>
          </div>
        </div>

        {/* 2-Column Responsive Layout: Sidebar Filters + Main Order Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* ========================================================= */}
          {/* 1. LEFT SIDEBAR: FILTERS (Desktop) */}
          {/* ========================================================= */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-24">
            <div className="bg-white rounded-2xl border border-[#F0E5EC] shadow-2xs p-5 space-y-5">
              {/* Header: Filters + Clear all */}
              <div className="flex items-center justify-between border-b border-[#F0E5EC] pb-3.5">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#C00078]" />
                  <h2 className="text-[15px] font-semibold text-[#24212A]">Filters</h2>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-[12px] font-semibold text-[#C00078] hover:text-[#9e0062] hover:underline cursor-pointer"
                  >
                    CLEAR ALL
                  </button>
                )}
              </div>

              {/* Filter Group 1: Order Status */}
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#77717C] mb-3 flex items-center justify-between">
                  <span>Order Status</span>
                  {selectedStatuses.length > 0 && (
                    <span className="text-[10px] font-semibold text-[#C00078] bg-[#FFF5FA] px-1.5 py-0.5 rounded-full border border-[#F0E5EC]">
                      {selectedStatuses.length}
                    </span>
                  )}
                </h3>
                <div className="space-y-2.5">
                  {STATUS_OPTIONS.map((st) => {
                    const isChecked = selectedStatuses.includes(st)
                    const count = statusCounts[st] || 0
                    return (
                      <label
                        key={st}
                        className="flex items-center justify-between text-[13px] font-normal text-[#24212A] hover:text-[#C00078] cursor-pointer select-none group"
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleStatusFilter(st)}
                            className="sr-only"
                          />
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                              isChecked
                                ? 'bg-[#C00078] border-[#C00078] text-white shadow-2xs'
                                : 'border-[#D1D5DB] bg-white group-hover:border-[#C00078]'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className={isChecked ? 'font-medium text-[#24212A]' : 'text-[#77717C]'}>
                            {st}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#77717C] font-normal tabular-nums">
                          ({count})
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="border-t border-[#F0E5EC]" />

              {/* Filter Group 2: Order Time */}
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#77717C] mb-3 flex items-center justify-between">
                  <span>Order Time</span>
                  {selectedTimeFilters.length > 0 && (
                    <span className="text-[10px] font-semibold text-[#C00078] bg-[#FFF5FA] px-1.5 py-0.5 rounded-full border border-[#F0E5EC]">
                      {selectedTimeFilters.length}
                    </span>
                  )}
                </h3>
                <div className="space-y-2.5">
                  {TIME_OPTIONS.map((tf) => {
                    const isChecked = selectedTimeFilters.includes(tf)
                    const count = timeCounts[tf] || 0
                    return (
                      <label
                        key={tf}
                        className="flex items-center justify-between text-[13px] font-normal text-[#24212A] hover:text-[#C00078] cursor-pointer select-none group"
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleTimeFilter(tf)}
                            className="sr-only"
                          />
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                              isChecked
                                ? 'bg-[#C00078] border-[#C00078] text-white shadow-2xs'
                                : 'border-[#D1D5DB] bg-white group-hover:border-[#C00078]'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className={isChecked ? 'font-medium text-[#24212A]' : 'text-[#77717C]'}>
                            {tf}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#77717C] font-normal tabular-nums">
                          ({count})
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* ========================================================= */}
          {/* 2. RIGHT MAIN CONTENT (col-span-9) */}
          {/* ========================================================= */}
          <main className="lg:col-span-9 min-w-0 space-y-4">
            {/* Top Search Bar & Mobile Filter Trigger */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#77717C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Order ID or Product Name..."
                  className="w-full pl-10 pr-9 py-2.5 bg-white text-[13px] border border-[#F0E5EC] rounded-2xl outline-none focus:border-[#C00078] transition-colors shadow-2xs text-[#24212A]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#77717C] hover:text-[#24212A] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Mobile Filter Button (< lg) */}
              <button
                type="button"
                onClick={() => setMobileFilterOpen(true)}
                className="lg:hidden flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-[#F0E5EC] hover:border-[#C00078]/40 rounded-2xl text-[12px] font-semibold text-[#24212A] shadow-2xs cursor-pointer active:scale-95 transition-all"
              >
                <SlidersHorizontal className="w-4 h-4 text-[#C00078]" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#D6007A] text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Active Filter Pills Bar */}
            {(activeFilterCount > 0 || searchQuery) && (
              <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide">
                  Active Filters:
                </span>
                {selectedStatuses.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => toggleStatusFilter(st)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 border border-pink-200 text-xs font-semibold text-[#D6007A] hover:bg-pink-100 transition-colors cursor-pointer"
                  >
                    <span>{st}</span>
                    <X className="w-3 h-3" />
                  </button>
                ))}
                {selectedTimeFilters.map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => toggleTimeFilter(tf)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 border border-pink-200 text-xs font-semibold text-[#D6007A] hover:bg-pink-100 transition-colors cursor-pointer"
                  >
                    <span>{tf}</span>
                    <X className="w-3 h-3" />
                  </button>
                ))}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-200 transition-colors cursor-pointer"
                  >
                    <span>"{searchQuery}"</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs font-bold text-[#D6007A] hover:underline cursor-pointer ml-1"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Orders Content Stream */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-3xl p-6 border border-neutral-200 animate-pulse space-y-4 shadow-xs"
                  >
                    <div className="h-4 bg-neutral-200 rounded w-1/4" />
                    <div className="h-20 bg-neutral-100 rounded-2xl" />
                    <div className="h-4 bg-neutral-200 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-pink-100 max-w-md mx-auto my-12 shadow-xs">
                <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center text-[#D6007A] mx-auto mb-4">
                  <Package className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-neutral-900">No orders found</h3>
                <p className="text-xs text-neutral-500 mt-1 mb-6">
                  {activeFilterCount > 0 || searchQuery
                    ? 'No orders match your selected filters or search criteria.'
                    : 'You have not placed any orders yet.'}
                </p>
                {activeFilterCount > 0 || searchQuery ? (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="px-6 py-2.5 rounded-full bg-[#D6007A] hover:bg-[#B80068] text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md transition-all active:scale-95"
                  >
                    Clear All Filters
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onContinueShopping}
                    className="px-6 py-2.5 btn-theme text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md"
                  >
                    Explore Collections
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-6">
                {filteredOrders.map((order) => {
                  const orderId = order.id || order.sale_order_id || order.order_id
                  const dateStr = order.created_at || order.c_date || order.date
                  const orderCode = order.order_id || `ORD${orderId}`
              const saleId = order.sale_id || `SID${orderId}`
              const orderStatus = String(
                order.order_status || order.status || order.order_history_with_date || ''
              ).toUpperCase()

              const isOrderCancelled =
                order.is_cancelled === true ||
                orderStatus.includes('CANCEL') ||
                orderStatus.includes('DECLINE') ||
                String(order.order_status) === '4' ||
                String(order.order_history_with_date || '').toUpperCase().includes('CANCEL') ||
                String(order.order_history_with_date || '').toUpperCase().includes('DECLINE')

              const isOrderReturned =
                !isOrderCancelled &&
                (order.is_returned === true ||
                  order.cancelled_type === 'return' ||
                  Boolean(order.return_details) ||
                  orderStatus.includes('RETURN') ||
                  String(order.order_history_with_date || '').toUpperCase().includes('RETURN') ||
                  String(order.order_status) === '8')

              const isOrderDelivered =
                !isOrderCancelled &&
                (orderStatus.includes('DELIVER') ||
                  order.is_delivered === true ||
                  String(order.order_status) === '5')

              const rawProducts = order.products || order.items || order.order_items || []
              const products =
                rawProducts.length > 0
                  ? rawProducts
                  : order.product_name || order.product_id
                  ? [order]
                  : []

              const sumOfProducts = products.reduce((sum, p) => {
                const val =
                  parseFloat(p.discount_price ?? p.price ?? p.item_price ?? p.amount ?? p.single_product_price ?? 0) || 0
                const qty = parseInt(p.quantity || p.qty || 1, 10) || 1
                return sum + (val > 0 ? val * qty : 0)
              }, 0)

              const totalAmount =
                (parseFloat(order.payable_price) > 0 ? parseFloat(order.payable_price) : null) ||
                (parseFloat(order.total_amount) > 0 ? parseFloat(order.total_amount) : null) ||
                (parseFloat(order.amount) > 0 ? parseFloat(order.amount) : null) ||
                (parseFloat(order.grand_total) > 0 ? parseFloat(order.grand_total) : null) ||
                (parseFloat(order.price) > 0 ? parseFloat(order.price) : null) ||
                (sumOfProducts > 0 ? sumOfProducts : null) ||
                (parseFloat(products[0]?.discount_price) > 0 ? parseFloat(products[0]?.discount_price) : null) ||
                (parseFloat(products[0]?.price) > 0 ? parseFloat(products[0]?.price) : null) ||
                (parseFloat(products[0]?.item_price) > 0 ? parseFloat(products[0]?.item_price) : null) ||
                0

              return (
                <div
                  key={orderId}
                  className="bg-white rounded-2xl border border-[#F0E5EC] shadow-2xs hover:border-[#C00078]/25 hover:shadow-xs transition-all overflow-hidden"
                >
                  {/* ========================================================= */}
                  {/* 1. ORDER HEADER BAR (Refined luxury proportions) */}
                  {/* ========================================================= */}
                  <div className="bg-[#FFF5FA] px-3 sm:px-3.5 py-2 border-b border-[#F0E5EC] flex flex-wrap items-center justify-between gap-2.5 text-xs">
                    {/* Left: 3 Metadata items with brand magenta outline icons */}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-5">
                      {/* Order Placed */}
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-[#C00078] shrink-0" />
                        <div>
                          <span className="text-[10px] text-[#77717C] font-normal block leading-none">
                            Order Placed
                          </span>
                          <span className="text-[12px] font-semibold text-[#24212A] block leading-tight mt-0.5 tabular-nums">
                            {formatDisplayDate(dateStr) || 'Recent'}
                          </span>
                        </div>
                      </div>

                      {/* Total Amount */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-[#C00078] shrink-0 leading-none">₹</span>
                        <div>
                          <span className="text-[10px] text-[#77717C] font-normal block leading-none">
                            Total Amount
                          </span>
                          <span className="text-[12px] font-bold text-[#C00078] block leading-tight mt-0.5 tabular-nums">
                            ₹{totalAmount}
                          </span>
                        </div>
                      </div>

                      {/* Order Reference */}
                      <div className="flex items-center gap-1.5">
                        <Bookmark className="w-3 h-3 text-[#C00078] shrink-0" />
                        <div>
                          <span className="text-[10px] text-[#77717C] font-normal block leading-none">
                            Order Reference
                          </span>
                          <span className="text-[11.5px] font-semibold text-[#24212A] block leading-tight mt-0.5">
                            {orderCode} {saleId ? `(${saleId})` : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right side: Status Badge + Solid Magenta Invoice Button + White Order Details Button */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getStatusBadge(order.order_status || order.status || order.order_history_with_date, order)}

                      <button
                        type="button"
                        onClick={() => {
                          setInvoiceOrderId(order.order_id || order.id || orderId)
                          setInvoiceSaleOrderId(order.sale_order_id || order.sale_id || (products[0] && (products[0].sale_order_id || products[0].id)) || null)
                          setIsInvoiceModalOpen(true)
                        }}
                        className="px-2.5 py-1 rounded-full bg-[#C00078] hover:bg-[#a00064] text-white text-[11px] font-semibold flex items-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
                        title="View or download official invoice"
                      >
                        <FileText className="w-3 h-3 text-white" />
                        <span>Invoice</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectOrder && onSelectOrder(order.sale_order_id || order.id || order.order_id || orderId)}
                        className="px-2.5 py-1 rounded-full bg-white hover:bg-[#FFF5FA] border border-[#F0E5EC] hover:border-[#C00078]/40 text-[#24212A] text-[11px] font-semibold flex items-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
                        title="View complete order details, timeline, and delivery information"
                      >
                        <FileText className="w-3 h-3 text-[#77717C]" />
                        <span>Order Details</span>
                        <ChevronRight className="w-2.5 h-2.5 text-[#77717C]" />
                      </button>
                    </div>
                  </div>

                  {/* ========================================================= */}
                  {/* 2. ORDER ITEMS LIST & REVIEWS */}
                  {/* ========================================================= */}
                  <div className="p-3.5 sm:p-4 divide-y divide-neutral-100">
                    {products.map((prod, idx) => {
                      const saleOrderId =
                        prod.sale_order_id || prod.id || order.sale_order_id || order.id
                      const itemStatus = String(
                        prod.order_status || prod.status || prod.order_history_with_date || orderStatus
                      ).toUpperCase()

                      const isItemCancelled =
                        isOrderCancelled ||
                        prod.is_cancelled === true ||
                        itemStatus.includes('CANCEL') ||
                        itemStatus.includes('DECLINE')

                      const isItemReturned =
                        !isItemCancelled &&
                        (isOrderReturned ||
                          prod.is_returned === true ||
                          itemStatus.includes('RETURN') ||
                          Boolean(prod.return_details))

                      const isItemDelivered =
                        !isItemCancelled &&
                        (isOrderDelivered ||
                          itemStatus.includes('DELIVER') ||
                          prod.is_delivered === true)

                      // Reviews allowed ONLY for Successful (Delivered) or Returned orders — NEVER for Cancelled orders
                      const isEligibleForReview =
                        !isItemCancelled && (isItemDelivered || isItemReturned)

                      const existingReview =
                        (saleOrderId ? userReviewsMap[saleOrderId] : null) ||
                        prod.review ||
                        order.review ||
                        null

                      const hasReviewed = Boolean(existingReview && (existingReview.ratings || existingReview.review))

                      const isCustomizable = Boolean(
                        String(prod.is_customisable) === '1' ||
                        String(prod.is_customizable) === '1' ||
                        prod.is_customisable === 1 ||
                        prod.is_customizable === true ||
                        String(prod.product_type).toLowerCase().includes('custom') ||
                        String(order.is_customisable) === '1' ||
                        String(order.is_customizable) === '1' ||
                        (prod.measurements && Object.keys(prod.measurements).length > 0) ||
                        (prod.measurment_details &&
                          (Array.isArray(prod.measurment_details)
                            ? prod.measurment_details.length > 0
                            : Object.keys(prod.measurment_details).length > 0))
                      )

                      const itemPrice =
                        prod.discount_price ??
                        prod.price ??
                        prod.item_price ??
                        prod.amount ??
                        totalAmount ??
                        0

                      return (
                        <div key={idx} className="py-2.5 first:pt-0 last:pb-0 space-y-2.5">
                          {/* Item Card Flex Row (Product Info on Left, Chat with Admin on Right) */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                            {/* Product Image & Details */}
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <img
                                src={
                                  formatImageUrl(
                                    prod.product_image ||
                                      prod.image ||
                                      prod.image_path ||
                                      prod.main_image
                                  ) ||
                                  'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=300&q=80'
                                }
                                alt={prod.product_name || prod.title}
                                className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-xl border border-[#F0E5EC] shrink-0 shadow-2xs cursor-pointer hover:opacity-90 transition-opacity bg-neutral-100"
                                onClick={() =>
                                  onSelectProduct &&
                                  onSelectProduct(prod.product_id || order.product_id || prod.id)
                                }
                              />

                              <div className="flex-1 min-w-0">
                                {/* Badge */}
                                <div className="mb-0.5">
                                  <span
                                    className={`text-[9.5px] font-semibold tracking-wide px-2 py-0.5 rounded-full inline-block ${
                                      isCustomizable
                                        ? 'bg-[#FFF5FA] text-[#C00078] border border-[#F0E5EC]'
                                        : 'bg-[#F4F4F6] text-[#77717C]'
                                    }`}
                                  >
                                    {isCustomizable ? 'Bespoke Tailored' : 'Ready Made'}
                                  </span>
                                </div>

                                {/* Title: 13-14px, weight 500 */}
                                <h3
                                  onClick={() =>
                                    onSelectProduct &&
                                    onSelectProduct(prod.product_id || order.product_id || prod.id)
                                  }
                                  className="text-[13px] sm:text-[14px] font-medium text-[#24212A] hover:text-[#C00078] cursor-pointer transition-colors leading-snug line-clamp-1"
                                >
                                  {prod.product_name || prod.title || 'Product'}
                                </h3>

                                {/* Variant / Attributes: 11.5px, weight 400 */}
                                <p className="text-[11.5px] text-[#77717C] font-normal mt-0.5">
                                  {prod.product_material_name ? `${prod.product_material_name} • ` : ''}
                                  Size: <span className="font-medium text-[#24212A]">{prod.size || 'Standard'}</span>
                                  {prod.quantity ? ` • Qty: ${prod.quantity}` : ' • Qty: 1'}
                                </p>

                                {/* Price: 14.5px, weight 700 with tabular-nums */}
                                <div className="mt-0.5 text-[14.5px] font-bold text-[#C00078] tabular-nums">
                                  ₹{itemPrice}
                                </div>
                              </div>
                            </div>

                            {/* Right Action: Clean Chat with Admin pill button */}
                            <div className="shrink-0 w-full sm:w-auto flex justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onOpenVendorChat) {
                                    onOpenVendorChat({
                                      saleOrderId,
                                      sale_order_id: saleOrderId,
                                      orderId: order.id || orderId,
                                      order_id: order.order_id,
                                      orderCode,
                                      product_name: prod.product_name || prod.title,
                                      product_image: prod.product_image || prod.image,
                                      size: prod.size,
                                      quantity: prod.quantity,
                                      status: order.order_status || order.status,
                                      order_status: order.order_status || order.status,
                                      vendor_id: order.vendor_id || order.vendor?.id,
                                      vendor: order.vendor,
                                      vendor_shop_name: order.vendor?.shop_name || order.vendor?.name,
                                    })
                                  } else if (onOpenSupport) {
                                    onOpenSupport()
                                  } else if (onSelectOrder) {
                                    onSelectOrder(orderId)
                                  }
                                }}
                                className="w-full sm:w-auto px-3 py-1 rounded-full border border-[#F0E5EC] hover:border-[#C00078] hover:bg-[#FFF5FA] text-[#24212A] hover:text-[#C00078] text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                              >
                                <MessageCircle className="w-3 h-3 text-[#77717C]" />
                                <span>Chat with Admin</span>
                              </button>
                            </div>
                          </div>

                          {/* ========================================================= */}
                          {/* 3. REVIEW SECTION (Exact match to uploaded design) */}
                          {/* ========================================================= */}
                          {!isItemCancelled && hasReviewed && (() => {
                            const reviewRating = Number(existingReview.ratings || existingReview.rating || 5)
                            const starInfo = getStarColor(reviewRating)
                            const reviewImages = Array.isArray(existingReview.images) ? existingReview.images : []
                            const extraImagesCount = reviewImages.length > 1 ? reviewImages.length - 1 : 0

                            return (
                              <div className="pt-2.5 border-t border-neutral-100">
                                {/* Stars, Score, Date & Edit Review Button Row */}
                                <div className="flex items-center justify-between gap-2.5 flex-wrap">
                                  <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                                    {/* Dynamic Colored Stars (Green 4-5, Orange 3, Red 1-2 based on review rating) */}
                                    <div className="flex items-center gap-0.5">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          className={`w-3.5 h-3.5 transition-colors ${
                                            star <= reviewRating
                                              ? starInfo.starClass
                                              : 'text-neutral-300 fill-transparent'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <span className={`text-[11px] font-bold ${starInfo.textClass} ml-0.5`}>
                                      {reviewRating}.0 out of 5
                                    </span>
                                    <span className="text-neutral-300 mx-1">|</span>
                                    {existingReview.created_at && (
                                      <span className="text-[10.5px] text-neutral-400 font-medium">
                                        Reviewed on {formatDisplayDate(existingReview.created_at)}
                                      </span>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => openReviewModal(prod, order, true, existingReview)}
                                    className="px-2.5 py-1 rounded-full bg-[#FFF0F6] hover:bg-[#FFE0ED] text-neutral-800 border border-pink-200/60 text-[10.5px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                                    title="Edit your review"
                                  >
                                    <Pen className="w-3 h-3 text-[#D6007A]" />
                                    <span>Edit Review</span>
                                  </button>
                                </div>

                                {/* Review Comment Box */}
                                {existingReview.review && (
                                  <div className="mt-2 px-3 py-1.5 rounded-lg bg-[#FFF8FA] border border-pink-100/70 text-xs text-neutral-700 font-normal italic">
                                    "{existingReview.review}"
                                  </div>
                                )}

                                {/* Review Photos Row */}
                                {reviewImages.length > 0 && (
                                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                                    {reviewImages.slice(0, 2).map((imgObj, i) => {
                                      const imgUrl = formatImageUrl(
                                        imgObj.image_path || imgObj.url || imgObj
                                      )
                                      return (
                                        <a
                                          key={i}
                                          href={imgUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="w-10 h-10 rounded-lg overflow-hidden border border-pink-200/70 shadow-2xs hover:scale-105 transition-transform"
                                          title="View photo"
                                        >
                                          <img
                                            src={imgUrl}
                                            alt="Review attachment"
                                            className="w-full h-full object-cover"
                                          />
                                        </a>
                                      )
                                    })}

                                    {extraImagesCount > 0 && (
                                      <span className="w-7 h-7 rounded-lg bg-[#FFF0F6] text-[#D6007A] font-bold text-[10.5px] flex items-center justify-center border border-pink-200/60 shadow-2xs">
                                        +{extraImagesCount}
                                      </span>
                                    )}

                                    <span className="text-[11px] text-neutral-500 font-medium ml-1">
                                      {reviewImages.length} Photo{reviewImages.length > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )
                          })()}

                          {/* Write Review Prompt if eligible and not yet reviewed */}
                          {!isItemCancelled && !hasReviewed && isEligibleForReview && (
                            <div className="pt-2.5 border-t border-neutral-100 flex items-center justify-between gap-2.5 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className="w-3.5 h-3.5 text-neutral-300 fill-transparent"
                                    />
                                  ))}
                                </div>
                                <span className="text-[11px] text-neutral-500 font-medium">
                                  Share your experience with this bespoke garment
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => openReviewModal(prod, order, false)}
                                className="px-3 py-1 rounded-full bg-[#FFF0F6] hover:bg-[#FFE0ED] text-[#D6007A] border border-pink-200 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                              >
                                <Star className="w-3 h-3 fill-[#D6007A] text-[#D6007A]" />
                                <span>Rate & Review</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Load More Orders Action */}
          {Boolean(pagination && (pagination.lastPage || pagination.totalPages || 1) > page) && (
            <div className="mt-8 text-center pb-4">
              <button
                type="button"
                disabled={isLoadingMore}
                onClick={handleLoadMore}
                className="px-6 py-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-800 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isLoadingMore ? 'Loading More Orders...' : 'Load More Past Orders'}
              </button>
            </div>
          )}
        </>
      )}
          </main>
        </div>

        {/* Mobile Filter Modal / Drawer */}
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom duration-200">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#D6007A]" />
                  <h3 className="text-base font-bold text-neutral-900">Filters</h3>
                  {activeFilterCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-pink-100 text-[#D6007A] text-[10px] font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 overflow-y-auto">
                {/* Order Status */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-3">
                    Order Status
                  </h4>
                  <div className="space-y-3">
                    {STATUS_OPTIONS.map((st) => {
                      const isChecked = selectedStatuses.includes(st)
                      const count = statusCounts[st] || 0
                      return (
                        <label
                          key={st}
                          className="flex items-center justify-between text-xs font-medium text-neutral-700 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleStatusFilter(st)}
                              className="sr-only"
                            />
                            <div
                              className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                                isChecked
                                  ? 'bg-[#D6007A] border-[#D6007A] text-white'
                                  : 'border-neutral-300 bg-white'
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <span className={isChecked ? 'font-semibold text-neutral-900 text-sm' : 'text-neutral-700 text-sm'}>
                              {st}
                            </span>
                          </div>
                          <span className="text-xs text-neutral-400 font-normal">
                            ({count})
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="border-t border-neutral-100" />

                {/* Order Time */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-3">
                    Order Time
                  </h4>
                  <div className="space-y-3">
                    {TIME_OPTIONS.map((tf) => {
                      const isChecked = selectedTimeFilters.includes(tf)
                      const count = timeCounts[tf] || 0
                      return (
                        <label
                          key={tf}
                          className="flex items-center justify-between text-xs font-medium text-neutral-700 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleTimeFilter(tf)}
                              className="sr-only"
                            />
                            <div
                              className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                                isChecked
                                  ? 'bg-[#D6007A] border-[#D6007A] text-white'
                                  : 'border-neutral-300 bg-white'
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <span className={isChecked ? 'font-semibold text-neutral-900 text-sm' : 'text-neutral-700 text-sm'}>
                              {tf}
                            </span>
                          </div>
                          <span className="text-xs text-neutral-400 font-normal">
                            ({count})
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-4 py-2.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 cursor-pointer"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#D6007A] hover:bg-[#B80068] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  Apply Filters ({filteredOrders.length})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal for Order Item (Supports both New and Edit modes) */}
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
            if (reviewingItem.saleOrderId) {
              setUserReviewsMap((prev) => ({
                ...prev,
                [reviewingItem.saleOrderId]: savedData,
              }))
            }
            loadOrdersAndReviews()
          }}
        />
      )}

      {/* Invoice Modal Preview */}
      {isInvoiceModalOpen && (
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false)
            setInvoiceOrderId(null)
            setInvoiceSaleOrderId(null)
          }}
          orderId={invoiceOrderId}
          saleOrderId={invoiceSaleOrderId}
          currentUser={currentUser}
        />
      )}
    </div>
  )
}
