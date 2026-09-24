import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'

function getTenantId(decodedTenantId?: string) {
  return decodedTenantId || 'default-tenant'
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  // Require authentication - only staff or tenant_admin can access tenant management
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = getTenantId(decoded.tenantId)

  if (req.method === 'GET') {
    try {
      // Unified account directory: one row per person. A tenant_users account
      // whose email matches a staff record is folded into the staff row — the
      // staff row then carries account_id/account_status so the UI can manage
      // the login without showing the same person twice.
      const result = await sql`
        SELECT tu.id::text AS id, tu.name, tu.email, tu.role, tu.status,
               tu.last_active, tu.invited_at, tu.created_at,
               CASE WHEN lower(tu.role) LIKE '%admin%' THEN 'admin' ELSE 'user' END AS type,
               NULL::text AS account_id, NULL::text AS account_status
        FROM tenant_users tu
        WHERE tu.tenant_id = ${tenantId}
          AND NOT EXISTS (
            SELECT 1 FROM staff s
            WHERE s.tenant_id = tu.tenant_id AND lower(s.email) = lower(tu.email)
          )
        UNION ALL
        SELECT s.id::text AS id, s.name, s.email, s.role, s.status,
               tu.last_active, tu.invited_at, s.created_at, 'staff' AS type,
               tu.id::text AS account_id, tu.status AS account_status
        FROM staff s
        LEFT JOIN tenant_users tu
          ON tu.tenant_id = s.tenant_id AND lower(tu.email) = lower(s.email)
        WHERE s.tenant_id = ${tenantId}
        UNION ALL
        SELECT st.id::text AS id, st.name, st.guardian_email AS email,
               ('Student' || COALESCE(' — ' || st.class, '')) AS role,
               LOWER(st.status) AS status,
               NULL AS last_active, NULL AS invited_at, st.created_at, 'student' AS type,
               NULL::text AS account_id, NULL::text AS account_status
        FROM students st
        WHERE st.tenant_id = ${tenantId} AND st.deleted_at IS NULL
        UNION ALL
        SELECT p.id::text AS id, p.name, p.email, 'Parent' AS role,
               CASE WHEN p.password_hash IS NOT NULL THEN 'active' ELSE 'invited' END AS status,
               NULL AS last_active, NULL AS invited_at, p.created_at, 'parent' AS type,
               NULL::text AS account_id, NULL::text AS account_status
        FROM parents p
        WHERE p.tenant_id = ${tenantId}
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
      if (status === 'invited') {
        const result = await sql`
          UPDATE tenant_users 
          SET invited_at = CURRENT_TIMESTAMP
          WHERE id = ${id} AND tenant_id = ${tenantId}
          RETURNING *
        `
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' })
        return res.status(200).json({ data: result.rows[0], message: 'Invitation resent' })
      }

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

  if (req.method === 'PUT') {
    const body = req.body || {}
    const { id, name, role } = typeof body === 'string' ? JSON.parse(body) : body

    if (!id || !name || !role) {
      return res.status(400).json({ error: 'id, name, and role are required' })
    }

    try {
      const result = await sql`
        UPDATE tenant_users 
        SET name = ${name}, role = ${role}
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' })
      }
      return res.status(200).json({ data: result.rows[0] })
    } catch (error) {
      console.error('Error updating user:', error)
      return res.status(500).json({ error: 'Failed to update user' })
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id is required' })

    try {
      const result = await sql`
        DELETE FROM tenant_users 
        WHERE id = ${id as string} AND tenant_id = ${tenantId}
        RETURNING id
      `
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' })
      }
      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Error deleting user:', error)
      return res.status(500).json({ error: 'Failed to delete user' })
    }
  }

  res.setHeader('Allow', 'GET,POST,PATCH,PUT,DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
