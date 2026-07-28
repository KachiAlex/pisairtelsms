import React, { useEffect, useState } from 'react'
import { AlertCircle, ChevronDown } from 'lucide-react'
import { Button } from '../../ui/button'

interface ClassInfo {
  id: string
  name: string
  arm: string
  studentCount: number
}

interface StudentProfile {
  id: string
  name: string
  admissionNumber: string
  gender: string
  class: string
  arm: string
  email?: string
  phone?: string
}

interface ClassListsData {
  classes: ClassInfo[]
}

export function ClassLists() {
  const [data, setData] = useState<ClassListsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null)
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null)
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)

  const auth = localStorage.getItem('auth')
  const token = auth ? JSON.parse(auth).token : null

  // Fetch classes
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

        const classesData = await response.json()
        setData(classesData)
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

  // Fetch students when class is selected
  useEffect(() => {
    if (!selectedClass) {
      setStudents([])
      setSelectedStudent(null)
      return
    }

    const fetchStudents = async () => {
      try {
        setIsLoadingStudents(true)
        setError(null)

        if (!token) {
          setError('Not authenticated')
          return
        }

        const response = await fetch(`/api/staff/classes/${selectedClass.id}/students`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch students')
        }

        const studentsData = await response.json()
        setStudents(studentsData.students || [])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        setError(message)
        console.error('Error fetching students:', err)
      } finally {
        setIsLoadingStudents(false)
      }
    }

    fetchStudents()
  }, [selectedClass, token])

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
            <h3 className="font-semibold text-red-900">Error Loading Classes</h3>
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

  if (!data || data.classes.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-gray-600">No classes assigned</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Class List */}
        <div className="lg:col-span-1 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Classes</h2>
          <div className="space-y-2">
            {data.classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                  selectedClass?.id === cls.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <p className="font-semibold text-gray-900">
                  {cls.name} {cls.arm}
                </p>
                <p className="text-sm text-gray-600">{cls.studentCount} students</p>
              </button>
            ))}
          </div>
        </div>

        {/* Student List and Detail */}
        <div className="lg:col-span-2 space-y-6">
          {selectedClass ? (
            <>
              {/* Student List */}
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {selectedClass.name} {selectedClass.arm} - Student Roster
                </h2>

                {isLoadingStudents ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200" />
                    ))}
                  </div>
                ) : students.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">No students in this class</p>
                ) : (
                  <div className="space-y-2">
                    {students.map((student) => (
                      <button
                        key={student.id}
                        onClick={() => setSelectedStudent(student)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                          selectedStudent?.id === student.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <p className="font-semibold text-gray-900">{student.name}</p>
                        <p className="text-sm text-gray-600">{student.admissionNumber}</p>
                        <p className="text-xs text-gray-500">Gender: {student.gender}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Student Detail */}
              {selectedStudent && (
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Profile</h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Name</p>
                      <p className="text-gray-900">{selectedStudent.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Admission Number</p>
                      <p className="text-gray-900">{selectedStudent.admissionNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Gender</p>
                      <p className="text-gray-900">{selectedStudent.gender}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Class</p>
                      <p className="text-gray-900">
                        {selectedStudent.class} {selectedStudent.arm}
                      </p>
                    </div>
                    {selectedStudent.email && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">Email</p>
                        <p className="text-gray-900">{selectedStudent.email}</p>
                      </div>
                    )}
                    {selectedStudent.phone && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">Phone</p>
                        <p className="text-gray-900">{selectedStudent.phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
              <p className="text-gray-600">Select a class to view students</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
