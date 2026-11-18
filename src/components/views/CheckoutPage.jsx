import React, { useState, useEffect, useMemo } from 'react'
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
  Trash2,
  CheckCircle2,
  Minus,
  Info,
  ShoppingBag,
  MessageSquare,
  Scissors,
  Edit2,
} from 'lucide-react'
import {
  getAddresses,
  addAddressApi,
  getPromoCodes,
  applyPromoCodeApi,
  getDeliveryCharge,
  placeOrderApi,
  verifyPaymentApi,
  paymentFailedApi,
  formatImageUrl,
} from '../../services/api'
import {
  PromoSuccessAnimation,
  OrderSuccessAnimation,
  PageLoadingAnimation,
} from '../animations'
import CustomMeasurementsModal from '../common/CustomMeasurementsModal'
import { lookupPincode } from '../../utils/postalUtils'

/**
 * Dynamically load Razorpay checkout script if not already on window
 */
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      return resolve(true)
    }
    const existing = document.querySelector('script[src*="checkout.razorpay.com"]')
    if (existing) {
      existing.addEventListener('load', () => resolve(true))
      existing.addEventListener('error', () => resolve(false))
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function CheckoutPage({
  currentUser,
  cartItems = [],
  onBack,
  onOrderSuccess,
  onOpenAuth,
  onUpdateQuantity,
  onRemoveItem,
  onNavigate,
}) {
  // --------------------------------------------------------------------------
  // Address State
  // --------------------------------------------------------------------------
  const [addresses, setAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(Boolean(currentUser?.id || currentUser?.user_id))
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false)
  const [isSavingAddress, setIsSavingAddress] = useState(false)
  const [addressFormError, setAddressFormError] = useState('')
  const [addressForm, setAddressForm] = useState({
    name: currentUser?.name || currentUser?.username || '',
    phone: currentUser?.mobile || '',
    pincode: '',
    state: '',
    city: '',
    house_building_name: '',
    area_colony: '',
    landmark_nearby: '',
    type: '0', // '0' for HOME, '1' for WORK (MySQL enum safe)
  })

  // --------------------------------------------------------------------------
  // Product Selection State
  // --------------------------------------------------------------------------
  const [selectedItemIds, setSelectedItemIds] = useState(() => {
    return new Set(cartItems.map((item) => String(item.cart_item_id || item.id)))
  })

  // Synchronize selection set when cart items update
  useEffect(() => {
    if (cartItems.length > 0) {
      setSelectedItemIds((prev) => {
        const next = new Set()
        cartItems.forEach((item) => {
          const id = String(item.cart_item_id || item.id)
          // Preserve selection if already set, or select if newly loaded
          if (prev.has(id) || prev.size === 0) {
            next.add(id)
          }
        })
        return next
      })
    } else {
      setSelectedItemIds(new Set())
    }
  }, [cartItems])

  // --------------------------------------------------------------------------
  // Confirmation Dialog & Modals State
  // --------------------------------------------------------------------------
  const [itemToRemove, setItemToRemove] = useState(null)
  const [isRemovingItem, setIsRemovingItem] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [customSizeItem, setCustomSizeItem] = useState(null)

  // --------------------------------------------------------------------------
  // Promo Code State
  // --------------------------------------------------------------------------
  const [promoCodes, setPromoCodes] = useState([])
  const [appliedPromo, setAppliedPromo] = useState(null)
  const [couponInput, setCouponInput] = useState('')
  const [couponError, setCouponError] = useState('')
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false)

  // --------------------------------------------------------------------------
  // Payment State & DB Delivery Charge
  // --------------------------------------------------------------------------
  const [paymentMode] = useState('ONLINE') // Strictly ONLINE (COD removed per requirement)
  const [dbDeliveryCharge, setDbDeliveryCharge] = useState(150)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [orderError, setOrderError] = useState('')

  // --------------------------------------------------------------------------
  // Lottie Animation States (Promo, Order Success)
  // --------------------------------------------------------------------------
  const [promoAnimationState, setPromoAnimationState] = useState({
    isOpen: false,
    code: '',
    discountAmount: 0,
  })
  const [orderSuccessState, setOrderSuccessState] = useState({
    isOpen: false,
    orderData: null,
  })

  // --------------------------------------------------------------------------
  // Load Addresses, Promo Codes & Delivery Charge on Mount
  // --------------------------------------------------------------------------
  useEffect(() => {
    let ignore = false
    const userId = currentUser?.id || currentUser?.user_id

    // Load active delivery charge directly from MySQL delivery_charge table
    getDeliveryCharge().then((amount) => {
      if (!ignore && typeof amount === 'number') {
        setDbDeliveryCharge(amount)
      }
    })

    if (!userId) return

    async function loadData() {
      setIsLoadingAddresses(true)
      try {
        const [addrRes, promoRes] = await Promise.allSettled([
          getAddresses(userId),
          getPromoCodes(),
        ])
        if (ignore) return
        if (
          addrRes.status === 'fulfilled' &&
          (addrRes.value.status === 'true' || addrRes.value.status === true) &&
          Array.isArray(addrRes.value.data)
        ) {
          setAddresses(addrRes.value.data)
          if (addrRes.value.data.length > 0) {
            const savedDefault = userId ? localStorage.getItem(`bespoke_default_address_${userId}`) : null
            const defaultMatch = addrRes.value.data.find((a) => String(a.id) === String(savedDefault))
            setSelectedAddressId(defaultMatch ? defaultMatch.id : addrRes.value.data[0].id)
          }
        }
        if (
          promoRes.status === 'fulfilled' &&
          promoRes.value.success &&
          Array.isArray(promoRes.value.data)
        ) {
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

  // Toast notification timer
  useEffect(() => {
    if (!toastMessage) return
    const timer = setTimeout(() => setToastMessage(''), 3500)
    return () => clearTimeout(timer)
  }, [toastMessage])

  // --------------------------------------------------------------------------
  // Product Selection Handlers
  // --------------------------------------------------------------------------
  const isAllSelected = useMemo(() => {
    return (
      cartItems.length > 0 &&
      cartItems.every((item) => selectedItemIds.has(String(item.cart_item_id || item.id)))
    )
  }, [cartItems, selectedItemIds])

  const toggleItemSelection = (id) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev)
      const strId = String(id)
      if (next.has(strId)) {
        next.delete(strId)
      } else {
        next.add(strId)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItemIds(new Set())
    } else {
      setSelectedItemIds(new Set(cartItems.map((item) => String(item.cart_item_id || item.id))))
    }
  }

  // Filter selected cart items
  const selectedItems = useMemo(() => {
    return cartItems.filter((item) => selectedItemIds.has(String(item.cart_item_id || item.id)))
  }, [cartItems, selectedItemIds])

  // Currently selected address object
  const currentAddress = useMemo(() => {
    return addresses.find((a) => a.id === selectedAddressId) || addresses[0] || null
  }, [addresses, selectedAddressId])

  // --------------------------------------------------------------------------
  // Financial Calculations (Based EXCLUSIVELY on Selected Products)
  // --------------------------------------------------------------------------
  const selectedOriginalSubtotal = useMemo(() => {
    return selectedItems.reduce((acc, item) => {
      const unitActual = Number(item.actual_price) || Number(item.price) * 1.25
      return acc + Math.round(unitActual * (item.quantity || 1))
    }, 0)
  }, [selectedItems])

  const selectedSubtotal = useMemo(() => {
    return selectedItems.reduce((acc, item) => {
      return acc + (Number(item.price) || 0) * (item.quantity || 1)
    }, 0)
  }, [selectedItems])

  const selectedGst = useMemo(() => {
    const sum = selectedItems.reduce((acc, item) => {
      const rawPct = item.gst_percentage !== undefined && item.gst_percentage !== null ? Number(item.gst_percentage) : null
      const gstPct = rawPct !== null && rawPct > 0 ? rawPct : 18
      if (item.total_gst !== undefined && item.total_gst !== null && Number(item.total_gst) > 0) {
        return acc + Number(item.total_gst)
      }
      if (gstPct > 0) {
        const itemTotal = (Number(item.price) || 0) * (item.quantity || 1)
        return acc + Math.round(((itemTotal * gstPct) / 100) * 100) / 100
      }
      return acc
    }, 0)
    return Math.round(sum * 100) / 100
  }, [selectedItems])

  const gstSummaryLabel = useMemo(() => {
    const names = []
    selectedItems.forEach((item) => {
      const rawPct = item.gst_percentage !== undefined && item.gst_percentage !== null ? Number(item.gst_percentage) : null
      const pct = rawPct !== null && rawPct > 0 ? rawPct : 18
      const name = item.gst_name || (pct > 0 ? `GST ${pct}%` : 'GST 18%')
      if (name && !names.includes(name)) {
        names.push(name)
      }
    })
    return names.length > 0 ? names.join(', ') : 'GST 18%'
  }, [selectedItems])

  const productDiscount = Math.max(0, selectedOriginalSubtotal - selectedSubtotal)

  // Delivery fee: Active delivery charge directly from MySQL table delivery_charge
  const deliveryFee = selectedItems.length === 0 ? 0 : dbDeliveryCharge

  // Coupon discount calculation: directly and accurately subtract discount from subtotal
  const couponDiscount = useMemo(() => {
    if (!appliedPromo || selectedSubtotal <= 0) return 0
    const rawDiscount = Number(
      appliedPromo.discount_amount !== undefined
        ? appliedPromo.discount_amount
        : (appliedPromo.discount !== undefined ? appliedPromo.discount : appliedPromo.value || 0)
    )
    if (appliedPromo.discount_type === 'percentage') {
      return Math.round((selectedSubtotal * rawDiscount) / 100)
    }
    return Math.min(selectedSubtotal, rawDiscount)
  }, [appliedPromo, selectedSubtotal])

  const grandTotal = Math.max(
    0,
    Math.round((selectedSubtotal - couponDiscount + selectedGst + deliveryFee) * 100) / 100
  )
  const totalSavings = productDiscount + couponDiscount

  // --------------------------------------------------------------------------
  // Coupon Handlers
  // --------------------------------------------------------------------------
  const handleApplyCoupon = async (promo) => {
    const code = promo?.code || promo?.promocode || couponInput.trim()
    if (!code) {
      setCouponError('Please enter a coupon code.')
      return
    }

    if (selectedSubtotal <= 0) {
      setCouponError('Please select at least one product before applying a coupon.')
      return
    }

    setIsApplyingCoupon(true)
    setCouponError('')

    try {
      const res = await applyPromoCodeApi({
        code,
        userId: currentUser?.id || currentUser?.user_id,
        subtotal: selectedSubtotal,
        itemCount: selectedItems.length,
      })

      if (res?.success === true || res?.status === 'true') {
        const discountVal = Number(
          res.discount !== undefined
            ? res.discount
            : (res.promo?.discount || promo?.discount_amount || promo?.discount || promo?.value || 0)
        )
        setAppliedPromo({
          ...promo,
          code: res.promo?.code || promo?.code || code,
          id: res.promo?.id || res.promo_id || promo?.id,
          discount_amount: discountVal,
          discount_type: 'flat', // Backend already computed the exact discount value in ₹
        })
        setCouponInput(code)
        setIsPromoModalOpen(false)
        setToastMessage(`Coupon ${code} applied! Saved ₹${discountVal}`)
        // Authoritative success from backend: trigger promo Lottie animation
        setPromoAnimationState({
          isOpen: true,
          code: res.promo?.code || promo?.code || code,
          discountAmount: discountVal,
        })
      } else {
        // Fallback: validate with local promo code object if backend validation message is vague
        const matched = promoCodes.find(
          (p) => (p.code || p.promocode || '').toLowerCase() === code.toLowerCase()
        )
        if (matched) {
          const minSpend = Number(
            matched.min_order_value || matched.min_purchase || matched.minimum_order_amount || 0
          )
          if (selectedSubtotal < minSpend) {
            setCouponError(`Requires minimum order of ₹${minSpend}.`)
            return
          }
          const discountVal = Number(
            matched.discount_amount || matched.discount || matched.value || 0
          )
          setAppliedPromo({
            ...matched,
            code,
            id: matched.id,
            discount_amount: discountVal,
            discount_type: matched.discount_type || matched.type || 'flat',
          })
          setCouponInput(code)
          setIsPromoModalOpen(false)
          setToastMessage(`Coupon ${code} applied! Saved ₹${discountVal}`)
          // Confirmed coupon application: trigger promo Lottie animation
          setPromoAnimationState({
            isOpen: true,
            code,
            discountAmount: discountVal,
          })
        } else {
          setCouponError(res?.message || res?.error || 'Invalid or expired coupon code.')
        }
      }
    } catch (err) {
      console.error('Coupon validation error:', err)
      setCouponError('Failed to validate coupon code.')
    } finally {
      setIsApplyingCoupon(false)
    }
  }

  const handleManualCouponSubmit = (e) => {
    e.preventDefault()
    if (!couponInput.trim()) return
    handleApplyCoupon({ code: couponInput.trim().toUpperCase() })
  }

  const handleRemoveCoupon = () => {
    setAppliedPromo(null)
    setCouponInput('')
    setCouponError('')
    setToastMessage('Coupon removed. Original price restored.')
  }

  // --------------------------------------------------------------------------
  // Product Removal & Quantity Handlers
  // --------------------------------------------------------------------------
  const promptRemoveItem = (item) => {
    setItemToRemove(item)
  }

  const confirmRemoveItem = async () => {
    if (!itemToRemove) return
    const itemId = itemToRemove.cart_item_id || itemToRemove.id
    setIsRemovingItem(true)

    try {
      if (onRemoveItem) {
        await onRemoveItem(itemId)
      }
      setSelectedItemIds((prev) => {
        const next = new Set(prev)
        next.delete(String(itemId))
        return next
      })
      setToastMessage(`Removed "${itemToRemove.title || itemToRemove.product_name}" from bag.`)
      setItemToRemove(null)
    } catch (err) {
      console.error('Failed to remove item:', err)
      alert('Could not remove item. Please try again.')
    } finally {
      setIsRemovingItem(false)
    }
  }

  const handleQuantityChange = async (item, delta) => {
    const currentQty = item.quantity || 1
    const newQty = currentQty + delta
    const itemId = item.cart_item_id || item.id

    if (newQty <= 0) {
      promptRemoveItem(item)
      return
    }

    if (onUpdateQuantity) {
      await onUpdateQuantity(itemId, newQty)
    }
  }

  // --------------------------------------------------------------------------
  // Address Management Handlers
  // --------------------------------------------------------------------------
  const handleSaveAddress = async (e) => {
    e.preventDefault()
    setAddressFormError('')

    if (
      !addressForm.name ||
      !addressForm.phone ||
      !addressForm.pincode ||
      !addressForm.house_building_name
    ) {
      setAddressFormError('Please fill out all mandatory fields.')
      return
    }

    if (addressForm.phone.length < 10) {
      setAddressFormError('Please enter a valid 10-digit mobile number.')
      return
    }

    if (addressForm.pincode.length < 6) {
      setAddressFormError('Please enter a valid 6-digit PIN code.')
      return
    }

    setIsSavingAddress(true)
    try {
      const res = await addAddressApi({
        user_id: currentUser?.id || currentUser?.user_id,
        name: addressForm.name,
        phone: addressForm.phone,
        pincode: addressForm.pincode,
        state: addressForm.state || 'Tamil Nadu',
        city: addressForm.city || 'Chennai',
        house_building_name: addressForm.house_building_name,
        area_colony: addressForm.area_colony || '',
        landmark_nearby: addressForm.landmark_nearby || '',
        type: addressForm.type || '0',
      })

      if (res?.status === 'true' || res?.status === true) {
        let list = Array.isArray(res.data) ? res.data : null
        if (!list || list.length === 0) {
          const updated = await getAddresses(currentUser?.id || currentUser?.user_id)
          list = updated?.data || []
        }
        if (list && list.length > 0) {
          setAddresses(list)
          const newlyAdded = list[list.length - 1]
          if (newlyAdded?.id) {
            setSelectedAddressId(newlyAdded.id)
          }
        }
        setIsAddingNewAddress(false)
        setIsAddressModalOpen(false)
        setToastMessage('New address saved successfully!')
      } else {
        setAddressFormError(res?.message || 'Failed to save delivery address.')
      }
    } catch (err) {
      console.error('Error saving address:', err)
      setAddressFormError('Network error while saving address.')
    } finally {
      setIsSavingAddress(false)
    }
  }

  // --------------------------------------------------------------------------
  // Place Order & Payment Handler
  // --------------------------------------------------------------------------
  const handlePlaceOrder = async () => {
    if (selectedItems.length === 0) {
      setOrderError('Please select at least one product to proceed to payment.')
      return
    }

    if (!selectedAddressId) {
      setOrderError('Please select or add a delivery address to continue.')
      return
    }

    setOrderError('')
    setIsPlacingOrder(true)

    try {
      const orderPayload = {
        user_id: currentUser?.id || currentUser?.user_id,
        address_id: selectedAddressId,
        coupen_id: appliedPromo ? (appliedPromo.code || appliedPromo.id || appliedPromo.promo_id) : null,
        coupon_code: appliedPromo ? (appliedPromo.code || appliedPromo.promocode) : null,
        payment_mode: 'ONLINE',
        product: selectedItems.map((item) => ({
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
        const orderId =
          res.order?.order_id ||
          res.order?.id ||
          res.order_id ||
          res.sale_order_id ||
          res.data?.id ||
          res.id ||
          Date.now()

        const confirmedOrderData = {
          orderId,
          totalAmount: res.order?.payable_price || grandTotal,
          address: currentAddress,
          items: selectedItems,
          paymentMode,
        }

        // Handle Razorpay Online Gateway
        if (paymentMode === 'ONLINE' && res.razorpay_order_id) {
          // 1. Ensure Razorpay checkout script is loaded
          const isLoaded = await loadRazorpayScript()
          if (!isLoaded || typeof window.Razorpay === 'undefined') {
            setOrderError('Razorpay payment gateway could not be loaded. Please check your internet connection.')
            setIsPlacingOrder(false)
            return
          }

          const razorpayKey =
            res.razorpay_key_id ||
            import.meta.env.VITE_RAZORPAY_KEY ||
            'rzp_test_TXqcdxL4jgko9t'
          const payablePaise =
            res.amount || Math.round((res.order?.payable_price || grandTotal) * 100)
          const rzpOrderId = res.razorpay_order_id

          const options = {
            key: razorpayKey,
            amount: payablePaise,
            currency: res.currency || 'INR',
            name: 'Bespoke Atelier',
            description: `Order #${orderId}`,
            order_id: rzpOrderId,
            prefill: {
              name: currentAddress?.name || currentUser?.name || 'Valued Customer',
              email: currentUser?.email || 'customer@bespoke.com',
              contact: currentAddress?.phone || currentUser?.mobile || '',
            },
            theme: {
              color: '#D6007A',
            },
            handler: async function (response) {
              setIsPlacingOrder(true)
              try {
                const verifyRes = await verifyPaymentApi({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                })

                if (verifyRes?.status === true || verifyRes?.status === 'true') {
                  // Record payment details in customer payment records
                  try {
                    const uId = currentUser?.id || currentUser?.user_id || 'guest'
                    const payKey = `bespoke_order_payments_${uId}`
                    const existingPays = JSON.parse(localStorage.getItem(payKey) || '[]')
                    const newPayRecord = {
                      id: response.razorpay_payment_id || `pay_${Date.now()}`,
                      orderId: confirmedOrderData.orderId || orderId,
                      saleOrderId: confirmedOrderData.saleOrderId || null,
                      amount: confirmedOrderData.grandTotal || grandTotal,
                      paymentMode: 'Online Payment (Razorpay)',
                      paymentMethod: 'UPI / Card (Razorpay)',
                      paymentId: response.razorpay_payment_id,
                      razorpayOrderId: response.razorpay_order_id,
                      status: 'Paid',
                      date: new Date().toISOString(),
                    }
                    localStorage.setItem(payKey, JSON.stringify([newPayRecord, ...existingPays]))
                  } catch (e) {
                    console.warn('Could not store order payment in local storage:', e)
                  }

                  // Only when signature verification succeeds from backend: trigger confirmed celebration!
                  setOrderSuccessState({
                    isOpen: true,
                    orderData: {
                      ...confirmedOrderData,
                      paymentMode: 'ONLINE',
                      paymentId: response.razorpay_payment_id,
                      razorpayOrderId: response.razorpay_order_id,
                    },
                  })
                } else {
                  setOrderError(
                    verifyRes?.message ||
                      'Payment signature verification failed. Please contact customer support.'
                  )
                }
              } catch (verErr) {
                console.error('Payment verification failed:', verErr)
                setOrderError(
                  'Payment verification error. If money was debited, our support team will verify your order.'
                )
              } finally {
                setIsPlacingOrder(false)
              }
            },
            modal: {
              ondismiss: async function () {
                console.log('[Razorpay] Payment modal dismissed by user')
                setIsPlacingOrder(false)
                try {
                  await paymentFailedApi({ razorpay_order_id: rzpOrderId })
                } catch (e) {
                  console.warn('paymentFailedApi notice:', e)
                }
                setOrderError(
                  'Payment was cancelled. Your bag items are preserved, so you can retry whenever you are ready.'
                )
              },
            },
          }

          const rzp = new window.Razorpay(options)
          rzp.on('payment.failed', async function (failedResponse) {
            console.error('[Razorpay] Payment failed:', failedResponse?.error)
            setIsPlacingOrder(false)
            try {
              await paymentFailedApi({ razorpay_order_id: rzpOrderId })
            } catch (e) {
              console.warn('paymentFailedApi notice:', e)
            }
            setOrderError(
              failedResponse?.error?.description ||
                'Payment transaction failed. Please try a different card, UPI or NetBanking method.'
            )
          })

          rzp.open()
          setIsPlacingOrder(false)
          return
        }

        // Authoritative confirmed order for offline / COD
        setOrderSuccessState({
          isOpen: true,
          orderData: confirmedOrderData,
        })
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

  // Handle proceeding after order success animation finishes
  const handleProceedAfterOrderSuccess = () => {
    if (orderSuccessState.orderData && onOrderSuccess) {
      const data = orderSuccessState.orderData
      setOrderSuccessState({ isOpen: false, orderData: null })
      onOrderSuccess(data)
    }
  }

  // --------------------------------------------------------------------------
  // Unauthenticated Guest View
  // --------------------------------------------------------------------------
  if (!currentUser) {
    return (
      <div className="min-h-[75vh] bg-[#FAF9F8] flex items-center justify-center p-4">
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-neutral-100 shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center text-[var(--theme-primary)] mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900">Sign in to Checkout</h2>
          <p className="text-xs text-neutral-500 mt-2 mb-6 leading-relaxed">
            Please log in or create an account to view your saved addresses, apply luxury coupons,
            and complete your bespoke couture order.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 py-3 border border-neutral-200 text-neutral-700 rounded-xl text-xs font-bold hover:bg-neutral-50 cursor-pointer transition-colors"
            >
              Back to Shopping
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="flex-1 py-3 btn-theme text-xs font-bold cursor-pointer shadow-md"
            >
              Sign In / Register
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // Empty Cart View
  // --------------------------------------------------------------------------
  if (cartItems.length === 0) {
    return (
      <div className="min-h-[75vh] bg-[#FAF9F8] flex items-center justify-center p-4">
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-neutral-100 shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center text-[var(--theme-primary)] mx-auto mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900">Your Shopping Bag is Empty</h2>
          <p className="text-xs text-neutral-500 mt-2 mb-6 leading-relaxed">
            Explore our curated collections of bespoke couture, ready-to-wear ateliers, and luxury
            accessories to begin your order.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="w-full py-3.5 btn-theme text-xs font-bold cursor-pointer shadow-md flex items-center justify-center gap-2"
          >
            <span>Explore Collections</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF9F8] py-6 sm:py-8 px-4 sm:px-6 lg:px-8 pb-28 lg:pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-neutral-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-medium flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Navigation Breadcrumbs & Luxury Checkout Stepper */}
        <div className="mb-8 pb-5 border-b border-neutral-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 text-xs font-bold text-neutral-600 hover:text-black cursor-pointer transition-colors self-start"
            >
              <ArrowLeft className="w-4 h-4 text-theme-primary" />
              <span>Continue Shopping</span>
            </button>

            {/* Luxury 3-Step Breadcrumb Progress Bar */}
            <div className="flex items-center gap-2 sm:gap-3 self-center sm:self-auto bg-white px-4 py-2 rounded-2xl border border-neutral-200/70 shadow-xs">
              {/* Step 1: Bag */}
              <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Bag</span>
              </div>

              <span className="w-4 h-px bg-neutral-300" />

              {/* Step 2: Address & Fit (Active) */}
              <div className="flex items-center gap-1.5 text-[#C00078] font-semibold text-xs">
                <div className="w-5 h-5 rounded-full bg-[#FFF5FA] flex items-center justify-center text-[#C00078] font-semibold text-[11px] ring-2 ring-[#C00078]/20">
                  2
                </div>
                <span>Address & Fit</span>
              </div>

              <span className="w-4 h-px bg-neutral-300" />

              {/* Step 3: Payment */}
              <div className="flex items-center gap-1.5 text-neutral-400 font-medium text-xs">
                <div className="w-5 h-5 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 font-bold text-[10px]">
                  3
                </div>
                <span>Payment</span>
              </div>
            </div>

            <div className="hidden sm:block text-xs text-neutral-400 font-medium">
              100% Encrypted & Verified
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {orderError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{orderError}</span>
          </div>
        )}

        {/* Two-Column Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ================================================================= */}
          {/* LEFT COLUMN: Address, Coupons, Select-All, Product Cards */}
          {/* ================================================================= */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. DELIVERY ADDRESS CARD */}
            <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-pink-50 flex items-center justify-center text-[var(--theme-primary)] shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">Delivery Address</h3>
                    <p className="text-[11px] text-neutral-400">Order will be delivered to this location</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl border border-[var(--theme-primary)]/40 text-[var(--theme-primary)] hover:bg-pink-50 text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Change</span>
                </button>
              </div>

              {isLoadingAddresses ? (
                <div className="py-6 text-center text-xs text-neutral-400 animate-pulse">
                  Loading saved delivery addresses...
                </div>
              ) : currentAddress ? (
                <div className="p-4 rounded-2xl bg-neutral-50/70 border border-neutral-150">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-extrabold text-neutral-900">
                      {currentAddress.name}
                    </span>
                    <span className="badge-theme-subtle text-[10px] py-0.5 px-2 uppercase font-extrabold">
                      {String(currentAddress.type) === '1' || currentAddress.type === 'WORK'
                        ? 'WORK'
                        : 'HOME'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {currentAddress.house_building_name || currentAddress.house}
                    {currentAddress.area_colony ? `, ${currentAddress.area_colony}` : ''}
                    {currentAddress.landmark_nearby
                      ? `, Near ${currentAddress.landmark_nearby}`
                      : ''}
                    <br />
                    {currentAddress.city}, {currentAddress.state} -{' '}
                    <span className="font-bold text-neutral-800">{currentAddress.pincode}</span>
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-2 font-medium">
                    Phone: <span className="text-neutral-800 font-semibold">{currentAddress.phone}</span>
                  </p>
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-neutral-200 rounded-2xl">
                  <p className="text-xs text-neutral-500 mb-3">No delivery address saved.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNewAddress(true)
                      setIsAddressModalOpen(true)
                    }}
                    className="px-4 py-2 btn-theme text-xs font-bold cursor-pointer shadow-sm"
                  >
                    Add Delivery Address
                  </button>
                </div>
              )}
            </div>

            {/* 2. COUPON SECTION */}
            <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[var(--theme-primary)]" />
                  <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    Coupons & Offers
                  </h3>
                </div>
                {promoCodes.length > 0 && !appliedPromo && (
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
                /* APPLIED COUPON CARD WITH PROPER "REMOVE COUPON" TEXT BUTTON */
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-900">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-800">
                          {appliedPromo.code || appliedPromo.promocode}
                        </span>
                        <span className="badge-success text-[10px] py-0.5 px-2">APPLIED</span>
                      </div>
                      <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">
                        You saved ₹{couponDiscount} with this coupon!
                      </p>
                    </div>
                  </div>

                  {/* PROPER TEXT BUTTON - NO 'X' ICON */}
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="self-end sm:self-center px-3.5 py-1.5 rounded-xl border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Coupon</span>
                  </button>
                </div>
              ) : (
                /* COUPON INPUT & APPLY BUTTON */
                <form onSubmit={handleManualCouponSubmit} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase())
                        if (couponError) setCouponError('')
                      }}
                      placeholder="ENTER COUPON CODE (E.G. BESPOKE15)"
                      className="flex-1 px-3.5 py-2.5 text-xs border border-neutral-200 rounded-xl focus:border-[var(--theme-primary)] outline-none font-bold uppercase tracking-wider transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={isApplyingCoupon || !couponInput.trim()}
                      className="px-5 py-2.5 btn-theme text-xs font-bold cursor-pointer shrink-0 disabled:opacity-50 transition-all flex items-center justify-center min-w-[80px]"
                    >
                      {isApplyingCoupon ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>Apply</span>
                      )}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{couponError}</span>
                    </p>
                  )}
                </form>
              )}
            </div>

            {/* 3. SELECT-ALL CHECKBOX BAR */}
            <div className="bg-white rounded-2xl p-4 border border-neutral-100 shadow-sm flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-[var(--theme-primary)] rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-neutral-800">
                  Select All Items ({selectedItems.length}/{cartItems.length} selected)
                </span>
              </label>

              {selectedItems.length > 0 && selectedItems.length < cartItems.length && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-[11px] font-bold text-[var(--theme-primary)] hover:underline cursor-pointer"
                >
                  Select All
                </button>
              )}

              {selectedItems.length === cartItems.length && (
                <button
                  type="button"
                  onClick={() => setSelectedItemIds(new Set())}
                  className="text-[11px] font-bold text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  Deselect All
                </button>
              )}
            </div>

            {/* 4. INDIVIDUAL PRODUCT CARDS */}
            <div className="space-y-4">
              {cartItems.map((item) => {
                const itemId = item.cart_item_id || item.id
                const isSelected = selectedItemIds.has(String(itemId))
                const unitPrice = Number(item.price) || 0
                const unitActualPrice = Number(item.actual_price) || Math.round(unitPrice * 1.25)
                const itemTotalPrice = unitPrice * (item.quantity || 1)
                const itemTotalActual = unitActualPrice * (item.quantity || 1)
                const discountPercent =
                  unitActualPrice > unitPrice
                    ? Math.round(((unitActualPrice - unitPrice) / unitActualPrice) * 100)
                    : 0

                const isCustomizable =
                  item.is_customizable ||
                  item.isCustomizable ||
                  Boolean(item.measurements?.length || item.measurementDetails)

                return (
                  <div
                    key={itemId}
                    className={`bg-white rounded-3xl p-5 border transition-all ${
                      isSelected
                        ? 'border-[var(--theme-primary)]/40 shadow-xs ring-1 ring-[var(--theme-primary)]/20'
                        : 'border-neutral-200/70 opacity-80'
                    }`}
                  >
                    <div className="flex gap-4">
                      {/* Checkbox */}
                      <div className="pt-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItemSelection(itemId)}
                          className="w-4 h-4 accent-[var(--theme-primary)] rounded cursor-pointer"
                        />
                      </div>

                      {/* Product Thumbnail */}
                      <div className="relative shrink-0">
                        <img
                          src={
                            formatImageUrl(item.image || item.image_path) ||
                            'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=300&q=80'
                          }
                          alt={item.title || item.product_name}
                          className="w-20 h-24 sm:w-24 sm:h-28 object-cover rounded-2xl border border-neutral-100 shadow-xs"
                        />
                        {discountPercent > 0 && (
                          <span className="absolute top-1 left-1 bg-[#24212A] text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
                            {discountPercent}% OFF
                          </span>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span
                                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                                  isCustomizable
                                    ? 'bg-pink-50 text-[var(--theme-primary)]'
                                    : 'bg-neutral-100 text-neutral-600'
                                }`}
                              >
                                {isCustomizable ? 'Customizable' : 'Ready Made'}
                              </span>

                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>In Stock</span>
                              </span>
                            </div>

                            <h4 className="text-sm font-bold text-neutral-900 leading-snug line-clamp-1">
                              {item.title || item.product_name}
                            </h4>

                            <p className="text-[11px] text-neutral-500 mt-0.5">
                              {item.vendor || item.designer || 'Bespoke Atelier'}
                            </p>
                          </div>
                        </div>

                        {/* Variant & Size */}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                          <span className="bg-neutral-100 px-2.5 py-0.5 rounded-lg font-medium text-[11px]">
                            Size: <strong className="text-neutral-800">{item.size || 'Standard'}</strong>
                          </span>
                          {(item.color || item.material_name || item.variant_name) && (
                            <span className="bg-neutral-100 px-2.5 py-0.5 rounded-lg font-medium text-[11px]">
                              Color: <strong className="text-neutral-800">{item.color || item.material_name || item.variant_name}</strong>
                            </span>
                          )}
                          {item.material && (
                            <span className="bg-neutral-100 px-2.5 py-0.5 rounded-lg font-medium text-[11px]">
                              Fabric: <strong className="text-neutral-800">{item.material}</strong>
                            </span>
                          )}
                          {Number(item.gst_percentage || 0) > 0 && (
                            <span className="bg-pink-50 text-[var(--theme-primary)] border border-pink-200/80 px-2 py-0.5 rounded-lg font-semibold text-[11px]">
                              {item.gst_name || `GST ${item.gst_percentage}%`}
                            </span>
                          )}
                        </div>

                        {/* Add-ons if present */}
                        {item.addons && item.addons.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {item.addons.map((addon, idx) => (
                              <span
                                key={idx}
                                className="badge-theme-subtle text-[9px] py-0.5 px-2 font-bold"
                              >
                                +{addon.name || addon.title} (+₹{addon.amount || addon.price || 0})
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Price & Quantity Controls */}
                        <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3">
                          {/* Price Tag */}
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-[16px] font-bold text-[#24212A] tabular-nums">
                              ₹{itemTotalPrice}
                            </span>
                            {Number(itemTotalActual) > Number(itemTotalPrice) ? (
                              <span className="text-[13px] text-[#77717C] line-through tabular-nums">
                                ₹{itemTotalActual}
                              </span>
                            ) : null}
                            {Number(item.gst_percentage || 0) > 0 && (
                              <span className="text-[10px] text-neutral-500 font-medium">
                                + ₹{Math.round(((itemTotalPrice * Number(item.gst_percentage)) / 100) * 100) / 100} GST ({item.gst_percentage}%)
                              </span>
                            )}
                          </div>

                          {/* Stepper */}
                          <div className="flex items-center border border-neutral-200 rounded-xl bg-neutral-50/50 p-0.5">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(item, -1)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-600 hover:bg-white hover:shadow-xs cursor-pointer transition-all"
                              title="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-bold text-neutral-800">
                              {item.quantity || 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(item, 1)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-600 hover:bg-white hover:shadow-xs cursor-pointer transition-all"
                              title="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Bottom Actions Row: Custom Size, Ask Vendor, PROPER REMOVE BUTTON */}
                        <div className="mt-3 pt-2 border-t border-neutral-100/70 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            {isCustomizable && (
                              <button
                                type="button"
                                onClick={() => setCustomSizeItem(item)}
                                className="text-[11px] font-bold text-[var(--theme-primary)] hover:underline cursor-pointer flex items-center gap-1"
                              >
                                <Scissors className="w-3 h-3" />
                                <span>Custom Size</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => onNavigate && onNavigate('chats')}
                              className="text-[11px] font-bold text-neutral-500 hover:text-neutral-800 cursor-pointer flex items-center gap-1"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>Ask Vendor</span>
                            </button>
                          </div>

                          {/* PROPER TEXT BUTTON FOR REMOVE WITH TRASH ICON - NO 'X' ICON */}
                          <button
                            type="button"
                            onClick={() => promptRemoveItem(item)}
                            className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ================================================================= */}
          {/* RIGHT COLUMN: Sticky Order Summary & Payment Mode */}
          {/* ================================================================= */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            {/* Price Details Card */}
            <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-4 flex items-center justify-between">
                <span>Price Details</span>
                <span className="text-[11px] text-neutral-400 font-semibold lowercase">
                  ({selectedItems.length} items selected)
                </span>
              </h3>

              {/* Price Breakdown */}
              <div className="space-y-3 text-xs text-neutral-600 pb-4 border-b border-neutral-100">
                <div className="flex justify-between">
                  <span>Price ({selectedItems.length} items)</span>
                  <span className="font-bold text-neutral-900">₹{selectedOriginalSubtotal}</span>
                </div>

                {productDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Product Discount</span>
                    <span>- ₹{productDiscount}</span>
                  </div>
                )}

                {appliedPromo && couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Coupon Discount ({appliedPromo.code})</span>
                    <span>- ₹{couponDiscount}</span>
                  </div>
                )}

                <div className="flex justify-between text-neutral-700">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">GST</span>
                    {gstSummaryLabel && (
                      <span className="text-[10px] text-neutral-500 font-normal">({gstSummaryLabel})</span>
                    )}
                  </div>
                  <span className="font-bold text-neutral-900">+ ₹{selectedGst}</span>
                </div>

                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-600 font-bold">FREE</span>
                  ) : (
                    <span className="font-bold text-neutral-900">₹{deliveryFee}</span>
                  )}
                </div>
              </div>

              {/* Payment Mode Selection - Online Only */}
              <div className="py-4 border-b border-neutral-100">
                <span className="block text-[11px] font-bold text-neutral-700 mb-2 uppercase tracking-wider">
                  Payment Method
                </span>
                <div className="p-3.5 rounded-2xl border border-[var(--theme-primary)] bg-pink-50/30 ring-1 ring-[var(--theme-primary)] text-left flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="w-4 h-4 text-[var(--theme-primary)]" />
                      <span className="text-xs font-bold text-neutral-900">Pay Online</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full uppercase">100% Secure</span>
                    </div>
                    <p className="text-[11px] text-neutral-500">UPI, Credit/Debit Cards, NetBanking, Wallets</p>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-[var(--theme-primary)] shrink-0" />
                </div>
              </div>

              {/* Total Amount */}
              <div className="pt-4 flex justify-between items-baseline mb-4">
                <div>
                  <span className="text-[14px] font-semibold text-[#24212A]">Total Amount</span>
                  <p className="text-[11px] text-[#77717C] font-normal">
                    {selectedGst > 0 ? `Includes ₹${selectedGst} GST & delivery` : 'Inclusive of all taxes & artisanal duties'}
                  </p>
                </div>
                <span className="text-[22px] font-bold text-[#C00078] tabular-nums">
                  ₹{grandTotal}
                </span>
              </div>

              {/* Savings Banner */}
              {totalSavings > 0 && selectedItems.length > 0 && (
                <div className="mb-5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs font-semibold text-emerald-800">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>You're saving ₹{totalSavings} on this order!</span>
                </div>
              )}

              {/* Pay Now Button (Desktop) */}
              <button
                type="button"
                disabled={isPlacingOrder || selectedItems.length === 0}
                onClick={handlePlaceOrder}
                className="w-full py-3.5 btn-theme text-[13px] sm:text-[14px] font-semibold tracking-normal shadow-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                {isPlacingOrder ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing Order...</span>
                  </>
                ) : selectedItems.length === 0 ? (
                  <span>Select at least 1 item to proceed</span>
                ) : (
                  <>
                    <span>Proceed to Payment (₹{grandTotal})</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {selectedItems.length === 0 && (
                <p className="text-[11px] text-center text-rose-600 font-medium mt-2">
                  Select at least one product to proceed to payment.
                </p>
              )}

              {/* Trust & Authentic Badges */}
              <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-center gap-2 text-[11px] text-neutral-400 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Authentic Handcrafted Wear • Secure SSL Checkout</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MOBILE STICKY BOTTOM PAYMENT BAR */}
      {/* ===================================================================== */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 px-4 py-3 lg:hidden shadow-xl">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider block">
              Total Payable ({selectedItems.length} items)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-[#C00078] tabular-nums">
                ₹{grandTotal}
              </span>
              {totalSavings > 0 && selectedItems.length > 0 && (
                <span className="text-[10px] font-bold text-emerald-600">Save ₹{totalSavings}</span>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={isPlacingOrder || selectedItems.length === 0}
            onClick={handlePlaceOrder}
            className="flex-1 max-w-[200px] py-3 btn-theme text-xs font-bold uppercase tracking-wider shadow-md flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
          >
            {isPlacingOrder ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : selectedItems.length === 0 ? (
              <span>Select Items</span>
            ) : (
              <>
                <span>Pay Now</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL 1: ITEM REMOVAL CONFIRMATION DIALOG (PROPER LABELS & CONFIRMATION) */}
      {/* ===================================================================== */}
      {itemToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-neutral-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-neutral-900 text-center">
              Remove Item from Bag?
            </h3>
            <p className="text-xs text-neutral-500 text-center mt-1.5 mb-5 leading-relaxed">
              Are you sure you want to remove{' '}
              <span className="font-bold text-neutral-800">
                "{itemToRemove.title || itemToRemove.product_name}"
              </span>{' '}
              from your shopping bag? You can always add it again later.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setItemToRemove(null)}
                className="flex-1 py-2.5 border border-neutral-200 text-neutral-700 rounded-xl text-xs font-bold hover:bg-neutral-50 cursor-pointer transition-colors"
              >
                Keep in Bag
              </button>
              <button
                type="button"
                disabled={isRemovingItem}
                onClick={confirmRemoveItem}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 cursor-pointer transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center"
              >
                {isRemovingItem ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Remove Item</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: ADDRESS SELECTION & ADD NEW ADDRESS MODAL */}
      {/* ===================================================================== */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-neutral-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[var(--theme-primary)]" />
                <h3 className="text-sm font-bold text-neutral-900">
                  {isAddingNewAddress ? 'Add New Delivery Address' : 'Select Delivery Address'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddressModalOpen(false)
                  setIsAddingNewAddress(false)
                }}
                className="p-1 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {isAddingNewAddress ? (
                /* Add New Address Form */
                <form onSubmit={handleSaveAddress} className="space-y-3">
                  {addressFormError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                      {addressFormError}
                    </div>
                  )}

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
                        onChange={async (e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                          setAddressForm((prev) => ({ ...prev, pincode: val }))
                          if (val.length === 6) {
                            const info = await lookupPincode(val)
                            if (info) {
                              setAddressForm((prev) => ({
                                ...prev,
                                pincode: val,
                                city: info.city || prev.city,
                                state: info.state || prev.state,
                              }))
                            }
                          }
                        }}
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
                      onChange={(e) =>
                        setAddressForm({ ...addressForm, house_building_name: e.target.value })
                      }
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

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      value={addressForm.landmark_nearby}
                      onChange={(e) =>
                        setAddressForm({ ...addressForm, landmark_nearby: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[var(--theme-primary)] outline-none"
                      placeholder="e.g. Near Taj Coromandel"
                    />
                  </div>

                  {/* Address Type */}
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1.5">
                      Address Type
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-700">
                        <input
                          type="radio"
                          name="addressType"
                          value="0"
                          checked={addressForm.type === '0'}
                          onChange={() => setAddressForm({ ...addressForm, type: '0' })}
                          className="accent-[var(--theme-primary)]"
                        />
                        <span>Home</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-700">
                        <input
                          type="radio"
                          name="addressType"
                          value="1"
                          checked={addressForm.type === '1'}
                          onChange={() => setAddressForm({ ...addressForm, type: '1' })}
                          className="accent-[var(--theme-primary)]"
                        />
                        <span>Work / Office</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3">
                    <button
                      type="submit"
                      disabled={isSavingAddress}
                      className="flex-1 py-2.5 btn-theme text-xs font-bold cursor-pointer flex items-center justify-center"
                    >
                      {isSavingAddress ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>Save Address</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewAddress(false)}
                      className="px-4 py-2.5 border border-neutral-300 text-neutral-600 rounded-xl text-xs font-bold hover:bg-neutral-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                /* Address List */
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsAddingNewAddress(true)}
                      className="flex items-center gap-1.5 text-xs font-bold text-[var(--theme-primary)] hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New Address</span>
                    </button>
                  </div>

                  {addresses.length === 0 ? (
                    <div className="text-center py-6 text-xs text-neutral-500">
                      No saved addresses yet.
                    </div>
                  ) : (
                    addresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id
                      return (
                        <div
                          key={addr.id}
                          onClick={() => {
                            setSelectedAddressId(addr.id)
                            setIsAddressModalOpen(false)
                            setToastMessage(`Delivering to ${addr.name}`)
                          }}
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
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-xs font-bold text-neutral-900">{addr.name}</h4>
                              <span className="badge-theme-subtle text-[10px] py-0.5 px-2 uppercase font-bold">
                                {String(addr.type) === '1' || addr.type === 'WORK'
                                  ? 'WORK'
                                  : 'HOME'}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-600 leading-relaxed">
                              {addr.house_building_name || addr.house}
                              {addr.area_colony ? `, ${addr.area_colony}` : ''}
                              {addr.landmark_nearby ? `, Near ${addr.landmark_nearby}` : ''}
                              <br />
                              {addr.city}, {addr.state} -{' '}
                              <span className="font-bold text-neutral-800">{addr.pincode}</span>
                            </p>
                            <p className="text-[11px] text-neutral-500 mt-1">
                              Phone: {addr.phone}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: AVAILABLE PROMO CODES MODAL */}
      {/* ===================================================================== */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[var(--theme-primary)]" />
                <h3 className="text-sm font-bold text-neutral-900">Available Bespoke Coupons</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPromoModalOpen(false)}
                className="p-1 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {promoCodes.map((promo) => {
                const code = promo.code || promo.promocode
                const minSpend = Number(
                  promo.min_order_value || promo.min_purchase || promo.minimum_order_amount || 0
                )
                const isEligible = selectedSubtotal >= minSpend
                const discountDisplay =
                  promo.discount_amount || promo.discount || promo.value || ''

                return (
                  <div
                    key={promo.id || code}
                    className="p-3.5 rounded-2xl border border-pink-100 bg-pink-50/20 flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="text-xs font-semibold text-[#C00078] tracking-wide">
                        {code}
                      </span>
                      <p className="text-[11px] text-neutral-600 mt-0.5">
                        {promo.description ||
                          (discountDisplay
                            ? (promo.discount_type === 'percentage' || promo.type === 'percentage'
                                ? `Get ${discountDisplay}% OFF on your order`
                                : `Save ₹${discountDisplay} on bespoke couture`)
                            : 'Exclusive bespoke promotional discount')}
                      </p>
                      {minSpend > 0 && (
                        <span className="text-[10px] text-neutral-400 block mt-0.5">
                          Min. order: ₹{minSpend}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={!isEligible}
                      onClick={() => handleApplyCoupon(promo)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer transition-colors ${
                        isEligible
                          ? 'btn-theme shadow-xs'
                          : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                      }`}
                    >
                      {isEligible ? 'Apply' : `Min ₹${minSpend}`}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: CUSTOM SIZE & MEASUREMENT MODAL */}
      {/* ===================================================================== */}
      {customSizeItem && (
        <CustomMeasurementsModal
          isOpen={Boolean(customSizeItem)}
          onClose={() => setCustomSizeItem(null)}
          product={customSizeItem}
          selectedPriceId={customSizeItem.price_id || customSizeItem.priceId || customSizeItem.id}
          currentSize={customSizeItem.size || 'XS'}
          availableSizes={['XS', 'S', 'M', 'L', 'XL', 'FREE SIZE']}
          currentUser={currentUser}
          initialMeasurements={customSizeItem.measurements || customSizeItem.custom_measurements}
          onApplyMeasurements={(result) => {
            if (customSizeItem) {
              customSizeItem.measurements = result.measurements
              customSizeItem.custom_measurements = result.measurements
              customSizeItem.measurement_summary = result.summaryText
              if (result.size) customSizeItem.size = result.size
            }
            setCustomSizeItem(null)
          }}
        />
      )}

      {/* 1. Lottie Promo Celebration Animation upon Authoritative Coupon Application */}
      <PromoSuccessAnimation
        isOpen={promoAnimationState.isOpen}
        onClose={() => setPromoAnimationState({ isOpen: false, code: '', discountAmount: 0 })}
        promoCode={promoAnimationState.code}
        discountAmount={promoAnimationState.discountAmount}
      />

      {/* 2. Lottie Order Confirmed Animation upon Authoritative Backend Success */}
      <OrderSuccessAnimation
        isOpen={orderSuccessState.isOpen}
        onComplete={handleProceedAfterOrderSuccess}
        orderId={orderSuccessState.orderData?.orderId}
        totalAmount={orderSuccessState.orderData?.totalAmount}
        itemsCount={orderSuccessState.orderData?.items?.length}
      />

      {/* 3. Lottie Blocking Loader Overlay while Placing Order */}
      {isPlacingOrder && (
        <PageLoadingAnimation
          fullScreen={true}
          message="Placing your bespoke order..."
          subMessage="Securing your items with atelier and payment gateway"
        />
      )}
    </div>
  )
}
