import type { VercelRequest, VercelResponse } from '@vercel/node';
import biometricDevicesApi from './biometric-devices';

/**
 * Biometric Devices Integration API Handler
 * Routes:
 *   GET    /api/tenant/integrations/biometric-devices                        - List devices
 *   POST   /api/tenant/integrations/biometric-devices                        - Register device
 *   GET    /api/tenant/integrations/biometric-devices/statistics             - Get statistics
 *   GET    /api/tenant/integrations/biometric-devices/:id                    - Get device
 *   PUT    /api/tenant/integrations/biometric-devices/:id/status             - Update status
 *   POST   /api/tenant/integrations/biometric-devices/:id/sync               - Start sync
 *   PUT    /api/tenant/integrations/biometric-devices/:id/sync/:syncId       - Complete sync
 *   GET    /api/tenant/integrations/biometric-devices/:id/logs               - Get device logs
 *   GET    /api/tenant/integrations/biometric-devices/:id/sync-history       - Get sync history
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const tenantId =
    (req.headers['x-tenant-id'] as string) ||
    (req.query.tenantId as string) ||
    'default-tenant';

  const userId =
    (req.headers['x-user-id'] as string) ||
    (req.query.userId as string) ||
    'system';

  const { id, action, syncId } = req.query;

  try {
    // GET /api/tenant/integrations/biometric-devices/statistics
    if (req.method === 'GET' && id === 'statistics') {
      const stats = biometricDevicesApi.getStatistics(tenantId);
      return res.status(200).json({ data: stats });
    }

    // PUT /api/tenant/integrations/biometric-devices/:id/status
    if (req.method === 'PUT' && id && action === 'status') {
      const { status, message } = req.body || {};
      const device = biometricDevicesApi.updateDeviceStatus(tenantId, id as string, status, message);
      return res.status(200).json({ data: device });
    }

    // POST /api/tenant/integrations/biometric-devices/:id/sync
    if (req.method === 'POST' && id && action === 'sync' && !syncId) {
      const sync = biometricDevicesApi.startAttendanceSync(tenantId, id as string);
      return res.status(201).json({ data: sync });
    }

    // PUT /api/tenant/integrations/biometric-devices/:id/sync/:syncId
    if (req.method === 'PUT' && id && action === 'sync' && syncId) {
      const { recordsProcessed, recordsFailed, error } = req.body || {};
      const sync = biometricDevicesApi.completeAttendanceSync(
        tenantId, syncId as string, recordsProcessed || 0, recordsFailed || 0, error
      );
      return res.status(200).json({ data: sync });
    }

    // GET /api/tenant/integrations/biometric-devices/:id/logs
    if (req.method === 'GET' && id && action === 'logs') {
      const limit = parseInt((req.query.limit as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      const logs = biometricDevicesApi.getDeviceLogs(tenantId, id as string, limit, offset);
      return res.status(200).json(logs);
    }

    // GET /api/tenant/integrations/biometric-devices/:id/sync-history
    if (req.method === 'GET' && id && action === 'sync-history') {
      const limit = parseInt((req.query.limit as string) || '20');
      const history = biometricDevicesApi.getSyncHistory(tenantId, id as string, limit);
      return res.status(200).json({ data: history });
    }

    // GET /api/tenant/integrations/biometric-devices/:id
    if (req.method === 'GET' && id && !action) {
      const device = biometricDevicesApi.getDevice(tenantId, id as string);
      if (!device) return res.status(404).json({ error: 'Device not found' });
      return res.status(200).json({ data: device });
    }

    // GET /api/tenant/integrations/biometric-devices
    if (req.method === 'GET') {
      const limit = parseInt((req.query.limit as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      const result = biometricDevicesApi.getDevices(tenantId, limit, offset);
      return res.status(200).json(result);
    }

    // POST /api/tenant/integrations/biometric-devices
    if (req.method === 'POST') {
      const device = biometricDevicesApi.registerDevice(tenantId, userId, req.body || {});
      return res.status(201).json({ data: device });
    }

    res.setHeader('Allow', 'GET, POST, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: message });
  }
}
