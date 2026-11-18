import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  ArrowLeft,
  Bell,
  Package,
  MessageSquare,
  CheckCheck,
  Clock,
  ExternalLink,
  Sparkles,
  ShoppingBag,
  RefreshCw,
} from 'lucide-react'
import { io } from 'socket.io-client'
import {
  getNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
} from '../../services/api'

export default function NotificationsPage({
  currentUser = null,
  onBack,
  onNavigate,
  onOpenChats,
  onOpenOrderTracking,
  onOpenOrders,
}) {
  const [notifications, setNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'unread' | 'order' | 'support'
  const socketRef = useRef(null)

  const userId = currentUser?.id || currentUser?.user_id || 76

  const loadNotifications = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoading(true)
    if (socketRef.current?.connected) {
      socketRef.current.emit('get_notifications', { recipientId: userId, limit: 50 })
      return
    }
    try {
      const res = await getNotificationsApi({
        recipientType: 'user',
        recipientId: userId,
        page: 1,
        limit: 50,
      })
      const list = Array.isArray(res?.data) ? res.data : []
      setNotifications(list)
    } catch (err) {
      console.warn('Failed to load notifications:', err)
    } finally {
      if (showLoader) setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [userId])

  useEffect(() => {
    loadNotifications(true)
  }, [loadNotifications])

  // Setup real-time Socket.IO listener for live notification arrival
  useEffect(() => {
    const rawWsUrl =
      import.meta.env.VITE_WEBSOCKET_URL ||
      import.meta.env.VITE_NODE_API ||
      'http://localhost:8080'
    const socketUrl = String(rawWsUrl).trim().replace(/\/+$/, '')

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('register', userId)
      socket.emit('join_room', String(userId))
      socket.emit('join_room', `user_${userId}`)
      // Fetch notifications list over WebSocket
      socket.emit('get_notifications', { recipientId: userId, limit: 50 })
    })

    const handleNotificationsList = (res) => {
      const list = Array.isArray(res?.data) ? res.data : []
      setNotifications(list)
      setIsLoading(false)
      setIsRefreshing(false)
    }

    const handleIncomingNotification = (newNotif) => {
      if (!newNotif) return
      setNotifications((prev) => {
        const notifId = newNotif.id || newNotif.notification_id
        if (notifId && prev.some((n) => (n.id || n.notification_id) === notifId)) {
          return prev
        }
        return [newNotif, ...prev]
      })
    }

    socket.on('notifications:list', handleNotificationsList)
    socket.on('notification:new', handleIncomingNotification)
    socket.on('notification', handleIncomingNotification)
    socket.on('support_notification:new', handleIncomingNotification)

    return () => {
      socket.off('notifications:list', handleNotificationsList)
      socket.off('notification:new', handleIncomingNotification)
      socket.off('notification', handleIncomingNotification)
      socket.off('support_notification:new', handleIncomingNotification)
      socket.disconnect()
      socketRef.current = null
    }
  }, [userId])

  const handleMarkAsRead = async (notif) => {
    const notifId = notif.id || notif.notification_id
    if (!notifId) return

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => ((n.id || n.notification_id) === notifId ? { ...n, is_read: true, isRead: true } : n))
    )

    if (socketRef.current?.connected) {
      socketRef.current.emit('mark_read', { id: notifId, recipientId: userId })
    } else {
      markNotificationReadApi(notifId, { recipientType: 'user', recipientId: userId }).catch(() => {})
    }
  }

  const handleMarkAllRead = async () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, isRead: true }))
    )
    if (socketRef.current?.connected) {
      socketRef.current.emit('mark_all_read', { recipientId: userId })
    } else {
      markAllNotificationsReadApi({ recipientType: 'user', recipientId: userId }).catch(() => {})
    }
  }

  const handleNotificationClick = (notif) => {
    handleMarkAsRead(notif)

    const notifType = String(notif.type || '').toLowerCase()
    const targetUrl = notif.data?.targetUrl || notif.data?.target_url || ''
    const ticketId = notif.related_ticket_id || notif.data?.ticket_id || notif.data?.ticketId
    const orderId = notif.related_order_id || notif.data?.order_id || notif.data?.orderId

    if (notifType === 'support' || notifType === 'chat' || ticketId || targetUrl.includes('chat')) {
      if (onOpenChats) {
        onOpenChats(ticketId ? { ticket_id: ticketId } : null)
      } else if (onNavigate) {
        onNavigate('chats')
      }
    } else if (notifType === 'order' || notifType === 'order_paid' || orderId || targetUrl.includes('order')) {
      if (orderId && onOpenOrderTracking) {
        onOpenOrderTracking(orderId)
      } else if (onOpenOrders) {
        onOpenOrders()
      } else if (onNavigate) {
        onNavigate('orders')
      }
    }
  }

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return 'Just now'
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return 'Recently'
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays === 1) return 'Yesterday'
      if (diffDays < 7) return `${diffDays}d ago`
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
    } catch {
      return 'Recently'
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read && !n.isRead).length

  const filteredNotifications = notifications.filter((n) => {
    const isUnread = !n.is_read && !n.isRead
    const type = String(n.type || '').toLowerCase()

    if (activeFilter === 'unread') return isUnread
    if (activeFilter === 'order') return type === 'order' || type === 'order_paid' || Boolean(n.related_order_id)
    if (activeFilter === 'support') return type === 'support' || type === 'chat' || Boolean(n.related_ticket_id)
    return true
  })

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 md:pb-12 text-neutral-800 font-sans">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-600 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-pink-100 text-pink-700 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-pink-600 hover:bg-pink-50 border border-pink-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsRefreshing(true)
              loadNotifications(false)
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
            title="Refresh notifications"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-pink-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-5">
        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-2 no-scrollbar">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: `Unread (${unreadCount})` },
            { id: 'order', label: 'Orders' },
            { id: 'support', label: 'Concierge & Support' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-theme-gradient text-white shadow-sm ring-2 ring-pink-300/40'
                  : 'bg-white text-neutral-600 hover:bg-neutral-50 hover:text-black border border-neutral-200/80 shadow-2xs'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 border border-neutral-100 shadow-2xs animate-pulse flex gap-3.5"
              >
                <div className="w-10 h-10 rounded-full bg-neutral-200 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3.5 bg-neutral-200 rounded w-1/3" />
                  <div className="h-3 bg-neutral-100 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-3xl border border-neutral-100 p-12 text-center shadow-xs mt-4">
            <div className="w-16 h-16 rounded-full bg-pink-50 text-pink-600 mx-auto flex items-center justify-center mb-4">
              <Bell className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 mb-1">
              No notifications found
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {activeFilter === 'unread'
                ? "You're all caught up! You have no unread notifications."
                : "You don't have any notifications in this section yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 pt-1">
            {filteredNotifications.map((notif) => {
              const isUnread = !notif.is_read && !notif.isRead
              const notifType = String(notif.type || '').toLowerCase()
              const isOrder = notifType === 'order' || notifType === 'order_paid' || Boolean(notif.related_order_id)
              const isSupport = notifType === 'support' || notifType === 'chat' || Boolean(notif.related_ticket_id)

              return (
                <div
                  key={notif.id || Math.random()}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
                    isUnread
                      ? 'border-pink-200 bg-gradient-to-r from-pink-50/40 via-white to-white'
                      : 'border-neutral-100 hover:border-neutral-200'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Icon Avatar */}
                    <div
                      className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white ${
                        isSupport
                          ? 'bg-gradient-to-br from-[#D6007A] to-purple-600'
                          : isOrder
                          ? 'bg-gradient-to-br from-neutral-800 to-neutral-950'
                          : 'bg-gradient-to-br from-amber-500 to-orange-600'
                      }`}
                    >
                      {isSupport ? (
                        <MessageSquare className="w-4 h-4" />
                      ) : isOrder ? (
                        <Package className="w-4 h-4" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4
                          className={`text-xs sm:text-sm font-bold truncate ${
                            isUnread ? 'text-neutral-950' : 'text-neutral-700'
                          }`}
                        >
                          {notif.title || 'Bespoke Notification'}
                        </h4>
                        <span className="text-[10px] text-neutral-400 font-medium shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(notif.created_at || notif.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-600 leading-relaxed line-clamp-2">
                        {notif.message || notif.body || ''}
                      </p>

                      {/* Bottom Context Badge */}
                      <div className="mt-2.5 flex items-center gap-2">
                        {notif.related_ticket_id && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-semibold">
                            Ticket #{notif.related_ticket_id}
                          </span>
                        )}
                        {notif.related_order_id && (
                          <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[10px] font-semibold">
                            Order #{notif.related_order_id}
                          </span>
                        )}
                        {isUnread && (
                          <span className="inline-block w-2 h-2 rounded-full bg-pink-500 ring-2 ring-pink-100" />
                        )}
                      </div>
                    </div>

                    <ExternalLink className="w-3.5 h-3.5 text-neutral-300 group-hover:text-neutral-600 shrink-0 mt-1 transition-colors" />
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

