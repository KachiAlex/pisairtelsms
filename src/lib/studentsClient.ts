export interface Student {
  id: string
  admissionNo: string
  name: string
  class: string
  arm: string
  gender: string
  status: 'Active' | 'Suspended' | 'Graduated'
  guardian: string
  phone: string
  created_at?: string
  updated_at?: string
}

export interface StudentPayload {
  admissionNo: string
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
  const response = await fetch('/api/tenant/students', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...studentData }),
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
