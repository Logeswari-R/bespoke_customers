import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  ChevronLeft,
  RefreshCw,
  Send,
  Image as ImageIcon,
  MessageSquare,
  CheckCheck,
  Loader2,
  Headphones,
  Package,
} from 'lucide-react'
import {
  getOrderVendorChatApi,
  sendOrderVendorMessageApi,
  uploadChatAttachmentApi,
} from '../../services/api'
import { io } from 'socket.io-client'

// Pure helper to collapse any rapid twin/triplet duplicates from DB or socket echoes
function deduplicateMessages(list) {
  if (!Array.isArray(list)) return []
  const seenIds = new Set()
  const result = []

  for (const m of list) {
    if (!m) continue
    const id = m.id ? String(m.id) : null
    if (id && seenIds.has(id)) continue
    if (id) seenIds.add(id)

    const text = String(m.message || m.text || '').trim()
    const sender = String(m.sender_id || m.senderId || '')

    // Check if any recent message in result (within last 3 items) has identical text and sender
    const isTwin = result.some((prev, idx) => {
      if (result.length - idx > 3) return false
      const prevText = String(prev.message || prev.text || '').trim()
      const prevSender = String(prev.sender_id || prev.senderId || '')
      return prevText === text && prevSender === sender
    })

    if (isTwin) {
      continue
    }

    result.push(m)
  }
  return result
}

