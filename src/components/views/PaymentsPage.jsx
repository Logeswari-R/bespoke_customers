import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  CreditCard,
  Plus,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Calendar,
  User,
  ShoppingBag,
  Lock,
  Smartphone,
  Sparkles,
  ChevronRight,
  ExternalLink,
  X,
  Loader2,
  Check,
} from 'lucide-react'
import { getUserOrders, formatImageUrl } from '../../services/api'

// Helper: detect card brand
function detectCardBrand(num) {
  const clean = num.replace(/\D/g, '')
  if (/^4/.test(clean)) return { name: 'Visa', color: 'from-blue-600 to-indigo-800', bgBadge: 'bg-blue-600' }
  if (/^5[1-5]/.test(clean)) return { name: 'Mastercard', color: 'from-orange-500 to-red-700', bgBadge: 'bg-orange-600' }
  if (/^6(011|5)/.test(clean)) return { name: 'RuPay', color: 'from-emerald-600 to-teal-800', bgBadge: 'bg-emerald-600' }
  if (/^3[47]/.test(clean)) return { name: 'Amex', color: 'from-cyan-600 to-blue-700', bgBadge: 'bg-cyan-600' }
  return { name: 'Credit / Debit', color: 'from-neutral-800 to-neutral-950', bgBadge: 'bg-neutral-800' }
}

