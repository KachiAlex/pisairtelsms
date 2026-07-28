import React, { useState, useEffect, useRef } from 'react'
import { Bell, Check, X, Loader2, MessageSquare, AlertCircle, Calendar, FileText } from 'lucide-react'
import { Button } from '../ui/button'
import { getAuthFromStorage } from '../../lib/auth'

interface Notification {
  id: string
  type: 'message' | 'announcement'
  title: string
  message: string
  date: string
  isRead: boolean
  link?: string
}

export function StudentNotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [markingRead, setMarkingRead] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const auth = getAuthFromStorage()

  const unreadCount = notifications.filter(n => !n.isRead).length

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const token = auth?.token
      if (!token) return

      const [messagesRes, announcementsRes] = await Promise.all([
        fetch('/api/student/messages', {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
        fetch('/api/student/announcements', {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
      ])

      const notificationsList: Notification[] = []

      if (messagesRes?.ok) {
        const messagesData = await messagesRes.json()
        const messages = messagesData.messages || []
        notificationsList.push(
          ...messages.map((m: any) => ({
            id: `msg-${m.id}`,
            type: 'message' as const,
            title: m.subject,
            message: m.body?.slice(0, 100) + (m.body?.length > 100 ? '...' : '') || '',
            date: m.date,
            isRead: m.isRead,
            link: '/student/messages',
          }))
        )
      }

      if (announcementsRes?.ok) {
        const announcementsData = await announcementsRes.json()
        const announcements = announcementsData.announcements || []
        notificationsList.push(
          ...announcements.slice(0, 3).map((a: any) => ({
            id: `ann-${a.id}`,
            type: 'announcement' as const,
            title: a.title,
            message: a.preview || a.body?.slice(0, 100) || '',
            date: a.date,
            isRead: false,
            link: '/student/communications',
          }))
        )
      }

      notificationsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setNotifications(notificationsList.slice(0, 10))
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      setMarkingRead(notificationId)
      const token = auth?.token
      if (!token) return

      const [type, id] = notificationId.split('-')

      if (type === 'msg') {
        await fetch(`/api/student/messages/${id}/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      }

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
      )
    } catch (err) {
      console.error('Failed to mark as read:', err)
    } finally {
      setMarkingRead(null)
    }
  }

  const markAllAsRead = async () => {
    try {
      const token = auth?.token
      if (!token) return

      const unreadMessages = notifications.filter(n => !n.isRead && n.type === 'message')

      await Promise.all(
        unreadMessages.map(n => {
          const [, id] = n.id.split('-')
          return fetch(`/api/student/messages/${id}/read`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          })
        })
      )

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-4 h-4 text-blue-500" />
      case 'announcement':
        return <AlertCircle className="w-4 h-4 text-amber-500" />
      default:
        return <Bell className="w-4 h-4 text-gray-500" />
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60))
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60))
        return minutes === 0 ? 'Just now' : `${minutes}m ago`
      }
      return `${hours}h ago`
    }
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-3 hover:bg-gray-50 transition-colors ${
                      !notification.isRead ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">{getIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium truncate ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-xs text-gray-400">
                            {formatDate(notification.date)}
                          </span>
                          {!notification.isRead && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              disabled={markingRead === notification.id}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                            >
                              {markingRead === notification.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <Check className="w-3 h-3" />
                                  Mark read
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-2 bg-gray-50">
            <button
              onClick={() => {
                setIsOpen(false)
                window.location.href = '/student/messages'
              }}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium py-1"
            >
              View all messages
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
