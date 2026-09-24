import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'

/**
 * /api/student/lesson-notes
 * GET ?session&term&subject? — approved lesson notes for the student's class.
 * Only admin-approved notes are visible; drafts/submitted/returned are not.
 * ?id= returns a single note with full content + attachment.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['student'])
  if (!decoded) return
  const studentId = decoded.studentId || decoded.userId
  const tenantId = decoded.tenantId || 'default-tenant'
  if (!studentId) return res.status(401).json({ error: 'Invalid token payload' })
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const stu = await sql`
      SELECT class FROM students
      WHERE id::text = ${studentId} AND tenant_id = ${tenantId} AND deleted_at IS NULL LIMIT 1`
    const studentClass = stu.rows[0]?.class
    if (!studentClass) return res.status(404).json({ error: 'Student class not found' })

    const q = req.query as Record<string, string | undefined>

    if (q.id) {
      const r = await sql`
        SELECT id::text, staff_name, subject, class, session, term, week, topic,
               title, content, link, attachment_name, attachment_data, taught_at
        FROM lesson_notes
        WHERE id = ${q.id} AND tenant_id = ${tenantId} AND status = 'approved'
          AND (class = ${studentClass} OR ${studentClass} LIKE class || ' %')
        LIMIT 1`
      if (!r.rows[0]) return res.status(404).json({ error: 'Note not found' })
      return res.status(200).json({ data: r.rows[0] })
    }

    const params: any[] = [tenantId, studentClass]
    let extra = ''
    if (q.session) { params.push(q.session); extra += ` AND session = $${params.length}` }
    if (q.term) { params.push(q.term); extra += ` AND term = $${params.length}` }
    if (q.subject) { params.push(q.subject); extra += ` AND subject = $${params.length}` }

    const rows = await sql.query(
      `SELECT id::text, staff_name, subject, session, term, week, topic, title,
              link, attachment_name, attachment_data IS NOT NULL AS has_attachment,
              taught_at, LEFT(content, 200) AS excerpt
       FROM lesson_notes
       WHERE tenant_id = $1 AND status = 'approved'
         AND (class = $2 OR $2 LIKE class || ' %')
         ${extra}
       ORDER BY subject, week ASC`, params)
    return res.status(200).json({ data: rows.rows })
  } catch (error) {
    console.error('Student lesson notes error:', error)
    return res.status(500).json({ error: 'Failed to load lesson notes' })
  }
}
