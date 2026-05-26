import type { VercelRequest, VercelResponse } from '@vercel/node';
import sessionsLib from './sessions';
import { requireRole } from '../../_lib/auth-middleware.js';

/**
 * Sessions API Handler
 * Routes:
 *   GET    /api/tenant/security/sessions           - List active sessions
 *   POST   /api/tenant/security/sessions           - Create session
 *   GET    /api/tenant/security/sessions/policy    - Get session policy
 *   PUT    /api/tenant/security/sessions/policy    - Update session policy
 *   GET    /api/tenant/security/sessions/history   - Get session history
 *   POST   /api/tenant/security/sessions/:id/logout - Force logout session
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['staff', 'tenant_admin']);
  if (!decoded) return;

  const tenantId =
    (req.headers['x-tenant-id'] as string) ||
    (req.query.tenantId as string) ||
    'default-tenant';

  const userId =
    (req.headers['x-user-id'] as string) ||
    (req.query.userId as string) ||
    'system';

  const { action, id } = req.query;

  try {
    // GET /api/tenant/security/sessions/policy
    if (req.method === 'GET' && action === 'policy') {
      const policy = sessionsLib.getSessionPolicy(tenantId);
      return res.status(200).json({ data: policy });
    }

    // PUT /api/tenant/security/sessions/policy
    if (req.method === 'PUT' && action === 'policy') {
      const { timeoutMinutes, maxSessions } = req.body || {};
      const policy = sessionsLib.updateSessionPolicy(
        tenantId,
        userId,
        timeoutMinutes,
        maxSessions
      );
      return res.status(200).json({ data: policy });
    }

    // GET /api/tenant/security/sessions/history
    if (req.method === 'GET' && action === 'history') {
      const limit = parseInt((req.query.limit as string) || '100');
      const offset = parseInt((req.query.offset as string) || '0');
      const actionFilter = req.query.action as string | undefined;
      const history = sessionsLib.getSessionHistory(tenantId, limit, offset, actionFilter);
      return res.status(200).json(history);
    }

    // POST /api/tenant/security/sessions/:id/logout
    if (req.method === 'POST' && id && action === 'logout') {
      const { reason } = req.body || {};
      const result = sessionsLib.logoutSession(tenantId, id as string, userId, reason);
      return res.status(200).json(result);
    }

    // GET /api/tenant/security/sessions - List active sessions
    if (req.method === 'GET') {
      const limit = parseInt((req.query.limit as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      const sessions = sessionsLib.listSessions(tenantId, userId, limit, offset);
      return res.status(200).json(sessions);
    }

    // POST /api/tenant/security/sessions - Create session
    if (req.method === 'POST') {
      const { deviceInfo, ipAddress, userAgent } = req.body || {};
      const session = sessionsLib.createSession(
        tenantId,
        userId,
        deviceInfo || null,
        ipAddress || (req.headers['x-forwarded-for'] as string) || null,
        userAgent || (req.headers['user-agent'] as string) || null
      );
      return res.status(201).json({ data: session });
    }

    res.setHeader('Allow', 'GET, POST, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: message });
  }
}
