import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'
import { verifyParentChildAccess } from './_lib/verify-child.js'
import { requireCSRF } from '../_lib/csrf.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET,POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const decoded = await requireRole(req, res, ['parent'])
    if (!decoded) return

    const parentInfo = { parentId: decoded.parentId, childrenIds: decoded.childrenIds || [], role: decoded.role }
    const tenantId = decoded.tenantId || 'default-tenant'

    const body = req.method === 'POST'
      ? (typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {})
      : {}
    const childId = (req.query.childId as string) || body.childId
    if (!childId) {
      return res.status(400).json({ error: 'Bad request: childId is required' })
    }

    if (!await verifyParentChildAccess(parentInfo.parentId, childId, tenantId)) {
      return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
    }

    // POST — submit an excuse request for a child's absent/late day
    if (req.method === 'POST') {
      if (requireCSRF(req, res, parentInfo.parentId!)) return
      const { date, reason } = body
      if (!date || !reason || !String(reason).trim()) {
        return res.status(400).json({ error: 'date and reason are required' })
      }

      const day = await sql`
        SELECT id FROM attendance_records
        WHERE student_id = ${childId} AND tenant_id = ${tenantId}
          AND date = ${date}::date AND status IN ('absent', 'late')
        LIMIT 1
      `
      if (!day.rows[0]) {
        return res.status(400).json({ error: 'No absence recorded for that date' })
      }

      const parentName = (await sql`SELECT name FROM parents WHERE id = ${parentInfo.parentId} LIMIT 1`.catch(() => ({ rows: [] as any[] }))).rows[0]?.name || 'Parent'

      const result = await sql`
        INSERT INTO attendance_excuse_requests
          (tenant_id, student_id, attendance_date, reason, submitted_by, submitted_by_role, submitted_by_name)
        VALUES (${tenantId}, ${childId}, ${date}::date, ${String(reason).trim()}, ${parentInfo.parentId}, 'parent', ${parentName})
        ON CONFLICT (tenant_id, student_id, attendance_date)
        DO UPDATE SET reason = EXCLUDED.reason, status = 'pending',
                      submitted_by = EXCLUDED.submitted_by,
                      submitted_by_role = EXCLUDED.submitted_by_role,
                      submitted_by_name = EXCLUDED.submitted_by_name,
                      reviewed_by = NULL, reviewed_by_name = NULL,
                      review_note = NULL, reviewed_at = NULL, updated_at = NOW()
        RETURNING id, status
      `
      return res.status(201).json({ success: true, data: result.rows[0] })
    }

    const summaryResult = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'present') AS present,
        COUNT(*) FILTER (WHERE status = 'absent')  AS absent,
        COUNT(*) FILTER (WHERE status = 'late')    AS late,
        COUNT(*) AS total
      FROM attendance_records WHERE student_id = ${childId} AND tenant_id = ${tenantId}
    `
    const totalPresent = parseInt(summaryResult.rows[0]?.present ?? '0')
    const totalAbsent  = parseInt(summaryResult.rows[0]?.absent  ?? '0')
    const totalLate    = parseInt(summaryResult.rows[0]?.late    ?? '0')
    const total        = parseInt(summaryResult.rows[0]?.total   ?? '0')
    const attendancePercent = total > 0 ? Math.round(((totalPresent) / total) * 100) : 100

    const recordsResult = await sql`
      SELECT a.id::text, a.date::text, a.status,
             COALESCE(ar.reason_name, '') AS reason,
             e.status AS excuse_status
      FROM attendance_records a
      LEFT JOIN absence_reasons ar ON ar.id = a.absence_reason_id
      LEFT JOIN attendance_excuse_requests e
        ON e.student_id = a.student_id AND e.tenant_id = a.tenant_id AND e.attendance_date = a.date
      WHERE a.student_id = ${childId} AND a.tenant_id = ${tenantId}
      ORDER BY a.date DESC LIMIT 60
    `

    const records = recordsResult.rows.map(r => ({
      id: r.id, date: r.date, status: r.status as 'present' | 'absent' | 'late',
      subject: 'General', reason: r.reason || null,
      excuseStatus: r.excuse_status || null,
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
