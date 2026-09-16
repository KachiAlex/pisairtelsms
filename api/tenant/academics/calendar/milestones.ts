import type { ApiRequest, ApiResponse } from '../../../_lib/http-types.js'
import { sql } from '../../../_lib/sql.js'
import { randomUUID } from 'crypto'
import { requireRole, requireAuth } from '../../_lib/auth-middleware.js'
import { auditAcademicChange } from '../../_lib/academic-audit.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const { id } = req.query

  // GET is read-only calendar data: any authenticated user (including students
  // and parents) may view published milestones. Mutations require staff/admin.
  if (req.method === 'GET') {
    const decoded = await requireAuth(req, res)
    if (!decoded) return
    const tenantId = decoded.tenantId || 'default-tenant'

    try {
      const status = req.query['status'] as string | undefined
      let result
      if (status && typeof status === 'string') {
        result = await sql`
          SELECT id, title, date, owner, status
          FROM academic_milestones
          WHERE tenant_id = ${tenantId} AND status = ${status}
          ORDER BY date ASC
        `
      } else {
        result = await sql`
          SELECT id, title, date, owner, status
          FROM academic_milestones
          WHERE tenant_id = ${tenantId}
          ORDER BY date ASC
        `
      }
      return res.status(200).json({ data: result.rows })
    } catch (error) {
      console.error('Error loading milestones:', error)
      return res.status(500).json({ error: 'Failed to load milestones' })
    }
  }

  // Mutations: staff or tenant_admin only.
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return
  const tenantId = decoded.tenantId || 'default-tenant'

  if (req.method === 'POST') {
    try {
      const { title, date, owner, status } = req.body || {}
      if (!title || !date) {
        return res.status(400).json({ error: 'Title and date are required' })
      }
      const newId = randomUUID()
      await sql`
        INSERT INTO academic_milestones (id, tenant_id, title, date, owner, status)
        VALUES (${newId}, ${tenantId}, ${title}, ${date}, ${owner || 'Admin'}, ${status || 'Tentative'})
      `
      await auditAcademicChange(tenantId, 'milestone', newId, 'insert', decoded.userId || decoded.staffId || 'system', decoded.email || 'system', null, { title, date, owner, status })
      return res.status(201).json({ success: true, id: newId })
    } catch (error) {
      console.error('Error creating milestone:', error)
      return res.status(500).json({ error: 'Failed to create milestone' })
    }
  }

  if (req.method === 'PUT') {
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Milestone id is required' })
    }
    try {
      const { title, date, owner, status } = req.body || {}
      // Build SET clauses explicitly so NULL values clear fields (COALESCE would keep old values).
      const setClauses: string[] = []
      const values: any[] = []
      let paramCount = 1
      if (title !== undefined) {
        setClauses.push(`title = $${paramCount++}`)
        values.push(title)
      }
      if (date !== undefined) {
        setClauses.push(`date = $${paramCount++}`)
        values.push(date)
      }
      if (owner !== undefined) {
        setClauses.push(`owner = $${paramCount++}`)
        values.push(owner)
      }
      if (status !== undefined) {
        setClauses.push(`status = $${paramCount++}`)
        values.push(status)
      }
      if (setClauses.length === 0) {
        return res.status(400).json({ error: 'No fields to update' })
      }
      setClauses.push(`updated_at = NOW()`)
      values.push(tenantId, id)

      const result = await sql.query(
        `UPDATE academic_milestones
         SET ${setClauses.join(', ')}
         WHERE tenant_id = $${paramCount++} AND id = $${paramCount++}
         RETURNING id, title, date, owner, status`,
        values
      )
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Milestone not found' })
      }
      await auditAcademicChange(tenantId, 'milestone', id, 'update', decoded.userId || decoded.staffId || 'system', decoded.email || 'system', null, { title, date, owner, status })
      return res.status(200).json({ success: true, data: result.rows[0] })
    } catch (error) {
      console.error('Error updating milestone:', error)
      return res.status(500).json({ error: 'Failed to update milestone' })
    }
  }

  if (req.method === 'DELETE') {
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Milestone id is required' })
    }
    try {
      const result = await sql`
        DELETE FROM academic_milestones
        WHERE tenant_id = ${tenantId} AND id = ${id}
        RETURNING id
      `
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Milestone not found' })
      }
      await auditAcademicChange(tenantId, 'milestone', id, 'delete', decoded.userId || decoded.staffId || 'system', decoded.email || 'system', null, null)
      return res.status(200).json({ success: true, message: 'Milestone deleted' })
    } catch (error) {
      console.error('Error deleting milestone:', error)
      return res.status(500).json({ error: 'Failed to delete milestone' })
    }
  }

  res.setHeader('Allow', 'GET,POST,PUT,DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
