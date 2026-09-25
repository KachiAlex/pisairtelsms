import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'
import { requireCSRF } from '../_lib/csrf.js'
import { notifyStudents } from '../_lib/student-notify.js'

/**
 * /api/tenant/attendance-excuses — staff review queue for excuse requests
 * submitted by students/parents.
 *
 * GET ?status=pending|approved|rejected (default pending)
 * PUT { id, action: 'approve'|'reject', note? }
 *   approve → marks the day's attendance record 'excused' and notifies the
 *   student + linked parents.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return
  const tenantId = decoded.tenantId || 'default-tenant'
  const userId = decoded.staffId || decoded.userId || decoded.sub || 'unknown'

  try {
    if (req.method === 'GET') {
      const status = (req.query.status as string) || 'pending'
      const r = await sql`
        SELECT e.id, e.student_id, e.attendance_date::text, e.reason,
               e.submitted_by_role, e.submitted_by_name, e.status,
               e.review_note, e.created_at::text,
               s.name AS student_name, s.class AS student_class
        FROM attendance_excuse_requests e
        LEFT JOIN students s ON s.id::text = e.student_id AND s.tenant_id = e.tenant_id
        WHERE e.tenant_id = ${tenantId} AND e.status = ${status}
        ORDER BY e.created_at DESC LIMIT 200
      `
      return res.status(200).json({ data: r.rows })
    }

    if (req.method === 'PUT') {
      if (requireCSRF(req, res, userId)) return
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      const { id, action, note } = body
      if (!id || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: "id and action ('approve'|'reject') are required" })
      }

      const reviewer = (await sql`SELECT name FROM staff WHERE id = ${userId} AND tenant_id = ${tenantId} LIMIT 1`.catch(() => ({ rows: [] as any[] }))).rows[0]?.name || userId

      const updated = await sql`
        UPDATE attendance_excuse_requests SET
          status = ${action === 'approve' ? 'approved' : 'rejected'},
          reviewed_by = ${userId}, reviewed_by_name = ${reviewer},
          review_note = ${note || null}, reviewed_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'pending'
        RETURNING student_id, attendance_date::text AS attendance_date
      `
      if (!updated.rows[0]) {
        return res.status(404).json({ error: 'Request not found or already reviewed' })
      }
      const { student_id, attendance_date } = updated.rows[0]

      if (action === 'approve') {
        // Mark the attendance record excused (only if currently absent/late)
        await sql`
          UPDATE attendance_records SET status = 'excused'
          WHERE tenant_id = ${tenantId} AND student_id = ${student_id}
            AND date = ${attendance_date}::date AND status IN ('absent', 'late')
        `.catch(() => {})
      }

      const studentName = (await sql`SELECT name FROM students WHERE id::text = ${student_id} AND tenant_id = ${tenantId} LIMIT 1`.catch(() => ({ rows: [] as any[] }))).rows[0]?.name || 'Student'

      await notifyStudents(tenantId, [student_id], {
        type: 'attendance',
        title: `Absence excuse ${action === 'approve' ? 'approved' : 'rejected'}`,
        message: `Your excuse for ${attendance_date} was ${action === 'approve' ? 'approved' : 'rejected'}${note ? `: ${note}` : ''}.`,
        actionUrl: '/student/attendance',
      })

      // Notify linked parents too
      try {
        await sql`
          INSERT INTO parent_notifications (id, parent_id, student_id, type, title, message)
          SELECT gen_random_uuid()::text, ps.parent_id, ${student_id}, 'attendance',
                 ${'Absence excuse ' + (action === 'approve' ? 'approved' : 'rejected')},
                 ${'An excuse submitted for ' + studentName + ' (' + attendance_date + ') was ' + (action === 'approve' ? 'approved' : 'rejected') + '.'}
          FROM parent_students ps
          WHERE ps.student_id = ${student_id} AND ps.tenant_id = ${tenantId}
        `.catch(() => {})
      } catch { /* parent_notifications may not exist */ }

      return res.status(200).json({ success: true })
    }

    res.setHeader('Allow', 'GET,PUT')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Error in attendance excuses:', error)
    return res.status(500).json({ error: 'Failed to process excuse request' })
  }
}
