/**
 * Academic Structure Audit Helper
 * Logs create/update/delete operations on academic structure entities
 * (classes, subjects, departments, programs, milestones) for accountability.
 */

import { sql } from '../../_lib/sql.js'

export type AcademicEntityType = 'class' | 'subject' | 'department' | 'program' | 'milestone' | 'student'
export type AuditAction = 'insert' | 'update' | 'delete'

/**
 * Record an audit entry for an academic structure mutation.
 */
export async function auditAcademicChange(
  tenantId: string,
  entityType: AcademicEntityType,
  entityId: string | null,
  action: AuditAction,
  actorId: string,
  actorName: string,
  oldValues?: Record<string, any> | null,
  newValues?: Record<string, any> | null,
): Promise<void> {
  try {
    await sql`
      INSERT INTO academic_structure_audit
        (tenant_id, entity_type, entity_id, action, old_values, new_values, actor_id, actor_name)
      VALUES
        (${tenantId}, ${entityType}, ${entityId}, ${action},
         ${oldValues ? JSON.stringify(oldValues) : null},
         ${newValues ? JSON.stringify(newValues) : null},
         ${actorId}, ${actorName})
    `
  } catch (error) {
    // Audit failures should not block the primary operation.
    console.error('Failed to write academic structure audit:', error)
  }
}
