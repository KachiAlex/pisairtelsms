import React, { useState, useEffect } from 'react'
import { MessageSquare, Loader2, Check, ChevronDown, ChevronUp, Mail, MailOpen, Send } from 'lucide-react'
import { getAuthFromStorage } from '../../../lib/auth'
import { Button } from '../../ui/button'

interface Message {
  id: string
  subject: string
  body: string
  sender: string
  senderRole: string
  date: string
  isRead: boolean
}

export function Communications() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [markingRead, setMarkingRead] = useState<string | null>(null)
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const auth = getAuthFromStorage()

  useEffect(() => {
    fetchMessages()
  }, [])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/staff/messages', {
        headers: { Authorization: `Bearer ${auth?.token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (messageId: string) => {
    try {
      setMarkingRead(messageId)
      const response = await fetch(`/api/staff/messages/${messageId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth?.token}` },
      })
      if (response.ok) {
        setMessages(prev =>
          prev.map(m => (m.id === messageId ? { ...m, isRead: true } : m))
        )
      }
    } catch (err) {
      console.error('Failed to mark as read:', err)
    } finally {
      setMarkingRead(null)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadMessages = messages.filter(m => !m.isRead)
      await Promise.all(
        unreadMessages.map(m =>
          fetch(`/api/staff/messages/${m.id}/read`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${auth?.token}` },
          })
        )
      )
      setMessages(prev => prev.map(m => ({ ...m, isRead: true })))
    } catch (err) {
      console.error('Failed to mark all as read:', err)
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

  const filteredMessages = filter === 'unread'
    ? messages.filter(m => !m.isRead)
    : messages

  const unreadCount = messages.filter(m => !m.isRead).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communications</h1>
          <p className="text-gray-600 mt-1">
            {unreadCount > 0 ? (
              <span className="text-blue-600 font-medium">{unreadCount} unread message{unreadCount !== 1 ? 's' : ''}</span>
            ) : (
              'No unread messages'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead} className="text-sm">
              <Check className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Send className="w-4 h-4 mr-1" />
            New Message
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-1 border-b border-gray-200 min-w-max">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              filter === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            All Messages
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              filter === 'unread'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Messages List */}
      {filteredMessages.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">
            {filter === 'unread' ? 'No unread messages' : 'No messages'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {filter === 'unread' ? "You're all caught up!" : 'Messages from admins and parents will appear here'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {filteredMessages.map((msg) => (
            <div
              key={msg.id}
              className={`p-4 hover:bg-gray-50 transition-colors ${
                !msg.isRead ? 'bg-blue-50/30' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {msg.isRead ? (
                    <MailOpen className="w-5 h-5 text-gray-400" />
                  ) : (
                    <Mail className="w-5 h-5 text-blue-500" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className={`font-medium ${!msg.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                        {msg.subject}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        From: <span className="text-gray-700">{msg.sender}</span>
                        <span className="mx-2">·</span>
                        <span>{formatDate(msg.date)}</span>
                      </p>
                    </div>
                    {!msg.isRead && (
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>

                  {/* Message Body */}
                  {expandedMessage === msg.id ? (
                    <div className="mt-3">
                      <p className="text-gray-700 whitespace-pre-wrap">{msg.body}</p>
                      <button
                        onClick={() => setExpandedMessage(null)}
                        className="mt-3 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                      >
                        <ChevronUp className="w-4 h-4" />
                        Show less
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{msg.body}</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 mt-3">
                    {expandedMessage !== msg.id && (
                      <button
                        onClick={() => setExpandedMessage(msg.id)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                        <ChevronDown className="w-4 h-4" />
                        Read more
                      </button>
                    )}
                    {!msg.isRead && (
                      <button
                        onClick={() => markAsRead(msg.id)}
                        disabled={markingRead === msg.id}
                        className="text-sm text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1 disabled:opacity-50"
                      >
                        {markingRead === msg.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Mark as read
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
  )
}
