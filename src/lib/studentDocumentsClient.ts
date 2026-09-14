import { tenantApiGet, tenantApiFetch } from './tenantApi'

export type StudentDocumentCategory = 'Academic' | 'Medical' | 'Finance' | 'Conduct'
export type StudentDocumentStatus = 'Pending review' | 'Escalated' | 'Awaiting upload'

export interface StudentDocument {
  id: string
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
  const response = await tenantApiGet(DOCUMENTS_ENDPOINT)

  if (!response.ok) {
    throw new Error(`Failed to fetch student documents: ${response.status}`)
  }

  const payload = await response.json()
  if (!Array.isArray(payload)) {
    throw new Error('Student documents response is not an array')
  }

  return payload as StudentDocument[]
}

/**
 * Delete a student document record (tenant-scoped).
 */
export async function deleteStudentDocument(id: string): Promise<void> {
  const response = await tenantApiFetch(`${DOCUMENTS_ENDPOINT}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!response.ok && response.status !== 204) {
    const data = await response.json().catch(() => ({}))
    throw new Error(typeof data.error === 'string' ? data.error : 'Unable to delete student document.')
  }
}
