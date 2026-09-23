import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const userId = decoded.userId || decoded.sub || 'system'

  await sql`ALTER TABLE virtual_classrooms ADD COLUMN IF NOT EXISTS co_teacher_id TEXT`.catch(() => {})

  try {
    // GET - list classrooms
    if (req.method === 'GET') {
      const result = await sql`
        SELECT vc.*, s.name as subject_name, c.name as class_arm_name,
               st.name as teacher_name, ct.name as co_teacher_name
        FROM virtual_classrooms vc
        LEFT JOIN subjects s ON s.id::text = vc.subject_id
        LEFT JOIN classes c ON c.id::text = vc.class_arm_id
        LEFT JOIN staff st ON st.id = vc.teacher_id
        LEFT JOIN staff ct ON ct.id = vc.co_teacher_id
        WHERE vc.tenant_id = ${tenantId}
        ORDER BY vc.created_at DESC
      `
      return res.status(200).json({ data: result.rows })
    }

    // POST - create classroom
    if (req.method === 'POST') {
      const { name, description, subjectId, classArmId, teacherId, coTeacherId, coverImageUrl } = req.body || {}
      if (!name || !teacherId) {
        return res.status(400).json({ error: 'name and teacherId are required' })
      }
      const result = await sql`
        INSERT INTO virtual_classrooms (tenant_id, subject_id, class_arm_id, teacher_id, co_teacher_id, name, description, cover_image_url)
        VALUES (${tenantId}, ${subjectId || null}, ${classArmId || null}, ${teacherId}, ${coTeacherId || null}, ${name}, ${description || null}, ${coverImageUrl || null})
        RETURNING *
      `
      // Notify the assigned teacher — otherwise the assignment is invisible
      // until they happen to open the (new) Virtual Classes page.
      for (const tid of [teacherId, coTeacherId].filter(Boolean)) {
        await sql`
          INSERT INTO virtual_learning_notifications
            (tenant_id, user_id, user_role, type, title, message, related_entity_type, related_entity_id)
          VALUES (${tenantId}, ${tid}, 'staff', 'classroom_assigned',
                  'Virtual classroom assigned',
                  ${`You have been assigned to teach "${name}". Open Virtual Classes in the staff portal to schedule or start a live session.`},
                  'virtual_classroom', ${result.rows[0].id})
        `.catch(() => {})
      }
      return res.status(201).json({ data: result.rows[0] })
    }

    // PUT - update classroom
    if (req.method === 'PUT') {
      const { id, name, description, subjectId, classArmId, teacherId, coTeacherId, coverImageUrl, status } = req.body || {}
      if (!id) {
        return res.status(400).json({ error: 'id is required' })
      }
      const result = await sql`
        UPDATE virtual_classrooms SET
          name = COALESCE(${name || null}, name),
          description = COALESCE(${description || null}, description),
          subject_id = COALESCE(${subjectId || null}, subject_id),
          class_arm_id = COALESCE(${classArmId || null}, class_arm_id),
          teacher_id = COALESCE(${teacherId || null}, teacher_id),
          co_teacher_id = COALESCE(${coTeacherId || null}, co_teacher_id),
          cover_image_url = COALESCE(${coverImageUrl || null}, cover_image_url),
          status = COALESCE(${status || null}, status),
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Classroom not found' })
      }
      return res.status(200).json({ data: result.rows[0] })
    }

    // DELETE - remove classroom
    if (req.method === 'DELETE') {
      const { id } = req.query
      if (!id) {
        return res.status(400).json({ error: 'id query param is required' })
      }
      const result = await sql`
        DELETE FROM virtual_classrooms WHERE id = ${id as string} AND tenant_id = ${tenantId}
        RETURNING id
      `
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Classroom not found' })
      }
      return res.status(204).end()
    }

    res.setHeader('Allow', 'GET,POST,PUT,DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('[virtual-classrooms]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}
