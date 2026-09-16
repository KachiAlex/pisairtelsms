import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js';
import errorLogsApi from './error-logs';
import { requireRole } from '../../_lib/auth-middleware.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin']);
  if (!decoded) return;

  const tenantId = decoded.tenantId || 'default-tenant';

  try {
    if (req.method === 'GET') {
      const { type, severity, service, logId, limit, offset } = req.query;

      if (type === 'logs') {
        const result = await errorLogsApi.listLogs(tenantId, {
          severity: severity as string,
          service: service as string,
          limit: limit ? parseInt(limit as string) : 50,
          offset: offset ? parseInt(offset as string) : 0,
        });
        return res.status(200).json(result);
      }

      if (type === 'log' && logId) {
        const result = await errorLogsApi.getLogById(tenantId, logId as string);
        return res.status(200).json(result);
      }

      if (type === 'environments') {
        const result = await errorLogsApi.listEnvironments(tenantId);
        return res.status(200).json({ data: result });
      }

      if (type === 'heatmap') {
        const result = await errorLogsApi.listHeatmap(tenantId);
        return res.status(200).json({ data: result });
      }

      if (type === 'statistics') {
        const result = await errorLogsApi.getStatistics(tenantId);
        return res.status(200).json(result);
      }

      return res.status(400).json({ error: 'Invalid type parameter' });
    }

    if (req.method === 'POST') {
      const { action, payload, logId } = req.body;

      if (action === 'create-log') {
        const log = await errorLogsApi.createLog(tenantId, payload);
        return res.status(201).json(log);
      }

      if (action === 'update-log') {
        const log = await errorLogsApi.updateLog(tenantId, logId, payload);
        return res.status(200).json(log);
      }

      if (action === 'create-environment') {
        const env = await errorLogsApi.createEnvironment(tenantId, payload);
        return res.status(201).json(env);
      }

      if (action === 'create-heatmap') {
        const entry = await errorLogsApi.createHeatmapEntry(tenantId, payload);
        return res.status(201).json(entry);
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in error logs routes:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
