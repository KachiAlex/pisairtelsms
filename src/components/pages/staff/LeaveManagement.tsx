import React, { useEffect, useState } from 'react'
import { AlertCircle, Plus } from 'lucide-react'
import { Button } from '../../ui/button'

interface LeaveRequest {
  id: string
  leaveType: string
  startDate: string
  endDate: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  approvedBy?: string
  approvalDate?: string
}

interface LeaveBalance {
  leaveType: string
  totalDays: number
  usedDays: number
  remainingDays: number
}

interface LeaveData {
  requests: LeaveRequest[]
  balance: LeaveBalance[]
}

export function LeaveManagement() {
  const [data, setData] = useState<LeaveData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [formData, setFormData] = useState({
    leaveType: 'Annual',
    startDate: '',
    endDate: '',
    reason: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const auth = localStorage.getItem('auth')
  const authParsed = auth ? JSON.parse(auth) : null
  const token = authParsed?.token ?? null
  const userId = authParsed?.userId ?? null

  // Fetch leave data
  useEffect(() => {
    const fetchLeaveData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        if (!token) {
          setError('Not authenticated')
          return
        }

        const response = await fetch('/api/staff/leave', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch leave data')
        }

        const leaveData = await response.json()
        setData(leaveData)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        setError(message)
        console.error('Error fetching leave data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLeaveData()
  }, [token])

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.leaveType) errors.leaveType = 'Leave type is required'
    if (!formData.startDate) errors.startDate = 'Start date is required'
    if (!formData.endDate) errors.endDate = 'End date is required'
    if (!formData.reason) errors.reason = 'Reason is required'

    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        errors.dateRange = 'Start date must be before or equal to end date'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      setIsSubmitting(true)
      setError(null)

      if (!token) {
        setError('Not authenticated')
        return
      }

      const response = await fetch('/api/staff/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit leave request')
      }

      setSuccess('Leave request submitted successfully')
      setFormData({
        leaveType: '',
        startDate: '',
        endDate: '',
        reason: '',
      })
      setShowForm(false)

      // Refresh data
      const refreshResponse = await fetch('/api/staff/leave', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (refreshResponse.ok) {
        const leaveData = await refreshResponse.json()
        setData(leaveData)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      console.error('Error submitting leave request:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const calculateDays = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-96 animate-pulse rounded-lg bg-gray-200" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Error Loading Leave Data</h3>
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

  const filteredRequests = data.requests.filter(
    (req) => statusFilter === 'all' || req.status === statusFilter
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-amber-100 text-amber-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Leave Balance */}
      {data.balance.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Leave Balance</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.balance.map((balance) => (
              <div key={balance.leaveType} className="border border-gray-200 rounded-lg p-4">
                <p className="font-semibold text-gray-900">{balance.leaveType}</p>
                <div className="mt-3 space-y-1 text-sm">
                  <p className="text-gray-600">Total: {balance.totalDays} days</p>
                  <p className="text-gray-600">Used: {balance.usedDays} days</p>
                  <p className="font-semibold text-blue-600">Remaining: {balance.remainingDays} days</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Leave Request Form */}
      {!showForm && (
        <Button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Leave Request
        </Button>
      )}

      {showForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Submit Leave Request</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
              <select
                value={formData.leaveType}
                onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="Annual">Annual Leave</option>
                <option value="Sick">Sick Leave</option>
                <option value="Casual">Casual Leave</option>
                <option value="Maternity">Maternity Leave</option>
              </select>
              {formErrors.leaveType && (
                <p className="text-sm text-red-600 mt-1">{formErrors.leaveType}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                />
                {formErrors.startDate && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.startDate}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                />
                {formErrors.endDate && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.endDate}</p>
                )}
              </div>
            </div>

            {formData.startDate && formData.endDate && (
              <p className="text-sm text-gray-600">
                Duration: {calculateDays(formData.startDate, formData.endDate)} days
              </p>
            )}

            {formErrors.dateRange && (
              <p className="text-sm text-red-600">{formErrors.dateRange}</p>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                placeholder="Enter reason for leave"
              />
              {formErrors.reason && (
                <p className="text-sm text-red-600 mt-1">{formErrors.reason}</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setFormData({ leaveType: '', startDate: '', endDate: '', reason: '' })
                  setFormErrors({})
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Leave Requests List */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Leave Requests</h2>

        {/* Status Filter */}
        <div className="mb-4 overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
          <div className="flex gap-2 min-w-max">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <p className="text-gray-600 text-center py-4">No leave requests</p>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{request.leaveType}</p>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {request.startDate} to {request.endDate}
                    </p>
                    <p className="text-sm text-gray-600">Reason: {request.reason}</p>
                    <p className="text-xs text-gray-500 mt-2">Submitted: {request.createdAt}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
