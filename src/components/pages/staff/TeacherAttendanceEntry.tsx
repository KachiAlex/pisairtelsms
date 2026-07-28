import React, { useEffect, useState, useCallback } from 'react'
import {
  AlertCircle,
  Check,
  X,
  Clock,
  ChevronDown,
  Search,
  CheckSquare,
  Square,
  Loader2,
} from 'lucide-react'
import { Button } from '../../ui/button'
import { useToast } from '../../ui/use-toast'

interface Student {
  id: string
  studentId: string
  name: string
  admissionNumber: string
}

interface AttendanceRecord {
  studentId: string
  status: 'present' | 'absent' | 'late'
  absenceReasonId?: string
}

interface AbsenceReason {
  id: string
  reasonName: string
}

interface ConfirmationData {
  date: string
  totalStudents: number
  presentCount: number
  absentCount: number
  lateCount: number
  records: Array<{
    studentId: string
    name: string
    status: 'present' | 'absent' | 'late'
    absenceReason?: string
  }>
}

export function TeacherAttendanceEntry() {
  // State management
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({})
  const [absenceReasons, setAbsenceReasons] = useState<Record<string, string>>({})
  const [absenceReasonsList, setAbsenceReasonsList] = useState<AbsenceReason[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'id'>('name')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null)
  const [expandedReasonStudent, setExpandedReasonStudent] = useState<string | null>(null)
  const [currentClassName, setCurrentClassName] = useState<string>('Homeroom')

  const { toast } = useToast()

  const auth = localStorage.getItem('auth')
  const token = auth ? JSON.parse(auth).token : null
  const tenantId = auth ? JSON.parse(auth).tenantId || 'default-tenant' : 'default-tenant'
  const userId = auth ? JSON.parse(auth).userId || '' : ''

  // Get max date (today)
  const today = new Date().toISOString().split('T')[0]

  // Fetch students and absence reasons on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!token) {
          setError('Not authenticated')
          return
        }

        // Fetch teacher's homeroom students
        const response = await fetch('/api/staff/classes', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch classes')
        }

        const classesData = await response.json()
        const classes = classesData.classes || []

        if (classes.length === 0) {
          setError('No classes assigned to you')
          return
        }

        // Fetch students from first class (homeroom)
        const firstClass = classes[0]
        setCurrentClassName(firstClass.name)
        const studentsResponse = await fetch(
          `/api/staff/classes/${firstClass.id}/students`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (!studentsResponse.ok) {
          throw new Error('Failed to fetch students')
        }

        const studentsData = await studentsResponse.json()
        const fetchedStudents = studentsData.students || []

        setStudents(fetchedStudents)

        // Initialize attendance records
        const initialAttendance: Record<string, AttendanceRecord> = {}
        fetchedStudents.forEach((student: Student) => {
          initialAttendance[student.studentId] = {
            studentId: student.studentId,
            status: 'present',
          }
        })
        setAttendance(initialAttendance)

        // Fetch absence reasons
        const reasonsResponse = await fetch('/api/tenant/absence-reasons', {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-tenant-id': tenantId,
          },
        })

        if (reasonsResponse.ok) {
          const reasonsData = await reasonsResponse.json()
          setAbsenceReasonsList(reasonsData.data || [])
        } else {
          console.warn('Failed to fetch absence reasons, using empty list')
          setAbsenceReasonsList([])
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        setError(message)
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [token, tenantId])

  // Filter and sort students
  const filteredStudents = students
    .filter(
      (student) =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      }
      return a.studentId.localeCompare(b.studentId)
    })

  // Handle status change
  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
        absenceReasonId: status === 'absent' ? prev[studentId]?.absenceReasonId : undefined,
      },
    }))
  }

  // Handle absence reason change
  const handleAbsenceReasonChange = (studentId: string, reasonId: string) => {
    setAbsenceReasons((prev) => ({
      ...prev,
      [studentId]: reasonId,
    }))
    setAttendance((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        absenceReasonId: reasonId,
      },
    }))
  }

  // Get reason name by ID
  const getReasonName = (reasonId: string): string | undefined => {
    return absenceReasonsList.find((r) => r.id === reasonId)?.reasonName
  }

  // Bulk actions
  const handleMarkAllPresent = () => {
    const updated: Record<string, AttendanceRecord> = {}
    students.forEach((student) => {
      updated[student.studentId] = {
        studentId: student.studentId,
        status: 'present',
      }
    })
    setAttendance(updated)
    toast({
      title: 'Bulk Action',
      description: `Marked ${students.length} students as present`,
    })
  }

  const handleMarkAllAbsent = () => {
    const updated: Record<string, AttendanceRecord> = {}
    students.forEach((student) => {
      updated[student.studentId] = {
        studentId: student.studentId,
        status: 'absent',
      }
    })
    setAttendance(updated)
    toast({
      title: 'Bulk Action',
      description: `Marked ${students.length} students as absent`,
    })
  }

  const handleClearAll = () => {
    const updated: Record<string, AttendanceRecord> = {}
    students.forEach((student) => {
      updated[student.studentId] = {
        studentId: student.studentId,
        status: 'present',
      }
    })
    setAttendance(updated)
    setAbsenceReasons({})
    toast({
      title: 'Cleared',
      description: 'All attendance records have been reset',
    })
  }

  // Prepare confirmation data
  const prepareConfirmation = () => {
    const presentCount = Object.values(attendance).filter((r) => r.status === 'present').length
    const absentCount = Object.values(attendance).filter((r) => r.status === 'absent').length
    const lateCount = Object.values(attendance).filter((r) => r.status === 'late').length

    const records = students.map((student) => {
      const record = attendance[student.studentId]
      const reasonId = record?.absenceReasonId
      const reason = reasonId ? getReasonName(reasonId) : undefined

      return {
        studentId: student.studentId,
        name: student.name,
        status: record?.status || 'present',
        absenceReason: reason,
      }
    })

    const confirmation: ConfirmationData = {
      date: selectedDate,
      totalStudents: students.length,
      presentCount,
      absentCount,
      lateCount,
      records,
    }

    setConfirmationData(confirmation)
    setShowConfirmation(true)
  }

  // Submit attendance
  const handleSubmit = async () => {
    if (!confirmationData) return

    try {
      setSubmitting(true)
      setError(null)

      if (!token) {
        setError('Not authenticated')
        return
      }

      const month = new Date().getMonth() + 1
      const term = month >= 9 || month <= 12 ? '1' : month <= 4 ? '2' : '3'
      const academicYear = month >= 9
        ? `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`
        : `${new Date().getFullYear() - 1}/${new Date().getFullYear()}`

      const records = confirmationData.records.map((record) => ({
        studentId: record.studentId,
        class: currentClassName,
        date: selectedDate,
        status: record.status,
        absenceReasonId: record.absenceReason
          ? absenceReasonsList.find((r) => r.reasonName === record.absenceReason)?.id
          : undefined,
        academicSession: academicYear,
        term,
      }))

      const response = await fetch('/api/tenant/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenantId,
          'x-user-id': userId,
        },
        body: JSON.stringify({ records }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save attendance')
      }

      const result = await response.json()

      setSuccess(
        `Successfully saved ${result.data.count} attendance records for ${selectedDate}`
      )
      toast({
        title: 'Success',
        description: `${result.data.count} attendance records saved`,
      })

      // Reset form
      setShowConfirmation(false)
      setConfirmationData(null)
      const initialAttendance: Record<string, AttendanceRecord> = {}
      students.forEach((student) => {
        initialAttendance[student.studentId] = {
          studentId: student.studentId,
          status: 'present',
        }
      })
      setAttendance(initialAttendance)
      setAbsenceReasons({})

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
      console.error('Error saving attendance:', err)
    } finally {
      setSubmitting(false)
    }
  }

  // Get status color
  const getStatusColor = (status: 'present' | 'absent' | 'late') => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'late':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    }
  }

  const getStatusButtonColor = (status: 'present' | 'absent' | 'late', isSelected: boolean) => {
    if (!isSelected) {
      return 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }
    switch (status) {
      case 'present':
        return 'bg-green-600 text-white'
      case 'absent':
        return 'bg-red-600 text-white'
      case 'late':
        return 'bg-yellow-600 text-white'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-96 animate-pulse rounded-lg bg-gray-200" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Error</p>
              <p className="text-sm text-red-800 mt-1">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-4">
            <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">Success</p>
              <p className="text-sm text-green-800 mt-1">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Date Selection */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendance Date</h2>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={today}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              aria-label="Attendance date"
            />
          </div>
          <div className="text-sm text-gray-600">
            <p className="font-medium">Total Students: {students.length}</p>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Bulk Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleMarkAllPresent}
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={submitting}
          >
            <Check className="h-4 w-4 mr-2" />
            Mark All Present
          </Button>
          <Button
            onClick={handleMarkAllAbsent}
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={submitting}
          >
            <X className="h-4 w-4 mr-2" />
            Mark All Absent
          </Button>
          <Button
            onClick={handleClearAll}
            variant="outline"
            disabled={submitting}
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Students
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 text-gray-900 focus:border-blue-500 focus:outline-none"
                aria-label="Search students"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'id')}
              className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              aria-label="Sort students by"
            >
              <option value="name">Name</option>
              <option value="id">ID</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student List */}
      {filteredStudents.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Mark Attendance ({filteredStudents.length} students)
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredStudents.map((student) => {
              const record = attendance[student.studentId]
              const status = record?.status || 'present'
              const reasonId = record?.absenceReasonId
              const reason = reasonId
                ? absenceReasonsList.find((r) => r.id === reasonId)?.reasonName
                : undefined

              return (
                <div
                  key={student.studentId}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{student.name}</p>
                      <p className="text-sm text-gray-600">{student.admissionNumber}</p>
                    </div>

                    {/* Status Buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleStatusChange(student.studentId, 'present')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${getStatusButtonColor(
                          'present',
                          status === 'present'
                        )}`}
                        title="Mark as present"
                        aria-label={`Mark ${student.name} as present`}
                      >
                        <Check className="h-4 w-4" />
                        <span className="hidden sm:inline">Present</span>
                      </button>
                      <button
                        onClick={() => handleStatusChange(student.studentId, 'late')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${getStatusButtonColor(
                          'late',
                          status === 'late'
                        )}`}
                        title="Mark as late"
                        aria-label={`Mark ${student.name} as late`}
                      >
                        <Clock className="h-4 w-4" />
                        <span className="hidden sm:inline">Late</span>
                      </button>
                      <button
                        onClick={() => handleStatusChange(student.studentId, 'absent')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${getStatusButtonColor(
                          'absent',
                          status === 'absent'
                        )}`}
                        title="Mark as absent"
                        aria-label={`Mark ${student.name} as absent`}
                      >
                        <X className="h-4 w-4" />
                        <span className="hidden sm:inline">Absent</span>
                      </button>
                    </div>

                    {/* Status Badge */}
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </div>
                  </div>

                  {/* Absence Reason Dropdown */}
                  {status === 'absent' && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <button
                        onClick={() =>
                          setExpandedReasonStudent(
                            expandedReasonStudent === student.studentId ? null : student.studentId
                          )
                        }
                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            expandedReasonStudent === student.studentId ? 'rotate-180' : ''
                          }`}
                        />
                        {reason ? `Reason: ${reason}` : 'Select absence reason (optional)'}
                      </button>

                      {expandedReasonStudent === student.studentId && (
                        <div className="mt-2 space-y-2">
                          {absenceReasonsList.length > 0 ? (
                            absenceReasonsList.map((r) => (
                              <button
                                key={r.id}
                                onClick={() => {
                                  handleAbsenceReasonChange(student.studentId, r.id)
                                  setExpandedReasonStudent(null)
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                  reasonId === r.id
                                    ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {r.reasonName}
                              </button>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 px-3 py-2">
                              No absence reasons available
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Submit Button */}
          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                const initialAttendance: Record<string, AttendanceRecord> = {}
                students.forEach((student) => {
                  initialAttendance[student.studentId] = {
                    studentId: student.studentId,
                    status: 'present',
                  }
                })
                setAttendance(initialAttendance)
                setAbsenceReasons({})
              }}
              disabled={submitting}
            >
              Reset
            </Button>
            <Button
              onClick={prepareConfirmation}
              disabled={submitting || filteredStudents.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Review & Submit'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmation && confirmationData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Attendance Submission
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Please review the attendance records before submitting
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-xs text-blue-600 font-medium">Date</p>
                  <p className="text-sm font-semibold text-blue-900 mt-1">
                    {new Date(confirmationData.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 p-3">
                  <p className="text-xs text-green-600 font-medium">Present</p>
                  <p className="text-sm font-semibold text-green-900 mt-1">
                    {confirmationData.presentCount}
                  </p>
                </div>
                <div className="rounded-lg bg-red-50 p-3">
                  <p className="text-xs text-red-600 font-medium">Absent</p>
                  <p className="text-sm font-semibold text-red-900 mt-1">
                    {confirmationData.absentCount}
                  </p>
                </div>
                <div className="rounded-lg bg-yellow-50 p-3">
                  <p className="text-xs text-yellow-600 font-medium">Late</p>
                  <p className="text-sm font-semibold text-yellow-900 mt-1">
                    {confirmationData.lateCount}
                  </p>
                </div>
              </div>

              {/* Student List */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">Student Records:</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {confirmationData.records.map((record) => (
                    <div
                      key={record.studentId}
                      className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded"
                    >
                      <span className="text-gray-900">{record.name}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                            record.status
                          )}`}
                        >
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </span>
                        {record.absenceReason && (
                          <span className="text-xs text-gray-600">
                            ({record.absenceReason})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmation(false)
                  setConfirmationData(null)
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Confirm & Submit'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {students.length === 0 && !loading && !error && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-gray-600">No students found in your homeroom</p>
        </div>
      )}
    </div>
  )
}
