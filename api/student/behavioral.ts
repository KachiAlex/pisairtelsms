import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'

/**
 * /api/student/behavioral — the student's own conduct record:
 * incidents, recognitions, and teacher comments. Same data parents see.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const decoded = await requireRole(req, res, ['student'])
    if (!decoded) return
    const studentId = decoded.studentId || decoded.userId
    const tenantId = decoded.tenantId || 'default-tenant'
    if (!studentId) return res.status(401).json({ error: 'Invalid token payload' })

    const [incidentRows, recognitionRows, commentRows] = await Promise.all([
      sql`
        SELECT bi.id, bi.date::text, bi.type, COALESCE(bi.description, '') AS description,
               bi.severity, COALESCE(bi.action_taken, '') AS action_taken,
               COALESCE(st.name, bi.reported_by, '') AS reported_by
        FROM behavioral_incidents bi
        LEFT JOIN staff st ON st.id = bi.reported_by
        WHERE bi.student_id = ${studentId} AND bi.tenant_id = ${tenantId}
        ORDER BY bi.date DESC
      `.catch(() => ({ rows: [] as any[] })),
      sql`
        SELECT br.id, br.date::text, br.type, COALESCE(br.description, '') AS description,
               COALESCE(st.name, br.awarded_by, '') AS awarded_by
        FROM behavioral_recognition br
        LEFT JOIN staff st ON st.id = br.awarded_by
        WHERE br.student_id = ${studentId} AND br.tenant_id = ${tenantId}
        ORDER BY br.date DESC
      `.catch(() => ({ rows: [] as any[] })),
      sql`
        SELECT tc.id, tc.date::text, tc.comment, COALESCE(tc.subject, '') AS subject,
               COALESCE(st.name, '') AS teacher
        FROM teacher_comments tc
        LEFT JOIN staff st ON st.id = tc.staff_id
        WHERE tc.student_id = ${studentId} AND tc.tenant_id = ${tenantId}
        ORDER BY tc.date DESC
      `.catch(() => ({ rows: [] as any[] })),
    ])

    return res.status(200).json({
      incidents: incidentRows.rows.map(r => ({
        id: r.id, date: r.date, type: r.type, description: r.description,
        severity: r.severity, actionTaken: r.action_taken, reportedBy: r.reported_by,
      })),
      recognitions: recognitionRows.rows.map(r => ({
        id: r.id, date: r.date, type: r.type, description: r.description, awardedBy: r.awarded_by,
      })),
      teacherComments: commentRows.rows.map(r => ({
        id: r.id, date: r.date, comment: r.comment, subject: r.subject, teacher: r.teacher,
      })),
    })
  } catch (error) {
    console.error('Error fetching student behavioral record:', error)
    return res.status(500).json({ error: 'Failed to fetch behavioral record' })
  }
}
