import type { VercelRequest, VercelResponse } from '@vercel/node';
import apiManagementApi from './api-management';

/**
 * API Management Handler
 * Routes:
 *   GET    /api/tenant/integrations/api-management                          - List API keys
 *   POST   /api/tenant/integrations/api-management                          - Generate API key
 *   GET    /api/tenant/integrations/api-management/statistics               - Get statistics
 *   GET    /api/tenant/integrations/api-management/:id                      - Get key by ID
 *   PUT    /api/tenant/integrations/api-management/:id                      - Update key
 *   POST   /api/tenant/integrations/api-management/:id/revoke               - Revoke key
 *   GET    /api/tenant/integrations/api-management/:id/usage                - Get usage
 *   GET    /api/tenant/integrations/api-management/:id/usage-stats          - Get usage stats
 *   GET    /api/tenant/integrations/api-management/:id/rate-limit           - Get rate limit
 *   PUT    /api/tenant/integrations/api-management/:id/rate-limit           - Update rate limit
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

  const { id, action } = req.query;

  try {
    // GET /api/tenant/integrations/api-management/statistics
    if (req.method === 'GET' && id === 'statistics') {
      const stats = apiManagementApi.getStatistics(tenantId);
      return res.status(200).json({ data: stats });
    }

    // POST /api/tenant/integrations/api-management/:id/revoke
    if (req.method === 'POST' && id && action === 'revoke') {
      const key = apiManagementApi.revokeKey(tenantId, id as string, userId);
      return res.status(200).json({ data: key });
    }

    // GET /api/tenant/integrations/api-management/:id/usage
    if (req.method === 'GET' && id && action === 'usage') {
      const limit = parseInt((req.query.limit as string) || '100');
      const offset = parseInt((req.query.offset as string) || '0');
      const usage = apiManagementApi.getUsage(tenantId, id as string, limit, offset);
      return res.status(200).json(usage);
    }

    // GET /api/tenant/integrations/api-management/:id/usage-stats
    if (req.method === 'GET' && id && action === 'usage-stats') {
      const timeRange = (req.query.timeRange as 'hour' | 'day' | 'week' | 'month') || 'day';
      const stats = apiManagementApi.getUsageStatistics(tenantId, id as string, timeRange);
      return res.status(200).json({ data: stats });
    }

    // GET /api/tenant/integrations/api-management/:id/rate-limit
    if (req.method === 'GET' && id && action === 'rate-limit') {
      const config = apiManagementApi.getRateLimitConfig(tenantId, id as string);
      return res.status(200).json({ data: config });
    }

    // PUT /api/tenant/integrations/api-management/:id/rate-limit
    if (req.method === 'PUT' && id && action === 'rate-limit') {
      const config = apiManagementApi.updateRateLimitConfig(tenantId, id as string, req.body || {});
      return res.status(200).json({ data: config });
    }

    // GET /api/tenant/integrations/api-management/:id
    if (req.method === 'GET' && id && !action) {
      const key = apiManagementApi.getKey(tenantId, id as string);
      return res.status(200).json({ data: key });
    }

    // PUT /api/tenant/integrations/api-management/:id
    if (req.method === 'PUT' && id) {
      const key = apiManagementApi.updateKey(tenantId, id as string, req.body || {});
      return res.status(200).json({ data: key });
    }

    // GET /api/tenant/integrations/api-management
    if (req.method === 'GET') {
      const limit = parseInt((req.query.limit as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      const result = apiManagementApi.getKeys(tenantId, limit, offset);
      return res.status(200).json(result);
    }

    // POST /api/tenant/integrations/api-management
    if (req.method === 'POST') {
      const key = apiManagementApi.generateKey(tenantId, userId, req.body || {});
      return res.status(201).json({ data: key });
    }

    res.setHeader('Allow', 'GET, POST, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: message });
  }
}
