import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js';
import { sql } from '../../_lib/sql.js';
import { requireRole } from '../../_lib/auth-middleware.js';
import { getActivePaymentGateway, getTenantPaymentSettings, upsertTenantPaymentSetting } from '../finance/_lib/payments.js';

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
  }

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin']);
  if (!decoded) return;

  const tenantId = decoded.tenantId || 'default-tenant';

  const userId = decoded.userId || decoded.staffId || 'system';

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
    // Reads the authoritative store (tenant_payment_settings) — the same keys
    // that drive fee collection and payroll disbursement.
    if (req.method === 'GET' && action === 'config') {
      const active = await getActivePaymentGateway(tenantId);
      if (!active) return res.status(200).json({ data: null });
      return res.status(200).json({
        data: {
          provider: active.gateway,
          mode: (active.metadata as any)?.mode || 'live',
          api_key: active.publicKey,
          // Never send the stored secret down — blank field keeps it on save
          secret_key: '',
          has_secret_key: !!active.secretKey,
          secret_key_last4: active.secretKey ? active.secretKey.slice(-4) : '',
          webhook_url: (active.metadata as any)?.webhookUrl || null,
          is_active: active.isActive,
          updated_at: active.updatedAt,
        },
      });
    }

    // ── PUT /config ───────────────────────────────────────────────────────────
    if (req.method === 'PUT' && action === 'config') {
      if (decoded.role !== 'tenant_admin') {
        return res.status(403).json({ error: 'Only tenant admins can change payment gateway settings' });
      }
      const { provider, mode, apiKey, secretKey, webhookUrl, webhookSecret } = req.body || {};
      if (!provider || !apiKey) {
        return res.status(400).json({ error: 'provider and apiKey are required' });
      }
      const gw = String(provider).toLowerCase();
      if (!['paystack', 'flutterwave', 'moniepoint'].includes(gw)) {
        return res.status(400).json({ error: 'Supported providers: paystack, flutterwave, moniepoint' });
      }
      // Empty secretKey = keep the stored one
      let effectiveSecret = typeof secretKey === 'string' ? secretKey.trim() : '';
      if (!effectiveSecret) {
        const existing = (await getTenantPaymentSettings(tenantId)).find(s => s.gateway === gw);
        effectiveSecret = existing?.secretKey || '';
      }
      if (!effectiveSecret) {
        return res.status(400).json({ error: 'secretKey is required when configuring a gateway for the first time' });
      }
      const setting = await upsertTenantPaymentSetting(tenantId, gw as 'paystack' | 'flutterwave' | 'moniepoint', apiKey, effectiveSecret, true, {
        mode: mode || 'live',
        webhookUrl: webhookUrl || null,
        webhookSecret: webhookSecret || null,
        configuredBy: userId,
      });
      return res.status(200).json({
        data: {
          provider: setting.gateway,
          api_key: setting.publicKey,
          secret_key: '',
          has_secret_key: true,
          secret_key_last4: effectiveSecret.slice(-4),
          is_active: setting.isActive,
          updated_at: setting.updatedAt,
        },
      });
    }

    // ── GET / (all configs for tenant) ───────────────────────────────────────
    if (req.method === 'GET') {
      const settings = await getTenantPaymentSettings(tenantId);
      return res.status(200).json({
        data: settings.map(s => ({
          provider: s.gateway,
          apiKey: s.publicKey,
          hasSecretKey: !!s.secretKey,
          isActive: s.isActive,
          updatedAt: s.updatedAt,
        })),
      });
    }

    res.setHeader('Allow', 'GET, PUT, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[payment-gateway-handler]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