export default function OrderVendorChatPage({
  saleOrderId: propSaleOrderId,
  initialOrder = null,
  currentUser,
  onBack,
}) {
  // 1. Safely resolve Sale Order ID (works on page reload, query string, or direct URL)
  const resolvedSaleOrderId =
    propSaleOrderId ||
    initialOrder?.saleOrderId ||
    initialOrder?.sale_order_id ||
    initialOrder?.orderId ||
    initialOrder?.id ||
    (() => {
      if (typeof window !== 'undefined') {
        const match = window.location.pathname.match(/\/(?:orders?|order-tracking)\/([a-zA-Z0-9_-]+)/i)
        if (match && match[1] && match[1] !== 'history') return match[1]
        const params = new URLSearchParams(window.location.search)
        return params.get('sale_order_id') || params.get('order_id') || null
      }
      return null
    })()

  // 2. Safely resolve Customer User ID
  const getActiveCustomerId = useCallback(() => {
    if (currentUser?.id) return String(currentUser.id)
    if (currentUser?.user_id) return String(currentUser.user_id)
    if (currentUser?.cust_id) return String(currentUser.cust_id)
    try {
      const saved = localStorage.getItem('bespoke_user')
      if (saved) {
        const u = JSON.parse(saved)
        if (u.id) return String(u.id)
        if (u.user_id) return String(u.user_id)
      }
    } catch (e) {}
    return '76'
  }, [currentUser])

  const [messages, setMessages] = useState([])
  const [order, setOrder] = useState(initialOrder)
  const orderRef = useRef(initialOrder)
  useEffect(() => {
    orderRef.current = order
  }, [order])

  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const chatContainerRef = useRef(null)
  const fileInputRef = useRef(null)
  const socketRef = useRef(null)

  const quickChips = [
    { label: '💬 Speak with specialist', text: 'Speak with bespoke specialist' },
    { label: '🚚 When will my order arrive?', text: 'When will my order arrive?' },
    { label: '✏️ Need measurement assistance', text: 'Need measurement assistance' },
    { label: '✂️ Request alteration update', text: 'Request alteration update' },
    { label: '📦 Return or refund status', text: 'Return or refund status' },
  ]

  // Container-scoped scroll (NEVER scrolls window to footer!)
  const scrollContainerToBottom = useCallback((smooth = true) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      })
    }
  }, [])

  // Load chat and order metadata from database
  const loadChat = useCallback(
    async (showSpinner = false) => {
      if (!resolvedSaleOrderId) return
      if (showSpinner) setIsRefreshing(true)

      try {
        const res = await getOrderVendorChatApi(resolvedSaleOrderId)
        if (res.success || res.order || res.messages || res.data) {
          if (res.order) {
            setOrder((prev) => ({
              ...prev,
              ...res.order,
              ticket_id: res.ticket_id || res.order?.ticket_id || prev?.ticket_id,
              ticket_code: res.ticket_code || res.order?.ticket_code || prev?.ticket_code,
            }))
          }
          const msgList = Array.isArray(res.messages)
            ? res.messages
            : Array.isArray(res.data)
            ? res.data
            : []
          setMessages(deduplicateMessages(msgList))

          // Initial scroll to bottom inside message container
          setTimeout(() => scrollContainerToBottom(false), 50)
        }
      } catch (err) {
        console.error('Failed to load order vendor chat:', err)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [resolvedSaleOrderId, scrollContainerToBottom]
  )

  // Real-time WebSocket connection via Socket.IO (Persistent, no teardown on order update)
  useEffect(() => {
    loadChat()

    if (!resolvedSaleOrderId) return

    const rawWsUrl =
      import.meta.env.VITE_WEBSOCKET_URL ||
      import.meta.env.VITE_NODE_API ||
      'http://43.204.68.67'
    const socketUrl = String(rawWsUrl).trim().replace(/\/+$/, '')

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      timeout: 10000,
    })
    socketRef.current = socket

    const activeCustId = getActiveCustomerId()

    socket.on('connect', () => {
      console.log('⚡ Connected to Order Vendor socket for order:', resolvedSaleOrderId)
      socket.emit('register', activeCustId)
      socket.emit('join_order', resolvedSaleOrderId)
      const rooms = [
        `order_${resolvedSaleOrderId}`,
        `order_vendor_${resolvedSaleOrderId}`,
        `order_chat_${resolvedSaleOrderId}_customer_to_admin_${activeCustId}`,
        `order_chat_${resolvedSaleOrderId}_customer_to_admin_76`,
        `order_chat_${resolvedSaleOrderId}_customer_to_admin_26`,
        `customer_${activeCustId}`,
        String(activeCustId),
        '10',
      ]
      if (orderRef.current?.ticket_id) {
        rooms.push(`ticket_${orderRef.current.ticket_id}`)
      }
      rooms.forEach((r) => socket.emit('join_room', r))
      console.log('🚪 [Socket] Joined order rooms:', rooms)
    })

    socket.on('message_status', (statusData) => {
      console.log('📬 [Socket] Received order message_status:', statusData)
      if (statusData?.messageId) {
        setMessages((prev) => {
          const pendingIdx = prev.findIndex(
            (m) =>
              (statusData.temp_id && (m.id === statusData.temp_id || m.temp_id === statusData.temp_id)) ||
              m.pending
          )
          if (pendingIdx !== -1) {
            const updated = [...prev]
            updated[pendingIdx] = {
              ...updated[pendingIdx],
              id: statusData.messageId,
              sale_order_id: statusData.sale_order_id || updated[pendingIdx].sale_order_id,
              pending: false,
            }
            return deduplicateMessages(updated)
          }
          return prev
        })
      }
    })

    const handleIncomingMessage = (newMsg) => {
      if (!newMsg) return
      console.log('📨 [Realtime Order Chat] Incoming message received:', newMsg)
      const targetOrderId = String(newMsg.sale_order_id || newMsg.saleOrderId || newMsg.order_id || '')
      const curOrderId = String(resolvedSaleOrderId || orderRef.current?.id || '')

      // Match if this message belongs to the current order
      if (!targetOrderId || targetOrderId === curOrderId || targetOrderId === String(orderRef.current?.sale_order_id)) {
        const msgText = String(newMsg.message || newMsg.text || '').trim()
        const msgId = String(newMsg.id || '')
        const msgTempId = String(newMsg.temp_id || newMsg.tempId || '')
        const msgSender = String(newMsg.sender_id || newMsg.senderId || '')

        setMessages((prev) => {
          // 1. If message already exists by ID, do not duplicate
          if (msgId && prev.some((m) => String(m.id) === msgId)) {
            return prev
          }

          // 2. If a pending optimistic message matches temp_id or text, reconcile it immediately
          const pendingIdx = prev.findIndex(
            (m) =>
              (msgTempId && String(m.id) === msgTempId) ||
              (m.pending && String(m.message || m.text || '').trim() === msgText)
          )
          if (pendingIdx !== -1) {
            const updated = [...prev]
            updated[pendingIdx] = { ...updated[pendingIdx], ...newMsg, pending: false }
            return deduplicateMessages(updated)
          }

          // 3. Prevent duplicate echo if sender is current user and message is already shown
          if (msgSender === String(activeCustId)) {
            const alreadyExists = prev.some(
              (m) => String(m.message || m.text || '').trim() === msgText
            )
            if (alreadyExists) return prev
          }

          // 4. Prevent duplicate non-pending message with exact same content within 15 seconds
          const isDuplicateRecent = prev.some(
            (m) =>
              !m.pending &&
              String(m.message || m.text || '').trim() === msgText &&
              String(m.sender_id || m.senderId) === msgSender
          )
          if (isDuplicateRecent) return prev

          return deduplicateMessages([...prev, newMsg])
        })
        setTimeout(() => scrollContainerToBottom(true), 50)
      }
    }

    const handleOrderNotification = (data) => {
      if (!data) return
      const msg = data.message || data
      handleIncomingMessage(msg)
    }

    socket.on('receive_order_message', handleIncomingMessage)
    socket.on('receive_message', handleIncomingMessage)
    socket.on('receive_ticket_message', handleIncomingMessage)
    socket.on('order_chat_notification', handleOrderNotification)

    return () => {
      if (socket) {
        socket.emit('leave_order', resolvedSaleOrderId)
        socket.emit('leave_room', `order_vendor_${resolvedSaleOrderId}`)
        socket.off('message_status')
        socket.off('receive_order_message', handleIncomingMessage)
        socket.off('receive_message', handleIncomingMessage)
        socket.off('receive_ticket_message', handleIncomingMessage)
        socket.off('order_chat_notification', handleOrderNotification)
        socket.disconnect()
      }
    }
  }, [resolvedSaleOrderId, loadChat, getActiveCustomerId, scrollContainerToBottom])

  // Send message to Admin (via Real-time WebSocket or REST API)
  const handleSendMessage = async (textToSend, customFilePath = null) => {
    const text = textToSend !== undefined ? textToSend : inputText.trim()
    if ((!text && !customFilePath) || !resolvedSaleOrderId) return

    const tempId = `temp_${Date.now()}`
    const adminReceiverId = '1'
    const customerId = getActiveCustomerId()

    const optimisticMessage = {
      id: tempId,
      sale_order_id: resolvedSaleOrderId,
      sender_id: String(customerId),
      senderId: String(customerId),
      sender_type: 'customer',
      senderType: 'customer',
      receiver_id: adminReceiverId,
      receiverId: adminReceiverId,
      receiver_type: 'admin',
      receiverType: 'admin',
      message: text,
      file_path: customFilePath,
      message_type: customFilePath ? 'image' : 'text',
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      pending: true,
    }

    setMessages((prev) => [...prev, optimisticMessage])
    if (textToSend === undefined) setInputText('')
    setIsSending(true)
    setTimeout(() => scrollContainerToBottom(true), 50)

    // 1. Emit via WebSocket if connected
    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', {
        sale_order_id: resolvedSaleOrderId,
        saleOrderId: resolvedSaleOrderId,
        sender_id: String(customerId),
        senderId: String(customerId),
        receiver_id: adminReceiverId,
        receiverId: adminReceiverId,
        sender_type: 'customer',
        senderType: 'customer',
        receiver_type: 'admin',
        receiverType: 'admin',
        message: text,
        file_path: customFilePath,
        message_type: customFilePath ? 'image' : 'text',
        chatType: 'order',
        chat_type: 'order',
        temp_id: tempId,
        tempId: tempId,
      })
      setIsSending(false)
      return
    }

    // 2. Fallback to REST API only when socket is disconnected
    try {
      const res = await sendOrderVendorMessageApi({
        saleOrderId: resolvedSaleOrderId,
        vendorId: adminReceiverId,
        customerId,
        message: text,
        filePath: customFilePath,
      })

      if (res.success || res.data) {
        const realData = res.data || res
        if (realData?.id) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, ...realData, pending: false } : m))
          )
        }
      }
    } catch (err) {
      console.error('Error sending order chat message via fallback API:', err)
    } finally {
      setIsSending(false)
    }
  }

  // Handle Photo / Attachment Upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const uploadRes = await uploadChatAttachmentApi(file)
      if (uploadRes.success && (uploadRes.imageUrl || uploadRes.imageKey)) {
        const imagePath = uploadRes.imageKey || uploadRes.imageUrl
        await handleSendMessage('', imagePath)
      } else {
        alert(uploadRes.error || 'Failed to upload image')
      }
    } catch (err) {
      console.error('Error in photo upload:', err)
      alert('Could not upload photo. Please try again.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    try {
      let d = new Date(dateStr)
      if (d.getTime() > Date.now() + 60000) {
        d = new Date(d.getTime() - 5.5 * 60 * 60 * 1000)
      }
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  // Garment & Vendor details
  const vendorName =
    order?.vendor_shop_name ||
    order?.vendor?.shop_name ||
    order?.vendor_name ||
    order?.vendor?.name ||
    'Bespoke Support'
  const orderCode =
    order?.order_id ||
    order?.order_code ||
    (order?.id ? `ORD${order.id}` : `ORD${resolvedSaleOrderId}`)
  const ticketId =
    order?.ticket_id ||
    order?.ticketId ||
    messages.find((m) => m.ticket_id)?.ticket_id ||
    order?.ticket_code ||
    messages.find((m) => m.ticket_code)?.ticket_code ||
    null
  const productName =
    order?.product_name ||
    order?.product?.product_name ||
    order?.items?.[0]?.product_name ||
    'Tshirt'
  const productImage =
    order?.product_image ||
    order?.product?.image_path ||
    order?.items?.[0]?.product_image ||
    null
  const productSize =
    order?.size ||
    order?.items?.[0]?.size ||
    'Standard'
  const productQty =
    order?.quantity ||
    order?.qty ||
    order?.items?.[0]?.quantity ||
    1
  const orderStatus =
    order?.status ||
    order?.order_status ||
    order?.order_history ||
    'Order Placed'

  const activeCustId = getActiveCustomerId()

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col bg-[#F8F9FA] font-sans overflow-hidden">
      {/* 1. Header (Matching Mobile Screenshot) */}
      <div className="shrink-0 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
          </button>

          {/* Avatar with Headset & Online indicator */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#880e4f] via-[#c2185b] to-[#ad1457] flex items-center justify-center text-white shadow-sm">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white" />
          </div>

          <div>
            <h1 className="text-sm font-bold text-neutral-900 leading-tight">
              {vendorName}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[11px] text-neutral-500 font-medium">
                Order #{orderCode}
              </span>
              {ticketId && (
                <>
                  <span className="text-neutral-300">•</span>
                  <span className="text-[11px] text-neutral-600 font-medium">
                    Ticket #{String(ticketId).replace(/^TKT[-#]?/i, '')}
                  </span>
                </>
              )}
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                Live
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadChat(true)}
          disabled={isRefreshing}
          className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-600 hover:text-[#D6007A] hover:bg-pink-50 transition-colors cursor-pointer"
          title="Refresh conversation"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#D6007A]' : ''}`}
          />
        </button>
      </div>

      {/* 2. Pinned Garment Card (Matching Mobile Screenshot) */}
      <div className="shrink-0 max-w-2xl w-full mx-auto px-3 pt-3">
        <div className="bg-white rounded-2xl p-3 border border-neutral-200/90 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-14 rounded-lg bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200/60 flex items-center justify-center">
              {productImage ? (
                <img
                  src={productImage}
                  alt={productName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <Package className="w-6 h-6 text-neutral-400" />
              )}
            </div>

            <div>
              <h2 className="text-xs sm:text-sm font-bold text-neutral-900 leading-snug">
                {productName}
              </h2>
              <p className="text-[11px] text-neutral-500 mt-0.5 font-medium">
                Qty: {productQty} • Size: {productSize}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700">
              {orderStatus}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Messages Stream (Internal container scrolling only) */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto max-w-2xl w-full mx-auto px-4 py-4 flex flex-col space-y-3"
      >
        {/* Date Divider */}
        <div className="flex justify-center my-1 shrink-0">
          <span className="bg-neutral-200/70 text-neutral-600 text-[10px] font-bold px-3 py-1 rounded-full">
            Today
          </span>
        </div>

        {isLoading && messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-neutral-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#D6007A] mb-2" />
            <span className="text-xs">Connecting to Atelier Artisan...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center py-12 text-neutral-400 text-xs bg-white/60 rounded-2xl border border-neutral-200/50 p-6 mx-2">
            <div>
              <MessageSquare className="w-7 h-7 mx-auto mb-2 text-neutral-300" />
              <p className="font-semibold text-neutral-700">Start the conversation</p>
              <p className="text-[11px] text-neutral-500 mt-1">
                Choose a quick inquiry below or send a custom question to the artisan.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const senderId = String(msg.sender_id || msg.senderId || '')
            const senderType = String(msg.sender_type || msg.senderType || '').toLowerCase()
            const vendorId = String(orderRef.current?.vendor_id || orderRef.current?.vendor?.id || '1')

            // Strict alignment logic:
            // Admin (ID 1, 'admin', senderType admin) is ALWAYS on the left (isMe = false)
            // Customer messages are ALWAYS on the right (isMe = true)
            const isAdmin =
              senderId === '1' ||
              senderId === 'admin' ||
              senderType === 'admin'
            const isMe =
              !isAdmin &&
              (senderId === String(activeCustId) || senderType === 'customer' || !senderId)

            const isImage =
              msg.message_type === 'image' ||
              msg.messageType === 'image' ||
              Boolean(msg.file_path) ||
              (typeof msg.message === 'string' &&
                (msg.message.startsWith('http') || msg.message.startsWith('chatUploads/')))

            return (
              <div
                key={msg.id || index}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[82%] sm:max-w-md px-3.5 py-2.5 rounded-2xl shadow-xs ${
                    isMe
                      ? 'bg-[#1E2022] text-white rounded-br-xs'
                      : 'bg-white text-neutral-900 border border-neutral-200/80 rounded-bl-xs'
                  }`}
                >
                  {/* Image Message */}
                  {isImage ? (
                    <div className="mb-1 rounded-xl overflow-hidden bg-neutral-900/10">
                      <img
                        src={msg.file_path || msg.message}
                        alt="Attachment"
                        className="max-h-60 w-auto rounded-lg object-contain cursor-pointer"
                        onClick={() => window.open(msg.file_path || msg.message, '_blank')}
                      />
                    </div>
                  ) : null}

                  {/* Text Message with speech bubble icon if customer */}
                  {msg.message && !isImage && (
                    <div className="flex items-start gap-1.5">
                      {isMe && (
                        <MessageSquare className="w-3.5 h-3.5 inline shrink-0 mt-0.5 text-white/90" />
                      )}
                      <p className="text-xs sm:text-[13px] font-medium leading-relaxed whitespace-pre-wrap">
                        {msg.message}
                      </p>
                    </div>
                  )}

                  {/* Footer: Time & Double Ticks */}
                  <div
                    className={`flex items-center justify-end gap-1 text-[9px] mt-1 ${
                      isMe ? 'text-white/60' : 'text-neutral-400'
                    }`}
                  >
                    <span>{formatTime(msg.created_at || msg.createdAt)}</span>
                    {isMe && <CheckCheck className="w-3 h-3 text-sky-400" />}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 4. Bottom Section: Quick Chips & Input Bar (Fixed at bottom) */}
      <div className="shrink-0 bg-white/95 backdrop-blur-md border-t border-neutral-200/80 px-3 py-2.5 max-w-2xl w-full mx-auto">
        {/* Quick Suggestion Chips (Horizontal Scrollable) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(chip.text)}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-neutral-50 border border-neutral-200/90 hover:border-pink-300 text-neutral-700 hover:text-[#D6007A] hover:bg-pink-50 transition-colors whitespace-nowrap shrink-0 shadow-2xs cursor-pointer active:scale-95"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="bg-neutral-100/80 rounded-full border border-neutral-200/90 shadow-2xs px-3 py-1 flex items-center gap-2 mt-1">
          {/* Hidden File Input for Photos */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />

          {/* Photo/Attachment Icon button */}
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#D6007A] hover:bg-pink-50 transition-colors cursor-pointer shrink-0"
            title="Attach garment photo or measurement note"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#D6007A]" />
            ) : (
              <ImageIcon className="w-5 h-5 stroke-[2.2]" />
            )}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            placeholder="Type a message regarding order..."
            className="flex-1 px-2 py-2 text-xs sm:text-sm text-neutral-900 bg-transparent outline-none placeholder:text-neutral-400"
          />

          {/* Pink Gradient Circular Send Button */}
          <button
            type="button"
            disabled={!inputText.trim() || isSending}
            onClick={() => handleSendMessage()}
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#880e4f] via-[#c2185b] to-[#ad1457] hover:opacity-95 disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-sm"
            aria-label="Send message"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Send className="w-4 h-4 text-white -mr-0.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
