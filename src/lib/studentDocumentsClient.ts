export type StudentDocumentCategory = 'Academic' | 'Medical' | 'Finance' | 'Conduct'
export type StudentDocumentStatus = 'Pending review' | 'Escalated' | 'Awaiting upload'

export interface StudentDocument {
  student: string
  cohort: string
  category: StudentDocumentCategory
  doc: string
  owner: string
  status: StudentDocumentStatus
  aging: string
  fileType: string
  lastUpdated: string
  requirement: string
}

const DOCUMENTS_ENDPOINT = '/api/student-documents'

export async function fetchStudentDocuments(signal?: AbortSignal): Promise<StudentDocument[]> {
  const response = await fetch(DOCUMENTS_ENDPOINT, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch student documents: ${response.status}`)
  }

  const payload = await response.json()
  if (!Array.isArray(payload)) {
    throw new Error('Student documents response is not an array')
  }

  return payload as StudentDocument[]
}
