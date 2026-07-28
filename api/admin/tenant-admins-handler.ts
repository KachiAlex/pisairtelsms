import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
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
      const r = tenantId
        ? await sql`
            SELECT
              id,
              staff_id AS "staffId",
              name,
              email,
              role,
              department AS "tenantId",
              status,
              phone,
              created_at AS "createdAt"
            FROM staff
            WHERE role = ANY(${ADMIN_ROLES})
              AND department = ${tenantId as string}
            ORDER BY name ASC
          `
        : await sql`
            SELECT
              id,
              staff_id AS "staffId",
              name,
              email,
              role,
              department AS "tenantId",
              status,
              phone,
              created_at AS "createdAt"
            FROM staff
            WHERE role = ANY(${ADMIN_ROLES})
            ORDER BY department ASC, name ASC
          `
      return res.json({ success: true, data: r.rows })
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
      const existing = await sql`SELECT id FROM staff WHERE email = ${email.toLowerCase()} LIMIT 1`
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

      const r = await sql`
        INSERT INTO staff (
          id, staff_id, name, role, department, status, email,
          phone, hire_date, password_hash
        )
        VALUES (
          ${id}, ${staffId}, ${name.trim()}, ${role}, ${tenantId},
          'active', ${email.toLowerCase()}, '', ${today}, ${passwordHash}
        )
        RETURNING
          id, staff_id AS "staffId", name, email, role,
          department AS "tenantId", status, phone, created_at AS "createdAt"
      `

      // Mirror into tenant_users so the admin appears in tenant user management
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS tenant_users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(255) NOT NULL DEFAULT 'default-tenant',
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            role VARCHAR(255) NOT NULL DEFAULT 'Staff',
            status VARCHAR(50) NOT NULL DEFAULT 'invited',
            last_active TIMESTAMP WITH TIME ZONE,
            invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `
        const existingUser = await sql`
          SELECT id FROM tenant_users WHERE email = ${email.toLowerCase()} LIMIT 1
        `
        if (existingUser.rows.length > 0) {
          await sql`
            UPDATE tenant_users
            SET tenant_id = ${tenantId}, name = ${name.trim()}, role = ${role}, status = 'active'
            WHERE email = ${email.toLowerCase()}
          `
        } else {
          await sql`
            INSERT INTO tenant_users (tenant_id, name, email, role, status)
            VALUES (${tenantId}, ${name.trim()}, ${email.toLowerCase()}, ${role}, 'active')
          `
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
    const { id } = typeof body === 'string' ? JSON.parse(body) : body

    if (!id) {
      return res.status(400).json({ success: false, error: 'id is required' })
    }

    try {
      const newPassword = `reset_${Math.random().toString(36).slice(2, 8)}`
      const passwordHash = await hashPassword(newPassword)

      const r = await sql`
        UPDATE staff SET password_hash = ${passwordHash}
        WHERE id = ${id} AND role = ANY(${ADMIN_ROLES})
        RETURNING
          id, staff_id AS "staffId", name, email, role,
          department AS "tenantId", status, phone, created_at AS "createdAt"
      `
      if (r.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Tenant admin not found' })
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
      const r = await sql`
        UPDATE staff SET status = ${status}
        WHERE id = ${id} AND role = ANY(${ADMIN_ROLES})
        RETURNING
          id, staff_id AS "staffId", name, email, role,
          department AS "tenantId", status, phone, created_at AS "createdAt"
      `
      if (r.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Tenant admin not found' })
      }

      // Sync tenant_users status
      try {
        const userStatus = status === 'active' ? 'active' : 'suspended'
        await sql`
          UPDATE tenant_users
          SET status = ${userStatus}
          WHERE email = ${r.rows[0].email.toLowerCase()}
        `
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
