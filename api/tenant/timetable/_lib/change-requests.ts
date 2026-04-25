import { randomUUID } from 'crypto'

export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected' | 'applied'

export interface ChangeRequest {
  id: string
  tenantId: string
  requesterId: string
  requesterName: string
  entityType: string
  entityId: string
  changeDescription: string
  status: ChangeRequestStatus
  reviewerId?: string
  reviewComments?: string
  sla: string
  createdAt: string
  reviewedAt?: string
  appliedAt?: string
}

const store = new Map<string, ChangeRequest>()

function initMockData() {
  if (store.size > 0) return
  const tenantId = 'demo-tenant-001'
  const now = new Date().toISOString()

  const requests: ChangeRequest[] = [
    { id: 'rq-501', tenantId, requesterId: 'teacher-bello', requesterName: 'Mrs. Bello', entityType: 'class', entityId: 'JSS 1A', changeDescription: 'Swap Civic with History on Thursday', status: 'pending', sla: 'Due in 6 hrs', createdAt: now },
    { id: 'rq-493', tenantId, requesterId: 'teacher-johnson', requesterName: 'Mr. Johnson', entityType: 'class', entityId: 'JSS 2B', changeDescription: 'Add lab block for Biology Project', status: 'pending', sla: 'Due tomorrow', createdAt: now },
    { id: 'rq-489', tenantId, requesterId: 'sports-lead', requesterName: 'Sports Lead', entityType: 'class', entityId: 'SS 1C', changeDescription: 'Extend Friday advisory for trials', status: 'approved', sla: 'Due today', createdAt: now },
    { id: 'rq-610', tenantId, requesterId: 'exam-office', requesterName: 'Exam Office', entityType: 'exam', entityId: 'exam-1', changeDescription: 'Add extra CBT batch for SS 3', status: 'pending', sla: 'Due today', createdAt: now },
  ]
  for (const r of requests) store.set(r.id, r)
}

export function getChangeRequests(tenantId: string, status?: string): ChangeRequest[] {
  initMockData()
  let requests = Array.from(store.values()).filter(r => r.tenantId === tenantId)
  if (status) requests = requests.filter(r => r.status === status)
  return requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function createChangeRequest(tenantId: string, data: Omit<ChangeRequest, 'id' | 'tenantId' | 'status' | 'createdAt'>): ChangeRequest {
  initMockData()
  const now = new Date().toISOString()
  const request: ChangeRequest = { id: randomUUID(), tenantId, status: 'pending', createdAt: now, ...data }
  store.set(request.id, request)
  return request
}

export function updateChangeRequest(id: string, status: ChangeRequestStatus, reviewerId?: string, reviewComments?: string): ChangeRequest | null {
  initMockData()
  const request = store.get(id)
  if (!request) return null
  const now = new Date().toISOString()
  const updated: ChangeRequest = {
    ...request,
    status,
    reviewerId,
    reviewComments,
    reviewedAt: now,
    appliedAt: status === 'applied' ? now : request.appliedAt,
  }
  store.set(id, updated)
  return updated
}
