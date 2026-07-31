import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole, requireAuth } from '../_lib/auth-middleware.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Students can submit; staff/tenant_admin can grade
  const decoded = await requireAuth(req, res)
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const userId = decoded.userId || decoded.sub || 'system'
  const userRole = decoded.role

  try {
    // GET - list submissions for an assignment (staff) or own submissions (student)
    if (req.method === 'GET') {
      const { assignmentId, studentId } = req.query
      if (!assignmentId) {
        return res.status(400).json({ error: 'assignmentId query param is required' })
      }
      let result
      if (userRole === 'student') {
        result = await sql`
          SELECT * FROM submissions
          WHERE assignment_id = ${assignmentId as string} AND student_id = ${userId} AND tenant_id = ${tenantId}
          ORDER BY submitted_at DESC
        `
      } else {
        result = await sql`
          SELECT s.*, st.name as student_name
          FROM submissions s
          LEFT JOIN students st ON st.id = s.student_id
          WHERE s.assignment_id = ${assignmentId as string} AND s.tenant_id = ${tenantId}
          ORDER BY s.submitted_at DESC
        `
      }
      return res.status(200).json({ data: result.rows })
    }

    // POST - submit assignment (students only)
    if (req.method === 'POST') {
      if (userRole !== 'student') {
        return res.status(403).json({ error: 'Only students can submit assignments' })
      }
      const { assignmentId, content, fileUrls } = req.body || {}
      if (!assignmentId) {
        return res.status(400).json({ error: 'assignmentId is required' })
      }
      // Check if already submitted
      const existing = await sql`
        SELECT id, status FROM submissions
        WHERE assignment_id = ${assignmentId} AND student_id = ${userId}
      `
      if (existing.rows[0] && existing.rows[0].status === 'submitted') {
        return res.status(409).json({ error: 'You have already submitted this assignment' })
      }
      // Check if late
      const assignment = await sql`
        SELECT due_date, allow_late_submission FROM assignments WHERE id = ${assignmentId}
      `
      if (!assignment.rows[0]) {
        return res.status(404).json({ error: 'Assignment not found' })
      }
      const isLate = new Date() > new Date(assignment.rows[0].due_date)
      if (isLate && !assignment.rows[0].allow_late_submission) {
        return res.status(400).json({ error: 'Late submissions are not allowed for this assignment' })
      }
      // Upsert submission
      const result = await sql`
        INSERT INTO submissions (assignment_id, student_id, tenant_id, content, file_urls, is_late, status)
        VALUES (${assignmentId}, ${userId}, ${tenantId}, ${content || null}, ${fileUrls || null}, ${isLate}, 'submitted')
        ON CONFLICT (assignment_id, student_id)
        DO UPDATE SET content = EXCLUDED.content, file_urls = EXCLUDED.file_urls, is_late = EXCLUDED.is_late, status = 'resubmitted', submitted_at = NOW(), updated_at = NOW()
        RETURNING *
      `
      return res.status(201).json({ data: result.rows[0] })
    }

    // PUT - grade submission (staff/tenant_admin only)
    if (req.method === 'PUT') {
      if (userRole !== 'staff' && userRole !== 'tenant_admin') {
        return res.status(403).json({ error: 'Only staff can grade submissions' })
      }
      const { id, grade, feedback, status } = req.body || {}
      if (!id) {
        return res.status(400).json({ error: 'id is required' })
      }
      const result = await sql`
        UPDATE submissions SET
          grade = ${grade !== undefined ? grade : null},
          feedback = ${feedback || null},
          status = COALESCE(${status || null}, status),
          graded_by = ${userId},
          graded_at = NOW(),
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Submission not found' })
      }
      return res.status(200).json({ data: result.rows[0] })
    }

    res.setHeader('Allow', 'GET,POST,PUT')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('[submissions]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}
