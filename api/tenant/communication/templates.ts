import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../../_lib/auth-middleware.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const method = req.method

  // GET: list all templates or a single template by id
  if (method === 'GET') {
    try {
      const { id } = req.query

      if (id && typeof id === 'string') {
        const result = await sql`
          SELECT * FROM communication_templates WHERE id = ${id} AND tenant_id = ${tenantId}
        `
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Template not found' })
        }
        return res.status(200).json({ data: result.rows[0] })
      }

      const result = await sql`
        SELECT * FROM communication_templates WHERE tenant_id = ${tenantId} ORDER BY created_at DESC
      `
      return res.status(200).json({ data: result.rows })
    } catch (error) {
      console.error('Error fetching templates:', error)
      return res.status(500).json({ error: 'Failed to fetch templates' })
    }
  }

  // POST: create template
  if (method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const { name, type, title, body: templateBody, channels, variables } = body

      if (!name || !type || !title || !templateBody) {
        return res.status(400).json({ error: 'Missing required fields: name, type, title, body' })
      }

      const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const result = await sql`
        INSERT INTO communication_templates (id, tenant_id, name, type, title, body, channels, variables, created_at, updated_at)
        VALUES (${id}, ${tenantId}, ${name}, ${type}, ${title}, ${templateBody},
          ${channels || []}, ${variables || []}, NOW(), NOW())
        RETURNING *
      `

      return res.status(201).json({ data: result.rows[0] })
    } catch (error) {
      console.error('Error creating template:', error)
      return res.status(500).json({ error: 'Failed to create template' })
    }
  }

  // PUT: update template
  if (method === 'PUT') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const { id, name, type, title, body: templateBody, channels, variables } = body

      if (!id) {
        return res.status(400).json({ error: 'Template ID is required' })
      }

      const result = await sql`
        UPDATE communication_templates SET
          name = COALESCE(${name ?? null}, name),
          type = COALESCE(${type ?? null}, type),
          title = COALESCE(${title ?? null}, title),
          body = COALESCE(${templateBody ?? null}, body),
          channels = COALESCE(${channels ?? null}, channels),
          variables = COALESCE(${variables ?? null}, variables),
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Template not found' })
      }

      return res.status(200).json({ data: result.rows[0] })
    } catch (error) {
      console.error('Error updating template:', error)
      return res.status(500).json({ error: 'Failed to update template' })
    }
  }

  // DELETE: delete template
  if (method === 'DELETE') {
    try {
      const { id } = req.query

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Template ID is required' })
      }

      const result = await sql`
        DELETE FROM communication_templates WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING id
      `

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Template not found' })
      }

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Error deleting template:', error)
      return res.status(500).json({ error: 'Failed to delete template' })
    }
  }

  res.setHeader('Allow', 'GET, POST, PUT, DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
