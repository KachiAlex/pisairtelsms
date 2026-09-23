import { sql } from '../../_lib/sql.js'

/**
 * Authoritative parent-child access check against parent_students.
 * The JWT childrenIds claim goes stale when links are added or removed after
 * login, so the database is the source of truth for authorization.
 */
export async function verifyParentChildAccess(
  parentId: string | undefined | null,
  childId: string | undefined | null,
  tenantId: string,
): Promise<boolean> {
  if (!parentId || !childId) return false
  const r = await sql`
    SELECT 1 FROM parent_students
    WHERE parent_id = ${parentId} AND student_id = ${childId} AND tenant_id = ${tenantId}
    LIMIT 1
  `
  return r.rows.length > 0
}
