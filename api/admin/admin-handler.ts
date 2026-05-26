import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../_lib/auth-middleware.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  // Require authentication - only super_admin or tenant_admin can access admin endpoints
  const decoded = requireRole(req, res, ['super_admin', 'tenant_admin'])
  if (!decoded) return

  const action = req.query['action'] as string

  try {
    if (action === 'provisioning-queue') {
      const r = await sql`
        SELECT id, name, type, eta, owner FROM admin_provisioning_queue
        WHERE status != 'completed' ORDER BY created_at DESC LIMIT 20`
      return res.json({ success: true, data: r.rows })
    }

    if (action === 'activity-feed') {
      const r = await sql`
        SELECT id, title, meta FROM admin_activity_feed
        ORDER BY created_at DESC LIMIT 20`
      return res.json({ success: true, data: r.rows })
    }

    if (action === 'incidents') {
      const r = await sql`
        SELECT id, title, impact, status,
               TO_CHAR(created_at, 'HH24:MI') AS timestamp
        FROM admin_incidents ORDER BY created_at DESC LIMIT 20`
      return res.json({ success: true, data: r.rows })
    }

    if (action === 'stats') {
      const active = await sql`SELECT COUNT(*)::int AS n FROM tenants WHERE status = 'active'`
      const pending = await sql`SELECT COUNT(*)::int AS n FROM admin_provisioning_queue WHERE status != 'completed'`
      const alerts = await sql`SELECT COUNT(*)::int AS n FROM admin_incidents WHERE status NOT IN ('Mitigated','Resolved')`
      return res.json({
        success: true,
        data: {
          activeTenants: active.rows[0]?.n ?? 0,
          pendingProvisioning: pending.rows[0]?.n ?? 0,
          complianceAlerts: alerts.rows[0]?.n ?? 0,
          overallHealth: '99%',
        },
      })
    }

    return res.status(404).json({ success: false, error: 'Not found' })
  } catch (error) {
    console.error('admin-handler error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
