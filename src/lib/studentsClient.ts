// Re-export canonical Student type from shared types
export type { Student } from '../types'
import type { Student } from '../types'

export interface StudentPayload {
  admissionNo?: string
  name: string
  class: string
  arm: string
  gender: string
  status: 'Active' | 'Suspended' | 'Graduated'
  guardian: string
  phone: string
}

interface ApiResponse<T> {
  data?: T
  error?: string
}

async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const data = (await response.json().catch(() => ({}))) as ApiResponse<T>
  if (!response.ok) {
    const message = typeof data.error === 'string' ? data.error : 'Request failed. Please try again.'
    throw new Error(message)
  }
  return data
}

export async function fetchStudents(): Promise<Student[]> {
  const response = await fetch('/api/tenant/students')
  const result = await parseResponse<Student[]>(response)
  return result.data ?? []
}

export async function createStudent(studentData: StudentPayload): Promise<Student> {
  const response = await fetch('/api/tenant/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student: studentData }),
  })
  const result = await parseResponse<Student>(response)
  if (!result.data) {
    throw new Error('Unable to create student.')
  }
  return result.data
}

export async function createStudents(studentsData: StudentPayload[]): Promise<Student[]> {
  const response = await fetch('/api/tenant/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ students: studentsData }),
  })
  const result = await parseResponse<Student[]>(response)
  if (!result.data) {
    throw new Error('Unable to create students.')
  }
  return result.data
}

export async function updateStudent(id: string, studentData: Partial<StudentPayload>): Promise<Student> {
  const response = await fetch(`/api/tenant/students?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(studentData),
  })
  const result = await parseResponse<Student>(response)
  if (!result.data) {
    throw new Error('Unable to update student.')
  }
  return result.data
}

export async function deleteStudent(id: string): Promise<void> {
  const response = await fetch(`/api/tenant/students?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  await parseResponse<void>(response)
}

/**
 * Export students to CSV format
 */
export function exportStudentsToCSV(students: Student[]): void {
  if (students.length === 0) {
    alert('No students to export')
    return
  }

  // CSV headers
  const headers = ['Admission No', 'Name', 'Class', 'Arm', 'Gender', 'Guardian', 'Phone', 'Status']
  
  // CSV rows
  const rows = students.map(s => [
    s.admissionNo,
    s.name,
    s.class,
    s.arm,
    s.gender,
    s.guardian,
    s.phone,
    s.status,
  ])

  // Escape CSV values
  const escapeCsvValue = (value: string) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  // Build CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(escapeCsvValue).join(',')),
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `students_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
