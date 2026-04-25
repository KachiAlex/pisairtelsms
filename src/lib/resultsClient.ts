// Results API client for fetching student scores and attendance

export interface StudentScore {
  id: string
  studentId: string
  subject: string
  academicSession: string
  term: string
  caScore: number
  examScore: number
  totalScore: number
  attendancePercentage: number
  class: string
  createdAt: string
  updatedAt: string
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

export async function fetchScores(
  studentId?: string,
  academicSession?: string,
  term?: string,
  className?: string
): Promise<StudentScore[]> {
  const params = new URLSearchParams()
  if (studentId) params.set('studentId', studentId)
  if (academicSession) params.set('academicSession', academicSession)
  if (term) params.set('term', term)
  if (className) params.set('class', className)

  const url = `/api/tenant/results${params.toString() ? `?${params.toString()}` : ''}`
  const response = await fetch(url)
  const result = await parseResponse<StudentScore[]>(response)
  return result.data ?? []
}
