import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireRole } from '../_lib/auth-middleware.js';

/**
 * Alerts / System-Alerts API Handler
 * Routes:
 *   GET    /api/tenant/alerts                           - List active alerts
 *   POST   /api/tenant/alerts                           - Create alert
 *   GET    /api/tenant/alerts/statistics/summary        - Get metrics (open, resolved, MTTR)
 *   GET    /api/tenant/alerts/channels                  - Channel health list
 *   POST   /api/tenant/alerts/channels                  - Upsert channel health
 *   GET    /api/tenant/alerts/maintenance               - Maintenance windows
 *   POST   /api/tenant/alerts/maintenance               - Create maintenance window
 *   POST   /api/tenant/alerts/:id/acknowledge           - Acknowledge alert
 *   POST   /api/tenant/alerts/:id/resolve               - Resolve alert
 *   GET    /api/tenant/alerts/:id                       - Get alert by ID
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Require authentication - only staff or tenant_admin can access tenant alerts
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId =
    (req.headers['x-tenant-id'] as string) ||
    (req.query.tenantId as string) ||
    'default-tenant';

  const userId =
    (req.headers['x-user-id'] as string) ||
    (req.query.userId as string) ||
    'system';

  const { id, action, sub } = req.query;
  const idStr    = Array.isArray(id)     ? id[0]     : id;
  const actionStr = Array.isArray(action) ? action[0] : action;
  const subStr   = Array.isArray(sub)    ? sub[0]    : sub;

  try {
    // ─── GET /api/tenant/alerts/statistics/summary ────────────────────────
    if (req.method === 'GET' && idStr === 'statistics' && subStr === 'summary') {
      const r = await sql.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'active')   as open_incidents,
           COUNT(*) FILTER (WHERE status = 'resolved' AND resolved_at >= CURRENT_DATE) as resolved_today,
           AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60)
             FILTER (WHERE status = 'resolved' AND resolved_at IS NOT NULL) as avg_mttr
         FROM system_alerts WHERE tenant_id = $1`,
        [tenantId]
      );
      const ch = await sql.query(
        `SELECT id, channel, status, latency, uptime FROM channel_health WHERE tenant_id = $1 ORDER BY channel`,
        [tenantId]
      );
      const row = r.rows[0];
      return res.status(200).json({
        success: true,
        data: {
          openIncidents:    parseInt(row.open_incidents   || '0'),
          resolvedToday:    parseInt(row.resolved_today   || '0'),
          avgMttr:          row.avg_mttr ? `${Math.round(parseFloat(row.avg_mttr))} mins` : '0 mins',
          pagerDutyCoverage: '100%',
          channelHealth:    ch.rows,
        },
      });
    }

    // ─── GET /api/tenant/alerts/channels ─────────────────────────────────
    if (req.method === 'GET' && idStr === 'channels') {
      const result = await sql.query(
        `SELECT id, channel, status, latency, uptime, last_checked FROM channel_health WHERE tenant_id = $1 ORDER BY channel`,
        [tenantId]
      );
      return res.status(200).json({ success: true, data: result.rows });
    }

    // ─── POST /api/tenant/alerts/channels ────────────────────────────────
    if (req.method === 'POST' && idStr === 'channels') {
      const { channel, status, latency, uptime } = req.body || {};
      if (!channel || !status)
        return res.status(400).json({ success: false, error: 'channel and status required' });
      const result = await sql.query(
        `INSERT INTO channel_health (id, tenant_id, channel, status, latency, uptime, last_checked, created_at, updated_at)
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW(), NOW(), NOW())
         ON CONFLICT (tenant_id, channel)
         DO UPDATE SET status=EXCLUDED.status, latency=EXCLUDED.latency, uptime=EXCLUDED.uptime, last_checked=NOW(), updated_at=NOW()
         RETURNING *`,
        [tenantId, channel, status, latency || null, uptime ?? 99.9]
      );
      return res.status(201).json({ success: true, data: result.rows[0] });
    }

    // ─── GET /api/tenant/alerts/maintenance ──────────────────────────────
    if (req.method === 'GET' && idStr === 'maintenance') {
      const result = await sql.query(
        `SELECT id, label, window_start, window_end, owner, status, notified
         FROM maintenance_windows WHERE tenant_id = $1 ORDER BY window_start ASC`,
        [tenantId]
      );
      return res.status(200).json({ success: true, data: result.rows });
    }

    // ─── POST /api/tenant/alerts/maintenance ─────────────────────────────
    if (req.method === 'POST' && idStr === 'maintenance') {
      const { label, windowStart, windowEnd, owner } = req.body || {};
      if (!label || !windowStart || !windowEnd || !owner)
        return res.status(400).json({ success: false, error: 'label, windowStart, windowEnd, owner required' });
      const result = await sql.query(
        `INSERT INTO maintenance_windows (id, tenant_id, label, window_start, window_end, owner, status, notified, created_at, updated_at)
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, 'scheduled', false, NOW(), NOW()) RETURNING *`,
        [tenantId, label, windowStart, windowEnd, owner]
      );
      return res.status(201).json({ success: true, data: result.rows[0] });
    }

    // ─── POST /api/tenant/alerts/:id/acknowledge ─────────────────────────
    if (req.method === 'POST' && idStr && actionStr === 'acknowledge') {
      const result = await sql.query(
        `UPDATE system_alerts SET status = 'acknowledged', updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2 RETURNING *`,
        [tenantId, idStr]
      );
      if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Not found' });
      return res.status(200).json({ success: true, data: result.rows[0] });
    }

    // ─── POST /api/tenant/alerts/:id/resolve ─────────────────────────────
    if (req.method === 'POST' && idStr && actionStr === 'resolve') {
      const result = await sql.query(
        `UPDATE system_alerts SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2 RETURNING *`,
        [tenantId, idStr]
      );
      if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Not found' });
      return res.status(200).json({ success: true, data: result.rows[0] });
    }

    // ─── GET /api/tenant/alerts/:id ────────────────────────────────────
    if (req.method === 'GET' && idStr && !actionStr) {
      const result = await sql.query(
        `SELECT * FROM system_alerts WHERE tenant_id = $1 AND id = $2`,
        [tenantId, idStr]
      );
      if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Not found' });
      return res.status(200).json({ success: true, data: result.rows[0] });
    }

    // ─── GET /api/tenant/alerts ─────────────────────────────────────────
    if (req.method === 'GET') {
      const limit    = parseInt((req.query.limit    as string) || '50');
      const offset   = parseInt((req.query.offset   as string) || '0');
      const severity = req.query.severity as string | undefined;
      const status   = (req.query.status as string) || 'active';

      let query = `SELECT id, title, impact, owner, severity, eta, status, resolved_at, created_at
                   FROM system_alerts WHERE tenant_id = $1`;
      const params: any[] = [tenantId];
      let p = 2;
      if (status)   { query += ` AND status = $${p++}`;   params.push(status); }
      if (severity) { query += ` AND severity = $${p++}`; params.push(severity); }
      query += ` ORDER BY created_at DESC LIMIT $${p++} OFFSET $${p++}`;
      params.push(limit, offset);

      const result = await sql.query(query, params);
      return res.status(200).json({ success: true, data: result.rows });
    }

    // ─── POST /api/tenant/alerts ────────────────────────────────────────
    if (req.method === 'POST') {
      const { title, impact, owner, severity = 'medium', eta } = req.body || {};
      if (!title)
        return res.status(400).json({ success: false, error: 'title required' });
      const result = await sql.query(
        `INSERT INTO system_alerts (id, tenant_id, title, impact, owner, severity, eta, status, created_at, updated_at)
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, 'active', NOW(), NOW()) RETURNING *`,
        [tenantId, title, impact || null, owner || null, severity, eta || null]
      );
      return res.status(201).json({ success: true, data: result.rows[0] });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('[alerts-handler]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ success: false, error: message });
  }
}
