import { NextApiRequest, NextApiResponse } from 'next';
import errorLogsApi from './error-logs';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { tenantId } = req.query;

  if (!tenantId || typeof tenantId !== 'string') {
    return res.status(400).json({ error: 'Missing tenant ID' });
  }

  try {
    if (req.method === 'GET') {
      const { type, severity, service, logId, limit, offset } = req.query;

      if (type === 'logs') {
        const result = errorLogsApi.listLogs(tenantId, {
          severity: severity as string,
          service: service as string,
          limit: limit ? parseInt(limit as string) : 50,
          offset: offset ? parseInt(offset as string) : 0,
        });
        return res.status(200).json(result);
      }

      if (type === 'log' && logId) {
        const result = errorLogsApi.getLogById(tenantId, logId as string);
        return res.status(200).json(result);
      }

      if (type === 'environments') {
        const result = errorLogsApi.listEnvironments(tenantId);
        return res.status(200).json({ data: result });
      }

      if (type === 'heatmap') {
        const result = errorLogsApi.listHeatmap(tenantId);
        return res.status(200).json({ data: result });
      }

      if (type === 'statistics') {
        const result = errorLogsApi.getStatistics(tenantId);
        return res.status(200).json(result);
      }

      return res.status(400).json({ error: 'Invalid type parameter' });
    }

    if (req.method === 'POST') {
      const { action, payload, logId } = req.body;

      if (action === 'create-log') {
        const log = errorLogsApi.createLog(tenantId, payload);
        return res.status(201).json(log);
      }

      if (action === 'update-log') {
        const log = errorLogsApi.updateLog(tenantId, logId, payload);
        return res.status(200).json(log);
      }

      if (action === 'create-environment') {
        const env = errorLogsApi.createEnvironment(tenantId, payload);
        return res.status(201).json(env);
      }

      if (action === 'create-heatmap') {
        const entry = errorLogsApi.createHeatmapEntry(tenantId, payload);
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
