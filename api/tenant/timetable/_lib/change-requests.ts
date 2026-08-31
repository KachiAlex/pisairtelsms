import { randomUUID } from 'crypto'
import { sql } from './db.js'

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

const ts = (r: any) => r instanceof Date ? r.toISOString() : (r ? String(r) : undefined)

function rowToRequest(r: any): ChangeRequest {
  return { id: r.id, tenantId: r.tenant_id, requesterId: r.requester_id, requesterName: r.requester_name, entityType: r.entity_type ?? r.change_type, entityId: r.entity_id, changeDescription: r.reason, status: r.status, reviewerId: r.reviewed_by ?? undefined, sla: '', createdAt: ts(r.created_at)!, reviewedAt: ts(r.reviewed_at), appliedAt: ts(r.applied_at) }
}

export async function getChangeRequests(tenantId: string, status?: string): Promise<ChangeRequest[]> {
  try {
    const result = status
      ? await sql`SELECT * FROM timetable_change_requests WHERE tenant_id = ${tenantId} AND status = ${status} ORDER BY created_at DESC`
      : await sql`SELECT * FROM timetable_change_requests WHERE tenant_id = ${tenantId} ORDER BY created_at DESC`
    return result.rows.map(rowToRequest)
  } catch { return [] }
}

export async function createChangeRequest(tenantId: string, data: Omit<ChangeRequest, 'id' | 'tenantId' | 'status' | 'createdAt'>): Promise<ChangeRequest> {
  const id = randomUUID()
  const result = await sql`INSERT INTO timetable_change_requests (id, tenant_id, requester_id, requester_name, entity_id, change_type, reason) VALUES (${id}, ${tenantId}, ${data.requesterId}, ${data.requesterName}, ${data.entityId}, ${data.entityType}, ${data.changeDescription}) RETURNING *`
  return rowToRequest(result.rows[0])
}

export async function updateChangeRequest(id: string, status: ChangeRequestStatus, reviewerId?: string, reviewComments?: string): Promise<ChangeRequest | null> {
  const result = await sql`UPDATE timetable_change_requests SET status = ${status}, reviewed_by = COALESCE(${reviewerId ?? null}, reviewed_by), reviewed_at = NOW(), updated_at = NOW() WHERE id = ${id} RETURNING *`
  return result.rows[0] ? rowToRequest(result.rows[0]) : null
}
