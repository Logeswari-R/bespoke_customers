import React, { useState, useEffect } from 'react'
import {
  MapPin,
  Plus,
  Check,
  Tag,
  CreditCard,
  Truck,
  ShieldCheck,
  ArrowLeft,
  ChevronRight,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react'
import {
  getAddresses,
  addAddressApi,
  getPromoCodes,
  placeOrderApi,
  formatImageUrl,
} from '../../services/api'

export default function CheckoutPage({
  currentUser,
  cartItems = [],
  onBack,
  onOrderSuccess,
  onOpenAuth,
}) {
  // Address state
  const [addresses, setAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(Boolean(currentUser?.id))
  const [isAddingAddress, setIsAddingAddress] = useState(false)
  const [addressForm, setAddressForm] = useState({
    name: currentUser?.name || currentUser?.username || '',
    phone: currentUser?.mobile || '',
    pincode: '',
    state: '',
    city: '',
    house_building_name: '',
    area_colony: '',
    landmark_nearby: '',
    type: '0',
  })

  // Promo code state
  const [promoCodes, setPromoCodes] = useState([])
  const [appliedPromo, setAppliedPromo] = useState(null)
  const [couponInput, setCouponInput] = useState('')
  const [couponError, setCouponError] = useState('')
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false)

  // Payment state
  const [paymentMode, setPaymentMode] = useState('ONLINE') // 'ONLINE' or 'COD'
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [orderError, setOrderError] = useState('')

  // Load addresses on mount
  useEffect(() => {
    let ignore = false
    const userId = currentUser?.id || currentUser?.user_id
    if (!userId) return

    async function loadData() {
      setIsLoadingAddresses(true)
      try {
        const [addrRes, promoRes] = await Promise.allSettled([
          getAddresses(userId),
          getPromoCodes(),
        ])
        if (ignore) return
        if (addrRes.status === 'fulfilled' && addrRes.value.status && Array.isArray(addrRes.value.data)) {
          setAddresses(addrRes.value.data)
          if (addrRes.value.data.length > 0) {
            setSelectedAddressId(addrRes.value.data[0].id)
          }
        }
        if (promoRes.status === 'fulfilled' && promoRes.value.success && Array.isArray(promoRes.value.data)) {
          setPromoCodes(promoRes.value.data)
        }
      } catch (e) {
        console.error('Checkout init error:', e)
      } finally {
        if (!ignore) setIsLoadingAddresses(false)
      }
    }
    loadData()
    return () => {
      ignore = true
    }
  }, [currentUser?.id, currentUser?.user_id])

  // If not logged in, prompt login
  if (!currentUser) {
    return (
      <div className="min-h-[70vh] bg-[var(--theme-bg)] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center text-[var(--theme-primary)] mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900">Sign in to Checkout</h2>
          <p className="text-xs text-neutral-500 mt-2 mb-6">
            Please log in or create an account to view your saved addresses, apply luxury coupons, and complete your bespoke order.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 py-2.5 border border-neutral-200 text-neutral-700 rounded-xl text-xs font-bold hover:bg-neutral-50 cursor-pointer"
            >
              Back to Shopping
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="flex-1 py-2.5 btn-theme text-xs font-bold cursor-pointer"
            >
              Sign In / Register
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Subtotal and Calculations
  const subtotal = cartItems.reduce(
    (acc, item) => acc + (Number(item.price) || 0) * (item.quantity || 1),
    0
  )
  const deliveryFee = subtotal >= 499 ? 0 : 49

  // Calculate discount from applied promo
  let discountAmount = 0
  if (appliedPromo) {
    if (appliedPromo.discount_type === 'percentage') {
      discountAmount = Math.round((subtotal * (Number(appliedPromo.discount_amount) || 0)) / 100)
    } else {
      discountAmount = Math.min(subtotal, Number(appliedPromo.discount_amount) || 0)
    }
  }

  const grandTotal = Math.max(0, subtotal - discountAmount + deliveryFee)

  // Apply Coupon Handler
  const handleApplyCoupon = (promo) => {
    const minSpend = Number(promo.min_purchase || promo.minimum_order_amount || 0)
    if (subtotal < minSpend) {
      setCouponError(`Requires minimum order of ₹${minSpend}`)
      return
    }
    setAppliedPromo(promo)
    setCouponInput(promo.code || promo.promocode)
    setCouponError('')
    setIsPromoModalOpen(false)
  }

  const handleManualCouponSubmit = (e) => {
    e.preventDefault()
    if (!couponInput.trim()) return
    const matched = promoCodes.find(
      (p) => (p.code || p.promocode || '').toLowerCase() === couponInput.trim().toLowerCase()
    )
    if (matched) {
      handleApplyCoupon(matched)
    } else {
      setCouponError('Invalid or expired coupon code.')
    }
  }

  // Handle Save New Address
  const handleSaveAddress = async (e) => {
    e.preventDefault()
    if (!addressForm.name || !addressForm.phone || !addressForm.pincode || !addressForm.house_building_name) {
      alert('Please fill out all mandatory address fields.')
      return
    }
    try {
      const res = await addAddressApi({
        user_id: currentUser?.id || currentUser?.user_id,
        ...addressForm,
      })
      if (res?.status === 'true' || res?.status === true) {
        let list = Array.isArray(res.data) ? res.data : null
        if (!list || list.length === 0) {
          const updated = await getAddresses(currentUser?.id || currentUser?.user_id)
          list = updated?.data || []
        }
        if (list && list.length > 0) {
          setAddresses(list)
          setSelectedAddressId(list[list.length - 1]?.id)
        }
        setIsAddingAddress(false)
      } else {
        alert(res?.message || 'Failed to save address')
      }
    } catch (err) {
      console.error(err)
      alert('Network error saving address')
    }
  }

  // Handle Place Order
  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setOrderError('Please select or add a delivery address to continue.')
      return
    }
    if (cartItems.length === 0) {
      setOrderError('Your shopping bag is empty.')
      return
    }

    setOrderError('')
    setIsPlacingOrder(true)

    try {
      const orderPayload = {
        user_id: currentUser?.id || currentUser?.user_id,
        address_id: selectedAddressId,
        coupen_id: appliedPromo ? (appliedPromo.id || appliedPromo.coupon_id) : null,
        payment_mode: paymentMode,
        product: cartItems.map((item) => ({
          price_id: item.price_id || null,
          product_id: item.product_id || item.id,
          quantity: item.quantity || 1,
          cart_id: item.cart_item_id || item.id,
          addon: (item.addons || []).map((a) => ({ id: a.id || a.addon_id })),
          measurements: item.measurements || item.measurementDetails || [],
        })),
      }

      const res = await placeOrderApi(orderPayload)

      if (res?.status === true || res?.status === 'true') {
        const orderId = res.order_id || res.sale_order_id || Date.now()
        if (paymentMode === 'ONLINE' && res.razorpay_order_id) {
          // Trigger Razorpay payment gateway
          alert(`Order created! In a live transaction, Razorpay checkout modal opens with ID ${res.razorpay_order_id}. Simulating payment confirmation.`)
        }
        if (onOrderSuccess) {
          onOrderSuccess({
            orderId,
            totalAmount: grandTotal,
            address: addresses.find((a) => a.id === selectedAddressId),
            items: cartItems,
            paymentMode,
          })
        }
      } else {
        setOrderError(res?.message || 'Could not place order. Please review your details.')
      }
    } catch (err) {
      console.error('Order error:', err)
      setOrderError('Failed to connect to checkout gateway. Please try again.')
    } finally {
      setIsPlacingOrder(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-200">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-neutral-600 hover:text-black cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Shopping</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-400">Bag</span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs font-extrabold text-[var(--theme-primary)]">Checkout & Payment</span>
          </div>
        </div>

        {orderError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{orderError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Delivery Address, Order Items, Payment */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Delivery Address Card */}
            <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-[var(--theme-primary)]">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900">1. Delivery Address</h3>
                </div>
                {!isAddingAddress && (
                  <button
                    type="button"
                    onClick={() => setIsAddingAddress(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-[var(--theme-primary)] hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Address</span>
                  </button>
                )}
              </div>

              {isLoadingAddresses ? (
                <div className="py-8 text-center text-xs text-neutral-400 animate-pulse">
                  Loading saved addresses...
                </div>
              ) : isAddingAddress ? (
                /* Add New Address Form */
                <form onSubmit={handleSaveAddress} className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={addressForm.name}
                        onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[var(--theme-primary)] outline-none"
                        placeholder="e.g. Priyadarshini Rao"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        10-Digit Mobile *
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={addressForm.phone}
                        onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[var(--theme-primary)] outline-none"
                        placeholder="e.g. 9876543210"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        PIN Code *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={addressForm.pincode}
                        onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[var(--theme-primary)] outline-none"
                        placeholder="600001"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">City</label>
                      <input
                        type="text"
                        value={addressForm.city}
                        onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[var(--theme-primary)] outline-none"
                        placeholder="Chennai"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">State</label>
                      <input
                        type="text"
                        value={addressForm.state}
                        onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[var(--theme-primary)] outline-none"
                        placeholder="Tamil Nadu"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      Flat, House No., Building Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.house_building_name}
                      onChange={(e) => setAddressForm({ ...addressForm, house_building_name: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[var(--theme-primary)] outline-none"
                      placeholder="e.g. Flat 4B, Emerald Heights"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      Road Name, Area, Colony
                    </label>
                    <input
                      type="text"
                      value={addressForm.area_colony}
                      onChange={(e) => setAddressForm({ ...addressForm, area_colony: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[var(--theme-primary)] outline-none"
                      placeholder="e.g. Nungambakkam High Road"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2 btn-theme text-xs font-bold cursor-pointer"
                    >
                      Save & Use Address
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingAddress(false)}
                      className="px-4 py-2 border border-neutral-300 text-neutral-600 rounded-xl text-xs font-bold hover:bg-neutral-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : addresses.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-neutral-500 mb-3">No delivery addresses found.</p>
                  <button
                    type="button"
                    onClick={() => setIsAddingAddress(true)}
                    className="px-4 py-2 btn-theme text-xs font-bold cursor-pointer"
                  >
                    Add Your First Address
                  </button>
                </div>
              ) : (
                /* Address Selector Cards */
                <div className="space-y-3">
                  {addresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id
                    return (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isSelected
                            ? 'border-[var(--theme-primary)] bg-pink-50/20 shadow-xs ring-1 ring-[var(--theme-primary)]'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]'
                              : 'border-neutral-300'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-neutral-900">{addr.name}</h4>
                            <span className="badge-theme-subtle text-[10px] py-0.5 px-2 uppercase font-bold">
                              {String(addr.type) === '1' || addr.type === 'WORK' ? 'WORK' : 'HOME'}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                            {addr.house_building_name || addr.house}, {addr.area_colony || addr.road}
                            {addr.landmark_nearby ? `, Near ${addr.landmark_nearby}` : ''}
                            <br />
                            {addr.city}, {addr.state} - <span className="font-bold">{addr.pincode}</span>
                          </p>
                          <p className="text-[11px] text-neutral-500 mt-1">Phone: {addr.phone}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 2. Review Bag Items & Add-ons */}
            <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-[var(--theme-primary)]">
                    <Truck className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    2. Atelier Items ({cartItems.length})
                  </h3>
                </div>
              </div>

              <div className="divide-y divide-neutral-100">
                {cartItems.map((item) => (
                  <div key={item.cart_item_id || item.id} className="py-3.5 flex gap-3.5 items-center">
                    <img
                      src={
                        formatImageUrl(item.image || item.image_path) ||
                        'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=300&q=80'
                      }
                      alt={item.title || item.product_name}
                      className="w-14 h-16 object-cover rounded-xl border border-neutral-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-neutral-900 truncate">
                        {item.title || item.product_name}
                      </h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {item.vendor || 'Bespoke Studio'} {item.size ? `• Size: ${item.size}` : ''} • Qty: {item.quantity || 1}
                      </p>
                      {item.addons && item.addons.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.addons.map((a, idx) => (
                            <span key={idx} className="badge-theme-subtle text-[9px] py-0.5 px-1.5">
                              +{a.name} (+₹{a.amount})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-neutral-900">
                        ₹{(Number(item.price) || 0) * (item.quantity || 1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Payment Method */}
            <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-[var(--theme-primary)]">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900">3. Payment Option</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Online Payment */}
                <div
                  onClick={() => setPaymentMode('ONLINE')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    paymentMode === 'ONLINE'
                      ? 'border-[var(--theme-primary)] bg-pink-50/20 shadow-xs ring-1 ring-[var(--theme-primary)]'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        paymentMode === 'ONLINE'
                          ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]'
                          : 'border-neutral-300'
                      }`}
                    >
                      {paymentMode === 'ONLINE' && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900">Pay Online (Razorpay)</h4>
                      <p className="text-[11px] text-neutral-500">UPI, Cards, NetBanking</p>
                    </div>
                  </div>
                  <span className="badge-success text-[10px] py-0.5 px-2">Fast & Secure</span>
                </div>

                {/* Cash on Delivery */}
                <div
                  onClick={() => setPaymentMode('COD')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    paymentMode === 'COD'
                      ? 'border-[var(--theme-primary)] bg-pink-50/20 shadow-xs ring-1 ring-[var(--theme-primary)]'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        paymentMode === 'COD'
                          ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]'
                          : 'border-neutral-300'
                      }`}
                    >
                      {paymentMode === 'COD' && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900">Cash on Delivery</h4>
                      <p className="text-[11px] text-neutral-500">Pay upon doorstep arrival</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Promocode & Order Summary Bill */}
          <div className="lg:col-span-5 space-y-6">
            {/* Promo Code Card */}
            <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[var(--theme-primary)]" />
                  <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    Promotions & Vouchers
                  </h3>
                </div>
                {promoCodes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsPromoModalOpen(true)}
                    className="text-[11px] font-bold text-[var(--theme-primary)] hover:underline cursor-pointer"
                  >
                    View Available ({promoCodes.length})
                  </button>
                )}
              </div>

              {appliedPromo ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-extrabold uppercase">{appliedPromo.code || appliedPromo.promocode}</span>
                      <p className="text-[10px] text-emerald-600">Saved ₹{discountAmount} on this order</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedPromo(null)
                      setCouponInput('')
                    }}
                    className="p-1 hover:bg-emerald-100 rounded-full text-emerald-700 cursor-pointer"
                    title="Remove coupon"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleManualCouponSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter Coupon Code"
                    className="flex-1 px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[var(--theme-primary)] outline-none font-bold uppercase"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 btn-theme text-xs font-bold cursor-pointer shrink-0"
                  >
                    Apply
                  </button>
                </form>
              )}
              {couponError && <p className="text-[11px] text-rose-600 mt-2 font-medium">{couponError}</p>}
            </div>

            {/* Bill Details Sticky Card */}
            <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs sticky top-24">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-4">
                Price Breakdown
              </h3>

              <div className="space-y-2.5 text-xs text-neutral-600 pb-4 border-b border-neutral-100">
                <div className="flex justify-between">
                  <span>Bag Subtotal</span>
                  <span className="font-bold text-neutral-900">₹{subtotal}</span>
                </div>

                {appliedPromo && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Coupon Discount</span>
                    <span>-₹{discountAmount}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Express Atelier Delivery</span>
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-600 font-bold">FREE</span>
                  ) : (
                    <span className="font-bold text-neutral-900">₹{deliveryFee}</span>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-between items-baseline mb-6">
                <div>
                  <span className="text-sm font-extrabold text-neutral-900">Grand Total</span>
                  <p className="text-[10px] text-neutral-400">Inclusive of all artisanal taxes</p>
                </div>
                <span className="text-xl font-black text-[var(--theme-primary)]">₹{grandTotal}</span>
              </div>

              <button
                type="button"
                disabled={isPlacingOrder || cartItems.length === 0}
                onClick={handlePlaceOrder}
                className="w-full py-3.5 btn-theme text-xs font-bold uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isPlacingOrder ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing Order...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Place Order</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-center gap-2 text-[11px] text-neutral-400 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Authentic Handcrafted Wear • Secure Checkout</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Available Coupons Modal */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-neutral-900">Available Bespoke Coupons</h3>
              <button
                type="button"
                onClick={() => setIsPromoModalOpen(false)}
                className="p-1 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {promoCodes.map((promo) => (
                <div
                  key={promo.id}
                  className="p-3.5 rounded-2xl border border-pink-100 bg-pink-50/30 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-black text-[var(--theme-primary)] uppercase tracking-wider">
                      {promo.code || promo.promocode}
                    </span>
                    <p className="text-[11px] text-neutral-600 mt-0.5">
                      {promo.description || `Save ₹${promo.discount_amount} on luxury orders`}
                    </p>
                    {promo.min_purchase && (
                      <span className="text-[10px] text-neutral-400">
                        Min. order ₹{promo.min_purchase}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon(promo)}
                    className="px-3 py-1.5 btn-theme text-[10px] font-bold cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
