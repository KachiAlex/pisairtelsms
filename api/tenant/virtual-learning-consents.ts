import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireAuth } from '../_lib/auth-middleware.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireAuth(req, res)
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  // Parent tokens carry parentId (not userId) — normalize so 'system' is never stored
  const userId = decoded.userId || decoded.parentId || decoded.staffId || decoded.studentId || decoded.sub || 'system'
  const userRole = decoded.role

  try {
    if (req.method === 'GET') {
      const { studentId } = req.query
      let result
      if (userRole === 'parent') {
        // Parents see consents for their own children only
        result = await sql`
          SELECT c.* FROM virtual_learning_consents c
          JOIN parent_students ps ON ps.student_id = c.student_id
            AND ps.parent_id = ${userId} AND ps.tenant_id = ${tenantId}
          WHERE c.tenant_id = ${tenantId}
          ORDER BY c.created_at DESC
        `
      } else if (studentId && (userRole === 'staff' || userRole === 'tenant_admin')) {
        result = await sql`
          SELECT * FROM virtual_learning_consents
          WHERE student_id = ${studentId as string} AND tenant_id = ${tenantId}
          ORDER BY created_at DESC
        `
      } else if (studentId && userRole === 'student' && studentId === (decoded.studentId || userId)) {
        // Students may read only their own consent record
        result = await sql`
          SELECT * FROM virtual_learning_consents
          WHERE student_id = ${studentId as string} AND tenant_id = ${tenantId}
          ORDER BY created_at DESC
        `
      } else if (userRole === 'tenant_admin') {
        result = await sql`
          SELECT * FROM virtual_learning_consents
          WHERE tenant_id = ${tenantId}
          ORDER BY created_at DESC
        `
      } else {
        return res.status(403).json({ error: 'Not authorized' })
      }
      return res.status(200).json({ data: result.rows })
    }

    if (req.method === 'POST') {
      const { studentId, consentType, status, notes } = req.body || {}
      if (!studentId || !consentType || !status) {
        return res.status(400).json({ error: 'studentId, consentType, and status are required' })
      }
      // Only parents or admins can set consent
      if (userRole !== 'parent' && userRole !== 'tenant_admin') {
        return res.status(403).json({ error: 'Only parents or admins can set consent' })
      }

      // Verify the student exists in this tenant
      const student = await sql`
        SELECT id FROM students WHERE id::text = ${studentId as string} AND tenant_id = ${tenantId}
      `
      if (!student.rows[0]) {
        return res.status(404).json({ error: 'Student not found' })
      }

      // Parents may only set consent for their own children
      if (userRole === 'parent') {
        const link = await sql`
          SELECT 1 FROM parent_students
          WHERE parent_id = ${userId} AND student_id = ${studentId as string} AND tenant_id = ${tenantId}
        `
        if (!link.rows[0]) {
          return res.status(403).json({ error: 'You can only set consent for your own children' })
        }
      }

      const parentId = userRole === 'parent' ? userId : req.body.parentId

      const result = await sql`
        INSERT INTO virtual_learning_consents (tenant_id, student_id, parent_id, consent_type, status, granted_at, denied_at, notes)
        VALUES (${tenantId}, ${studentId}, ${parentId}, ${consentType}, ${status},
          ${status === 'granted' ? new Date().toISOString() : null},
          ${status === 'denied' ? new Date().toISOString() : null},
          ${notes || null})
        ON CONFLICT (student_id, consent_type)
        DO UPDATE SET
          status = EXCLUDED.status,
          granted_at = CASE WHEN EXCLUDED.status = 'granted' THEN NOW() ELSE virtual_learning_consents.granted_at END,
          denied_at = CASE WHEN EXCLUDED.status = 'denied' THEN NOW() ELSE virtual_learning_consents.denied_at END,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING *
      `
      return res.status(200).json({ data: result.rows[0] })
    }

    res.setHeader('Allow', 'GET,POST')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('[virtual-learning-consents]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}
