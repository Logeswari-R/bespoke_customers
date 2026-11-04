import React, { useState, useEffect } from 'react'
import {
  Package,
  ChevronRight,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  Search,
  ArrowLeft,
  Calendar,
} from 'lucide-react'
import { getUserOrders, formatImageUrl } from '../../services/api'

export default function OrdersPage({
  currentUser,
  onBack,
  onSelectOrder,
  onOpenAuth,
  onContinueShopping,
}) {
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(() => Boolean(currentUser?.id))
  const [activeTab, setActiveTab] = useState('ALL') // 'ALL', 'ACTIVE', 'DELIVERED', 'CANCELLED'
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let ignore = false
    const userId = currentUser?.id
    if (!userId) return

    async function fetchOrders() {
      setIsLoading(true)
      try {
        const res = await getUserOrders(userId, 1)
        if (!ignore && res.status && Array.isArray(res.orders)) {
          setOrders(res.orders)
        }
      } catch (err) {
        console.error('Failed to load orders:', err)
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    fetchOrders()
    return () => {
      ignore = true
    }
  }, [currentUser?.id])

  if (!currentUser) {
    return (
      <div className="min-h-[70vh] bg-[var(--theme-bg)] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center text-[var(--theme-primary)] mx-auto mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900">Sign in to View Orders</h2>
          <p className="text-xs text-neutral-500 mt-2 mb-6">
            Log in to track your bespoke garments, view past purchase invoices, and request doorstep alterations.
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

  // Filter orders by tab & search query
  const filteredOrders = orders.filter((order) => {
    const status = String(order.order_status || order.status || '').toUpperCase()
    if (activeTab === 'ACTIVE' && (status.includes('DELIVER') || status.includes('CANCEL'))) {
      return false
    }
    if (activeTab === 'DELIVERED' && !status.includes('DELIVER')) {
      return false
    }
    if (activeTab === 'CANCELLED' && !status.includes('CANCEL')) {
      return false
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const idMatch = String(order.id || order.sale_order_id || '').toLowerCase().includes(q)
      const nameMatch = (order.products || order.items || []).some((p) =>
        String(p.product_name || p.title || '').toLowerCase().includes(q)
      )
      return idMatch || nameMatch
    }

    return true
  })

  const getStatusBadge = (statusStr) => {
    const s = String(statusStr || 'PLACED').toUpperCase()
    if (s.includes('DELIVER')) {
      return (
        <span className="badge-success text-[10px] py-0.5 px-2.5 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Delivered
        </span>
      )
    }
    if (s.includes('CANCEL')) {
      return (
        <span className="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold py-0.5 px-2.5 rounded-full flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Cancelled
        </span>
      )
    }
    if (s.includes('DISPATCH') || s.includes('SHIP')) {
      return (
        <span className="badge-accent-cyan text-[10px] py-0.5 px-2.5 flex items-center gap-1">
          <Truck className="w-3 h-3" />
          Dispatched
        </span>
      )
    }
    return (
      <span className="badge-theme-subtle text-[10px] py-0.5 px-2.5 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        In Crafting
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-neutral-600 hover:text-black cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <h1 className="text-base font-extrabold text-neutral-900 tracking-tight">
            My Orders & Tracking
          </h1>
          <div className="w-12" />
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <div className="flex p-1 bg-white border border-neutral-200 rounded-2xl w-full sm:w-auto">
            {['ALL', 'ACTIVE', 'DELIVERED', 'CANCELLED'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-theme-gradient text-white shadow-xs'
                    : 'text-neutral-500 hover:text-black'
                }`}
              >
                {tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID or item..."
              className="w-full pl-9 pr-3 py-2 bg-white text-xs border border-neutral-200 rounded-2xl outline-none focus:border-[var(--theme-primary)]"
            />
          </div>
        </div>

        {/* Orders Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-3xl p-6 border border-neutral-200 animate-pulse space-y-4"
              >
                <div className="h-4 bg-neutral-200 rounded w-1/4" />
                <div className="h-16 bg-neutral-100 rounded-2xl" />
                <div className="h-4 bg-neutral-200 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-neutral-200 max-w-md mx-auto my-12">
            <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center text-[var(--theme-primary)] mx-auto mb-4">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">No orders found</h3>
            <p className="text-xs text-neutral-500 mt-1 mb-6">
              {searchQuery
                ? 'No orders matched your search criteria.'
                : 'You have not placed any orders under this filter yet.'}
            </p>
            <button
              type="button"
              onClick={onContinueShopping}
              className="px-6 py-2.5 btn-theme text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Explore Collections
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const orderId = order.id || order.sale_order_id || order.order_id
              const dateStr = order.created_at || order.c_date || order.date
              const products = order.products || order.items || order.order_items || []
              const totalAmount = order.total_amount || order.amount || order.grand_total || 0

              return (
                <div
                  key={orderId}
                  onClick={() => onSelectOrder && onSelectOrder(orderId)}
                  className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs hover:border-[var(--theme-primary)]/40 hover:shadow-md transition-all cursor-pointer group"
                >
                  {/* Top Bar: Order ID, Date, Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-neutral-100">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-extrabold text-neutral-900 group-hover:text-[var(--theme-primary)] transition-colors">
                        Order #{orderId}
                      </span>
                      {dateStr && (
                        <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(dateStr).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                    <div>{getStatusBadge(order.order_status || order.status)}</div>
                  </div>

                  {/* Items list preview */}
                  <div className="py-4 space-y-3">
                    {products.length === 0 ? (
                      <p className="text-xs text-neutral-500">Bespoke Atelier Garment</p>
                    ) : (
                      products.slice(0, 2).map((prod, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <img
                            src={
                              formatImageUrl(prod.image || prod.image_path || prod.main_image) ||
                              'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=200&q=80'
                            }
                            alt={prod.product_name || prod.title}
                            className="w-12 h-14 object-cover rounded-xl border border-neutral-100 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-neutral-900 truncate">
                              {prod.product_name || prod.title || 'Bespoke Crafted Piece'}
                            </h4>
                            <p className="text-[11px] text-neutral-500 mt-0.5">
                              {prod.vendor_name || 'Bespoke Atelier'} {prod.size ? `• Size: ${prod.size}` : ''}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-neutral-900">
                            ₹{prod.discount_price || prod.price || 499}
                          </span>
                        </div>
                      ))
                    )}
                    {products.length > 2 && (
                      <p className="text-[11px] text-[var(--theme-primary)] font-semibold">
                        +{products.length - 2} more item(s) in this order
                      </p>
                    )}
                  </div>

                  {/* Bottom Bar: Amount & Action */}
                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-neutral-500">Total: </span>
                      <span className="font-extrabold text-neutral-900">₹{totalAmount}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[var(--theme-primary)] font-bold group-hover:translate-x-1 transition-transform">
                      <span>View Live Tracking & Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
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
