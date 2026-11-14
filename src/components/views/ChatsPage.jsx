import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  ArrowLeft,
  Send,
  MessageCircle,
  Sparkles,
  Bot,
  User,
  Clock,
  CheckCheck,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { getChatHistoryApi, sendChatMessageApi, getConciergeChatHistoryApi, markAllNotificationsReadApi } from '../../services/api'
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

export default function ChatsPage({ currentUser, onBack }) {
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTicket, setActiveTicket] = useState(null)

  const chatContainerRef = useRef(null)
  const socketRef = useRef(null)
  const activeUserIdRef = useRef('76')
  const activeTicketRef = useRef(null)

  const quickSuggestions = [
    '👋 Hello Bespoke',
    '📦 Order Status Inquiry',
    '📏 Measurement Help',
    '🚚 Delivery Estimate',
  ]

  // Resolve active customer user ID safely (works on page reload & guest fallback)
  const getActiveUserId = useCallback(() => {
    if (currentUser?.id) return String(currentUser.id)
    if (currentUser?.user_id) return String(currentUser.user_id)
    if (currentUser?.cust_id) return String(currentUser.cust_id)
    try {
      const saved = localStorage.getItem('bespoke_user')
      if (saved) {
        const u = JSON.parse(saved)
        if (u.id) return String(u.id)
        if (u.user_id) return String(u.user_id)
        if (u.cust_id) return String(u.cust_id)
      }
    } catch (e) {
      console.warn('Could not read user from localStorage:', e)
    }
    return '76' // Default active test customer
  }, [currentUser])

  // Keep refs in sync
  useEffect(() => {
    const uid = getActiveUserId()
    activeUserIdRef.current = uid
  }, [getActiveUserId])

  // Internal container scrolling (DOES NOT scroll browser window to footer!)
  const scrollContainerToBottom = useCallback((smooth = true) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      })
    }
  }, [])

  // Helper to join all required socket rooms and log them
  const joinRooms = useCallback(() => {
    const socket = socketRef.current
    if (!socket?.connected) return
    const uId = activeUserIdRef.current || '76'
    const tId = activeTicketRef.current?.id

    const rooms = [
      String(uId),
      `customer_${uId}`,
      '10', // Legacy Admin ticket fallback room
    ]
    if (tId) {
      rooms.push(`ticket_${tId}`)
    }

    rooms.forEach((r) => socket.emit('join_room', r))
    if (tId) {
      socket.emit('join_ticket', tId)
    }

    console.log('🚪 [Socket] Joined rooms:', rooms)
  }, [])

  // Load chat messages from database
  const loadMessages = useCallback(
    async (showSpinner = false) => {
      const userId = getActiveUserId()
      if (!userId) {
        setIsLoading(false)
        return
      }

      if (showSpinner) setIsRefreshing(true)
      try {
        const res = await getConciergeChatHistoryApi(userId)
        let msgList = []
        if (Array.isArray(res)) {
          msgList = res
        } else if (Array.isArray(res?.messages)) {
          msgList = res.messages
          if (res.ticket) {
            setActiveTicket(res.ticket)
            activeTicketRef.current = res.ticket
          }
        } else if (Array.isArray(res?.data)) {
          msgList = res.data
          if (res.ticket) {
            setActiveTicket(res.ticket)
            activeTicketRef.current = res.ticket
          }
        }

        // Strictly exclude order-specific chat messages from admin support chat
        const filtered = msgList.filter(
          (m) => !m.sale_order_id && !m.saleOrderId && !m.room_id?.startsWith?.('order_')
        )
        setMessages(deduplicateMessages(filtered))

        // Mark support notifications as read when opening chats
        markAllNotificationsReadApi({ recipientType: 'user', recipientId: userId }).catch(() => {})

        // Initial scroll to bottom inside container
        setTimeout(() => scrollContainerToBottom(false), 50)
      } catch (err) {
        console.error('Failed to load concierge chat history:', err)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [getActiveUserId, scrollContainerToBottom]
  )

  // Join ticket room when activeTicket updates
  useEffect(() => {
    activeTicketRef.current = activeTicket
    if (socketRef.current?.connected) {
      joinRooms()
    }
  }, [activeTicket, joinRooms])

  // Setup Real-time WebSocket (Socket.IO) - Persistent across renders
  useEffect(() => {
    loadMessages()

    const rawWsUrl =
      import.meta.env.VITE_WEBSOCKET_URL ||
      import.meta.env.VITE_NODE_API ||
      'http://localhost:8080'
    const socketUrl = String(rawWsUrl).trim().replace(/\/+$/, '')

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      timeout: 10000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      const activeUserId = activeUserIdRef.current
      console.log('⚡ Connected to Admin Support socket for user:', activeUserId)
      socket.emit('register', activeUserId)
      joinRooms()
    })

    socket.on('message_status', (statusData) => {
      console.log('📬 [Socket] Received message_status:', statusData)
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
              ticket_id: statusData.ticket_id || updated[pendingIdx].ticket_id,
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
      // Strictly ignore order-specific chat messages here
      if (newMsg.sale_order_id || newMsg.saleOrderId || newMsg.room_id?.startsWith?.('order_')) {
        return
      }

      console.log('📨 [Realtime Concierge] Incoming message received:', newMsg)

      const msgText = String(newMsg.message || newMsg.text || '').trim()
      const msgId = String(newMsg.id || '')
      const msgTempId = String(newMsg.temp_id || newMsg.tempId || '')
      const msgSender = String(newMsg.sender_id || newMsg.senderId || '')
      const activeUserId = activeUserIdRef.current

      setMessages((prev) => {
        // 1. If message already exists by ID, do not duplicate
        if (msgId && prev.some((m) => String(m.id) === msgId)) return prev

        // 2. Reconcile optimistic pending message
        const pendingIdx = prev.findIndex(
          (m) =>
            (msgTempId && (String(m.id) === msgTempId || String(m.temp_id) === msgTempId)) ||
            (m.pending && String(m.message || m.text || '').trim() === msgText)
        )
        if (pendingIdx !== -1) {
          const updated = [...prev]
          updated[pendingIdx] = { ...updated[pendingIdx], ...newMsg, pending: false }
          return deduplicateMessages(updated)
        }

        // 3. Prevent duplicate echo if sender is current user and message is already shown
        if (msgSender === String(activeUserId)) {
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

        // 5. Otherwise append new incoming message (e.g. from Admin)
        if (msgSender !== String(activeUserId)) {
          markAllNotificationsReadApi({ recipientType: 'user', recipientId: activeUserId }).catch(() => {})
        }
        return deduplicateMessages([...prev, newMsg])
      })

      setTimeout(() => scrollContainerToBottom(true), 50)
    }

    const handleOrderNotification = (data) => {
      if (!data) return
      console.log('🔔 [Realtime Concierge] order_chat_notification received:', data)
      const msg = data.message || data
      if (!msg.sale_order_id && !msg.saleOrderId) {
        handleIncomingMessage(msg)
      }
    }

    socket.on('receive_message', handleIncomingMessage)
    socket.on('receive_ticket_message', handleIncomingMessage)
    socket.on('order_chat_notification', handleOrderNotification)

    return () => {
      socket.off('connect')
      socket.off('message_status')
      socket.off('receive_message', handleIncomingMessage)
      socket.off('receive_ticket_message', handleIncomingMessage)
      socket.off('order_chat_notification', handleOrderNotification)
      socket.disconnect()
      socketRef.current = null
    }
  }, [joinRooms, loadMessages, scrollContainerToBottom])

  // Send message to Admin
  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText.trim()
    const activeUserId = getActiveUserId()
    if (!text || !activeUserId) return

    const tempId = `temp_${Date.now()}`
    const optimisticMessage = {
      id: tempId,
      temp_id: tempId,
      sender_id: String(activeUserId),
      senderId: String(activeUserId),
      receiver_id: '1',
      receiverId: '1',
      message: text,
      text: text,
      message_type: 'text',
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      pending: true,
    }

    setMessages((prev) => [...prev, optimisticMessage])
    if (!textToSend) setInputText('')
    setIsSending(true)
    setTimeout(() => scrollContainerToBottom(true), 50)

    // 1. Send via real-time WebSocket if connected (prevents dual-send duplication)
    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', {
        senderId: String(activeUserId),
        sender_id: String(activeUserId),
        receiverId: '1',
        receiver_id: '1',
        message: text,
        chatType: 'query',
        messageType: 'text',
        ticket_id: activeTicketRef.current?.id || activeTicket?.id || null,
        temp_id: tempId,
      })
      setIsSending(false)
      return
    }

    // 2. Fallback to REST API only when socket is disconnected
    try {
      const res = await sendChatMessageApi({
        sender_id: activeUserId,
        receiver_id: '1',
        message: text,
        message_type: 'text',
        ticket_id: activeTicketRef.current?.id || activeTicket?.id || null,
        temp_id: tempId,
      })

      if (res?.status === true || res?.status === 'true' || res?.data || res?.ticket_id) {
        if (res.ticket) setActiveTicket(res.ticket)
        const realData = res.data || res
        if (realData?.id) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, ...realData, pending: false } : m))
          )
        }
      }
    } catch (err) {
      console.error('Error sending support chat message:', err)
    } finally {
      setIsSending(false)
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

  const activeUserId = getActiveUserId()

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col bg-[#F8F9FA] font-sans overflow-hidden">
      {/* 1. Sticky Header */}
      <div className="shrink-0 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 sm:px-8 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-600 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#D6007A] to-pink-500 flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-neutral-900 leading-tight">
                Bespoke Atelier Concierge
              </h1>
              <p className="text-[11px] text-emerald-600 font-medium">
                Online • Dedicated Fashion Support (Admin)
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadMessages(true)}
          disabled={isRefreshing}
          className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-500 hover:text-[#D6007A] hover:bg-pink-50 transition-colors cursor-pointer"
          title="Refresh messages"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#D6007A]' : ''}`} />
        </button>
      </div>

      {/* 2. Messages Container (Internal scrolling only - DOES NOT scroll window!) */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 max-w-3xl w-full mx-auto flex flex-col space-y-3"
      >
        {/* Welcome Banner */}
        <div className="shrink-0 p-4 rounded-3xl bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100/80 text-center mb-2">
          <div className="w-9 h-9 rounded-full bg-[#D6007A] text-white flex items-center justify-center mx-auto mb-2 shadow-xs">
            <MessageCircle className="w-4 h-4" />
          </div>
          <h2 className="text-xs font-bold text-neutral-900">
            Welcome to Bespoke Private Concierge
          </h2>
          <p className="text-[11px] text-neutral-600 mt-1 max-w-sm mx-auto">
            Need styling advice, custom alteration assistance, or general help? Our dedicated admin team is here to assist.
          </p>
        </div>

        {/* Message Stream */}
        {isLoading && messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-neutral-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#D6007A] mb-2" />
            <span className="text-xs">Connecting to Atelier...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center py-12 text-neutral-400 text-xs">
            No previous messages. Choose a quick question below or ask anything!
          </div>
        ) : (
          messages.map((msg, index) => {
            const senderId = msg.sender_id || msg.senderId
            const senderType = String(msg.sender_type || msg.senderType || '').toLowerCase()
            const isMe =
              String(senderId) === String(activeUserId) &&
              senderType !== 'admin' &&
              String(senderId) !== '1'

            return (
              <div
                key={msg.id || index}
                className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-700 shrink-0 text-xs font-bold">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] sm:max-w-md px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed ${
                    isMe
                      ? 'bg-gradient-to-r from-[#D6007A] to-pink-600 text-white rounded-br-xs shadow-xs'
                      : 'bg-white text-neutral-800 border border-neutral-100 rounded-bl-xs shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.message}</p>
                  <div
                    className={`flex items-center justify-end gap-1 text-[9px] mt-1 font-normal ${
                      isMe ? 'text-pink-100' : 'text-neutral-400'
                    }`}
                  >
                    <Clock className="w-2.5 h-2.5" />
                    <span>{formatTime(msg.created_at || msg.createdAt)}</span>
                    {isMe && <CheckCheck className="w-3 h-3 text-pink-200" />}
                  </div>
                </div>

                {isMe && (
                  <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center text-[#D6007A] shrink-0 text-xs font-bold">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 3. Bottom Section: Quick Chips & Input Bar (Fixed at bottom of chat) */}
      <div className="shrink-0 bg-white/95 backdrop-blur-md border-t border-neutral-200/80 px-4 py-3 max-w-3xl w-full mx-auto">
        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {quickSuggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(item)}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-neutral-50 hover:bg-pink-50 border border-neutral-200 hover:border-pink-200 text-neutral-700 hover:text-[#D6007A] transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
            >
              {item}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="bg-neutral-100/80 rounded-3xl border border-neutral-200 shadow-2xs p-1.5 flex items-center gap-2 mt-1">
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
            placeholder="Type your message to concierge..."
            className="flex-1 px-4 py-2 text-xs sm:text-sm text-neutral-900 bg-transparent outline-none placeholder:text-neutral-400"
          />
          <button
            type="button"
            disabled={!inputText.trim() || isSending}
            onClick={() => handleSendMessage()}
            className="w-10 h-10 rounded-2xl bg-[#D6007A] hover:bg-pink-600 disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-sm"
            aria-label="Send message"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
