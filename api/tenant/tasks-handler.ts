import type { VercelRequest, VercelResponse } from '@vercel/node';
import tasksApi from './_lib/tasks';
import { requireRole } from '../_lib/auth-middleware';

/**
 * Tasks API Handler
 * Routes:
 *   GET    /api/tenant/tasks                        - List tasks
 *   POST   /api/tenant/tasks                        - Create task
 *   GET    /api/tenant/tasks/statistics             - Get statistics
 *   GET    /api/tenant/tasks/:id                    - Get task by ID
 *   PUT    /api/tenant/tasks/:id                    - Update task
 *   DELETE /api/tenant/tasks/:id                    - Delete task
 *   GET    /api/tenant/tasks/:id/comments           - Get task comments
 *   POST   /api/tenant/tasks/:id/comments           - Add comment
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Require authentication - only staff or tenant_admin can access tenant tasks
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

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
    // GET /api/tenant/tasks/statistics
    if (req.method === 'GET' && id === 'statistics') {
      const stats = tasksApi.getStatistics(tenantId);
      return res.status(200).json({ data: stats });
    }

    // GET /api/tenant/tasks/:id/comments
    if (req.method === 'GET' && id && action === 'comments') {
      const comments = tasksApi.getComments(tenantId, id as string);
      return res.status(200).json({ data: comments });
    }

    // POST /api/tenant/tasks/:id/comments
    if (req.method === 'POST' && id && action === 'comments') {
      const { text } = req.body || {};
      if (!text) return res.status(400).json({ error: 'Comment text is required' });
      const comment = tasksApi.addComment(tenantId, userId, id as string, text);
      return res.status(201).json({ data: comment });
    }

    // GET /api/tenant/tasks/:id
    if (req.method === 'GET' && id && !action) {
      const task = tasksApi.getById(tenantId, id as string);
      return res.status(200).json({ data: task });
    }

    // PUT /api/tenant/tasks/:id
    if (req.method === 'PUT' && id) {
      const task = tasksApi.update(tenantId, id as string, req.body || {});
      return res.status(200).json({ data: task });
    }

    // DELETE /api/tenant/tasks/:id
    if (req.method === 'DELETE' && id) {
      const task = tasksApi.delete(tenantId, id as string);
      return res.status(200).json({ data: task });
    }

    // GET /api/tenant/tasks - List
    if (req.method === 'GET') {
      const limit = parseInt((req.query.limit as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      const status = req.query.status as string | undefined;
      const assignedTo = req.query.assignedTo as string | undefined;
      const priority = req.query.priority as string | undefined;
      const result = tasksApi.list(tenantId, { status, assignedTo, priority, limit, offset });
      return res.status(200).json(result);
    }

    // POST /api/tenant/tasks - Create
    if (req.method === 'POST') {
      const task = tasksApi.create(tenantId, userId, req.body || {});
      return res.status(201).json({ data: task });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: message });
  }
}
