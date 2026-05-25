import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../_lib/auth-middleware'
import { verifyParentChildRelationship } from '../../src/lib/parentAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const decoded = requireRole(req, res, ['parent'])
    if (!decoded) return

    const parentInfo = { parentId: decoded.parentId, childrenIds: decoded.childrenIds || [], role: decoded.role }

    const childId = req.query.childId as string
    if (!childId) {
      return res.status(400).json({ error: 'Bad request: childId is required' })
    }

    if (!verifyParentChildRelationship(parentInfo.parentId, childId, parentInfo.childrenIds)) {
      return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
    }

    const [incidentRows, recognitionRows, commentRows] = await Promise.all([
      sql`
        SELECT bi.id, bi.date::text, bi.type, COALESCE(bi.description, '') AS description,
               bi.severity, COALESCE(bi.action_taken, '') AS action_taken,
               COALESCE(st.name, bi.reported_by, '') AS reported_by
        FROM behavioral_incidents bi
        LEFT JOIN staff st ON st.id = bi.reported_by
        WHERE bi.student_id = ${childId}
        ORDER BY bi.date DESC
      `,
      sql`
        SELECT br.id, br.date::text, br.type, COALESCE(br.description, '') AS description,
               COALESCE(st.name, br.awarded_by, '') AS awarded_by
        FROM behavioral_recognition br
        LEFT JOIN staff st ON st.id = br.awarded_by
        WHERE br.student_id = ${childId}
        ORDER BY br.date DESC
      `,
      sql`
        SELECT tc.id, tc.date::text, tc.comment, COALESCE(tc.subject, '') AS subject,
               COALESCE(st.name, '') AS teacher
        FROM teacher_comments tc
        LEFT JOIN staff st ON st.id = tc.staff_id
        WHERE tc.student_id = ${childId}
        ORDER BY tc.date DESC
      `,
    ])

    // Derive conduct grade: A if 0 incidents, B if 1-2, C if 3+
    const incidentCount = incidentRows.rows.length
    const conductGrade = incidentCount === 0 ? 'A' : incidentCount <= 2 ? 'B' : 'C'

    return res.status(200).json({
      conductGrade,
      conductTrend: [],
      incidents: incidentRows.rows.map(r => ({
        id: r.id, date: r.date, type: r.type, description: r.description,
        severity: r.severity as 'minor' | 'moderate' | 'severe',
        action: r.action_taken, reportedBy: r.reported_by,
      })),
      positiveRecognition: recognitionRows.rows.map(r => ({
        id: r.id, date: r.date, type: r.type, description: r.description, awardedBy: r.awarded_by,
      })),
      teacherComments: commentRows.rows.map(r => ({
        id: r.id, teacher: r.teacher, subject: r.subject, comment: r.comment, date: r.date,
      })),
    })
  } catch (error) {
    console.error('Error fetching behavioral reports:', error)
    return res.status(500).json({ error: 'Failed to fetch behavioral data' })
  }
}
