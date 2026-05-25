import React, { useState, useEffect } from 'react'
import { Calendar, Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, LogIn, LogOut, Briefcase } from 'lucide-react'
import { Button } from '../../ui/button'
import { getAuthFromStorage } from '../../../lib/auth'

interface AttendanceRecord {
  id: string
  date: string
  checkIn: string | null
  checkOut: string | null
  status: 'present' | 'absent' | 'late' | 'half_day'
  source: 'biometric' | 'manual' | 'web'
  notes: string | null
}

interface AttendanceSummary {
  month: string
  year: number
  present: number
  absent: number
  late: number
  halfDay: number
  total: number
}

interface TodayStatus {
  checkedIn: boolean
  checkedOut: boolean
  checkInTime: string | null
  checkOutTime: string | null
}

export function StaffSelfAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [summary, setSummary] = useState<AttendanceSummary | null>(null)
  const [today, setToday] = useState<TodayStatus>({ checkedIn: false, checkedOut: false, checkInTime: null, checkOutTime: null })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [error, setError] = useState<string | null>(null)
  const auth = getAuthFromStorage()

  useEffect(() => {
    fetchAttendance()
  }, [currentMonth])

  const fetchAttendance = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = auth?.token
      if (!token) {
        setError('Not authenticated')
        return
      }

      const month = currentMonth.getMonth() + 1
      const year = currentMonth.getFullYear()

      const response = await fetch(`/api/staff/my-attendance?month=${month}&year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch attendance')
      }

      const data = await response.json()
      setRecords(data.records || [])
      setSummary(data.summary)
      setToday(data.today)
    } catch (err) {
      console.error('Failed to fetch attendance:', err)
      setError('Failed to load attendance data')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async () => {
    try {
      setActionLoading(true)
      const token = auth?.token
      if (!token) return

      const response = await fetch('/api/staff/my-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'check-in' }),
      })

      if (!response.ok) {
        throw new Error('Failed to check in')
      }

      const data = await response.json()
      setToday(prev => ({
        ...prev,
        checkedIn: true,
        checkInTime: data.checkInTime,
      }))
      fetchAttendance()
    } catch (err) {
      console.error('Failed to check in:', err)
      setError('Failed to check in')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCheckOut = async () => {
    try {
      setActionLoading(true)
      const token = auth?.token
      if (!token) return

      const response = await fetch('/api/staff/my-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'check-out' }),
      })

      if (!response.ok) {
        throw new Error('Failed to check out')
      }

      const data = await response.json()
      setToday(prev => ({
        ...prev,
        checkedOut: true,
        checkOutTime: data.checkOutTime,
      }))
      fetchAttendance()
    } catch (err) {
      console.error('Failed to check out:', err)
      setError('Failed to check out')
    } finally {
      setActionLoading(false)
    }
  }

  const formatTime = (time: string | null) => {
    if (!time) return '--:--'
    const [hours, minutes] = time.split(':')
    return `${hours}:${minutes}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'absent':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'late':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'half_day':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4" />
      case 'absent':
        return <AlertCircle className="w-4 h-4" />
      case 'late':
        return <Clock className="w-4 h-4" />
      case 'half_day':
        return <Briefcase className="w-4 h-4" />
      default:
        return null
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1)
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1)
    }
    setCurrentMonth(newMonth)
  }

  const monthLabel = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })
  const isCurrentMonth = currentMonth.getMonth() === new Date().getMonth() &&
                         currentMonth.getFullYear() === new Date().getFullYear()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
          <p className="text-gray-600 mt-1">View your attendance history and clock in/out</p>
        </div>
        {isCurrentMonth && (
          <div className="flex items-center gap-2">
            {!today.checkedIn ? (
              <Button
                onClick={handleCheckIn}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <LogIn className="w-4 h-4 mr-1" />
                {actionLoading ? 'Checking in...' : 'Clock In'}
              </Button>
            ) : !today.checkedOut ? (
              <Button
                onClick={handleCheckOut}
                disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <LogOut className="w-4 h-4 mr-1" />
                {actionLoading ? 'Checking out...' : 'Clock Out'}
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Day Complete</span>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Today's Status */}
      {isCurrentMonth && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500 mb-1">Check In</p>
            <p className="text-2xl font-bold text-gray-900">
              {today.checkInTime ? formatTime(today.checkInTime) : '--:--'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {today.checkedIn ? 'Completed' : 'Pending'}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500 mb-1">Check Out</p>
            <p className="text-2xl font-bold text-gray-900">
              {today.checkOutTime ? formatTime(today.checkOutTime) : '--:--'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {today.checkedOut ? 'Completed' : today.checkedIn ? 'Ready to check out' : 'Waiting for check-in'}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500 mb-1">Duration</p>
            <p className="text-2xl font-bold text-gray-900">
              {today.checkInTime && today.checkOutTime
                ? (() => {
                    const [inH, inM] = today.checkInTime.split(':').map(Number)
                    const [outH, outM] = today.checkOutTime.split(':').map(Number)
                    const diff = (outH * 60 + outM) - (inH * 60 + inM)
                    const h = Math.floor(diff / 60)
                    const m = diff % 60
                    return `${h}h ${m}m`
                  })()
                : '--:--'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {today.checkInTime && !today.checkOutTime ? 'In progress' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Monthly Summary */}
      {summary && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-4">
            {summary.month} {summary.year} Summary
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">{summary.present}</p>
              <p className="text-sm text-green-600">Present</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-700">{summary.absent}</p>
              <p className="text-sm text-red-600">Absent</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <p className="text-2xl font-bold text-amber-700">{summary.late}</p>
              <p className="text-sm text-amber-600">Late</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">{summary.halfDay}</p>
              <p className="text-sm text-blue-600">Half Day</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-700">{summary.total}</p>
              <p className="text-sm text-gray-600">Total Days</p>
            </div>
          </div>
        </div>
      )}

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigateMonth('prev')} className="flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          {monthLabel}
        </h2>
        <Button variant="outline" onClick={() => navigateMonth('next')} className="flex items-center gap-1">
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Attendance Records */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Check In</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Check Out</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Source</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No attendance records for this month
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDate(record.date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatTime(record.checkIn)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatTime(record.checkOut)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusColor(record.status)}`}>
                        {getStatusIcon(record.status)}
                        <span className="capitalize">{record.status.replace('_', '-')}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{record.source}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {record.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
