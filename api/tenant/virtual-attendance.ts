import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireAuth } from '../_lib/auth-middleware.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireAuth(req, res)
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  // Real user ID comes from the JWT — never trust a client-supplied ID.
  // studentId/staffId are set on student/staff tokens; userId mirrors them.
  const userId = decoded.studentId || decoded.staffId || decoded.userId || decoded.parentId || decoded.sub || 'system'
  const userRole = decoded.role || 'staff'

  try {
    // GET - list attendance for a lesson, with readable participant identities
    if (req.method === 'GET') {
      const { lessonId } = req.query
      if (!lessonId) {
        return res.status(400).json({ error: 'lessonId query param is required' })
      }
      const result = await sql`
        SELECT va.*,
          COALESCE(va.participant_name, st.name, sf.name, p.name) AS display_name,
          st.admission_no,
          COALESCE(va.participant_role,
            CASE WHEN st.id IS NOT NULL THEN 'student'
                 WHEN sf.id IS NOT NULL THEN 'staff'
                 WHEN p.id IS NOT NULL THEN 'parent'
                 ELSE va.participant_role END) AS display_role
        FROM virtual_attendance va
        LEFT JOIN students st ON st.id::text = va.student_id AND st.tenant_id = va.tenant_id
        LEFT JOIN staff sf ON sf.id = va.student_id AND sf.tenant_id = va.tenant_id
        LEFT JOIN parents p ON p.id = va.student_id AND p.tenant_id = va.tenant_id
        WHERE va.lesson_id = ${lessonId as string} AND va.tenant_id = ${tenantId}
        ORDER BY va.joined_at DESC
      `
      return res.status(200).json({ data: result.rows })
    }

    // POST - record attendance event (join/leave)
    if (req.method === 'POST') {
      const { lessonId, participantId, participantName, action, durationSeconds } = req.body || {}
      if (!lessonId) {
        return res.status(400).json({ error: 'lessonId is required' })
      }

      // Resolve a display name server-side where possible; fall back to the
      // client-supplied name (already sanitized to the user's profile name).
      let displayName: string | null = participantName || null
      try {
        if (userRole === 'student') {
          const r = await sql`SELECT name FROM students WHERE id::text = ${userId} AND tenant_id = ${tenantId}`
          if (r.rows[0]?.name) displayName = r.rows[0].name
        } else if (userRole === 'staff' || userRole === 'tenant_admin') {
          const r = await sql`SELECT name FROM staff WHERE id = ${userId} AND tenant_id = ${tenantId}`
          if (r.rows[0]?.name) displayName = r.rows[0].name
        } else if (userRole === 'parent') {
          const r = await sql`SELECT name FROM parents WHERE id = ${userId} AND tenant_id = ${tenantId}`
          if (r.rows[0]?.name) displayName = r.rows[0].name
        }
      } catch {
        // best-effort name resolution — keep client name
      }

      if (action === 'joined') {
        // Upsert keyed on the real user ID; RTK participant ID kept separately
        const result = await sql`
          INSERT INTO virtual_attendance (
            lesson_id, student_id, tenant_id, joined_at, status,
            participant_id, participant_name, participant_role
          )
          VALUES (
            ${lessonId}, ${userId}, ${tenantId}, NOW(), 'present',
            ${participantId || null}, ${displayName}, ${userRole}
          )
          ON CONFLICT (lesson_id, student_id)
          DO UPDATE SET
            joined_at = NOW(),
            left_at = NULL,
            status = 'present',
            participant_id = EXCLUDED.participant_id,
            participant_name = EXCLUDED.participant_name,
            participant_role = EXCLUDED.participant_role
          RETURNING *
        `
        return res.status(200).json({ data: result.rows[0] })
      } else if (action === 'left') {
        const result = await sql`
          UPDATE virtual_attendance SET
            left_at = NOW(),
            duration_seconds = COALESCE(${durationSeconds || null},
              EXTRACT(EPOCH FROM (NOW() - joined_at))::integer)
          WHERE lesson_id = ${lessonId} AND student_id = ${userId} AND tenant_id = ${tenantId}
          RETURNING *
        `
        return res.status(200).json({ data: result.rows[0] })
      }

      return res.status(400).json({ error: 'action must be "joined" or "left"' })
    }

    res.setHeader('Allow', 'GET,POST')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('[virtual-attendance]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}
