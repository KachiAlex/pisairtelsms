import { useState, useEffect } from 'react'
import { BookOpen, CalendarCheck, CreditCard, Calendar, AlertTriangle, Info, AlertCircle, TrendingUp } from 'lucide-react'
import { useParentContext } from '../../../contexts/ParentContext'

interface DashboardData {
  parent: { id: string; name: string; email: string }
  child: { id: string; name: string; admissionNumber: string; class: string; arm: string }
  metrics: { attendancePercent: number; gpa: number; outstandingFees: number; nextExamDate: string }
  recentGrades: Array<{ id: string; subject: string; score: number; date: string }>
  recentAnnouncements: Array<{ id: string; title: string; date: string; preview: string }>
  upcomingEvents: Array<{ id: string; date: string; title: string; description: string }>
  alerts: Array<{ id: string; type: string; message: string; severity: 'info' | 'warning' | 'critical'; date: string }>
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
      <div className="h-8 bg-gray-200 rounded w-1/2"></div>
    </div>
  )
}

function AlertBadge({ severity }: { severity: 'info' | 'warning' | 'critical' }) {
  if (severity === 'critical') return <AlertCircle className="w-4 h-4 text-red-500" />
  if (severity === 'warning') return <AlertTriangle className="w-4 h-4 text-yellow-500" />
  return <Info className="w-4 h-4 text-blue-500" />
}

export function ParentDashboard() {
  const { selectedChild } = useParentContext()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = async () => {
    if (!selectedChild) return
    setIsLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('auth')
        ? JSON.parse(localStorage.getItem('auth')!).token
        : null
      const res = await fetch(`/api/parent/dashboard?childId=${selectedChild.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch dashboard')
      const json = await res.json()
      setData(json)
    } catch {
      setError('Failed to load dashboard. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [selectedChild?.id])

  if (!selectedChild) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please select a child to view the dashboard.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              {[1, 2, 3].map(j => <div key={j} className="h-3 bg-gray-200 rounded mb-2"></div>)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data) return null

  const alertBgColor = (severity: string) => {
    if (severity === 'critical') return 'bg-red-50 border-red-200'
    if (severity === 'warning') return 'bg-yellow-50 border-yellow-200'
    return 'bg-blue-50 border-blue-200'
  }

  return (
    <div className="space-y-6">
      {/* Child Info Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 sm:p-5 text-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xl sm:text-2xl font-bold">{data.child.name.charAt(0)}</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold truncate">{data.child.name}</h2>
            <p className="text-blue-100 text-sm">{data.child.admissionNumber} · {data.child.class} {data.child.arm}</p>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
            <CalendarCheck className="w-4 h-4" />
            Attendance
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.metrics.attendancePercent}%</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
            <TrendingUp className="w-4 h-4" />
            GPA
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.metrics.gpa.toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
            <CreditCard className="w-4 h-4" />
            Outstanding Fees
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {data.metrics.outstandingFees === 0 ? 'Nil' : `₦${data.metrics.outstandingFees.toLocaleString()}`}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
            <Calendar className="w-4 h-4" />
            Next Exam
          </div>
          <p className="text-lg font-bold text-gray-900">{data.metrics.nextExamDate}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Grades */}
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Recent Grades</h3>
          </div>
          {data.recentGrades.length === 0 ? (
            <p className="text-gray-500 text-sm">No grades available yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recentGrades.map(grade => (
                <div key={grade.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{grade.subject}</p>
                    <p className="text-xs text-gray-500">{grade.date}</p>
                  </div>
                  <span className={`text-sm font-bold px-2 py-1 rounded ${grade.score >= 70 ? 'bg-green-50 text-green-700' : grade.score >= 50 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                    {grade.score}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Announcements */}
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Announcements</h3>
          {data.recentAnnouncements.length === 0 ? (
            <p className="text-gray-500 text-sm">No announcements.</p>
          ) : (
            <div className="space-y-3">
              {data.recentAnnouncements.map(ann => (
                <div key={ann.id} className="py-2 border-b border-gray-50 last:border-0">
                  <p className="text-sm font-medium text-gray-900">{ann.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{ann.preview}</p>
                  <p className="text-xs text-gray-400 mt-1">{ann.date}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Upcoming Events</h3>
          {data.upcomingEvents.length === 0 ? (
            <p className="text-gray-500 text-sm">No upcoming events.</p>
          ) : (
            <div className="space-y-3">
              {data.upcomingEvents.map(event => (
                <div key={event.id} className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{event.title}</p>
                    <p className="text-xs text-gray-500">{event.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Active Alerts</h3>
          {data.alerts.length === 0 ? (
            <p className="text-gray-500 text-sm">No active alerts.</p>
          ) : (
            <div className="space-y-2">
              {data.alerts.map(alert => (
                <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg border ${alertBgColor(alert.severity)}`}>
                  <AlertBadge severity={alert.severity} />
                  <div>
                    <p className="text-sm text-gray-800">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{alert.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
