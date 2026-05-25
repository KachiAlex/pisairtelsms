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

    const summaryResult = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'present') AS present,
        COUNT(*) FILTER (WHERE status = 'absent')  AS absent,
        COUNT(*) FILTER (WHERE status = 'late')    AS late,
        COUNT(*) AS total
      FROM attendance WHERE student_id = ${childId}
    `
    const totalPresent = parseInt(summaryResult.rows[0]?.present ?? '0')
    const totalAbsent  = parseInt(summaryResult.rows[0]?.absent  ?? '0')
    const totalLate    = parseInt(summaryResult.rows[0]?.late    ?? '0')
    const total        = parseInt(summaryResult.rows[0]?.total   ?? '0')
    const attendancePercent = total > 0 ? Math.round(((totalPresent) / total) * 100) : 100

    const recordsResult = await sql`
      SELECT a.id::text, a.date::text, a.status,
             COALESCE(ar.reason_name, '') AS reason
      FROM attendance a
      LEFT JOIN absence_reasons ar ON ar.id = a.absence_reason_id
      WHERE a.student_id = ${childId}
      ORDER BY a.date DESC LIMIT 60
    `

    const records = recordsResult.rows.map(r => ({
      id: r.id, date: r.date, status: r.status as 'present' | 'absent' | 'late',
      subject: 'General', reason: r.reason || null,
    }))

    const absenceReasons = recordsResult.rows
      .filter(r => r.status === 'absent' && r.reason)
      .map(r => ({ date: r.date, reason: r.reason, approvedBy: '' }))

    return res.status(200).json({ attendancePercent, totalPresent, totalAbsent, totalLate, records, trend: [], absenceReasons })
  } catch (error) {
    console.error('Error fetching attendance:', error)
    return res.status(500).json({ error: 'Failed to fetch attendance data' })
  }
}
