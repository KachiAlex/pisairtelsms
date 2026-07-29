import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../_lib/auth-middleware.js'

async function ensureTenantsTable() {
  }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const decoded = await requireRole(req, res, ['super_admin', 'tenant_admin'])
    if (!decoded) return

    try {
      await ensureTenantsTable()
      const r = await sql`
        SELECT
          id,
          name,
          subscription_plan AS subscription,
          region,
          COALESCE(usage_percent, 0)::int AS usage,
          status,
          TO_CHAR(last_sync_at, 'HH24:MI') AS "lastSync",
          COALESCE(open_alerts, 0)::int AS alerts
        FROM tenants
        ORDER BY name ASC`
      return res.json({ success: true, data: r.rows })
    } catch (error) {
      console.error('tenants-handler error:', error)
      return res.status(500).json({ success: false, error: 'Internal server error' })
    }
  }

  if (req.method === 'POST') {
    const decoded = await requireRole(req, res, ['super_admin'])
    if (!decoded) return

    const { name, subscription = 'basic', region = 'global' } = req.body || {}
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Tenant name is required (min 2 chars)' })
    }

    try {
      await ensureTenantsTable()
      const r = await sql`
        INSERT INTO tenants (name, subscription_plan, region, status)
        VALUES (${name.trim()}, ${subscription}, ${region}, 'active')
        RETURNING id, name, subscription_plan AS subscription, region, usage_percent AS usage, status, TO_CHAR(last_sync_at, 'HH24:MI') AS "lastSync", open_alerts AS alerts
      `
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
      const r = await sql`
        UPDATE tenants SET status = ${status}
        WHERE id = ${id}
        RETURNING
          id, name, subscription_plan AS subscription, region,
          usage_percent AS usage, status, TO_CHAR(last_sync_at, 'HH24:MI') AS "lastSync",
          open_alerts AS alerts
      `
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
