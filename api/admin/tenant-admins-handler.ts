import type { VercelRequest, VercelResponse } from '@vercel/node'
import { poolQuery } from '../_lib/pg-pool.js'
import { requireRole } from '../_lib/auth-middleware.js'
import {
  ensureStaffTables,
  hashPassword,
} from '../tenant/_lib/staff.js'

const ADMIN_ROLES = ['tenant_admin', 'Admin', 'Principal', 'admin', 'principal']

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['super_admin'])
  if (!decoded) return

  try {
    await ensureStaffTables()
  } catch (e) {
    console.error('ensureStaffTables failed', e)
  }

  // ── GET: list tenant admins (optionally filtered by tenantId) ──────────────
  if (req.method === 'GET') {
    const { tenantId } = req.query
    try {
      const rolesPlaceholder = ADMIN_ROLES.map((_, i) => `$${i + 1}`).join(',')
      if (tenantId) {
        const r = await poolQuery(
          `SELECT id, staff_id AS "staffId", name, email, role,
             department AS "tenantId", status, phone, created_at AS "createdAt"
           FROM staff WHERE role IN (${rolesPlaceholder}) AND department = $${ADMIN_ROLES.length + 1}
           ORDER BY name ASC`,
          [...ADMIN_ROLES, tenantId as string]
        )
        return res.json({ success: true, data: r.rows })
      } else {
        const r = await poolQuery(
          `SELECT id, staff_id AS "staffId", name, email, role,
             department AS "tenantId", status, phone, created_at AS "createdAt"
           FROM staff WHERE role IN (${rolesPlaceholder})
           ORDER BY department ASC, name ASC`,
          ADMIN_ROLES
        )
        return res.json({ success: true, data: r.rows })
      }
    } catch (error) {
      console.error('tenant-admins GET error:', error)
      return res.status(500).json({ success: false, error: 'Internal server error' })
    }
  }

  // ── POST: create a tenant admin ───────────────────────────────────────────
  if (req.method === 'POST') {
    const body = req.body || {}
    const { name, email, role, tenantId, password } =
      typeof body === 'string' ? JSON.parse(body) : body

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Name is required (min 2 chars)' })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'Valid email is required' })
    }
    if (!role || !ADMIN_ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: `Role must be one of: ${ADMIN_ROLES.join(', ')}` })
    }
    if (!tenantId || typeof tenantId !== 'string') {
      return res.status(400).json({ success: false, error: 'Tenant ID is required' })
    }

    try {
      // Check for duplicate email
      const existing = await poolQuery('SELECT id FROM staff WHERE email = $1 LIMIT 1', [email.toLowerCase()])
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'A user with this email already exists' })
      }

      const id = `staff_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      const staffId = `STF${Date.now().toString().slice(-6)}`
      const rawPassword = password && typeof password === 'string' && password.trim().length >= 6
        ? password.trim()
        : `${name.split(' ')[0].toLowerCase()}@${Date.now().toString().slice(-4)}`
      const passwordHash = await hashPassword(rawPassword)
      const today = new Date().toISOString().split('T')[0]

      const r = await poolQuery(
        `INSERT INTO staff (id, staff_id, name, role, department, status, email, phone, hire_date, password_hash)
         VALUES ($1, $2, $3, $4, $5, 'active', $6, '', $7, $8)
         RETURNING id, staff_id AS "staffId", name, email, role,
           department AS "tenantId", status, phone, created_at AS "createdAt"`,
        [id, staffId, name.trim(), role, tenantId, email.toLowerCase(), today, passwordHash]
      )

      // Mirror into tenant_users so the admin appears in tenant user management
      try {
        const existingUser = await poolQuery(
          'SELECT id FROM tenant_users WHERE email = $1 LIMIT 1',
          [email.toLowerCase()]
        )
        if (existingUser.rows.length > 0) {
          await poolQuery(
            'UPDATE tenant_users SET tenant_id = $1, name = $2, role = $3, status = $4 WHERE email = $5',
            [tenantId, name.trim(), role, 'active', email.toLowerCase()]
          )
        } else {
          await poolQuery(
            'INSERT INTO tenant_users (tenant_id, name, email, role, status) VALUES ($1, $2, $3, $4, $5)',
            [tenantId, name.trim(), email.toLowerCase(), role, 'active']
          )
        }
      } catch (e) {
        console.error('tenant_users mirror insert failed:', e)
      }

      return res.status(201).json({
        success: true,
        data: r.rows[0],
        generatedPassword: rawPassword,
      })
    } catch (error) {
      console.error('tenant-admins POST error:', error)
      return res.status(500).json({ success: false, error: 'Internal server error' })
    }
  }

  // ── PUT: reset tenant admin password ──────────────────────────────────────
  if (req.method === 'PUT') {
    const body = req.body || {}
    const { id, password } = typeof body === 'string' ? JSON.parse(body) : body

    if (!id) {
      return res.status(400).json({ success: false, error: 'id is required' })
    }

    if (password !== undefined && (typeof password !== 'string' || password.trim().length < 6)) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' })
    }

    try {
      const newPassword = password && password.trim().length >= 6
        ? password.trim()
        : `reset_${Math.random().toString(36).slice(2, 10)}`
      const passwordHash = await hashPassword(newPassword)

      const r = await poolQuery(
        `UPDATE staff SET password_hash = $1
         WHERE id = $2 AND role = ANY($3)
         RETURNING id, staff_id AS "staffId", name, email, role,
           department AS "tenantId", status, phone, created_at AS "createdAt"`,
        [passwordHash, id, ADMIN_ROLES]
      )
      if (r.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Admin not found' })
      }
      return res.json({ success: true, data: r.rows[0], generatedPassword: newPassword })
    } catch (error) {
      console.error('tenant-admins PUT error:', error)
      return res.status(500).json({ success: false, error: 'Internal server error' })
    }
  }

  // ── PATCH: update tenant admin status ─────────────────────────────────────
  if (req.method === 'PATCH') {
    const body = req.body || {}
    const { id, status } = typeof body === 'string' ? JSON.parse(body) : body

    if (!id || !status) {
      return res.status(400).json({ success: false, error: 'id and status are required' })
    }
    const allowed = ['active', 'inactive', 'on_leave', 'suspended']
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: `status must be one of: ${allowed.join(', ')}` })
    }

    try {
      const r = await poolQuery(
        `UPDATE staff SET status = $1
         WHERE id = $2 AND role = ANY($3)
         RETURNING id, staff_id AS "staffId", name, email, role,
           department AS "tenantId", status, phone, created_at AS "createdAt"`,
        [status, id, ADMIN_ROLES]
      )
      if (r.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Tenant admin not found' })
      }

      // Sync tenant_users status
      try {
        const userStatus = status === 'active' ? 'active' : 'suspended'
        await poolQuery(
          'UPDATE tenant_users SET status = $1 WHERE email = $2',
          [userStatus, r.rows[0].email.toLowerCase()]
        )
      } catch (e) {
        console.error('tenant_users status sync failed:', e)
      }

      return res.json({ success: true, data: r.rows[0] })
    } catch (error) {
      console.error('tenant-admins PATCH error:', error)
      return res.status(500).json({ success: false, error: 'Internal server error' })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
