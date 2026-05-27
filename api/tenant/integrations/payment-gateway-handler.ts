import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireRole } from '../../_lib/auth-middleware.js';

/**
 * Payment Gateway Integration API Handler
 * Routes:
 *   GET    /api/tenant/integrations/payment-gateway/config          - Get active config
 *   PUT    /api/tenant/integrations/payment-gateway/config          - Upsert config
 *   GET    /api/tenant/integrations/payment-gateway/transactions     - List transactions
 *   POST   /api/tenant/integrations/payment-gateway/transactions     - Record transaction
 *   GET    /api/tenant/integrations/payment-gateway/statistics       - Aggregated stats
 *   GET    /api/tenant/integrations/payment-gateway/webhooks         - Webhook logs
 *   POST   /api/tenant/integrations/payment-gateway/webhooks         - Log webhook event
 *   PUT    /api/tenant/integrations/payment-gateway/:id/status       - Update txn status
 */

async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS payment_gateway_configs (
      id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id       TEXT NOT NULL,
      provider        TEXT NOT NULL,
      mode            TEXT NOT NULL DEFAULT 'test',
      api_key         TEXT NOT NULL,
      secret_key      TEXT NOT NULL,
      webhook_url     TEXT,
      webhook_secret  TEXT,
      is_active       BOOLEAN NOT NULL DEFAULT true,
      created_by      TEXT,
      updated_by      TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS payment_gateway_transactions (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id     TEXT NOT NULL,
      gateway_id    TEXT,
      provider      TEXT NOT NULL,
      reference_id  TEXT NOT NULL,
      amount        NUMERIC(14,2) NOT NULL,
      currency      TEXT NOT NULL DEFAULT 'NGN',
      status        TEXT NOT NULL DEFAULT 'pending',
      student_id    TEXT,
      description   TEXT,
      metadata      JSONB,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS payment_gateway_webhook_logs (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id   TEXT NOT NULL,
      provider    TEXT NOT NULL,
      event       TEXT NOT NULL,
      payload     JSONB NOT NULL DEFAULT '{}',
      processed   BOOLEAN NOT NULL DEFAULT false,
      error       TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin']);
  if (!decoded) return;

  const tenantId =
    (req.headers['x-tenant-id'] as string) ||
    (req.query.tenantId as string) ||
    'default-tenant';

  const userId =
    (req.headers['x-user-id'] as string) ||
    (req.query.userId as string) ||
    'system';

  const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;

  try {
    await ensureTables();

    // ── GET /statistics ─────────────────────────────────────────────────────
    if (req.method === 'GET' && action === 'statistics') {
      const { rows } = await sql.query(
        `SELECT
           COALESCE(SUM(amount) FILTER (WHERE status = 'success'), 0)  AS total_amount,
           COUNT(*) FILTER (WHERE status = 'success')                   AS success_count,
           COUNT(*) FILTER (WHERE status = 'failed')                    AS failed_count,
           COUNT(*) FILTER (WHERE status = 'pending')                   AS pending_count,
           COUNT(*)                                                      AS total_transactions
         FROM payment_gateway_transactions
         WHERE tenant_id = $1`,
        [tenantId],
      );
      const r = rows[0];
      return res.status(200).json({
        data: {
          totalAmount:       parseFloat(r.total_amount),
          successCount:      parseInt(r.success_count),
          failedCount:       parseInt(r.failed_count),
          pendingCount:      parseInt(r.pending_count),
          totalTransactions: parseInt(r.total_transactions),
        },
      });
    }

    // ── GET /webhooks ────────────────────────────────────────────────────────
    if (req.method === 'GET' && action === 'webhooks') {
      const limit  = parseInt((req.query.limit  as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      const { rows } = await sql.query(
        `SELECT * FROM payment_gateway_webhook_logs
         WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [tenantId, limit, offset],
      );
      const total = await sql.query(
        `SELECT COUNT(*) AS total FROM payment_gateway_webhook_logs WHERE tenant_id = $1`,
        [tenantId],
      );
      return res.status(200).json({ data: rows, total: parseInt(total.rows[0].total), limit, offset });
    }

    // ── POST /webhooks ───────────────────────────────────────────────────────
    if (req.method === 'POST' && action === 'webhooks') {
      const { provider, event, payload } = req.body || {};
      const { rows } = await sql.query(
        `INSERT INTO payment_gateway_webhook_logs (tenant_id, provider, event, payload)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [tenantId, provider, event, JSON.stringify(payload || {})],
      );
      return res.status(201).json({ data: rows[0] });
    }

    // ── GET /transactions ────────────────────────────────────────────────────
    if (req.method === 'GET' && action === 'transactions') {
      const limit    = parseInt((req.query.limit    as string) || '50');
      const offset   = parseInt((req.query.offset   as string) || '0');
      const status   = req.query.status   as string | undefined;
      const provider = req.query.provider as string | undefined;

      let where = 'WHERE tenant_id = $1';
      const params: any[] = [tenantId];
      if (status)   { params.push(status);   where += ` AND status = $${params.length}`; }
      if (provider) { params.push(provider); where += ` AND provider = $${params.length}`; }

      const { rows } = await sql.query(
        `SELECT * FROM payment_gateway_transactions ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
      );
      const countRes = await sql.query(
        `SELECT COUNT(*) AS total FROM payment_gateway_transactions ${where}`,
        params,
      );
      return res.status(200).json({ data: rows, total: parseInt(countRes.rows[0].total), limit, offset });
    }

    // ── POST /transactions ───────────────────────────────────────────────────
    if (req.method === 'POST' && action === 'transactions') {
      const { gatewayId, provider, referenceId, amount, currency, status, studentId, description, metadata } = req.body || {};
      if (!provider || !referenceId || amount == null) {
        return res.status(400).json({ error: 'provider, referenceId and amount are required' });
      }
      const { rows } = await sql.query(
        `INSERT INTO payment_gateway_transactions
           (tenant_id, gateway_id, provider, reference_id, amount, currency, status, student_id, description, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [tenantId, gatewayId || null, provider, referenceId, amount,
         currency || 'NGN', status || 'pending', studentId || null,
         description || null, JSON.stringify(metadata || {})],
      );
      return res.status(201).json({ data: rows[0] });
    }

    // ── PUT /:id/status ──────────────────────────────────────────────────────
    if (req.method === 'PUT' && action === 'transaction-status' && id) {
      const { status, metadata } = req.body || {};
      const { rows } = await sql.query(
        `UPDATE payment_gateway_transactions
         SET status = COALESCE($1, status),
             metadata = CASE WHEN $2::jsonb IS NOT NULL
                             THEN COALESCE(metadata,'{}') || $2::jsonb
                             ELSE metadata END,
             updated_at = NOW()
         WHERE tenant_id = $3 AND id = $4
         RETURNING *`,
        [status || null, metadata ? JSON.stringify(metadata) : null, tenantId, id],
      );
      if (!rows[0]) return res.status(404).json({ error: 'Transaction not found' });
      return res.status(200).json({ data: rows[0] });
    }

    // ── GET /config ──────────────────────────────────────────────────────────
    if (req.method === 'GET' && action === 'config') {
      const { rows } = await sql.query(
        `SELECT * FROM payment_gateway_configs
         WHERE tenant_id = $1 AND is_active = true ORDER BY updated_at DESC LIMIT 1`,
        [tenantId],
      );
      return res.status(200).json({ data: rows[0] || null });
    }

    // ── PUT /config ───────────────────────────────────────────────────────────
    if (req.method === 'PUT' && action === 'config') {
      const { provider, mode, apiKey, secretKey, webhookUrl, webhookSecret } = req.body || {};
      if (!provider || !apiKey || !secretKey) {
        return res.status(400).json({ error: 'provider, apiKey and secretKey are required' });
      }
      await sql.query(
        `UPDATE payment_gateway_configs SET is_active = false WHERE tenant_id = $1`,
        [tenantId],
      );
      const { rows } = await sql.query(
        `INSERT INTO payment_gateway_configs
           (tenant_id, provider, mode, api_key, secret_key, webhook_url, webhook_secret, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING *`,
        [tenantId, provider, mode || 'test', apiKey, secretKey,
         webhookUrl || null, webhookSecret || null, userId],
      );
      return res.status(200).json({ data: rows[0] });
    }

    // ── GET / (all configs for tenant) ───────────────────────────────────────
    if (req.method === 'GET') {
      const { rows } = await sql.query(
        `SELECT * FROM payment_gateway_configs WHERE tenant_id = $1 ORDER BY updated_at DESC`,
        [tenantId],
      );
      return res.status(200).json({ data: rows });
    }

    res.setHeader('Allow', 'GET, PUT, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[payment-gateway-handler]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
