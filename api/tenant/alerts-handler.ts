import type { VercelRequest, VercelResponse } from '@vercel/node';
import alertsApi from './alerts';

/**
 * Alerts API Handler
 * Routes:
 *   GET    /api/tenant/alerts                           - List alerts
 *   POST   /api/tenant/alerts                           - Create alert
 *   GET    /api/tenant/alerts/statistics/summary        - Get statistics
 *   GET    /api/tenant/alerts/:id                       - Get alert by ID
 *   POST   /api/tenant/alerts/:id/acknowledge           - Acknowledge alert
 *   POST   /api/tenant/alerts/:id/resolve               - Resolve alert
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

  const { id, action, sub } = req.query;

  try {
    // GET /api/tenant/alerts/statistics/summary
    if (req.method === 'GET' && id === 'statistics' && sub === 'summary') {
      const stats = alertsApi.getStatistics(tenantId);
      return res.status(200).json({ data: stats });
    }

    // POST /api/tenant/alerts/:id/acknowledge
    if (req.method === 'POST' && id && action === 'acknowledge') {
      const alert = alertsApi.acknowledge(tenantId, userId, id as string);
      return res.status(200).json({ data: alert });
    }

    // POST /api/tenant/alerts/:id/resolve
    if (req.method === 'POST' && id && action === 'resolve') {
      const alert = alertsApi.resolve(tenantId, id as string);
      return res.status(200).json({ data: alert });
    }

    // GET /api/tenant/alerts/:id
    if (req.method === 'GET' && id && !action) {
      const alert = alertsApi.getById(tenantId, id as string);
      return res.status(200).json({ data: alert });
    }

    // GET /api/tenant/alerts - List
    if (req.method === 'GET') {
      const limit = parseInt((req.query.limit as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      const severity = req.query.severity as string | undefined;
      const status = req.query.status as string | undefined;
      const result = alertsApi.list(tenantId, { severity, status, limit, offset });
      return res.status(200).json(result);
    }

    // POST /api/tenant/alerts - Create
    if (req.method === 'POST') {
      const { title, message, severity, category } = req.body || {};
      const alert = alertsApi.create(tenantId, { title, message, severity, category });
      return res.status(201).json({ data: alert });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: message });
  }
}
