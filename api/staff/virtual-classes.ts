import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'

/**
 * GET /api/staff/virtual-classes
 * Returns the virtual classrooms assigned to the signed-in teacher
 * (virtual_classrooms.teacher_id = their staff id), each with its lessons
 * — this is what lets an assigned teacher actually see and start a class.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const tenantId = decoded.tenantId || 'default-tenant'
  const staffId = decoded.staffId || decoded.userId || decoded.sub

  try {
    await sql`ALTER TABLE virtual_classrooms ADD COLUMN IF NOT EXISTS co_teacher_id TEXT`.catch(() => {})

    const classrooms = await sql`
      SELECT vc.id, vc.name, vc.description, vc.status, vc.created_at::text,
             s.name AS subject_name,
             c.name AS class_name, c.arm AS class_arm,
             (vc.teacher_id = ${staffId}) AS is_lead,
             st.name AS lead_teacher_name
      FROM virtual_classrooms vc
      LEFT JOIN subjects s ON s.id::text = vc.subject_id
      LEFT JOIN classes c ON c.id::text = vc.class_arm_id
      LEFT JOIN staff st ON st.id = vc.teacher_id
      WHERE vc.tenant_id = ${tenantId}
        AND (vc.teacher_id = ${staffId} OR vc.co_teacher_id = ${staffId})
        AND vc.status != 'archived'
      ORDER BY vc.created_at DESC
    `

    const ids = classrooms.rows.map((r: any) => r.id)
    const lessons = ids.length === 0
      ? { rows: [] as any[] }
      : await sql`
          SELECT id::text, classroom_id, title, description, type,
                 scheduled_at::text, duration_minutes, status, recording_url
          FROM lessons
          WHERE tenant_id = ${tenantId} AND classroom_id = ANY(${ids})
            AND status != 'cancelled'
          ORDER BY
            CASE status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 WHEN 'draft' THEN 2 ELSE 3 END,
            scheduled_at ASC NULLS LAST
        `

    const byClassroom = new Map<string, any[]>()
    for (const l of lessons.rows) {
      const list = byClassroom.get(l.classroom_id) || []
      list.push(l)
      byClassroom.set(l.classroom_id, list)
    }

    return res.status(200).json({
      success: true,
      data: classrooms.rows.map((c: any) => ({ ...c, lessons: byClassroom.get(c.id) || [] })),
    })
  } catch (error) {
    console.error('[staff/virtual-classes]', error)
    return res.status(500).json({ success: false, error: 'Failed to load your virtual classes' })
  }
}
