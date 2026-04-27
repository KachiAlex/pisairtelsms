import { NextApiRequest, NextApiResponse } from 'next';
import offlineSyncApi from './offline-sync';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { tenantId } = req.query;

  if (!tenantId || typeof tenantId !== 'string') {
    return res.status(400).json({ error: 'Missing tenant ID' });
  }

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

      if (type === 'statistics') {
        const result = offlineSyncApi.getStatistics(tenantId);
        return res.status(200).json(result);
      }

      return res.status(400).json({ error: 'Invalid type parameter' });
    }

    if (req.method === 'POST') {
      const { action, payload } = req.body;

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

      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in offline sync routes:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
