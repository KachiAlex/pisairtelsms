import { randomUUID } from 'crypto'
import { sql } from './db.js'

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

export interface DetectedConflict {
  type: 'teacher_double_booking' | 'unassigned_subject' | 'empty_schedule'
  severity: ConflictSeverity
  entityType: 'class' | 'teacher'
  entityId: string
  description: string
}

// Derive live conflicts from the schedule entries + allocation matrix rather
// than the persisted timetable_conflicts table — always reflects current truth.
export async function detectConflicts(tenantId: string, termId?: string): Promise<DetectedConflict[]> {
  const conflicts: DetectedConflict[] = []
  try {
    // 1. Teacher double-booked: same teacher, same slot, same day, >1 class
    const doubleBooked = await sql`
      SELECT e.teacher_id, MAX(e.teacher_name) AS teacher_name,
             e.time_slot_id, MAX(t.name) AS slot_name,
             e.day_of_week,
             array_agg(DISTINCT COALESCE(c.name || COALESCE(' ' || NULLIF(c.arm, ''), ''), s.class_id::text)) AS class_names,
             COUNT(DISTINCT s.id) AS class_count
      FROM timetable_class_schedule_entries e
      JOIN timetable_class_schedules s ON s.id = e.schedule_id
      JOIN timetable_time_slots t ON t.id = e.time_slot_id
      LEFT JOIN classes c ON c.id::text = s.class_id::text
      WHERE s.tenant_id = ${tenantId}
        AND (${termId ?? null}::text IS NULL OR s.term_id = ${termId ?? null})
      GROUP BY e.teacher_id, e.time_slot_id, e.day_of_week
      HAVING COUNT(DISTINCT s.id) > 1
    `
    const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    for (const r of doubleBooked.rows) {
      conflicts.push({
        type: 'teacher_double_booking',
        severity: 'high',
        entityType: 'teacher',
        entityId: r.teacher_id,
        description: `${r.teacher_name} is booked in ${r.class_count} classes at ${r.slot_name} on ${DAY_NAMES[Number(r.day_of_week)] || 'day ' + r.day_of_week}: ${(r.class_names || []).join(', ')}`,
      })
    }

    // 2. Allocation rows with no teacher (Open coverage)
    const openAlloc = await sql`
      SELECT class, subject FROM teacher_allocation_slots
      WHERE tenant_id = ${tenantId} AND (coverage = 'Open' OR teacher IS NULL OR teacher = '')
      ORDER BY class, subject`
    for (const r of openAlloc.rows) {
      conflicts.push({
        type: 'unassigned_subject',
        severity: 'medium',
        entityType: 'class',
        entityId: r.class,
        description: `${r.class}: no teacher assigned for ${r.subject}`,
      })
    }

    // 3. Schedules in this term with zero entries
    const emptySchedules = await sql`
      SELECT s.id, COALESCE(c.name || COALESCE(' ' || NULLIF(c.arm, ''), ''), s.class_id::text) AS class_name
      FROM timetable_class_schedules s
      LEFT JOIN classes c ON c.id::text = s.class_id::text
      LEFT JOIN timetable_class_schedule_entries e ON e.schedule_id = s.id
      WHERE s.tenant_id = ${tenantId}
        AND (${termId ?? null}::text IS NULL OR s.term_id = ${termId ?? null})
      GROUP BY s.id, class_name
      HAVING COUNT(e.id) = 0`
    for (const r of emptySchedules.rows) {
      conflicts.push({
        type: 'empty_schedule',
        severity: 'low',
        entityType: 'class',
        entityId: r.id,
        description: `${r.class_name} has a timetable with no entries`,
      })
    }
  } catch (e) {
    console.error('detectConflicts error:', e)
  }
  return conflicts
}
