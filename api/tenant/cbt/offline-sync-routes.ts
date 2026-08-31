import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireRole } from '../../_lib/auth-middleware.js';
import { getSyncStatistics } from './_lib/sync.js';
import { queryAll, queryOne } from './_lib/db.js';

/**
 * Offline CBT Sync Admin Dashboard API
 * Routes:
 *   GET /api/tenant/cbt/offline-sync?type=devices|packages|fallbacks|statistics
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin']);
  if (!decoded) return;

  const tenantId = decoded.tenantId || 'default-tenant';

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type } = req.query;

  try {
    if (type === 'statistics') {
      const syncStats = await getSyncStatistics();

      const deviceStats = await queryOne<{ total: number; ready: number }>(
        `SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready
         FROM offline_sync_devices WHERE tenant_id = $1`,
        [tenantId]
      );

      const packageStats = await queryOne<{ total: number; published: number }>(
        `SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'published' THEN 1 END) as published
         FROM offline_sync_packages WHERE tenant_id = $1`,
        [tenantId]
      );

      const recentSyncs = await queryOne<{ fresh: number }>(
        `SELECT COUNT(*) as fresh
         FROM offline_sync_queue
         WHERE sync_status = 'synced'
           AND updated_at > NOW() - INTERVAL '12 hours'`
      );

      const totalSynced = syncStats.synced || 0;
      const totalEntries = totalSynced + (syncStats.pending || 0) + (syncStats.failed || 0);
      const syncFreshness = totalEntries > 0
        ? Math.round((totalSynced / totalEntries) * 100)
        : 0;

      return res.status(200).json({
        devicesReady: deviceStats?.ready || 0,
        devicesTotal: deviceStats?.total || 0,
        packagesPublished: packageStats?.published || 0,
        packagesTotal: packageStats?.total || 0,
        syncFreshness,
        pendingSyncs: syncStats.pending || 0,
        failedSyncs: syncStats.failed || 0,
        totalRetries: syncStats.totalRetries || 0,
      });
    }

    if (type === 'devices') {
      const devices = await queryAll(
        `SELECT id, device_name, device_type, status, last_sync_at, os_version, app_version,
                created_at, updated_at
         FROM offline_sync_devices
         WHERE tenant_id = $1
         ORDER BY updated_at DESC
         LIMIT 100`,
        [tenantId]
      );

      return res.status(200).json({
        data: devices.map((d: any) => ({
          id: d.id,
          name: d.device_name,
          type: d.device_type,
          status: d.status,
          lastSync: d.last_sync_at?.toISOString?.() || String(d.last_sync_at || ''),
          osVersion: d.os_version,
          appVersion: d.app_version,
          createdAt: d.created_at?.toISOString?.() || String(d.created_at || ''),
        })),
      });
    }

    if (type === 'packages') {
      const packages = await queryAll(
        `SELECT id, exam_id, package_name, version, status, size_bytes, checksum,
                created_at, published_at
         FROM offline_sync_packages
         WHERE tenant_id = $1
         ORDER BY created_at DESC
         LIMIT 100`,
        [tenantId]
      );

      return res.status(200).json({
        data: packages.map((p: any) => ({
          id: p.id,
          examId: p.exam_id,
          name: p.package_name,
          version: p.version,
          status: p.status,
          size: p.size_bytes,
          checksum: p.checksum,
          createdAt: p.created_at?.toISOString?.() || String(p.created_at || ''),
          publishedAt: p.published_at?.toISOString?.() || null,
        })),
      });
    }

    if (type === 'fallbacks') {
      const fallbacks = await queryAll(
        `SELECT id, device_id, fallback_type, status, triggered_at, resolved_at, details
         FROM offline_sync_fallbacks
         WHERE tenant_id = $1
         ORDER BY triggered_at DESC
         LIMIT 100`,
        [tenantId]
      );

      return res.status(200).json({
        data: fallbacks.map((f: any) => ({
          id: f.id,
          deviceId: f.device_id,
          type: f.fallback_type,
          status: f.status,
          triggeredAt: f.triggered_at?.toISOString?.() || String(f.triggered_at || ''),
          resolvedAt: f.resolved_at?.toISOString?.() || null,
          details: f.details,
        })),
      });
    }

    return res.status(400).json({ error: 'Invalid type parameter. Use: devices, packages, fallbacks, or statistics' });
  } catch (error) {
    console.error('Offline sync routes error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
