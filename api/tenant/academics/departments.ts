import type { VercelRequest, VercelResponse } from '../../_lib/http-types.js'
import { sql } from '../../_lib/sql.js'
import { requireRole } from '../../_lib/auth-middleware.js'
import { auditAcademicChange } from '../_lib/academic-audit.js'

/**
 * Academic Departments API
 * CRUD for tenant-scoped academic departments.
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const { id } = req.query

  if (req.method === 'GET') {
    try {
      const result = await sql`
        SELECT id, name, description, head, status, created_at, updated_at
        FROM academic_departments
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
        ORDER BY name ASC
      `
      return res.status(200).json({ success: true, data: result.rows })
    } catch (error: any) {
      console.error('Error fetching departments:', error)
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch departments' })
    }
  }

  if (req.method === 'POST') {
    try {
      let body = req.body
      if (typeof body === 'string') {
        try { body = JSON.parse(body) } catch { body = null }
      }
      if (!body || !body.name) {
        return res.status(400).json({ success: false, error: 'Department name is required' })
      }
      const result = await sql`
        INSERT INTO academic_departments (tenant_id, name, description, head)
        VALUES (${tenantId}, ${body.name}, ${body.description || null}, ${body.head || null})
        RETURNING id, name, description, head, status, created_at, updated_at
      `
      await auditAcademicChange(tenantId, 'department', result.rows[0]?.id, 'insert', decoded.userId || decoded.staffId || 'system', decoded.email || 'system', null, { name: body.name, description: body.description, head: body.head })
      return res.status(201).json({ success: true, data: result.rows[0] })
    } catch (error: any) {
      console.error('Error creating department:', error)
      return res.status(400).json({ success: false, error: error.message || 'Failed to create department' })
    }
  }

  if (req.method === 'PUT') {
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Department id is required' })
    }
    try {
      let body = req.body
      if (typeof body === 'string') {
        try { body = JSON.parse(body) } catch { body = null }
      }
      // Build SET clauses explicitly so NULL values clear fields (COALESCE would keep old values).
      const setClauses: string[] = []
      const values: any[] = []
      let paramCount = 1
      if (body?.name !== undefined) {
        setClauses.push(`name = $${paramCount++}`)
        values.push(body.name)
      }
      if (body?.description !== undefined) {
        setClauses.push(`description = $${paramCount++}`)
        values.push(body.description)
      }
      if (body?.head !== undefined) {
        setClauses.push(`head = $${paramCount++}`)
        values.push(body.head)
      }
      if (body?.status !== undefined) {
        setClauses.push(`status = $${paramCount++}`)
        values.push(body.status)
      }
      if (setClauses.length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update' })
      }
      setClauses.push(`updated_at = CURRENT_TIMESTAMP`)
      values.push(tenantId, id)

      const result = await sql.query(
        `UPDATE academic_departments
         SET ${setClauses.join(', ')}
         WHERE tenant_id = $${paramCount++} AND id = $${paramCount++} AND deleted_at IS NULL
         RETURNING id, name, description, head, status, created_at, updated_at`,
        values
      )
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Department not found' })
      }
      await auditAcademicChange(tenantId, 'department', id, 'update', decoded.userId || decoded.staffId || 'system', decoded.email || 'system', null, body)
      return res.status(200).json({ success: true, data: result.rows[0] })
    } catch (error: any) {
      console.error('Error updating department:', error)
      return res.status(400).json({ success: false, error: error.message || 'Failed to update department' })
    }
  }

  if (req.method === 'DELETE') {
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Department id is required' })
    }
    try {
      const result = await sql`
        UPDATE academic_departments
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE tenant_id = ${tenantId} AND id = ${id} AND deleted_at IS NULL
        RETURNING id
      `
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Department not found' })
      }
      await auditAcademicChange(tenantId, 'department', id, 'delete', decoded.userId || decoded.staffId || 'system', decoded.email || 'system', null, null)
      return res.status(200).json({ success: true, message: 'Department deleted successfully' })
    } catch (error: any) {
      console.error('Error deleting department:', error)
      return res.status(400).json({ success: false, error: error.message || 'Failed to delete department' })
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
