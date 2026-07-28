import type { VercelRequest, VercelResponse } from '@vercel/node';
import riskAlertsApi from './risk-alerts';

/**
 * Predictive Risk Alerts API Handler
 * Routes:
 *   GET  /api/tenant/students/risk-alerts?type=alerts|models|playbooks|clusters|statistics
 *   POST /api/tenant/students/risk-alerts  (action: create-alert|create-model|create-playbook|create-cluster|create-intervention)
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  const tenantId =
    (req.headers['x-tenant-id'] as string) ||
    (req.query.tenantId as string) ||
    'default-tenant';

  try {
    if (req.method === 'GET') {
      const { type, likelihood, limit, offset, riskAlertId } = req.query;

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

      if (type === 'interventions' && riskAlertId) {
        const result = riskAlertsApi.listInterventions(tenantId, riskAlertId as string);
        return res.status(200).json({ data: result });
      }

      if (type === 'statistics') {
        const result = riskAlertsApi.getStatistics(tenantId);
        return res.status(200).json(result);
      }

      return res.status(400).json({ error: 'Invalid type parameter' });
    }

    if (req.method === 'POST') {
      const { action, payload } = req.body || {};

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

      if (action === 'create-intervention') {
        const intervention = riskAlertsApi.createIntervention(tenantId, payload);
        return res.status(201).json(intervention);
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
