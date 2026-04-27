import { NextApiRequest, NextApiResponse } from 'next';
import riskAlertsApi from './risk-alerts';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { tenantId } = req.query;

  if (!tenantId || typeof tenantId !== 'string') {
    return res.status(400).json({ error: 'Missing tenant ID' });
  }

  try {
    if (req.method === 'GET') {
      const { type, likelihood, limit, offset } = req.query;

      if (type === 'alerts') {
        const result = riskAlertsApi.listAlerts(tenantId, {
          likelihood: likelihood as string,
          limit: limit ? parseInt(limit as string) : 50,
          offset: offset ? parseInt(offset as string) : 0,
        });
        return res.status(200).json(result);
      }

      if (type === 'models') {
        const result = riskAlertsApi.listModelPerformance(tenantId);
        return res.status(200).json({ data: result });
      }

      if (type === 'playbooks') {
        const result = riskAlertsApi.listPlaybooks(tenantId);
        return res.status(200).json({ data: result });
      }

      if (type === 'clusters') {
        const result = riskAlertsApi.listClusters(tenantId);
        return res.status(200).json({ data: result });
      }

      if (type === 'statistics') {
        const result = riskAlertsApi.getStatistics(tenantId);
        return res.status(200).json(result);
      }

      return res.status(400).json({ error: 'Invalid type parameter' });
    }

    if (req.method === 'POST') {
      const { action, payload } = req.body;

      if (action === 'create-alert') {
        const alert = riskAlertsApi.createAlert(tenantId, payload);
        return res.status(201).json(alert);
      }

      if (action === 'create-model') {
        const model = riskAlertsApi.createModelPerformance(tenantId, payload);
        return res.status(201).json(model);
      }

      if (action === 'create-playbook') {
        const playbook = riskAlertsApi.createPlaybook(tenantId, payload);
        return res.status(201).json(playbook);
      }

      if (action === 'create-cluster') {
        const cluster = riskAlertsApi.createCluster(tenantId, payload);
        return res.status(201).json(cluster);
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in risk alerts routes:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
