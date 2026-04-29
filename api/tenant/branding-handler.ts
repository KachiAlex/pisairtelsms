import type { VercelRequest, VercelResponse } from '@vercel/node';
import brandingApi from './branding';

/**
 * Branding API Handler
 * Routes:
 *   GET    /api/tenant/branding                    - Get branding config
 *   PUT    /api/tenant/branding                    - Update branding config
 *   POST   /api/tenant/branding/logo               - Upload logo
 *   POST   /api/tenant/branding/publish            - Publish branding
 *   GET    /api/tenant/branding/history            - Get branding history
 *   GET    /api/tenant/branding/audit-logs         - Get audit logs
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

  const { action } = req.query;

  try {
    // POST /api/tenant/branding/logo
    if (req.method === 'POST' && action === 'logo') {
      const { logoUrl, fileName } = req.body || {};
      if (!logoUrl) return res.status(400).json({ error: 'logoUrl is required' });
      const config = brandingApi.uploadLogo(tenantId, userId, logoUrl, fileName || 'logo');
      return res.status(200).json({ data: config });
    }

    // POST /api/tenant/branding/publish
    if (req.method === 'POST' && action === 'publish') {
      const config = brandingApi.publish(tenantId, userId);
      return res.status(200).json({ data: config });
    }

    // GET /api/tenant/branding/history
    if (req.method === 'GET' && action === 'history') {
      const limit = parseInt((req.query.limit as string) || '10');
      const history = brandingApi.getHistory(tenantId, limit);
      return res.status(200).json({ data: history });
    }

    // GET /api/tenant/branding/audit-logs
    if (req.method === 'GET' && action === 'audit-logs') {
      const limit = parseInt((req.query.limit as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      const logs = brandingApi.getAuditLogs(tenantId, limit, offset);
      return res.status(200).json(logs);
    }

    // GET /api/tenant/branding
    if (req.method === 'GET') {
      const config = brandingApi.get(tenantId);
      return res.status(200).json({ data: config });
    }

    // PUT /api/tenant/branding
    if (req.method === 'PUT') {
      const config = brandingApi.upsert(tenantId, userId, req.body || {});
      return res.status(200).json({ data: config });
    }

    res.setHeader('Allow', 'GET, PUT, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: message });
  }
}
