import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireRole } from '../../_lib/auth-middleware';

async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS biometric_devices (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id     TEXT NOT NULL,
      name          TEXT NOT NULL,
      device_type   TEXT NOT NULL DEFAULT 'fingerprint',
      location      TEXT,
      ip_address    TEXT,
      serial_number TEXT,
      status        TEXT NOT NULL DEFAULT 'offline',
      last_sync_at  TIMESTAMPTZ,
      created_by    TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS biometric_syncs (
      id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id         TEXT NOT NULL,
      device_id         TEXT NOT NULL,
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
    CREATE TABLE IF NOT EXISTS biometric_device_logs (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id   TEXT NOT NULL,
      device_id   TEXT NOT NULL,
      log_type    TEXT NOT NULL,
      message     TEXT NOT NULL,
      details     JSONB,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['staff', 'tenant_admin']);
  if (!decoded) return;

  const tenantId = (req.headers['x-tenant-id'] as string) || (req.query.tenantId as string) || 'default-tenant';
  const userId   = (req.headers['x-user-id']   as string) || (req.query.userId   as string) || 'system';
  const id       = Array.isArray(req.query.id)     ? req.query.id[0]     : req.query.id;
  const action   = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;
  const syncId   = Array.isArray(req.query.syncId) ? req.query.syncId[0] : req.query.syncId;

  try {
    await ensureTables();

    // ── GET /statistics ─────────────────────────────────────────
    if (req.method === 'GET' && id === 'statistics') {
      const devStats = await sql.query(
        `SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status='online')  AS online,
           COUNT(*) FILTER (WHERE status='offline') AS offline,
           COUNT(*) FILTER (WHERE status='error')   AS error_count
         FROM biometric_devices WHERE tenant_id=$1`, [tenantId]);
      const syncStats = await sql.query(
        `SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status='completed') AS completed,
           COUNT(*) FILTER (WHERE status='failed')    AS failed,
           COALESCE(SUM(records_processed),0) AS records_processed
         FROM biometric_syncs WHERE tenant_id=$1`, [tenantId]);
      const d = devStats.rows[0]; const s = syncStats.rows[0];
      return res.status(200).json({ data: {
        totalDevices: parseInt(d.total), onlineDevices: parseInt(d.online),
        offlineDevices: parseInt(d.offline), errorDevices: parseInt(d.error_count),
        totalSyncs: parseInt(s.total), completedSyncs: parseInt(s.completed),
        failedSyncs: parseInt(s.failed), recordsProcessed: parseInt(s.records_processed),
      }});
    }

    // ── PUT /:id/status ─────────────────────────────────────
    if (req.method === 'PUT' && id && action === 'status') {
      const { status, message } = req.body || {};
      const { rows } = await sql.query(
        `UPDATE biometric_devices SET status=$1,updated_at=NOW() WHERE tenant_id=$2 AND id=$3 RETURNING *`,
        [status, tenantId, id]);
      if (!rows[0]) return res.status(404).json({ error: 'Device not found' });
      if (message) await sql.query(
        `INSERT INTO biometric_device_logs (tenant_id,device_id,log_type,message) VALUES ($1,$2,'status',$3)`,
        [tenantId, id, message]);
      return res.status(200).json({ data: rows[0] });
    }

    // ── POST /:id/sync ──────────────────────────────────────
    if (req.method === 'POST' && id && action === 'sync' && !syncId) {
      const { rows: devRows } = await sql.query(
        `SELECT id FROM biometric_devices WHERE tenant_id=$1 AND id=$2`, [tenantId, id]);
      if (!devRows[0]) return res.status(404).json({ error: 'Device not found' });
      const { rows } = await sql.query(
        `INSERT INTO biometric_syncs (tenant_id,device_id) VALUES ($1,$2) RETURNING *`, [tenantId, id]);
      return res.status(201).json({ data: rows[0] });
    }

    // ── PUT /:id/sync/:syncId ───────────────────────────────
    if (req.method === 'PUT' && id && action === 'sync' && syncId) {
      const { recordsProcessed, recordsFailed, error } = req.body || {};
      const status = error ? 'failed' : 'completed';
      const { rows } = await sql.query(
        `UPDATE biometric_syncs SET status=$1,records_processed=$2,records_failed=$3,error=$4,completed_at=NOW()
         WHERE tenant_id=$5 AND id=$6 RETURNING *`,
        [status, recordsProcessed||0, recordsFailed||0, error||null, tenantId, syncId]);
      if (!rows[0]) return res.status(404).json({ error: 'Sync not found' });
      await sql.query(
        `UPDATE biometric_devices SET last_sync_at=NOW(),updated_at=NOW() WHERE tenant_id=$1 AND id=$2`,
        [tenantId, id]);
      return res.status(200).json({ data: rows[0] });
    }

    // ── GET /:id/logs ───────────────────────────────────────
    if (req.method === 'GET' && id && action === 'logs') {
      const limit  = parseInt((req.query.limit  as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      const { rows } = await sql.query(
        `SELECT * FROM biometric_device_logs WHERE tenant_id=$1 AND device_id=$2 ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
        [tenantId, id, limit, offset]);
      const total = await sql.query(
        `SELECT COUNT(*) AS total FROM biometric_device_logs WHERE tenant_id=$1 AND device_id=$2`, [tenantId, id]);
      return res.status(200).json({ data: rows, total: parseInt(total.rows[0].total), limit, offset });
    }

    // ── GET /:id/sync-history ────────────────────────────────
    if (req.method === 'GET' && id && action === 'sync-history') {
      const limit = parseInt((req.query.limit as string) || '20');
      const { rows } = await sql.query(
        `SELECT * FROM biometric_syncs WHERE tenant_id=$1 AND device_id=$2 ORDER BY created_at DESC LIMIT $3`,
        [tenantId, id, limit]);
      return res.status(200).json({ data: rows });
    }

    // ── GET /:id ─────────────────────────────────────────────
    if (req.method === 'GET' && id && !action) {
      const { rows } = await sql.query(
        `SELECT * FROM biometric_devices WHERE tenant_id=$1 AND id=$2`, [tenantId, id]);
      if (!rows[0]) return res.status(404).json({ error: 'Device not found' });
      return res.status(200).json({ data: rows[0] });
    }

    // ── GET / ─────────────────────────────────────────────────
    if (req.method === 'GET') {
      const limit  = parseInt((req.query.limit  as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      const { rows } = await sql.query(
        `SELECT * FROM biometric_devices WHERE tenant_id=$1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3`,
        [tenantId, limit, offset]);
      const total = await sql.query(
        `SELECT COUNT(*) AS total FROM biometric_devices WHERE tenant_id=$1`, [tenantId]);
      return res.status(200).json({ data: rows, total: parseInt(total.rows[0].total), limit, offset });
    }

    // ── POST / (register device) ─────────────────────────────
    if (req.method === 'POST') {
      const { name, deviceType, location, ipAddress, serialNumber } = req.body || {};
      if (!name) return res.status(400).json({ error: 'name is required' });
      const { rows } = await sql.query(
        `INSERT INTO biometric_devices (tenant_id,name,device_type,location,ip_address,serial_number,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [tenantId, name, deviceType||'fingerprint', location||null, ipAddress||null, serialNumber||null, userId]);
      return res.status(201).json({ data: rows[0] });
    }

    res.setHeader('Allow', 'GET, POST, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[biometric-devices-handler]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
