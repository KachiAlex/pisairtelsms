import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { poolQuery } from '../_lib/pg-pool.js'
import { requireRole } from '../_lib/auth-middleware.js'

async function ensureAdminTables() {
  }

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET' && req.method !== 'PATCH') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const decoded = await requireRole(req, res, ['super_admin'])
  if (!decoded) return

  const action = req.query['action'] as string

  // PATCH /api/admin/provisioning-queue { id, status }
  if (req.method === 'PATCH') {
    if (action !== 'provisioning-queue') {
      return res.status(404).json({ success: false, error: 'Not found' })
    }
    const { id, status } = req.body || {}
    const allowed = ['pending', 'paused', 'completed']
    if (!id || !allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `id and status (${allowed.join('|')}) are required`,
      })
    }
    try {
      const r = await poolQuery(
        `UPDATE admin_provisioning_queue SET status = $1 WHERE id = $2
         RETURNING id, name, type, eta, owner, status, tenant_id AS "tenantId"`,
        [status, id]
      )
      if (r.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Queue item not found' })
      }
      const item = r.rows[0]

      // "Push live": completing a queued tenant that's still mid-provisioning
      // flips the tenant itself to active.
      if (status === 'completed' && item.tenantId) {
        await poolQuery(
          `UPDATE tenants SET status = 'active' WHERE id = $1 AND status = 'provisioning'`,
          [item.tenantId]
        ).catch((e) => console.error('tenant activate failed:', e))
      }

      await poolQuery(
        `INSERT INTO admin_audit_log (admin_id, admin_email, action, target_id, target_type, metadata)
         VALUES ($1, $2, $3, $4, 'provisioning_item', $5)`,
        [
          decoded.sub || 'super_admin', decoded.email,
          `provisioning.${status}`, item.tenantId || id,
          JSON.stringify({ name: item.name, status }),
        ]
      ).catch((e) => console.error('audit log failed:', e))

      return res.json({ success: true, data: item })
    } catch (error) {
      console.error('provisioning-queue PATCH error:', error)
      return res.status(500).json({ success: false, error: 'Internal server error' })
    }
  }

  try {
    await ensureAdminTables()
    if (action === 'provisioning-queue') {
      const r = await poolQuery(
        `SELECT id, name, type, eta, owner, status, tenant_id AS "tenantId"
         FROM admin_provisioning_queue
         WHERE status != 'completed' ORDER BY created_at DESC LIMIT 20`
      )
      return res.json({ success: true, data: r.rows })
    }

    if (action === 'activity-feed') {
      const r = await poolQuery(
        `SELECT id, title, meta FROM admin_activity_feed
         ORDER BY created_at DESC LIMIT 20`
      )
      return res.json({ success: true, data: r.rows })
    }

    if (action === 'incidents') {
      const r = await poolQuery(
        `SELECT id, title, impact, status,
           TO_CHAR(created_at, 'HH24:MI') AS timestamp
         FROM admin_incidents ORDER BY created_at DESC LIMIT 20`
      )
      return res.json({ success: true, data: r.rows })
    }

    if (action === 'audit-log') {
      const r = await poolQuery(
        `SELECT id, admin_id AS "adminId", admin_email AS "adminEmail",
           action, target_id AS "targetId", target_type AS "targetType",
           metadata,
           TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS timestamp
         FROM admin_audit_log ORDER BY created_at DESC LIMIT 50`
      )
      return res.json({ success: true, data: r.rows })
    }

    if (action === 'stats') {
      const active = await poolQuery<{ n: number }>('SELECT COUNT(*)::int AS n FROM tenants WHERE status = $1', ['active'])
      const pending = await poolQuery<{ n: number }>("SELECT COUNT(*)::int AS n FROM admin_provisioning_queue WHERE status != 'completed'")
      const alerts = await poolQuery<{ n: number }>("SELECT COUNT(*)::int AS n FROM admin_incidents WHERE status NOT IN ('Mitigated','Resolved')")
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
