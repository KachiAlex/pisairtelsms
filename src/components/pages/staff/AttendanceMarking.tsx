import React, { useEffect, useState } from 'react'
import { AlertCircle, Check, X } from 'lucide-react'
import { Button } from '../../ui/button'

interface ClassInfo {
  id: string
  name: string
  arm: string
  studentCount: number
}

interface StudentAttendanceRecord {
  id: string
  studentId: string
  name: string
  admissionNumber: string
  currentStatus: 'present' | 'absent' | 'late' | null
}

export function AttendanceMarking() {
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [students, setStudents] = useState<StudentAttendanceRecord[]>([])
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const auth = localStorage.getItem('auth')
  const token = auth ? JSON.parse(auth).token : null

  // Fetch classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setIsLoading(true)
        setError(null)

        if (!token) {
          setError('Not authenticated')
          return
        }

        const response = await fetch('/api/staff/classes', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch classes')
        }

        const data = await response.json()
        setClasses(data.classes || [])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        setError(message)
        console.error('Error fetching classes:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchClasses()
  }, [token])

  // Fetch students when class and date are selected
  useEffect(() => {
    if (!selectedClass || !selectedDate) return

    const fetchStudents = async () => {
      try {
        setIsLoading(true)
        setError(null)
        setAttendance({})

        if (!token) {
          setError('Not authenticated')
          return
        }

        const response = await fetch(
          `/api/staff/attendance?classId=${selectedClass}&date=${selectedDate}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch student list')
        }

        const data = await response.json()
        setStudents(data.students || [])

        // Initialize attendance with current status
        const initialAttendance: Record<string, 'present' | 'absent' | 'late'> = {}
        data.students.forEach((student: StudentAttendanceRecord) => {
          if (student.currentStatus) {
            initialAttendance[student.studentId] = student.currentStatus
          }
        })
        setAttendance(initialAttendance)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        setError(message)
        console.error('Error fetching students:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStudents()
  }, [selectedClass, selectedDate, token])

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }))
  }

  const handleSubmit = async () => {
    if (!selectedClass || !selectedDate) {
      setError('Please select a class and date')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      setSuccess(null)

      if (!token) {
        setError('Not authenticated')
        return
      }

      const records = Object.entries(attendance).map(([studentId, status]) => ({
        studentId,
        status,
      }))

      const response = await fetch('/api/staff/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          classId: selectedClass,
          date: selectedDate,
          records,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save attendance')
      }

      setSuccess('Attendance saved successfully')
      setAttendance({})
      setSelectedClass('')
      setSelectedDate('')
      setStudents([])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      console.error('Error saving attendance:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get max date (today)
  const today = new Date().toISOString().split('T')[0]

  if (isLoading && classes.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-12 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-96 animate-pulse rounded-lg bg-gray-200" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800">{error}</p>
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

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Class and Date Selection */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Class and Date</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select a class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} {cls.arm}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={today}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Student List */}
      {students.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Mark Attendance</h2>
          <div className="space-y-3">
            {students.map((student) => (
              <div key={student.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{student.name}</p>
                    <p className="text-sm text-gray-600">{student.admissionNumber}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusChange(student.studentId, 'present')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        attendance[student.studentId] === 'present'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <Check className="h-4 w-4 inline mr-1" />
                      Present
                    </button>
                    <button
                      onClick={() => handleStatusChange(student.studentId, 'late')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        attendance[student.studentId] === 'late'
                          ? 'bg-amber-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Late
                    </button>
                    <button
                      onClick={() => handleStatusChange(student.studentId, 'absent')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        attendance[student.studentId] === 'absent'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <X className="h-4 w-4 inline mr-1" />
                      Absent
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || Object.keys(attendance).length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? 'Saving...' : 'Save Attendance'}
            </Button>
          </div>
        </div>
      )}

      {selectedClass && selectedDate && students.length === 0 && !isLoading && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-gray-600">No students found for this class</p>
        </div>
      )}
    </div>
  )
}
