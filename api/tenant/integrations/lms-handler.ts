import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireRole } from '../../_lib/auth-middleware.js';

async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS lms_configs (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id     TEXT NOT NULL,
      provider      TEXT NOT NULL,
      base_url      TEXT NOT NULL,
      api_key       TEXT NOT NULL,
      is_active     BOOLEAN NOT NULL DEFAULT true,
      sync_status   TEXT NOT NULL DEFAULT 'pending',
      last_sync_at  TIMESTAMPTZ,
      created_by    TEXT,
      updated_by    TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS lms_syncs (
      id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id         TEXT NOT NULL,
      lms_config_id     TEXT NOT NULL,
      provider          TEXT NOT NULL,
      sync_type         TEXT NOT NULL,
      status            TEXT NOT NULL DEFAULT 'in_progress',
      records_processed INTEGER NOT NULL DEFAULT 0,
      records_failed    INTEGER NOT NULL DEFAULT 0,
      error             TEXT,
      started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at      TIMESTAMPTZ,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS lms_sync_logs (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id     TEXT NOT NULL,
      lms_config_id TEXT NOT NULL,
      log_type      TEXT NOT NULL,
      message       TEXT NOT NULL,
      details       JSONB,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['staff', 'tenant_admin']);
  if (!decoded) return;

  const tenantId = (req.headers['x-tenant-id'] as string) || (req.query.tenantId as string) || 'default-tenant';
  const userId   = (req.headers['x-user-id']   as string) || (req.query.userId   as string) || 'system';
  const id       = Array.isArray(req.query.id)       ? req.query.id[0]       : req.query.id;
  const action   = Array.isArray(req.query.action)   ? req.query.action[0]   : req.query.action;
  const syncId   = Array.isArray(req.query.syncId)   ? req.query.syncId[0]   : req.query.syncId;
  const syncType = Array.isArray(req.query.syncType) ? req.query.syncType[0] : req.query.syncType;

  try {
    await ensureTables();

    // ── GET /statistics ────────────────────────────────────────────
    if (req.method === 'GET' && id === 'statistics') {
      const { rows } = await sql.query(
        `SELECT
           COUNT(*) FILTER (WHERE status='completed') AS completed_count,
           COUNT(*) FILTER (WHERE status='failed')    AS failed_count,
           COUNT(*) FILTER (WHERE status='in_progress') AS in_progress_count,
           COALESCE(SUM(records_processed),0)         AS total_records_processed,
           COALESCE(SUM(records_failed),0)            AS total_records_failed,
           COUNT(*)                                   AS total_syncs
         FROM lms_syncs WHERE tenant_id=$1`, [tenantId]);
      const r = rows[0];
      return res.status(200).json({ data: {
        completedCount: parseInt(r.completed_count), failedCount: parseInt(r.failed_count),
        inProgressCount: parseInt(r.in_progress_count), totalRecordsProcessed: parseInt(r.total_records_processed),
        totalRecordsFailed: parseInt(r.total_records_failed), totalSyncs: parseInt(r.total_syncs),
      }});
    }

    // ── GET /config ───────────────────────────────────────────────
    if (req.method === 'GET' && id === 'config') {
      const { rows } = await sql.query(
        `SELECT * FROM lms_configs WHERE tenant_id=$1 AND is_active=true ORDER BY updated_at DESC LIMIT 1`, [tenantId]);
      return res.status(200).json({ data: rows[0] || null });
    }

    // ── PUT /config ───────────────────────────────────────────────
    if (req.method === 'PUT' && id === 'config') {
      const { provider, baseUrl, apiKey } = req.body || {};
      if (!provider || !baseUrl || !apiKey) return res.status(400).json({ error: 'provider, baseUrl and apiKey are required' });
      await sql.query(`UPDATE lms_configs SET is_active=false WHERE tenant_id=$1`, [tenantId]);
      const { rows } = await sql.query(
        `INSERT INTO lms_configs (tenant_id,provider,base_url,api_key,created_by,updated_by)
         VALUES ($1,$2,$3,$4,$5,$5) RETURNING *`,
        [tenantId, provider, baseUrl, apiKey, userId]);
      await sql.query(
        `INSERT INTO lms_sync_logs (tenant_id,lms_config_id,log_type,message) VALUES ($1,$2,'connection',$3)`,
        [tenantId, rows[0].id, `LMS connection configured: ${provider}`]);
      return res.status(200).json({ data: rows[0] });
    }

    // ── POST /:id/test ─────────────────────────────────────────
    if (req.method === 'POST' && id && action === 'test') {
      const { rows } = await sql.query(
        `SELECT * FROM lms_configs WHERE tenant_id=$1 AND id=$2`, [tenantId, id]);
      if (!rows[0]) return res.status(404).json({ error: 'LMS config not found' });
      await sql.query(
        `INSERT INTO lms_sync_logs (tenant_id,lms_config_id,log_type,message) VALUES ($1,$2,'connection','Connection test initiated')`,
        [tenantId, id]);
      return res.status(200).json({ success: true, message: 'Connection test initiated. Verify connectivity from your LMS.' });
    }

    // ── POST /:id/sync/students or /grades ─────────────────────
    if (req.method === 'POST' && id && action === 'sync' && (syncType === 'students' || syncType === 'grades') && !syncId) {
      const { rows: cfgRows } = await sql.query(
        `SELECT * FROM lms_configs WHERE tenant_id=$1 AND id=$2`, [tenantId, id]);
      if (!cfgRows[0]) return res.status(404).json({ error: 'LMS config not found' });
      const type = syncType === 'students' ? 'student' : 'grade';
      const { rows } = await sql.query(
        `INSERT INTO lms_syncs (tenant_id,lms_config_id,provider,sync_type) VALUES ($1,$2,$3,$4) RETURNING *`,
        [tenantId, id, cfgRows[0].provider, type]);
      await sql.query(
        `INSERT INTO lms_sync_logs (tenant_id,lms_config_id,log_type,message,details) VALUES ($1,$2,'sync',$3,$4)`,
        [tenantId, id, `${type} sync started`, JSON.stringify({ syncId: rows[0].id })]);
      return res.status(201).json({ data: rows[0] });
    }

    // ── PUT /:id/sync/:syncId (complete sync) ────────────────────
    if (req.method === 'PUT' && id && action === 'sync' && syncId) {
      const { recordsProcessed, recordsFailed, error } = req.body || {};
      const status = error ? 'failed' : 'completed';
      const { rows } = await sql.query(
        `UPDATE lms_syncs SET status=$1,records_processed=$2,records_failed=$3,error=$4,completed_at=NOW()
         WHERE tenant_id=$5 AND id=$6 RETURNING *`,
        [status, recordsProcessed||0, recordsFailed||0, error||null, tenantId, syncId]);
      if (!rows[0]) return res.status(404).json({ error: 'Sync not found' });
      await sql.query(
        `UPDATE lms_configs SET sync_status=$1,last_sync_at=NOW(),updated_at=NOW() WHERE tenant_id=$2 AND id=$3`,
        [status === 'completed' ? 'synced' : 'failed', tenantId, id]);
      return res.status(200).json({ data: rows[0] });
    }

    // ── GET /:id/sync-history ───────────────────────────────────
    if (req.method === 'GET' && id && action === 'sync-history') {
      const limit = parseInt((req.query.limit as string) || '20');
      const { rows } = await sql.query(
        `SELECT * FROM lms_syncs WHERE tenant_id=$1 AND lms_config_id=$2 ORDER BY created_at DESC LIMIT $3`,
        [tenantId, id, limit]);
      return res.status(200).json({ data: rows });
    }

    // ── GET /:id/logs ───────────────────────────────────────
    if (req.method === 'GET' && id && action === 'logs') {
      const limit  = parseInt((req.query.limit  as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      const { rows } = await sql.query(
        `SELECT * FROM lms_sync_logs WHERE tenant_id=$1 AND lms_config_id=$2 ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
        [tenantId, id, limit, offset]);
      const total = await sql.query(
        `SELECT COUNT(*) AS total FROM lms_sync_logs WHERE tenant_id=$1 AND lms_config_id=$2`, [tenantId, id]);
      return res.status(200).json({ data: rows, total: parseInt(total.rows[0].total), limit, offset });
    }

    // ── GET / (all configs) ────────────────────────────────────
    if (req.method === 'GET') {
      const { rows } = await sql.query(
        `SELECT * FROM lms_configs WHERE tenant_id=$1 ORDER BY updated_at DESC`, [tenantId]);
      return res.status(200).json({ data: rows });
    }

    res.setHeader('Allow', 'GET, PUT, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[lms-handler]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
