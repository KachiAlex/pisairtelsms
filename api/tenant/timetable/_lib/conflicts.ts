import { randomUUID } from 'crypto'
import { sql } from '@vercel/postgres'

export type ConflictSeverity = 'high' | 'medium' | 'low'
export type ConflictStatus = 'open' | 'resolved'

export interface Conflict {
  id: string
  tenantId: string
  conflictType: string
  entityType: 'class' | 'teacher' | 'exam'
  entityId: string
  description: string
  impact: string
  owner: string
  severity: ConflictSeverity
  status: ConflictStatus
  resolutionNotes?: string
  createdAt: string
  resolvedAt?: string
}

const ts = (r: any) => r instanceof Date ? r.toISOString() : (r ? String(r) : undefined)

function rowToConflict(r: any): Conflict {
  return { id: r.id, tenantId: r.tenant_id, conflictType: r.conflict_type, entityType: r.entity_type, entityId: r.entity_id, description: r.description, impact: r.impact, owner: r.owner, severity: r.severity, status: r.status, resolutionNotes: r.resolution_notes ?? undefined, createdAt: ts(r.created_at)!, resolvedAt: ts(r.resolved_at) }
}

export async function getConflicts(tenantId: string, status?: string, severity?: string, entityType?: string): Promise<Conflict[]> {
  try {
    const r = await sql`SELECT * FROM timetable_conflicts WHERE tenant_id = ${tenantId} ORDER BY CASE severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, created_at DESC`
    let conflicts = r.rows.map(rowToConflict)
    if (status) conflicts = conflicts.filter(c => c.status === status)
    if (severity) conflicts = conflicts.filter(c => c.severity === severity)
    if (entityType) conflicts = conflicts.filter(c => c.entityType === entityType)
    return conflicts
  } catch { return [] }
}

export async function resolveConflict(id: string, resolutionNotes: string): Promise<Conflict | null> {
  const result = await sql`UPDATE timetable_conflicts SET status = 'resolved', resolution_notes = ${resolutionNotes}, resolved_at = NOW() WHERE id = ${id} RETURNING *`
  return result.rows[0] ? rowToConflict(result.rows[0]) : null
}

export async function createConflict(tenantId: string, data: Omit<Conflict, 'id' | 'tenantId' | 'status' | 'createdAt'>): Promise<Conflict> {
  const id = randomUUID()
  const result = await sql`INSERT INTO timetable_conflicts (id, tenant_id, conflict_type, entity_type, entity_id, description, impact, owner, severity) VALUES (${id}, ${tenantId}, ${data.conflictType}, ${data.entityType}, ${data.entityId}, ${data.description}, ${data.impact}, ${data.owner}, ${data.severity}) RETURNING *`
  return rowToConflict(result.rows[0])
}

export async function getOpenConflictCount(tenantId: string): Promise<number> {
  try {
    const r = await sql`SELECT COUNT(*) as count FROM timetable_conflicts WHERE tenant_id = ${tenantId} AND status = 'open'`
    return parseInt(r.rows[0]?.count || '0')
  } catch { return 0 }
}
