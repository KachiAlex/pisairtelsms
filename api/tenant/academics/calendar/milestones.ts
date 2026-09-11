import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { randomUUID } from 'crypto'
import { requireRole } from '../../_lib/auth-middleware.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'

  if (req.method === 'GET') {
    try {
      const result = await sql`
        SELECT id, title, date, owner, status
        FROM academic_milestones
        WHERE tenant_id = ${tenantId}
        ORDER BY date ASC
      `
      return res.status(200).json({ data: result.rows })
    } catch (error) {
      console.error('Error loading milestones:', error)
      return res.status(200).json({ data: [] })
    }
  }

  if (req.method === 'POST') {
    try {
      const { title, date, owner, status } = req.body || {}
      if (!title || !date) {
        return res.status(400).json({ error: 'Title and date are required' })
      }
      const id = randomUUID()
      await sql`
        INSERT INTO academic_milestones (id, tenant_id, title, date, owner, status)
        VALUES (${id}, ${tenantId}, ${title}, ${date}, ${owner || 'Admin'}, ${status || 'Tentative'})
      `
      return res.status(201).json({ success: true, id })
    } catch (error) {
      console.error('Error creating milestone:', error)
      return res.status(500).json({ error: 'Failed to create milestone' })
    }
  }

  res.setHeader('Allow', 'GET,POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
