import { useState, useEffect } from 'react'
import { Bell, Trash2, AlertCircle, Mail, MessageSquare, Settings } from 'lucide-react'
import { useParentContext } from '../../contexts/ParentContext'
import { getAuthFromStorage } from '../../lib/auth'

interface Notification {
  id: string
  title: string
  message: string
  type: 'academic' | 'attendance' | 'behavioral' | 'fees' | 'communication' | 'health'
  date: string
  isRead: boolean
}

interface NotificationPreferences {
  emailNotifications: boolean
  smsNotifications: boolean
  inAppNotifications: boolean
  academic: boolean
  attendance: boolean
  behavioral: boolean
  fees: boolean
  communication: boolean
  health: boolean
}

export function Notifications() {
  const { selectedChild } = useParentContext()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<'all' | Notification['type']>('all')
  const [showPreferences, setShowPreferences] = useState(false)
  const [isSavingPreferences, setIsSavingPreferences] = useState(false)

  const notificationTypes = ['academic', 'attendance', 'behavioral', 'fees', 'communication', 'health'] as const

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'academic':
        return 'bg-blue-50 border-blue-200 text-blue-700'
      case 'attendance':
        return 'bg-purple-50 border-purple-200 text-purple-700'
      case 'behavioral':
        return 'bg-orange-50 border-orange-200 text-orange-700'
      case 'fees':
        return 'bg-red-50 border-red-200 text-red-700'
      case 'communication':
        return 'bg-green-50 border-green-200 text-green-700'
      case 'health':
        return 'bg-pink-50 border-pink-200 text-pink-700'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700'
    }
  }

  const fetchNotifications = async () => {
    if (!selectedChild) return
    setIsLoading(true)
    try {
      const auth = getAuthFromStorage()
      const res = await fetch(
        `/api/parent/notifications?childId=${selectedChild.id}&limit=50`,
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      )
      if (!res.ok) throw new Error('Failed to fetch notifications')
      const data = await res.json()
      setNotifications(data.notifications || [])
      setError(null)
    } catch (err) {
      setError('Failed to load notifications')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPreferences = async () => {
    try {
      const auth = getAuthFromStorage()
      const res = await fetch('/api/parent/notification-preferences', {
        headers: { Authorization: `Bearer ${auth?.token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch preferences')
      const data = await res.json()
      setPreferences(data)
    } catch (err) {
      console.error('Failed to load preferences:', err)
    }
  }

  useEffect(() => {
    fetchNotifications()
    fetchPreferences()
  }, [selectedChild])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const auth = getAuthFromStorage()
      await fetch(`/api/parent/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${auth?.token}` },
      })
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      )
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const auth = getAuthFromStorage()
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id)
      await Promise.all(
        unreadIds.map(id =>
          fetch(`/api/parent/notifications/${id}/read`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${auth?.token}` },
          })
        )
      )
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }

  const handleSavePreferences = async () => {
    if (!preferences) return
    setIsSavingPreferences(true)
    try {
      const auth = getAuthFromStorage()
      await fetch('/api/parent/notification-preferences', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${auth?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      })
      setShowPreferences(false)
    } catch (err) {
      console.error('Failed to save preferences:', err)
      alert('Failed to save preferences')
    } finally {
      setIsSavingPreferences(false)
    }
  }

  const filteredNotifications = notifications.filter(n =>
    selectedType === 'all' || n.type === selectedType
  )

  const unreadCount = notifications.filter(n => !n.isRead).length

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-blue-600" />
        <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
        {unreadCount > 0 && (
          <span className="ml-auto bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            {unreadCount} unread
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-900">{error}</p>
            <button
              onClick={fetchNotifications}
              className="text-xs text-red-700 hover:text-red-900 font-medium mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-between gap-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {notificationTypes.map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              Mark all as read
            </button>
          )}
          <button
            onClick={() => setShowPreferences(true)}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-gray-100">
          <Bell className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map(notification => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border transition-all ${
                notification.isRead
                  ? 'bg-white border-gray-100 hover:border-gray-200'
                  : 'bg-blue-50 border-blue-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                    {!notification.isRead && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{notification.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(notification.type)}`}>
                      {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(notification.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {!notification.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                    >
                      ✓
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteNotification(notification.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preferences Modal */}
      {showPreferences && preferences && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Notification Preferences</h2>
              <button
                onClick={() => setShowPreferences(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Delivery Methods */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Delivery Methods</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.emailNotifications}
                      onChange={e =>
                        setPreferences({
                          ...preferences,
                          emailNotifications: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-700">Email Notifications</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.smsNotifications}
                      onChange={e =>
                        setPreferences({
                          ...preferences,
                          smsNotifications: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-700">SMS Notifications</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.inAppNotifications}
                      onChange={e =>
                        setPreferences({
                          ...preferences,
                          inAppNotifications: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-700">In-App Notifications</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Notification Types */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Notification Types</h3>
                <div className="space-y-3">
                  {notificationTypes.map(type => (
                    <label key={type} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences[type]}
                        onChange={e =>
                          setPreferences({
                            ...preferences,
                            [type]: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowPreferences(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreferences}
                disabled={isSavingPreferences}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isSavingPreferences ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
