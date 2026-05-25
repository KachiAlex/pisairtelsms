import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../_lib/auth-middleware'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  // Require authentication - only super_admin or tenant_admin can access admin endpoints
  const decoded = requireRole(req, res, ['super_admin', 'tenant_admin'])
  if (!decoded) return

  try {
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
