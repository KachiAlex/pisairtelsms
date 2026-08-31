import type { VercelRequest, VercelResponse } from '@vercel/node'
import { poolQuery } from '../_lib/pg-pool.js'
import { requireRole } from '../_lib/auth-middleware.js'

async function ensureTenantsTable() {
  try {
    await poolQuery(`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY DEFAULT cuid(),
        name TEXT NOT NULL,
        domain TEXT UNIQUE,
        subscription_plan TEXT DEFAULT 'starter',
        region TEXT DEFAULT 'global',
        usage_percent INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        open_alerts INTEGER DEFAULT 0,
        last_sync_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // Ensure subscription_plan column exists for older tables
    await poolQuery(`
      ALTER TABLE tenants 
      ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'starter',
      ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'global',
      ADD COLUMN IF NOT EXISTS usage_percent INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS open_alerts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP
    `)
  } catch (err) {
    console.error('ensureTenantsTable error:', err)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const decoded = await requireRole(req, res, ['super_admin', 'tenant_admin'])
    if (!decoded) return

    try {
      await ensureTenantsTable()
      const r = await poolQuery(
        `SELECT id, name, subscription_plan AS subscription, region,
          COALESCE(usage_percent, 0)::int AS usage, status,
          TO_CHAR(last_sync_at, 'HH24:MI') AS "lastSync",
          COALESCE(open_alerts, 0)::int AS alerts
        FROM tenants ORDER BY name ASC`
      )
      return res.json({ success: true, data: r.rows })
    } catch (error) {
      console.error('tenants-handler error:', error)
      return res.status(500).json({ success: false, error: 'Internal server error' })
    }
  }

  if (req.method === 'POST') {
    const decoded = await requireRole(req, res, ['super_admin'])
    if (!decoded) return

    const { name, subscription = 'starter', region = 'global' } = req.body || {}
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Tenant name is required (min 2 chars)' })
    }

    const allowedPlans = ['starter', 'standard', 'premium']
    if (!allowedPlans.includes(subscription.toLowerCase())) {
      return res.status(400).json({ success: false, error: `subscription must be one of: ${allowedPlans.join(', ')}` })
    }

    try {
      await ensureTenantsTable()
      const r = await poolQuery(
        `INSERT INTO tenants (name, subscription_plan, region, status)
         VALUES ($1, $2, $3, 'active')
         RETURNING id, name, subscription_plan AS subscription, region,
           usage_percent AS usage, status,
           TO_CHAR(last_sync_at, 'HH24:MI') AS "lastSync", open_alerts AS alerts`,
        [name.trim(), subscription, region]
      )
      return res.status(201).json({ success: true, data: r.rows[0] })
    } catch (error) {
      console.error('tenants-handler POST error:', error)
      return res.status(500).json({ success: false, error: 'Internal server error' })
    }
  }

  if (req.method === 'PATCH') {
    const decoded = await requireRole(req, res, ['super_admin'])
    if (!decoded) return

    const { id, status } = req.body || {}
    if (!id || !status) {
      return res.status(400).json({ success: false, error: 'id and status are required' })
    }
    const allowed = ['active', 'suspended', 'provisioning', 'degraded']
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: `status must be one of: ${allowed.join(', ')}` })
    }

    try {
      await ensureTenantsTable()
      const r = await poolQuery(
        `UPDATE tenants SET status = $1 WHERE id = $2
         RETURNING id, name, subscription_plan AS subscription, region,
           usage_percent AS usage, status,
           TO_CHAR(last_sync_at, 'HH24:MI') AS "lastSync", open_alerts AS alerts`,
        [status, id]
      )
      if (r.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Tenant not found' })
      }
      return res.json({ success: true, data: r.rows[0] })
    } catch (error) {
      console.error('tenants-handler PATCH error:', error)
      return res.status(500).json({ success: false, error: 'Internal server error' })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
