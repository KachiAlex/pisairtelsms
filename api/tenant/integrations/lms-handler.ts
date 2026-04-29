import type { VercelRequest, VercelResponse } from '@vercel/node';
import lmsApi from './lms';

/**
 * LMS Integration API Handler
 * Routes:
 *   GET    /api/tenant/integrations/lms/config                      - Get config
 *   PUT    /api/tenant/integrations/lms/config                      - Upsert config
 *   GET    /api/tenant/integrations/lms/statistics                  - Get statistics
 *   POST   /api/tenant/integrations/lms/:id/test                    - Test connection
 *   POST   /api/tenant/integrations/lms/:id/sync/students           - Start student sync
 *   POST   /api/tenant/integrations/lms/:id/sync/grades             - Start grade sync
 *   PUT    /api/tenant/integrations/lms/:id/sync/:syncId            - Complete sync
 *   GET    /api/tenant/integrations/lms/:id/sync-history            - Get sync history
 *   GET    /api/tenant/integrations/lms/:id/logs                    - Get sync logs
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

  const { id, action, syncId, syncType } = req.query;

  try {
    // GET /api/tenant/integrations/lms/statistics
    if (req.method === 'GET' && id === 'statistics') {
      const stats = lmsApi.getStatistics(tenantId);
      return res.status(200).json({ data: stats });
    }

    // GET /api/tenant/integrations/lms/config
    if (req.method === 'GET' && id === 'config') {
      const config = lmsApi.getConfig(tenantId);
      return res.status(200).json({ data: config });
    }

    // PUT /api/tenant/integrations/lms/config
    if (req.method === 'PUT' && id === 'config') {
      const config = lmsApi.upsertConfig(tenantId, userId, req.body || {});
      return res.status(200).json({ data: config });
    }

    // POST /api/tenant/integrations/lms/:id/test
    if (req.method === 'POST' && id && action === 'test') {
      const result = lmsApi.testConnection(tenantId, id as string);
      return res.status(200).json(result);
    }

    // POST /api/tenant/integrations/lms/:id/sync/students
    if (req.method === 'POST' && id && action === 'sync' && syncType === 'students') {
      const sync = lmsApi.startStudentSync(tenantId, id as string);
      return res.status(201).json({ data: sync });
    }

    // POST /api/tenant/integrations/lms/:id/sync/grades
    if (req.method === 'POST' && id && action === 'sync' && syncType === 'grades') {
      const sync = lmsApi.startGradeSync(tenantId, id as string);
      return res.status(201).json({ data: sync });
    }

    // PUT /api/tenant/integrations/lms/:id/sync/:syncId
    if (req.method === 'PUT' && id && action === 'sync' && syncId) {
      const { recordsProcessed, recordsFailed, error, type } = req.body || {};
      let sync;
      if (type === 'grade') {
        sync = lmsApi.completeGradeSync(tenantId, syncId as string, recordsProcessed || 0, recordsFailed || 0, error);
      } else {
        sync = lmsApi.completeStudentSync(tenantId, syncId as string, recordsProcessed || 0, recordsFailed || 0, error);
      }
      return res.status(200).json({ data: sync });
    }

    // GET /api/tenant/integrations/lms/:id/sync-history
    if (req.method === 'GET' && id && action === 'sync-history') {
      const limit = parseInt((req.query.limit as string) || '20');
      const history = lmsApi.getSyncHistory(tenantId, id as string, limit);
      return res.status(200).json({ data: history });
    }

    // GET /api/tenant/integrations/lms/:id/logs
    if (req.method === 'GET' && id && action === 'logs') {
      const limit = parseInt((req.query.limit as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      const logs = lmsApi.getSyncLogs(tenantId, id as string, limit, offset);
      return res.status(200).json(logs);
    }

    // GET /api/tenant/integrations/lms (all configs)
    if (req.method === 'GET') {
      const configs = lmsApi.getAllConfigs(tenantId);
      return res.status(200).json({ data: configs });
    }

    res.setHeader('Allow', 'GET, PUT, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: message });
  }
}
