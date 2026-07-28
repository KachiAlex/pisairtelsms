import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { randomBytes } from 'crypto';
import { requireRole } from '../../_lib/auth-middleware.js';

async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id         TEXT NOT NULL,
      name              TEXT NOT NULL,
      key               TEXT NOT NULL UNIQUE,
      secret            TEXT,
      status            TEXT NOT NULL DEFAULT 'active',
      rate_limit        INTEGER NOT NULL DEFAULT 60,
      allowed_endpoints TEXT[],
      expires_at        TIMESTAMPTZ,
      last_used_at      TIMESTAMPTZ,
      created_by        TEXT,
      revoked_by        TEXT,
      revoked_at        TIMESTAMPTZ,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS api_usage (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id     TEXT NOT NULL,
      api_key_id    TEXT NOT NULL,
      endpoint      TEXT NOT NULL,
      method        TEXT NOT NULL,
      status_code   INTEGER,
      response_time INTEGER,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS api_rate_limit_configs (
      id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id            TEXT NOT NULL,
      api_key_id           TEXT NOT NULL UNIQUE,
      requests_per_minute  INTEGER NOT NULL DEFAULT 60,
      requests_per_hour    INTEGER NOT NULL DEFAULT 1000,
      requests_per_day     INTEGER NOT NULL DEFAULT 10000,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin']);
  if (!decoded) return;

  const tenantId = (req.headers['x-tenant-id'] as string) || (req.query.tenantId as string) || 'default-tenant';
  const userId   = (req.headers['x-user-id']   as string) || (req.query.userId   as string) || 'system';
  const id       = Array.isArray(req.query.id)     ? req.query.id[0]     : req.query.id;
  const action   = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;

  try {
    await ensureTables();

    // ── GET /statistics ───────────────────────────────────────
    if (req.method === 'GET' && id === 'statistics') {
      const { rows } = await sql.query(
        `SELECT
           COUNT(*) FILTER (WHERE status='active')  AS active_keys,
           COUNT(*) FILTER (WHERE status='revoked') AS revoked_keys,
           COUNT(*) FILTER (WHERE status='expired') AS expired_keys,
           COUNT(*)                                 AS total_keys
         FROM api_keys WHERE tenant_id=$1`, [tenantId]);
      const usage = await sql.query(
        `SELECT COUNT(*) AS total_calls,
           COUNT(*) FILTER (WHERE status_code >= 400) AS error_calls,
           ROUND(AVG(response_time))                  AS avg_response_time
         FROM api_usage WHERE tenant_id=$1
           AND created_at > NOW() - INTERVAL '24 hours'`, [tenantId]);
      const r = rows[0]; const u = usage.rows[0];
      const totalCalls = parseInt(u.total_calls) || 0;
      const errorCalls = parseInt(u.error_calls) || 0;
      return res.status(200).json({ data: {
        activeKeys:      parseInt(r.active_keys),
        revokedKeys:     parseInt(r.revoked_keys),
        expiredKeys:     parseInt(r.expired_keys),
        totalKeys:       parseInt(r.total_keys),
        callsLast24h:    totalCalls,
        errorRate:       totalCalls > 0 ? parseFloat(((errorCalls / totalCalls) * 100).toFixed(2)) : 0,
        avgResponseTime: parseInt(u.avg_response_time) || 0,
      }});
    }

    // ── POST /:id/revoke ─────────────────────────────────
    if (req.method === 'POST' && id && action === 'revoke') {
      const { rows } = await sql.query(
        `UPDATE api_keys SET status='revoked',revoked_by=$1,revoked_at=NOW(),updated_at=NOW()
         WHERE tenant_id=$2 AND id=$3 RETURNING *`,
        [userId, tenantId, id]);
      if (!rows[0]) return res.status(404).json({ error: 'API key not found' });
      return res.status(200).json({ data: rows[0] });
    }

    // ── GET /:id/usage ───────────────────────────────────
    if (req.method === 'GET' && id && action === 'usage') {
      const limit  = parseInt((req.query.limit  as string) || '100');
      const offset = parseInt((req.query.offset as string) || '0');
      const { rows } = await sql.query(
        `SELECT * FROM api_usage WHERE tenant_id=$1 AND api_key_id=$2 ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
        [tenantId, id, limit, offset]);
      const total = await sql.query(
        `SELECT COUNT(*) AS total FROM api_usage WHERE tenant_id=$1 AND api_key_id=$2`, [tenantId, id]);
      return res.status(200).json({ data: rows, total: parseInt(total.rows[0].total), limit, offset });
    }

    // ── GET /:id/usage-stats ─────────────────────────────
    if (req.method === 'GET' && id && action === 'usage-stats') {
      const timeRange = (req.query.timeRange as string) || 'day';
      const interval = timeRange === 'hour' ? '1 hour' : timeRange === 'week' ? '7 days' : timeRange === 'month' ? '30 days' : '24 hours';
      const { rows } = await sql.query(
        `SELECT COUNT(*) AS total_calls,
           COUNT(*) FILTER (WHERE status_code >= 400) AS error_calls,
           ROUND(AVG(response_time)) AS avg_response_time
         FROM api_usage WHERE tenant_id=$1 AND api_key_id=$2
           AND created_at > NOW() - INTERVAL '${interval}'`,
        [tenantId, id]);
      return res.status(200).json({ data: rows[0] });
    }

    // ── GET /:id/rate-limit ─────────────────────────────
    if (req.method === 'GET' && id && action === 'rate-limit') {
      const { rows } = await sql.query(
        `SELECT * FROM api_rate_limit_configs WHERE tenant_id=$1 AND api_key_id=$2`, [tenantId, id]);
      return res.status(200).json({ data: rows[0] || null });
    }

    // ── PUT /:id/rate-limit ─────────────────────────────
    if (req.method === 'PUT' && id && action === 'rate-limit') {
      const { requestsPerMinute, requestsPerHour, requestsPerDay } = req.body || {};
      const { rows } = await sql.query(
        `INSERT INTO api_rate_limit_configs (tenant_id,api_key_id,requests_per_minute,requests_per_hour,requests_per_day)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (api_key_id) DO UPDATE SET
           requests_per_minute=$3, requests_per_hour=$4, requests_per_day=$5, updated_at=NOW()
         RETURNING *`,
        [tenantId, id, requestsPerMinute||60, requestsPerHour||1000, requestsPerDay||10000]);
      return res.status(200).json({ data: rows[0] });
    }

    // ── GET /:id ─────────────────────────────────────────
    if (req.method === 'GET' && id && !action) {
      const { rows } = await sql.query(
        `SELECT * FROM api_keys WHERE tenant_id=$1 AND id=$2`, [tenantId, id]);
      if (!rows[0]) return res.status(404).json({ error: 'API key not found' });
      return res.status(200).json({ data: rows[0] });
    }

    // ── PUT /:id ─────────────────────────────────────────
    if (req.method === 'PUT' && id && !action) {
      const { name, rateLimit, allowedEndpoints, expiresAt } = req.body || {};
      const { rows } = await sql.query(
        `UPDATE api_keys SET
           name=COALESCE($1,name), rate_limit=COALESCE($2,rate_limit),
           allowed_endpoints=COALESCE($3,allowed_endpoints), expires_at=COALESCE($4,expires_at),
           updated_at=NOW()
         WHERE tenant_id=$5 AND id=$6 RETURNING *`,
        [name||null, rateLimit||null, allowedEndpoints||null, expiresAt||null, tenantId, id]);
      if (!rows[0]) return res.status(404).json({ error: 'API key not found' });
      return res.status(200).json({ data: rows[0] });
    }

    // ── GET / ───────────────────────────────────────────
    if (req.method === 'GET') {
      const limit  = parseInt((req.query.limit  as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      const { rows } = await sql.query(
        `SELECT * FROM api_keys WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [tenantId, limit, offset]);
      const total = await sql.query(
        `SELECT COUNT(*) AS total FROM api_keys WHERE tenant_id=$1`, [tenantId]);
      return res.status(200).json({ data: rows, total: parseInt(total.rows[0].total), limit, offset });
    }

    // ── POST / (generate key) ────────────────────────────
    if (req.method === 'POST') {
      const { name, rateLimit, allowedEndpoints, expiresAt } = req.body || {};
      if (!name) return res.status(400).json({ error: 'name is required' });
      const key    = `sk_${randomBytes(24).toString('hex')}`;
      const secret = `secret_${randomBytes(24).toString('hex')}`;
      const { rows } = await sql.query(
        `INSERT INTO api_keys (tenant_id,name,key,secret,rate_limit,allowed_endpoints,expires_at,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [tenantId, name, key, secret, rateLimit||60, allowedEndpoints||null, expiresAt||null, userId]);
      return res.status(201).json({ data: rows[0] });
    }

    res.setHeader('Allow', 'GET, POST, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[api-management-handler]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
