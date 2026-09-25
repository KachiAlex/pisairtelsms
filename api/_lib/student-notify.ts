import { sql } from './sql.js'

/**
 * Inserts student_notifications rows. Best-effort — callers should wrap in
 * try/catch or rely on the internal catch so notification failures never block
 * the primary operation.
 */
export async function notifyStudents(
  tenantId: string,
  studentIds: string[],
  n: { type: string; title: string; message: string; actionUrl?: string }
): Promise<void> {
  if (!studentIds.length) return
  try {
    await sql`
      INSERT INTO student_notifications (tenant_id, student_id, type, title, message, action_url)
      SELECT ${tenantId}, s_id, ${n.type}, ${n.title}, ${n.message}, ${n.actionUrl ?? null}
      FROM unnest(${studentIds}::text[]) AS s_id
    `
  } catch (err) {
    console.warn('notifyStudents failed:', err)
  }
}

/** Notify every active student in a class (used for new assignments/announcements). */
export async function notifyClassStudents(
  tenantId: string,
  className: string,
  n: { type: string; title: string; message: string; actionUrl?: string }
): Promise<void> {
  if (!className) return
  try {
    await sql`
      INSERT INTO student_notifications (tenant_id, student_id, type, title, message, action_url)
      SELECT ${tenantId}, id::text, ${n.type}, ${n.title}, ${n.message}, ${n.actionUrl ?? null}
      FROM students
      WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
        AND LOWER(class) = LOWER(${className})
    `
  } catch (err) {
    console.warn('notifyClassStudents failed:', err)
  }
}
