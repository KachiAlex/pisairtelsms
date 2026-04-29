import type { VercelRequest, VercelResponse } from '@vercel/node';
import offlineSyncApi from './offline-sync';

/**
 * Offline CBT Sync API Handler
 * Routes:
 *   GET  /api/tenant/cbt/offline-sync?type=devices|packages|fallbacks|conflicts|statistics
 *   POST /api/tenant/cbt/offline-sync  (action: register-device|update-device-status|create-package|update-package-status|create-fallback|create-conflict|resolve-conflict|track-status)
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  const tenantId =
    (req.headers['x-tenant-id'] as string) ||
    (req.query.tenantId as string) ||
    'default-tenant';

  try {
    if (req.method === 'GET') {
      const { type, status, limit, offset } = req.query;

      if (type === 'devices') {
        const result = offlineSyncApi.listDevices(tenantId, {
          status: status as string,
          limit: limit ? parseInt(limit as string) : 50,
          offset: offset ? parseInt(offset as string) : 0,
        });
        return res.status(200).json(result);
      }

      if (type === 'packages') {
        const result = offlineSyncApi.listPackages(tenantId, {
          status: status as string,
          limit: limit ? parseInt(limit as string) : 50,
          offset: offset ? parseInt(offset as string) : 0,
        });
        return res.status(200).json(result);
      }

      if (type === 'fallbacks') {
        const result = offlineSyncApi.listFallbacks(tenantId);
        return res.status(200).json({ data: result });
      }

      if (type === 'conflicts') {
        const result = offlineSyncApi.listConflicts(tenantId, {
          resolution: status as string,
          limit: limit ? parseInt(limit as string) : 50,
          offset: offset ? parseInt(offset as string) : 0,
        });
        return res.status(200).json(result);
      }

      if (type === 'statistics') {
        const result = offlineSyncApi.getStatistics(tenantId);
        return res.status(200).json(result);
      }

      return res.status(400).json({ error: 'Invalid type parameter' });
    }

    if (req.method === 'POST') {
      const { action, payload } = req.body || {};

      if (action === 'register-device') {
        const device = offlineSyncApi.registerDevice(tenantId, payload);
        return res.status(201).json(device);
      }

      if (action === 'update-device-status') {
        const device = offlineSyncApi.updateDeviceStatus(tenantId, payload.deviceId, payload);
        return res.status(200).json(device);
      }

      if (action === 'create-package') {
        const pkg = offlineSyncApi.createPackage(tenantId, payload);
        return res.status(201).json(pkg);
      }

      if (action === 'update-package-status') {
        const pkg = offlineSyncApi.updatePackageStatus(tenantId, payload.packageId, payload);
        return res.status(200).json(pkg);
      }

      if (action === 'create-fallback') {
        const fallback = offlineSyncApi.createFallback(tenantId, payload);
        return res.status(201).json(fallback);
      }

      if (action === 'create-conflict') {
        const conflict = offlineSyncApi.createConflict(tenantId, payload);
        return res.status(201).json(conflict);
      }

      if (action === 'resolve-conflict') {
        const conflict = offlineSyncApi.resolveConflict(tenantId, payload.conflictId, payload);
        return res.status(200).json(conflict);
      }

      if (action === 'track-status') {
        const status = offlineSyncApi.trackSyncStatus(tenantId, payload.deviceId, payload);
        return res.status(201).json(status);
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: message });
  }
}
