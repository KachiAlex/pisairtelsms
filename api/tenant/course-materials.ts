import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../_lib/auth-middleware.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const userId = decoded.userId || decoded.sub || 'system'

  try {
    // GET - list materials for a classroom
    if (req.method === 'GET') {
      const { classroomId, lessonId } = req.query
      if (!classroomId) {
        return res.status(400).json({ error: 'classroomId query param is required' })
      }
      let result
      if (lessonId) {
        result = await sql`
          SELECT * FROM course_materials
          WHERE classroom_id = ${classroomId as string} AND lesson_id = ${lessonId as string} AND tenant_id = ${tenantId}
          ORDER BY created_at DESC
        `
      } else {
        result = await sql`
          SELECT * FROM course_materials
          WHERE classroom_id = ${classroomId as string} AND tenant_id = ${tenantId}
          ORDER BY created_at DESC
        `
      }
      return res.status(200).json({ data: result.rows })
    }

    // POST - upload material
    if (req.method === 'POST') {
      const { classroomId, lessonId, title, description, type, url, fileName, fileSize } = req.body || {}
      if (!classroomId || !title || !url) {
        return res.status(400).json({ error: 'classroomId, title, and url are required' })
      }
      const result = await sql`
        INSERT INTO course_materials (classroom_id, lesson_id, tenant_id, title, description, type, url, file_name, file_size, uploaded_by)
        VALUES (${classroomId}, ${lessonId || null}, ${tenantId}, ${title}, ${description || null}, ${type || 'document'}, ${url}, ${fileName || null}, ${fileSize || null}, ${userId})
        RETURNING *
      `
      return res.status(201).json({ data: result.rows[0] })
    }

    // PUT - update material
    if (req.method === 'PUT') {
      const { id, title, description, type, url, isPublished } = req.body || {}
      if (!id) {
        return res.status(400).json({ error: 'id is required' })
      }
      const result = await sql`
        UPDATE course_materials SET
          title = COALESCE(${title || null}, title),
          description = COALESCE(${description || null}, description),
          type = COALESCE(${type || null}, type),
          url = COALESCE(${url || null}, url),
          is_published = COALESCE(${isPublished === undefined ? null : isPublished}, is_published),
          updated_at = NOW()
        WHERE id::text = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Material not found' })
      }
      return res.status(200).json({ data: result.rows[0] })
    }

    // DELETE - remove material
    if (req.method === 'DELETE') {
      const { id } = req.query
      if (!id) {
        return res.status(400).json({ error: 'id query param is required' })
      }
      const result = await sql`
        DELETE FROM course_materials WHERE id::text = ${id as string} AND tenant_id = ${tenantId}
        RETURNING id
      `
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Material not found' })
      }
      return res.status(204).end()
    }

    res.setHeader('Allow', 'GET,POST,PUT,DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('[course-materials]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}
