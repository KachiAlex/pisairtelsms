import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../_lib/auth-middleware.js'

function getTenantId(decodedTenantId?: string) {
  return decodedTenantId || 'default-tenant'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Require authentication - only staff or tenant_admin can access tenant management
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = getTenantId(decoded.tenantId)

  if (req.method === 'GET') {
    try {
      const result = await sql`
        SELECT id, name, email, role, status,
               last_active, invited_at, created_at
        FROM tenant_users
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `
      return res.status(200).json({ data: result.rows })
    } catch (error) {
      console.error('Error fetching users:', error)
      return res.status(500).json({ error: 'Failed to fetch users' })
    }
  }

  if (req.method === 'POST') {
    const body = req.body || {}
    const { name, email, role } = typeof body === 'string' ? JSON.parse(body) : body

    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' })
    }

    try {
      const existing = await sql`
        SELECT id FROM tenant_users WHERE email = ${email.toLowerCase()} AND tenant_id = ${tenantId}
      `
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'A user with this email already exists' })
      }

      const result = await sql`
        INSERT INTO tenant_users (tenant_id, name, email, role, status)
        VALUES (${tenantId}, ${name}, ${email.toLowerCase()}, ${role || 'Staff'}, 'invited')
        RETURNING *
      `
      return res.status(201).json({ data: result.rows[0] })
    } catch (error) {
      console.error('Error inviting user:', error)
      return res.status(500).json({ error: 'Failed to invite user' })
    }
  }

  if (req.method === 'PATCH') {
    const body = req.body || {}
    const { id, status } = typeof body === 'string' ? JSON.parse(body) : body

    if (!id || !status) {
      return res.status(400).json({ error: 'id and status are required' })
    }

    const allowed = ['active', 'suspended', 'invited']
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` })
    }

    try {
      const result = await sql`
        UPDATE tenant_users SET status = ${status}
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' })
      }
      return res.status(200).json({ data: result.rows[0] })
    } catch (error) {
      console.error('Error updating user status:', error)
      return res.status(500).json({ error: 'Failed to update user status' })
    }
  }

  res.setHeader('Allow', 'GET,POST,PATCH')
  return res.status(405).json({ error: 'Method not allowed' })
}
