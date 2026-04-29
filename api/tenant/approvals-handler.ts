import type { VercelRequest, VercelResponse } from '@vercel/node';
import approvalsApi from './approvals';

/**
 * Approvals API Handler
 * Routes:
 *   GET    /api/tenant/approvals                    - List approvals
 *   POST   /api/tenant/approvals                    - Create approval request
 *   GET    /api/tenant/approvals/statistics         - Get statistics
 *   POST   /api/tenant/approvals/bulk-approve       - Bulk approve
 *   POST   /api/tenant/approvals/bulk-reject        - Bulk reject
 *   GET    /api/tenant/approvals/:id                - Get approval by ID
 *   POST   /api/tenant/approvals/:id/approve        - Approve single
 *   POST   /api/tenant/approvals/:id/reject         - Reject single
 *   GET    /api/tenant/approvals/:id/history        - Get approval history
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
    // GET /api/tenant/approvals/statistics
    if (req.method === 'GET' && id === 'statistics') {
      const stats = approvalsApi.getStatistics ? approvalsApi.getStatistics(tenantId) : { total: 0, pending: 0, approved: 0, rejected: 0 };
      return res.status(200).json({ data: stats });
    }

    // POST /api/tenant/approvals/bulk-approve
    if (req.method === 'POST' && id === 'bulk-approve') {
      const { ids } = req.body || {};
      const result = approvalsApi.bulkApprove(tenantId, userId, ids);
      return res.status(200).json(result);
    }

    // POST /api/tenant/approvals/bulk-reject
    if (req.method === 'POST' && id === 'bulk-reject') {
      const { ids, reason } = req.body || {};
      const result = approvalsApi.bulkReject(tenantId, userId, ids, reason || '');
      return res.status(200).json(result);
    }

    // POST /api/tenant/approvals/:id/approve
    if (req.method === 'POST' && id && action === 'approve') {
      const approval = approvalsApi.approve(tenantId, userId, id as string);
      return res.status(200).json({ data: approval });
    }

    // POST /api/tenant/approvals/:id/reject
    if (req.method === 'POST' && id && action === 'reject') {
      const { reason } = req.body || {};
      const approval = approvalsApi.reject(tenantId, userId, id as string, reason || '');
      return res.status(200).json({ data: approval });
    }

    // GET /api/tenant/approvals/:id/history
    if (req.method === 'GET' && id && action === 'history') {
      const history = approvalsApi.getHistory(tenantId, id as string);
      return res.status(200).json({ data: history });
    }

    // GET /api/tenant/approvals/:id
    if (req.method === 'GET' && id && !action) {
      const approval = approvalsApi.getById(tenantId, id as string);
      return res.status(200).json({ data: approval });
    }

    // GET /api/tenant/approvals - List
    if (req.method === 'GET') {
      const limit = parseInt((req.query.limit as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      const type = req.query.type as string | undefined;
      const status = req.query.status as string | undefined;
      const result = approvalsApi.list(tenantId, { type, status, limit, offset });
      return res.status(200).json(result);
    }

    // POST /api/tenant/approvals - Create
    if (req.method === 'POST') {
      const { type, referenceId, description } = req.body || {};
      const approval = approvalsApi.create(tenantId, userId, { type, referenceId, description });
      return res.status(201).json({ data: approval });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: message });
  }
}