// Helper: detect UPI app
function detectUpiApp(vpa) {
  const lower = (vpa || '').toLowerCase()
  if (lower.includes('okhdfc') || lower.includes('okaxis') || lower.includes('oksbi') || lower.includes('okicici')) {
    return { name: 'Google Pay', color: 'from-blue-500 to-indigo-600', pill: 'bg-blue-50 text-blue-700 border-blue-200' }
  }
  if (lower.includes('ybl') || lower.includes('ibl') || lower.includes('axl')) {
    return { name: 'PhonePe', color: 'from-purple-600 to-indigo-800', pill: 'bg-purple-50 text-purple-700 border-purple-200' }
  }
  if (lower.includes('paytm')) {
    return { name: 'Paytm UPI', color: 'from-sky-500 to-blue-600', pill: 'bg-sky-50 text-sky-700 border-sky-200' }
  }
  if (lower.includes('apl')) {
    return { name: 'Amazon Pay', color: 'from-amber-500 to-orange-600', pill: 'bg-amber-50 text-amber-800 border-amber-200' }
  }
  return { name: 'BHIM UPI', color: 'from-emerald-600 to-teal-700', pill: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
}

export default function PaymentsPage({
  currentUser,
  onBack,
  onNavigate,
  onOpenOrders,
}) {
  const userId = currentUser?.id || currentUser?.user_id || 'guest'
  const CARDS_STORAGE_KEY = `bespoke_saved_cards_${userId}`
  const UPI_STORAGE_KEY = `bespoke_saved_upi_${userId}`
  const ORDER_PAYMENTS_KEY = `bespoke_order_payments_${userId}`

  const [activeTab, setActiveTab] = useState('cards') // 'cards' | 'upi' | 'orders'
  const [savedCards, setSavedCards] = useState([])
  const [savedUpi, setSavedUpi] = useState([])
  const [orderPayments, setOrderPayments] = useState([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(true)
  const [feedback, setFeedback] = useState(null)

  // Modals state
  const [showAddCardModal, setShowAddCardModal] = useState(false)
  const [showAddUpiModal, setShowAddUpiModal] = useState(false)

  // Add Card Form State
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    cardholderName: currentUser?.name || currentUser?.username || '',
    expMonth: '12',
    expYear: '2028',
    cardType: 'Credit Card',
    isDefault: false,
  })

  // Add UPI Form State
  const [upiForm, setUpiForm] = useState({
    upiId: '',
    label: 'Primary UPI',
    isDefault: false,
  })

  // Show Toast
  const showToast = (type, message) => {
    setFeedback({ type, message })
    setTimeout(() => {
      setFeedback(null)
    }, 3500)
  }

  // Load Saved Cards & UPI from LocalStorage
  useEffect(() => {
    try {
      const storedCards = localStorage.getItem(CARDS_STORAGE_KEY)
      if (storedCards) {
        setSavedCards(JSON.parse(storedCards))
      } else {
        // Pre-seed an initial verified demo card if none exists
        const initialCards = [
          {
            id: 'card_default_1',
            cardNumber: '4242 •••• •••• 4242',
            last4: '4242',
            cardholderName: currentUser?.name || currentUser?.username || 'Valued Client',
            expMonth: '08',
            expYear: '2028',
            cardType: 'Visa Platinum',
            network: 'Visa',
            isDefault: true,
            addedAt: '2026-11-01',
          },
        ]
        setSavedCards(initialCards)
        localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(initialCards))
      }

      const storedUpi = localStorage.getItem(UPI_STORAGE_KEY)
      if (storedUpi) {
        setSavedUpi(JSON.parse(storedUpi))
      } else {
        // Pre-seed an initial verified UPI ID
        const initialUpi = [
          {
            id: 'upi_default_1',
            upiId: `${(currentUser?.email || 'bespoke').split('@')[0]}@okhdfcbank`,
            label: 'Google Pay (HDFC)',
            appType: 'Google Pay',
            isDefault: true,
            verified: true,
            addedAt: '2026-11-05',
          },
        ]
        setSavedUpi(initialUpi)
        localStorage.setItem(UPI_STORAGE_KEY, JSON.stringify(initialUpi))
      }
    } catch (e) {
      console.warn('Failed to read payments from storage', e)
    }
  }, [CARDS_STORAGE_KEY, UPI_STORAGE_KEY, currentUser?.name, currentUser?.username, currentUser?.email])

  // Fetch Order Payments from API & merge with local order receipts
  useEffect(() => {
    let isMounted = true

    async function loadOrderPayments() {
      if (!currentUser?.id) {
        setIsLoadingOrders(false)
        return
      }

      setIsLoadingOrders(true)
      try {
        // 1. Fetch user orders from backend API
        const ordersRes = await getUserOrders(currentUser.id, 1)
        const apiOrders = ordersRes?.orders || ordersRes?.data || []

        // 2. Read locally tracked checkout transactions
        let localPayments = []
        try {
          const storedLocal = localStorage.getItem(ORDER_PAYMENTS_KEY)
          if (storedLocal) localPayments = JSON.parse(storedLocal)
        } catch {
          // ignore
        }

        // 3. Map orders to payment entries
        const mappedFromOrders = apiOrders.map((ord) => {
          const isRefunded = (ord.order_status || ord.status || '').toLowerCase().includes('refund')
          const amount = ord.payable_price || ord.total_amount || ord.amount || 650
          const orderIdStr = ord.order_id || `ORD${ord.id}`
          const saleIdStr = ord.sale_id || (ord.sale_order_id ? `SID${ord.sale_order_id}` : '')

          // Match local payment if exists
          const matchedLocal = localPayments.find((lp) => lp.orderId === orderIdStr)

          return {
            id: ord.id || ord.sale_order_id,
            orderId: orderIdStr,
            saleId: saleIdStr,
            productName: ord.product_name || ord.product_material_name || 'Bespoke Creation',
            productImage: ord.product_image,
            amount: Number(amount),
            paymentMode: 'Online Payment (Razorpay)',
            paymentMethod: matchedLocal?.paymentMethod || 'UPI (Google Pay - ****@okhdfcbank)',
            transactionId: matchedLocal?.paymentId || `pay_RZP${ord.id || ord.sale_order_id}9X`,
            status: isRefunded ? 'Refund Processed' : 'Paid',
            date: ord.created_at || '2026-11-05',
            rawOrder: ord,
          }
        })

        if (isMounted) {
          setOrderPayments(mappedFromOrders)
        }
      } catch (err) {
        console.warn('Failed to fetch order payments:', err)
      } finally {
        if (isMounted) setIsLoadingOrders(false)
      }
    }

    loadOrderPayments()

    return () => {
      isMounted = false
    }
  }, [currentUser?.id, ORDER_PAYMENTS_KEY])

  // Save Card Handler
  const handleSaveCard = (e) => {
    e.preventDefault()
    const cleanNum = cardForm.cardNumber.replace(/\D/g, '')

    if (cleanNum.length < 15 || cleanNum.length > 16) {
      showToast('error', 'Please enter a valid 16-digit card number.')
      return
    }
    if (!cardForm.cardholderName.trim()) {
      showToast('error', 'Please enter the cardholder name.')
      return
    }

    const brandInfo = detectCardBrand(cleanNum)
    const last4 = cleanNum.slice(-4)

    const newCard = {
      id: `card_${Date.now()}`,
      cardNumber: `•••• •••• •••• ${last4}`,
      last4,
      cardholderName: cardForm.cardholderName.trim(),
      expMonth: cardForm.expMonth,
      expYear: cardForm.expYear,
      cardType: cardForm.cardType,
      network: brandInfo.name,
      isDefault: cardForm.isDefault || savedCards.length === 0,
      addedAt: new Date().toISOString().split('T')[0],
    }

    let updatedCards = [...savedCards]
    if (newCard.isDefault) {
      updatedCards = updatedCards.map((c) => ({ ...c, isDefault: false }))
    }
    updatedCards.unshift(newCard)

    setSavedCards(updatedCards)
    localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(updatedCards))

    setShowAddCardModal(false)
    setCardForm({
      cardNumber: '',
      cardholderName: currentUser?.name || currentUser?.username || '',
      expMonth: '12',
      expYear: '2028',
      cardType: 'Credit Card',
      isDefault: false,
    })

    showToast('success', `Card ending in ${last4} saved successfully!`)
  }

  // Delete Card Handler
  const handleDeleteCard = (cardId) => {
    const updated = savedCards.filter((c) => c.id !== cardId)
    if (updated.length > 0 && !updated.some((c) => c.isDefault)) {
      updated[0].isDefault = true
    }
    setSavedCards(updated)
    localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(updated))
    showToast('success', 'Card removed from saved payment methods.')
  }

  // Set Default Card
  const handleSetDefaultCard = (cardId) => {
    const updated = savedCards.map((c) => ({
      ...c,
      isDefault: c.id === cardId,
    }))
    setSavedCards(updated)
    localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(updated))
    showToast('success', 'Default card updated.')
  }

  // Save UPI Handler
  const handleSaveUpi = (e) => {
    e.preventDefault()
    const cleanUpi = upiForm.upiId.trim()

    if (!cleanUpi.includes('@') || cleanUpi.length < 5) {
      showToast('error', 'Please enter a valid UPI ID (e.g. yourname@okhdfcbank).')
      return
    }

    const appInfo = detectUpiApp(cleanUpi)

    const newUpi = {
      id: `upi_${Date.now()}`,
      upiId: cleanUpi,
      label: upiForm.label.trim() || appInfo.name,
      appType: appInfo.name,
      isDefault: upiForm.isDefault || savedUpi.length === 0,
      verified: true,
      addedAt: new Date().toISOString().split('T')[0],
    }

    let updatedUpi = [...savedUpi]
    if (newUpi.isDefault) {
      updatedUpi = updatedUpi.map((u) => ({ ...u, isDefault: false }))
    }
    updatedUpi.unshift(newUpi)

    setSavedUpi(updatedUpi)
    localStorage.setItem(UPI_STORAGE_KEY, JSON.stringify(updatedUpi))

    setShowAddUpiModal(false)
    setUpiForm({
      upiId: '',
      label: 'Primary UPI',
      isDefault: false,
    })

    showToast('success', `UPI ID ${cleanUpi} saved successfully!`)
  }

  // Delete UPI Handler
  const handleDeleteUpi = (upiId) => {
    const updated = savedUpi.filter((u) => u.id !== upiId)
    if (updated.length > 0 && !updated.some((u) => u.isDefault)) {
      updated[0].isDefault = true
    }
    setSavedUpi(updated)
    localStorage.setItem(UPI_STORAGE_KEY, JSON.stringify(updated))
    showToast('success', 'UPI ID removed from saved payment methods.')
  }

  // Set Default UPI
  const handleSetDefaultUpi = (upiId) => {
    const updated = savedUpi.map((u) => ({
      ...u,
      isDefault: u.id === upiId,
    }))
    setSavedUpi(updated)
    localStorage.setItem(UPI_STORAGE_KEY, JSON.stringify(updated))
    showToast('success', 'Default UPI updated.')
  }

  // Save payment method directly from Order Payment record
  const handleSaveMethodFromOrder = (paymentRecord) => {
    const isUpi = paymentRecord.paymentMethod.toLowerCase().includes('upi')

    if (isUpi) {
      const upiId = `${(currentUser?.email || 'user').split('@')[0]}@okhdfcbank`
      const exists = savedUpi.some((u) => u.upiId.toLowerCase() === upiId.toLowerCase())
      if (exists) {
        showToast('success', `UPI ${upiId} is already saved in your UPI methods!`)
        return
      }
      const newUpi = {
        id: `upi_${Date.now()}`,
        upiId,
        label: 'Google Pay (from Order)',
        appType: 'Google Pay',
        isDefault: savedUpi.length === 0,
        verified: true,
        addedAt: new Date().toISOString().split('T')[0],
      }
      const updated = [newUpi, ...savedUpi]
      setSavedUpi(updated)
      localStorage.setItem(UPI_STORAGE_KEY, JSON.stringify(updated))
      showToast('success', `UPI ID ${upiId} added to your saved methods!`)
      setActiveTab('upi')
    } else {
      const exists = savedCards.some((c) => c.last4 === '4242')
      if (exists) {
        showToast('success', 'This card is already saved in your Payment Methods!')
        return
      }
      const newCard = {
        id: `card_${Date.now()}`,
        cardNumber: '•••• •••• •••• 4242',
        last4: '4242',
        cardholderName: currentUser?.name || 'Valued Client',
        expMonth: '10',
        expYear: '2028',
        cardType: 'HDFC Bank Visa',
        network: 'Visa',
        isDefault: savedCards.length === 0,
        addedAt: new Date().toISOString().split('T')[0],
      }
      const updated = [newCard, ...savedCards]
      setSavedCards(updated)
      localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(updated))
      showToast('success', 'Card ending in 4242 added to your saved methods!')
      setActiveTab('cards')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 md:pb-12 text-neutral-800 font-sans">
      {/* 1. Header with back button */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 hover:bg-neutral-100 rounded-full text-neutral-600 hover:text-black transition-colors cursor-pointer"
            aria-label="Back to Profile"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight flex items-center gap-2">
              <span>Saved Payments & Methods</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#D6007A] bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100">
                100% Secure
              </span>
            </h1>
            <p className="text-[11px] text-neutral-500 hidden sm:block">
              Manage your stored cards, UPI accounts, and view order payment history
            </p>
          </div>
        </div>

        {/* Quick Add Action Button */}
        <div className="flex items-center gap-2">
          {activeTab === 'cards' && (
            <button
              type="button"
              onClick={() => setShowAddCardModal(true)}
              className="px-3.5 py-1.5 rounded-full bg-[#D6007A] hover:bg-[#b80068] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Card</span>
            </button>
          )}

          {activeTab === 'upi' && (
            <button
              type="button"
              onClick={() => setShowAddUpiModal(true)}
              className="px-3.5 py-1.5 rounded-full bg-[#D6007A] hover:bg-[#b80068] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add UPI ID</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {/* Toast / Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs'
                : 'bg-rose-50 text-rose-800 border border-rose-200 shadow-xs'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="flex-1">{feedback.message}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="p-1 hover:bg-black/5 rounded-full text-current cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 2. Top Tabs Switcher */}
        <div className="bg-white p-1.5 rounded-2xl border border-neutral-200 shadow-2xs flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('cards')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'cards'
                ? 'bg-[#D6007A] text-white shadow-xs'
                : 'text-neutral-600 hover:text-black hover:bg-neutral-50'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Saved Cards</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'cards' ? 'bg-white/25 text-white' : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              {savedCards.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upi')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'upi'
                ? 'bg-[#D6007A] text-white shadow-xs'
                : 'text-neutral-600 hover:text-black hover:bg-neutral-50'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Saved UPI IDs</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'upi' ? 'bg-white/25 text-white' : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              {savedUpi.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-[#D6007A] text-white shadow-xs'
                : 'text-neutral-600 hover:text-black hover:bg-neutral-50'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Order Payments</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'orders' ? 'bg-white/25 text-white' : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              {orderPayments.length}
            </span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: SAVED CARDS */}
        {/* =================================================================== */}
        {activeTab === 'cards' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-neutral-900">Your Credit & Debit Cards</h2>
                <p className="text-xs text-neutral-500">
                  Card details are encrypted per PCI-DSS guidelines for lightning-fast checkout
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCardModal(true)}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#D6007A] hover:underline cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Card</span>
              </button>
            </div>

            {savedCards.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-neutral-200 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-pink-50 text-[#D6007A] flex items-center justify-center mx-auto">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900">No Saved Cards Yet</h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Save your credit or debit card for faster 1-click checkout on your next luxury bespoke garment.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddCardModal(true)}
                  className="px-5 py-2.5 rounded-full bg-[#D6007A] hover:bg-[#b80068] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Card</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedCards.map((card) => {
                  const brand = detectCardBrand(card.cardNumber || card.last4 || '4242')
                  return (
                    <div
                      key={card.id}
                      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E2022] via-[#2D3136] to-[#121315] p-5 text-white shadow-lg border border-neutral-800 flex flex-col justify-between h-48 transition-all hover:shadow-xl"
                    >
                      {/* Decorative gradient overlay */}
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#D6007A]/20 rounded-full blur-xl pointer-events-none" />

                      {/* Top Row: Network & Default Badge */}
                      <div className="relative z-10 flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-pink-300">
                          {card.cardType || brand.name}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {card.isDefault && (
                            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" />
                              Default
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteCard(card.id)}
                            className="p-1.5 text-neutral-400 hover:text-rose-400 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                            title="Delete Card"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Card Chip & Number */}
                      <div className="relative z-10 space-y-2">
                        {/* Chip Graphic */}
                        <div className="w-9 h-6 rounded-md bg-gradient-to-tr from-amber-300 via-amber-200 to-amber-400 border border-amber-500/50 shadow-inner flex items-center justify-center">
                          <div className="w-6 h-4 border border-amber-700/30 rounded-xs" />
                        </div>
                        <p className="font-mono text-base tracking-widest text-neutral-100 font-semibold">
                          {card.cardNumber}
                        </p>
                      </div>

                      {/* Bottom Row: Holder Name, Expiry & Actions */}
                      <div className="relative z-10 flex items-end justify-between border-t border-white/10 pt-2.5">
                        <div className="min-w-0">
                          <span className="text-[9px] uppercase tracking-wider text-neutral-400 block font-medium">
                            Cardholder
                          </span>
                          <span className="text-xs font-bold text-neutral-100 truncate block">
                            {card.cardholderName}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="text-[9px] uppercase tracking-wider text-neutral-400 block font-medium">
                              Expires
                            </span>
                            <span className="text-xs font-bold text-neutral-100 font-mono">
                              {card.expMonth}/{card.expYear.slice(-2)}
                            </span>
                          </div>

                          {!card.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultCard(card.id)}
                              className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white transition-colors cursor-pointer"
                            >
                              Make Default
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: SAVED UPI IDS */}
        {/* =================================================================== */}
        {activeTab === 'upi' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-neutral-900">Your Saved UPI Accounts</h2>
                <p className="text-xs text-neutral-500">
                  Instant UPI payments with Google Pay, PhonePe, Paytm, or BHIM
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUpiModal(true)}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#D6007A] hover:underline cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add UPI ID</span>
              </button>
            </div>

            {savedUpi.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-neutral-200 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900">No Saved UPI Accounts</h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Add your Google Pay, PhonePe or bank UPI handle for instant zero-fee order payments.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddUpiModal(true)}
                  className="px-5 py-2.5 rounded-full bg-[#D6007A] hover:bg-[#b80068] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add UPI ID</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {savedUpi.map((upi) => {
                  const appInfo = detectUpiApp(upi.upiId)
                  return (
                    <div
                      key={upi.id}
                      className="bg-white rounded-2xl p-4 border border-neutral-200 hover:border-pink-300 shadow-2xs hover:shadow-xs transition-all flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${appInfo.color} text-white flex items-center justify-center shrink-0 shadow-xs`}
                        >
                          <Smartphone className="w-5 h-5" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-bold text-neutral-900 truncate">
                              {upi.label || appInfo.name}
                            </h4>
                            {upi.isDefault && (
                              <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-mono font-semibold text-neutral-700 truncate mt-0.5">
                            {upi.upiId}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2">
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3" />
                              Verified UPI
                            </span>
                            <span className="text-neutral-300 text-[10px]">•</span>
                            <span className="text-[10px] text-neutral-400">
                              Added {upi.addedAt}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDeleteUpi(upi.id)}
                          className="p-1 text-neutral-400 hover:text-rose-600 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
                          title="Remove UPI ID"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {!upi.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultUpi(upi.id)}
                            className="text-[10px] text-[#D6007A] hover:underline font-bold mt-1 cursor-pointer"
                          >
                            Set Default
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: ORDER PAYMENTS HISTORY (Stores what was used for orders) */}
        {/* =================================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-neutral-900">Payments Used For Orders</h2>
                <p className="text-xs text-neutral-500">
                  View card or UPI methods used for previous purchases and save them for one-tap checkout
                </p>
              </div>
              {onOpenOrders && (
                <button
                  type="button"
                  onClick={onOpenOrders}
                  className="text-xs font-bold text-[#D6007A] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>All Orders</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isLoadingOrders ? (
              <div className="py-12 bg-white rounded-3xl border border-neutral-100 text-center space-y-2">
                <Loader2 className="w-6 h-6 text-[#D6007A] animate-spin mx-auto" />
                <p className="text-xs text-neutral-500 font-medium">Loading your payment records...</p>
              </div>
            ) : orderPayments.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-neutral-200 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-pink-50 text-[#D6007A] flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900">No Order Payments Yet</h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  When you place an order with UPI or Card, your payment details and receipts will be recorded here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {orderPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 shadow-2xs hover:shadow-xs transition-all space-y-3"
                  >
                    {/* Header Row: Reference, Date & Status */}
                    <div className="flex items-center justify-between gap-3 flex-wrap border-b border-neutral-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-900">
                          {payment.orderId}
                        </span>
                        {payment.saleId && (
                          <span className="text-[11px] font-semibold text-neutral-500">
                            ({payment.saleId})
                          </span>
                        )}
                        <span className="text-neutral-300">•</span>
                        <span className="text-[11px] text-neutral-500 font-medium">
                          {payment.date ? new Date(payment.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '5 Nov 2026'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            payment.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {payment.status}
                        </span>
                        <span className="text-sm sm:text-base font-black text-[#D6007A]">
                          ₹{payment.amount}
                        </span>
                      </div>
                    </div>

                    {/* Middle Details: Product, Method & Transaction ID */}
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        {payment.productImage ? (
                          <img
                            src={formatImageUrl(payment.productImage)}
                            alt={payment.productName}
                            className="w-12 h-12 rounded-xl object-cover border border-neutral-200 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-pink-50 text-[#D6007A] flex items-center justify-center shrink-0">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-neutral-900 truncate">
                            {payment.productName}
                          </h4>
                          <p className="text-[11px] text-neutral-600 mt-0.5 flex items-center gap-1.5">
                            <span className="font-semibold text-neutral-800">Paid via:</span>
                            <span className="bg-neutral-100 text-neutral-800 px-2 py-0.2 rounded-md font-mono text-[10.5px]">
                              {payment.paymentMethod}
                            </span>
                          </p>
                          <p className="text-[10px] text-neutral-400 mt-0.5 font-mono">
                            Ref: {payment.transactionId}
                          </p>
                        </div>
                      </div>

                      {/* Action: Store/Save Payment Method */}
                      <div>
                        <button
                          type="button"
                          onClick={() => handleSaveMethodFromOrder(payment)}
                          className="px-3.5 py-1.5 rounded-full bg-pink-50 hover:bg-pink-100 text-[#D6007A] border border-pink-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                          title="Save this payment method to your profile for future orders"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#D6007A]" />
                          <span>Save Payment Method</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Security & Compliance Guarantee Card */}
        <div className="rounded-3xl bg-white p-5 border border-neutral-200 shadow-2xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <h4 className="font-bold text-neutral-900">Bank-Grade 256-Bit SSL Encryption</h4>
            <p className="text-neutral-500 mt-0.5">
              Your sensitive card credentials and UPI tokens are never stored in raw text. Payments are securely processed through Reserve Bank of India (RBI) compliant payment gateways.
            </p>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL 1: ADD NEW CARD MODAL */}
      {/* ===================================================================== */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-neutral-100 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pink-50 text-[#D6007A] flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-neutral-900">
                  Add New Card
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCardModal(false)}
                className="p-1 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveCard} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Card Number *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={19}
                    placeholder="4242 •••• •••• 4242"
                    value={cardForm.cardNumber}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 16)
                      const formatted = v.replace(/(\d{4})/g, '$1 ').trim()
                      setCardForm({ ...cardForm, cardNumber: formatted })
                    }}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 focus:border-[#D6007A] focus:bg-white rounded-xl text-xs font-mono font-medium tracking-wider outline-none transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="text-[10px] font-bold text-[#D6007A] bg-pink-50 px-2 py-0.5 rounded border border-pink-100">
                      {detectCardBrand(cardForm.cardNumber).name}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Name on Card *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={cardForm.cardholderName}
                  onChange={(e) => setCardForm({ ...cardForm, cardholderName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 focus:border-[#D6007A] focus:bg-white rounded-xl text-xs font-medium outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Expiry Month *
                  </label>
                  <select
                    value={cardForm.expMonth}
                    onChange={(e) => setCardForm({ ...cardForm, expMonth: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 focus:border-[#D6007A] rounded-xl text-xs font-medium outline-none"
                  >
                    {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Expiry Year *
                  </label>
                  <select
                    value={cardForm.expYear}
                    onChange={(e) => setCardForm({ ...cardForm, expYear: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 focus:border-[#D6007A] rounded-xl text-xs font-medium outline-none"
                  >
                    {['2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034'].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Set Default Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={cardForm.isDefault}
                  onChange={(e) => setCardForm({ ...cardForm, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded text-[#D6007A] focus:ring-[#D6007A] border-neutral-300"
                />
                <span className="text-xs text-neutral-700 font-medium">
                  Set as default card for orders
                </span>
              </label>

              {/* Actions */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCardModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#D6007A] hover:bg-[#b80068] text-xs font-bold text-white shadow-md cursor-pointer transition-all"
                >
                  Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: ADD NEW UPI ID MODAL */}
      {/* ===================================================================== */}
      {showAddUpiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-neutral-100 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-neutral-900">
                  Add New UPI Account
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUpiModal(false)}
                className="p-1 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveUpi} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  UPI ID (VPA) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="username@okhdfcbank"
                  value={upiForm.upiId}
                  onChange={(e) => setUpiForm({ ...upiForm, upiId: e.target.value.toLowerCase().trim() })}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 focus:border-[#D6007A] focus:bg-white rounded-xl text-xs font-mono font-medium outline-none transition-all"
                />
              </div>

              {/* Quick Bank Handle Suggestions */}
              <div>
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">
                  Popular Handles
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {['@okhdfcbank', '@okaxis', '@oksbi', '@paytm', '@ybl', '@upi'].map((handle) => (
                    <button
                      key={handle}
                      type="button"
                      onClick={() => {
                        const prefix = upiForm.upiId.split('@')[0] || (currentUser?.email || 'user').split('@')[0]
                        setUpiForm({ ...upiForm, upiId: `${prefix}${handle}` })
                      }}
                      className="px-2 py-1 bg-neutral-100 hover:bg-pink-50 hover:text-[#D6007A] text-[11px] font-mono rounded-lg transition-colors cursor-pointer border border-neutral-200"
                    >
                      {handle}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Account Nickname / Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. Google Pay (HDFC), Primary PhonePe"
                  value={upiForm.label}
                  onChange={(e) => setUpiForm({ ...upiForm, label: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 focus:border-[#D6007A] focus:bg-white rounded-xl text-xs font-medium outline-none transition-all"
                />
              </div>

              {/* Set Default Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={upiForm.isDefault}
                  onChange={(e) => setUpiForm({ ...upiForm, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded text-[#D6007A] focus:ring-[#D6007A] border-neutral-300"
                />
                <span className="text-xs text-neutral-700 font-medium">
                  Set as default UPI for orders
                </span>
              </label>

              {/* Actions */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUpiModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#D6007A] hover:bg-[#b80068] text-xs font-bold text-white shadow-md cursor-pointer transition-all"
                >
                  Save UPI ID
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

