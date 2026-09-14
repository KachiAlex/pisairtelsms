import type { VercelRequest, VercelResponse } from '../../_lib/http-types.js'
import { sql } from '../../_lib/sql.js'
import { requireRole } from '../../_lib/auth-middleware.js'
import { auditAcademicChange } from '../_lib/academic-audit.js'

/**
 * Academic Programs API
 * CRUD for tenant-scoped academic programs (e.g. "Junior Secondary").
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const { id } = req.query

  if (req.method === 'GET') {
    try {
      const result = await sql`
        SELECT id, name, level, description, status, created_at, updated_at
        FROM academic_programs
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
        ORDER BY name ASC
      `
      return res.status(200).json({ success: true, data: result.rows })
    } catch (error: any) {
      console.error('Error fetching programs:', error)
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch programs' })
    }
  }

  if (req.method === 'POST') {
    try {
      let body = req.body
      if (typeof body === 'string') {
        try { body = JSON.parse(body) } catch { body = null }
      }
      if (!body || !body.name) {
        return res.status(400).json({ success: false, error: 'Program name is required' })
      }
      const result = await sql`
        INSERT INTO academic_programs (tenant_id, name, level, description)
        VALUES (${tenantId}, ${body.name}, ${body.level || null}, ${body.description || null})
        RETURNING id, name, level, description, status, created_at, updated_at
      `
      await auditAcademicChange(tenantId, 'program', result.rows[0]?.id, 'insert', decoded.userId || decoded.staffId || 'system', decoded.email || 'system', null, { name: body.name, level: body.level, description: body.description })
      return res.status(201).json({ success: true, data: result.rows[0] })
    } catch (error: any) {
      console.error('Error creating program:', error)
      return res.status(400).json({ success: false, error: error.message || 'Failed to create program' })
    }
  }

  if (req.method === 'PUT') {
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Program id is required' })
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
      if (body?.level !== undefined) {
        setClauses.push(`level = $${paramCount++}`)
        values.push(body.level)
      }
      if (body?.description !== undefined) {
        setClauses.push(`description = $${paramCount++}`)
        values.push(body.description)
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
        `UPDATE academic_programs
         SET ${setClauses.join(', ')}
         WHERE tenant_id = $${paramCount++} AND id = $${paramCount++} AND deleted_at IS NULL
         RETURNING id, name, level, description, status, created_at, updated_at`,
        values
      )
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Program not found' })
      }
      await auditAcademicChange(tenantId, 'program', id, 'update', decoded.userId || decoded.staffId || 'system', decoded.email || 'system', null, body)
      return res.status(200).json({ success: true, data: result.rows[0] })
    } catch (error: any) {
      console.error('Error updating program:', error)
      return res.status(400).json({ success: false, error: error.message || 'Failed to update program' })
    }
  }

  if (req.method === 'DELETE') {
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Program id is required' })
    }
    try {
      const result = await sql`
        UPDATE academic_programs
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE tenant_id = ${tenantId} AND id = ${id} AND deleted_at IS NULL
        RETURNING id
      `
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Program not found' })
      }
      await auditAcademicChange(tenantId, 'program', id, 'delete', decoded.userId || decoded.staffId || 'system', decoded.email || 'system', null, null)
      return res.status(200).json({ success: true, message: 'Program deleted successfully' })
    } catch (error: any) {
      console.error('Error deleting program:', error)
      return res.status(400).json({ success: false, error: error.message || 'Failed to delete program' })
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
