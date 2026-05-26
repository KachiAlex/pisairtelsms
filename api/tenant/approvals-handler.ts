import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireRole } from '../_lib/auth-middleware';

/**
 * Approvals API Handler
 * Routes:
 *   GET    /api/tenant/approvals                    - List approval requests
 *   POST   /api/tenant/approvals                    - Create approval request
 *   GET    /api/tenant/approvals/statistics         - Get statistics
 *   GET    /api/tenant/approvals/streams            - List approval streams
 *   POST   /api/tenant/approvals/streams            - Create approval stream
 *   GET    /api/tenant/approvals/breaches           - List SLA breaches
 *   POST   /api/tenant/approvals/breaches           - Create SLA breach
 *   GET    /api/tenant/approvals/workloads          - List reviewer workloads
 *   POST   /api/tenant/approvals/workloads          - Update reviewer workload
 *   POST   /api/tenant/approvals/bulk-approve       - Bulk approve
 *   POST   /api/tenant/approvals/bulk-reject        - Bulk reject
 *   POST   /api/tenant/approvals/:id/approve        - Approve single
 *   POST   /api/tenant/approvals/:id/reject         - Reject single
 *   GET    /api/tenant/approvals/:id/history        - Get approval history
 *   GET    /api/tenant/approvals/:id                - Get approval by ID
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Require authentication - only staff or tenant_admin can access tenant approvals
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

  const { id, action } = req.query;
  const idStr = Array.isArray(id) ? id[0] : id;
  const actionStr = Array.isArray(action) ? action[0] : action;

  try {
    // ─── GET /api/tenant/approvals/statistics ───────────────────────────────
    if (req.method === 'GET' && idStr === 'statistics') {
      const statsResult = await sql.query(
        `SELECT
           COUNT(*) FILTER (WHERE status IN ('pending','in_review','queued')) as items_awaiting,
           COUNT(*) FILTER (WHERE status = 'escalated') as escalations
         FROM approval_requests WHERE tenant_id = $1`,
        [tenantId]
      );
      const slaResult = await sql.query(
        `SELECT
           COUNT(*) FILTER (WHERE sla_deadline >= NOW() OR status = 'approved') as within_sla,
           COUNT(*) as total
         FROM approval_requests
         WHERE tenant_id = $1 AND submitted_at >= CURRENT_DATE - INTERVAL '30 days'`,
        [tenantId]
      );
      const breachResult = await sql.query(
        `SELECT COUNT(*) as count FROM sla_breaches WHERE tenant_id = $1 AND resolved_at IS NULL`,
        [tenantId]
      );
      const fastestResult = await sql.query(
        `SELECT type,
           AVG(EXTRACT(EPOCH FROM (approved_at - submitted_at))/60) as avg_mins
         FROM approval_requests
         WHERE tenant_id = $1 AND status = 'approved' AND approved_at IS NOT NULL
         GROUP BY type ORDER BY avg_mins ASC LIMIT 1`,
        [tenantId]
      );
      const r = statsResult.rows[0];
      const s = slaResult.rows[0];
      const slaCompliance = s.total > 0 ? Math.round((s.within_sla / s.total) * 100) : 0;
      const fastest = fastestResult.rows[0];
      return res.status(200).json({
        success: true,
        data: {
          itemsAwaitingAction: parseInt(r.items_awaiting || '0'),
          withinSla: slaCompliance,
          escalationsOpen: parseInt(breachResult.rows[0]?.count || '0'),
          fastestStream: fastest?.type || 'N/A',
          avgTurnaround: fastest?.avg_mins ? `${Math.round(parseFloat(fastest.avg_mins))}m` : 'N/A',
        },
      });
    }

    // ─── GET /api/tenant/approvals/streams ──────────────────────────────────
    if (req.method === 'GET' && idStr === 'streams') {
      const result = await sql.query(
        `SELECT id, surface, owner, sla_hours, risk, created_at, updated_at
         FROM approval_streams WHERE tenant_id = $1 ORDER BY surface`,
        [tenantId]
      );
      const withCounts = await Promise.all(
        result.rows.map(async (stream: any) => {
          const c = await sql.query(
            `SELECT COUNT(*) as pending FROM approval_requests
             WHERE tenant_id = $1 AND type = $2 AND status = 'pending'`,
            [tenantId, stream.surface]
          );
          return { ...stream, pending: parseInt(c.rows[0]?.pending || '0') };
        })
      );
      return res.status(200).json({ success: true, data: withCounts });
    }

    // ─── POST /api/tenant/approvals/streams ─────────────────────────────────
    if (req.method === 'POST' && idStr === 'streams') {
      const { surface, owner, slaHours, risk = 'low' } = req.body || {};
      if (!surface || !owner || !slaHours)
        return res.status(400).json({ success: false, error: 'surface, owner and slaHours required' });
      const result = await sql.query(
        `INSERT INTO approval_streams (id, tenant_id, surface, owner, sla_hours, risk, created_at, updated_at)
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
        [tenantId, surface, owner, slaHours, risk]
      );
      return res.status(201).json({ success: true, data: result.rows[0] });
    }

    // ─── GET /api/tenant/approvals/breaches ─────────────────────────────────
    if (req.method === 'GET' && idStr === 'breaches') {
      const result = await sql.query(
        `SELECT id, label, owner, severity, breach_minutes, resolved_at, created_at
         FROM sla_breaches WHERE tenant_id = $1 AND resolved_at IS NULL ORDER BY created_at DESC`,
        [tenantId]
      );
      return res.status(200).json({ success: true, data: result.rows });
    }

    // ─── POST /api/tenant/approvals/breaches ────────────────────────────────
    if (req.method === 'POST' && idStr === 'breaches') {
      const { label, owner, severity = 'warning', breachMinutes } = req.body || {};
      if (!label || !owner)
        return res.status(400).json({ success: false, error: 'label and owner required' });
      const result = await sql.query(
        `INSERT INTO sla_breaches (id, tenant_id, label, owner, severity, breach_minutes, created_at)
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW()) RETURNING *`,
        [tenantId, label, owner, severity, breachMinutes || null]
      );
      return res.status(201).json({ success: true, data: result.rows[0] });
    }

    // ─── GET /api/tenant/approvals/workloads ────────────────────────────────
    if (req.method === 'GET' && idStr === 'workloads') {
      const result = await sql.query(
        `SELECT id, reviewer, pending_count, eta, last_updated
         FROM reviewer_workloads WHERE tenant_id = $1 ORDER BY pending_count DESC`,
        [tenantId]
      );
      return res.status(200).json({ success: true, data: result.rows });
    }

    // ─── POST /api/tenant/approvals/workloads ───────────────────────────────
    if (req.method === 'POST' && idStr === 'workloads') {
      const { reviewer, pendingCount, eta } = req.body || {};
      if (!reviewer)
        return res.status(400).json({ success: false, error: 'reviewer required' });
      const result = await sql.query(
        `INSERT INTO reviewer_workloads (id, tenant_id, reviewer, pending_count, eta, last_updated)
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW())
         ON CONFLICT (tenant_id, reviewer)
         DO UPDATE SET pending_count = EXCLUDED.pending_count, eta = EXCLUDED.eta, last_updated = NOW()
         RETURNING *`,
        [tenantId, reviewer, pendingCount || 0, eta || null]
      );
      return res.status(201).json({ success: true, data: result.rows[0] });
    }

    // ─── POST /api/tenant/approvals/bulk-approve ────────────────────────────
    if (req.method === 'POST' && idStr === 'bulk-approve') {
      const { ids } = req.body || {};
      if (!Array.isArray(ids))
        return res.status(400).json({ success: false, error: 'ids array required' });
      await sql.query(
        `UPDATE approval_requests SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
         WHERE tenant_id = $2 AND id = ANY($3::text[])`,
        [userId, tenantId, ids]
      );
      return res.status(200).json({ success: true, count: ids.length });
    }

    // ─── POST /api/tenant/approvals/bulk-reject ─────────────────────────────
    if (req.method === 'POST' && idStr === 'bulk-reject') {
      const { ids, reason } = req.body || {};
      if (!Array.isArray(ids))
        return res.status(400).json({ success: false, error: 'ids array required' });
      await sql.query(
        `UPDATE approval_requests SET status = 'rejected', rejection_reason = $1, updated_at = NOW()
         WHERE tenant_id = $2 AND id = ANY($3::text[])`,
        [reason || '', tenantId, ids]
      );
      return res.status(200).json({ success: true, count: ids.length });
    }

    // ─── POST /api/tenant/approvals/:id/approve ─────────────────────────────
    if (req.method === 'POST' && idStr && actionStr === 'approve') {
      const result = await sql.query(
        `UPDATE approval_requests SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
         WHERE tenant_id = $2 AND id = $3 RETURNING *`,
        [userId, tenantId, idStr]
      );
      if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Not found' });
      return res.status(200).json({ success: true, data: result.rows[0] });
    }

    // ─── POST /api/tenant/approvals/:id/reject ──────────────────────────────
    if (req.method === 'POST' && idStr && actionStr === 'reject') {
      const { reason } = req.body || {};
      const result = await sql.query(
        `UPDATE approval_requests SET status = 'rejected', rejection_reason = $1, updated_at = NOW()
         WHERE tenant_id = $2 AND id = $3 RETURNING *`,
        [reason || '', tenantId, idStr]
      );
      if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Not found' });
      return res.status(200).json({ success: true, data: result.rows[0] });
    }

    // ─── GET /api/tenant/approvals/:id/history ──────────────────────────────
    if (req.method === 'GET' && idStr && actionStr === 'history') {
      return res.status(200).json({ success: true, data: [] });
    }

    // ─── GET /api/tenant/approvals/:id ──────────────────────────────────────
    if (req.method === 'GET' && idStr && !actionStr) {
      const result = await sql.query(
        `SELECT * FROM approval_requests WHERE tenant_id = $1 AND id = $2`,
        [tenantId, idStr]
      );
      if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Not found' });
      return res.status(200).json({ success: true, data: result.rows[0] });
    }

    // ─── GET /api/tenant/approvals ──────────────────────────────────────────
    if (req.method === 'GET') {
      const limit = parseInt((req.query.limit as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      const type = req.query.type as string | undefined;
      const status = req.query.status as string | undefined;

      let query = `SELECT id, type, requester, submitted_at, sla_deadline, status, approved_by, approved_at, rejection_reason, created_at
                   FROM approval_requests WHERE tenant_id = $1`;
      const params: any[] = [tenantId];
      let p = 2;
      if (status) { query += ` AND status = $${p++}`; params.push(status); }
      if (type)   { query += ` AND type = $${p++}`;   params.push(type); }
      query += ` ORDER BY submitted_at DESC LIMIT $${p++} OFFSET $${p++}`;
      params.push(limit, offset);

      const result = await sql.query(query, params);
      return res.status(200).json({ success: true, data: result.rows });
    }

    // ─── POST /api/tenant/approvals ─────────────────────────────────────────
    if (req.method === 'POST') {
      const { type, requester, slaHours } = req.body || {};
      if (!type || !requester)
        return res.status(400).json({ success: false, error: 'type and requester required' });
      const slaDeadline = slaHours ? new Date(Date.now() + slaHours * 3600000) : null;
      const result = await sql.query(
        `INSERT INTO approval_requests (id, tenant_id, type, requester, submitted_at, sla_deadline, status, created_at, updated_at)
         VALUES (gen_random_uuid()::text, $1, $2, $3, NOW(), $4, 'pending', NOW(), NOW()) RETURNING *`,
        [tenantId, type, requester, slaDeadline]
      );
      return res.status(201).json({ success: true, data: result.rows[0] });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('[approvals-handler]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ success: false, error: message });
  }
}
