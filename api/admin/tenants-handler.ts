import type { VercelRequest, VercelResponse } from '@vercel/node'
import { poolQuery, poolQueryOne } from '../_lib/pg-pool.js'
import { requireRole } from '../_lib/auth-middleware.js'
import { ensureStaffTables, hashPassword } from '../tenant/_lib/staff.js'

function generateSubdomain(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 50)
}

async function logAudit(
  adminId: string,
  adminEmail: string | undefined,
  action: string,
  targetId: string | null,
  targetType: string,
  metadata: Record<string, any> = {}
) {
  try {
    await poolQuery(
      `INSERT INTO admin_audit_log (admin_id, admin_email, action, target_id, target_type, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [adminId, adminEmail, action, targetId, targetType, JSON.stringify(metadata)]
    )
  } catch (e) {
    console.error('audit log failed:', e)
  }
}

const TENANT_FIELDS = `
  id, name, subscription_plan AS subscription, region,
  COALESCE(usage_percent, 0)::int AS usage, status,
  TO_CHAR(last_sync_at, 'HH24:MI') AS "lastSync",
  COALESCE(open_alerts, 0)::int AS alerts,
  subdomain, contact_email AS "contactEmail", contact_phone AS "contactPhone", address,
  trial_starts_at AS "trialStartsAt", trial_ends_at AS "trialEndsAt", billing_status AS "billingStatus",
  max_students AS "maxStudents", max_staff AS "maxStaff",
  TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS "createdAt"
`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GET: list tenants or single tenant by id
  if (req.method === 'GET') {
    const decoded = await requireRole(req, res, ['super_admin', 'tenant_admin'])
    if (!decoded) return

    try {
      const { id } = req.query
      if (id) {
        const r = await poolQueryOne(
          `SELECT ${TENANT_FIELDS} FROM tenants WHERE id = $1`,
          [id as string]
        )
        if (!r) return res.status(404).json({ success: false, error: 'Tenant not found' })
        return res.json({ success: true, data: r })
      }

      const r = await poolQuery(`SELECT ${TENANT_FIELDS} FROM tenants WHERE status != 'archived' ORDER BY name ASC`)
      return res.json({ success: true, data: r.rows })
    } catch (error) {
      console.error('tenants-handler GET error:', error)
      return res.status(500).json({ success: false, error: 'Internal server error' })
    }
  }

  // POST: provision a new tenant
  if (req.method === 'POST') {
    const decoded = await requireRole(req, res, ['super_admin'])
    if (!decoded) return

    const body = req.body || {}
    const {
      name,
      subscription = 'starter',
      region = 'global',
      subdomain,
      contactEmail,
      contactPhone,
      address,
      adminName,
      adminEmail,
      adminPassword,
      trialDays,
    } = body

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Tenant name is required (min 2 chars)' })
    }

    try {
      const finalSubdomain = (subdomain || generateSubdomain(name)).toLowerCase()

      // Check subdomain uniqueness
      const existing = await poolQuery('SELECT id FROM tenants WHERE subdomain = $1', [finalSubdomain])
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'Subdomain already taken' })
      }

      // Compute trial dates
      let trialStartsAt: string | null = null
      let trialEndsAt: string | null = null
      if (trialDays && typeof trialDays === 'number' && trialDays > 0) {
        trialStartsAt = new Date().toISOString()
        trialEndsAt = new Date(Date.now() + trialDays * 86400000).toISOString()
      }

      // Create tenant
      const r = await poolQuery(
        `INSERT INTO tenants (name, subscription_plan, region, status, subdomain, contact_email, contact_phone, address, trial_starts_at, trial_ends_at)
         VALUES ($1, $2, $3, 'active', $4, $5, $6, $7, $8, $9)
         RETURNING ${TENANT_FIELDS}`,
        [
          name.trim(), subscription, region, finalSubdomain,
          contactEmail || null, contactPhone || null, address || null,
          trialStartsAt, trialEndsAt,
        ]
      )
      const tenant = r.rows[0]

      // Add to provisioning queue
      try {
        await poolQuery(
          `INSERT INTO admin_provisioning_queue (name, type, eta, owner, status)
           VALUES ($1, 'tenant', 'pending', $2, 'pending')`,
          [name.trim(), decoded.email || 'super_admin']
        )
      } catch (e) {
        console.error('provisioning queue insert failed:', e)
      }

      // Create initial admin if provided
      let generatedPassword: string | null = null
      if (adminName && adminEmail) {
        try {
          await ensureStaffTables()
          const staffId = `staff_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
          const staffNum = `STF${Date.now().toString().slice(-6)}`
          const rawPassword = adminPassword && adminPassword.trim().length >= 6
            ? adminPassword.trim()
            : `${adminName.split(' ')[0].toLowerCase()}@${Date.now().toString().slice(-4)}`
          const passwordHash = await hashPassword(rawPassword)
          const today = new Date().toISOString().split('T')[0]

          await poolQuery(
            `INSERT INTO staff (id, staff_id, name, role, department, tenant_id, status, email, phone, hire_date, password_hash)
             VALUES ($1, $2, $3, 'tenant_admin', $4, $4, 'active', $5, '', $6, $7)`,
            [staffId, staffNum, adminName.trim(), tenant.id, adminEmail.toLowerCase(), today, passwordHash]
          )

          // Mirror into tenant_users
          await poolQuery(
            `INSERT INTO tenant_users (tenant_id, name, email, role, status)
             VALUES ($1, $2, $3, 'tenant_admin', 'active')
             ON CONFLICT DO NOTHING`,
            [tenant.id, adminName.trim(), adminEmail.toLowerCase()]
          ).catch(() => {})

          generatedPassword = rawPassword
        } catch (e) {
          console.error('initial admin creation failed:', e)
        }
      }

      // Audit log
      await logAudit(decoded.sub || 'super_admin', decoded.email, 'tenant.create', tenant.id, 'tenant', {
        name: name.trim(), subscription, region, subdomain: finalSubdomain,
      })

      return res.status(201).json({
        success: true,
        data: tenant,
        generatedPassword,
      })
    } catch (error) {
      console.error('tenants-handler POST error:', error)
      return res.status(500).json({ success: false, error: 'Internal server error' })
    }
  }

  // PATCH: update tenant (status, plan, billing, contact, limits)
  if (req.method === 'PATCH') {
    const decoded = await requireRole(req, res, ['super_admin'])
    if (!decoded) return

    const body = req.body || {}
    const { id, status, subscription, billingStatus, maxStudents, maxStaff, contactEmail, contactPhone, address } = body

    if (!id) {
      return res.status(400).json({ success: false, error: 'id is required' })
    }

    try {
      const updates: string[] = []
      const values: any[] = []
      let paramIdx = 1

      if (status) {
        const allowed = ['active', 'suspended', 'provisioning', 'degraded', 'archived']
        if (!allowed.includes(status)) {
          return res.status(400).json({ success: false, error: `status must be one of: ${allowed.join(', ')}` })
        }
        updates.push(`status = $${paramIdx++}`)
        values.push(status)
        if (status === 'archived') {
          updates.push(`archived_at = $${paramIdx++}`)
          values.push(new Date().toISOString())
        }
      }

      if (subscription) {
        updates.push(`subscription_plan = $${paramIdx++}`)
        values.push(subscription)
      }

      if (billingStatus) {
        updates.push(`billing_status = $${paramIdx++}`)
        values.push(billingStatus)
      }

      if (maxStudents !== undefined) {
        updates.push(`max_students = $${paramIdx++}`)
        values.push(maxStudents)
      }

      if (maxStaff !== undefined) {
        updates.push(`max_staff = $${paramIdx++}`)
        values.push(maxStaff)
      }

      if (contactEmail !== undefined) {
        updates.push(`contact_email = $${paramIdx++}`)
        values.push(contactEmail || null)
      }

      if (contactPhone !== undefined) {
        updates.push(`contact_phone = $${paramIdx++}`)
        values.push(contactPhone || null)
      }

      if (address !== undefined) {
        updates.push(`address = $${paramIdx++}`)
        values.push(address || null)
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update' })
      }

      values.push(id)

      const r = await poolQuery(
        `UPDATE tenants SET ${updates.join(', ')} WHERE id = $${paramIdx}
         RETURNING ${TENANT_FIELDS}`,
        values
      )
      if (r.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Tenant not found' })
      }

      // Audit log
      const action = subscription ? 'tenant.plan_change' : status ? `tenant.${status}` : 'tenant.update'
      await logAudit(decoded.sub || 'super_admin', decoded.email, action, id, 'tenant', { status, subscription, billingStatus })

      return res.json({ success: true, data: r.rows[0] })
    } catch (error) {
      console.error('tenants-handler PATCH error:', error)
      return res.status(500).json({ success: false, error: 'Internal server error' })
    }
  }

  // DELETE: archive a tenant (soft delete)
  if (req.method === 'DELETE') {
    const decoded = await requireRole(req, res, ['super_admin'])
    if (!decoded) return

    const { id } = req.body || {}
    if (!id) {
      return res.status(400).json({ success: false, error: 'id is required' })
    }

    try {
      const r = await poolQuery(
        `UPDATE tenants SET status = 'archived', archived_at = NOW()
         WHERE id = $1 RETURNING id, name`,
        [id]
      )
      if (r.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Tenant not found' })
      }

      await logAudit(decoded.sub || 'super_admin', decoded.email, 'tenant.archive', id, 'tenant', { name: r.rows[0].name })

      return res.json({ success: true, data: r.rows[0] })
    } catch (error) {
      console.error('tenants-handler DELETE error:', error)
      return res.status(500).json({ success: false, error: 'Internal server error' })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
