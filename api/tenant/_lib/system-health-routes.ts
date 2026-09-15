import type { VercelRequest, VercelResponse } from '../../_lib/http-types.js';
import systemHealthApi from './system-health';
import { requireRole } from '../../_lib/auth-middleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin']);
  if (!decoded) return;

  const tenantId = decoded.tenantId || 'default-tenant';

  try {
    if (req.method === 'GET') {
      const { type, serviceId } = req.query;

      if (type === 'services') {
        const result = await systemHealthApi.listServices(tenantId);
        return res.status(200).json({ data: result });
      }

      if (type === 'vitals') {
        const result = await systemHealthApi.listVitals(tenantId);
        return res.status(200).json({ data: result });
      }

      if (type === 'incidents') {
        const result = await systemHealthApi.listIncidents(tenantId);
        return res.status(200).json(result);
      }

      if (type === 'dependencies') {
        const result = await systemHealthApi.listDependencies(tenantId);
        return res.status(200).json({ data: result });
      }

      if (type === 'statistics') {
        const result = await systemHealthApi.getStatistics(tenantId);
        return res.status(200).json(result);
      }

      return res.status(400).json({ error: 'Invalid type parameter' });
    }

    if (req.method === 'POST') {
      const { action, payload, serviceId } = req.body;

      if (action === 'create-service') {
        const service = await systemHealthApi.createService(tenantId, payload);
        return res.status(201).json(service);
      }

      if (action === 'update-service') {
        const service = await systemHealthApi.updateService(tenantId, serviceId, payload);
        return res.status(200).json(service);
      }

      if (action === 'create-vital') {
        const vital = await systemHealthApi.createVital(tenantId, payload);
        return res.status(201).json(vital);
      }

      if (action === 'create-incident') {
        const incident = await systemHealthApi.createIncident(tenantId, payload);
        return res.status(201).json(incident);
      }

      if (action === 'create-dependency') {
        const dependency = await systemHealthApi.createDependency(tenantId, payload);
        return res.status(201).json(dependency);
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in system health routes:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
