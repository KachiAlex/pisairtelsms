import React, { useEffect, useState } from 'react'
import { AlertCircle, Calendar, MessageSquare, Bell } from 'lucide-react'
import { Button } from '../../ui/button'

interface StaffDashboardData {
  staff: {
    id: string
    name: string
    staffId: string
    department: string
    role: string
  }
  todaySchedule: Array<{
    id: string
    subject: string
    className: string
    timeSlot: string
    room: string
    startTime: string
    endTime: string
  }>
  pendingLeaveCount: number
  recentAnnouncements: Array<{
    id: string
    title: string
    date: string
    preview: string
  }>
  recentMessages: Array<{
    id: string
    sender: string
    subject: string
    date: string
    isRead: boolean
  }>
}

export function StaffDashboard() {
  const [data, setData] = useState<StaffDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const auth = localStorage.getItem('auth')
        if (!auth) {
          setError('Not authenticated')
          return
        }

        const { token } = JSON.parse(auth)
        const response = await fetch('/api/staff/dashboard', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }

        const dashboardData = await response.json()
        setData(dashboardData)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        setError(message)
        console.error('Error fetching dashboard:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-lg bg-gray-200" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Error Loading Dashboard</h3>
            <p className="mt-1 text-sm text-red-800">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-gray-600">No data available</p>
      </div>
    )
  }

  const unreadCount = data.recentMessages.filter(m => !m.isRead).length

  return (
    <div className="space-y-6">
      {/* Staff Info Header */}
      <div className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 p-4 sm:p-6 text-white">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{data.staff.name}</h1>
        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-blue-100">Staff ID</p>
            <p className="font-semibold">{data.staff.staffId}</p>
          </div>
          <div>
            <p className="text-sm text-blue-100">Department</p>
            <p className="font-semibold">{data.staff.department}</p>
          </div>
          <div>
            <p className="text-sm text-blue-100">Role</p>
            <p className="font-semibold">{data.staff.role}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Classes</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{data.todaySchedule.length}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Leave</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{data.pendingLeaveCount}</p>
            </div>
            <Calendar className="h-8 w-8 text-amber-600" />
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unread Messages</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{unreadCount}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Schedule */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Schedule</h2>
          {data.todaySchedule.length === 0 ? (
            <p className="text-gray-600 text-center py-4">No classes scheduled for today</p>
          ) : (
            <div className="space-y-3">
              {data.todaySchedule.map((session) => (
                <div key={session.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">{session.subject}</p>
                      <p className="text-sm text-gray-600">{session.className}</p>
                    </div>
                    <span className="text-sm font-medium text-blue-600">{session.timeSlot}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Room: {session.room}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Announcements */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Announcements
          </h2>
          {data.recentAnnouncements.length === 0 ? (
            <p className="text-gray-600 text-center py-4">No announcements</p>
          ) : (
            <div className="space-y-3">
              {data.recentAnnouncements.slice(0, 5).map((announcement) => (
                <div key={announcement.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                  <p className="font-semibold text-gray-900 text-sm">{announcement.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{announcement.preview}</p>
                  <p className="text-xs text-gray-500 mt-2">{announcement.date}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Messages */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Recent Messages
        </h2>
        {data.recentMessages.length === 0 ? (
          <p className="text-gray-600 text-center py-4">No messages</p>
        ) : (
          <div className="space-y-2">
            {data.recentMessages.slice(0, 5).map((message) => (
              <div key={message.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{message.sender}</p>
                    <p className="text-sm text-gray-600">{message.subject}</p>
                  </div>
                  {!message.isRead && (
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-600 flex-shrink-0 mt-1.5"></span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">{message.date}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
