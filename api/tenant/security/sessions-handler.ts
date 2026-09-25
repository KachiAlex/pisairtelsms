import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js'
import { sql } from '../../_lib/sql.js'
import { requireRole } from '../../_lib/auth-middleware.js'
import { recordSession, terminateSession, logSecurityEvent } from '../../_lib/session-tracker.js'

/** Persistent session-management API. The old implementation used process
 * memory, which lost sessions on restart and could not terminate JWT sessions. */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['tenant_admin'])
  if (!decoded) return
  const tenantId = decoded.tenantId
  if (!tenantId) return res.status(401).json({ success: false, error: 'Tenant context required' })

  const userId = decoded.userId || decoded.staffId || 'system'
  const action = String(req.query.action || '')
  const id = req.query.id ? String(req.query.id) : null

  try {
    if (req.method === 'GET' && action === 'policy') {
      const result = await sql`SELECT timeout_minutes AS "timeoutMinutes", max_sessions AS "maxSessions", updated_at AS "updatedAt" FROM security_session_policies WHERE tenant_id = ${tenantId}`
      return res.status(200).json({ data: result.rows[0] || { timeoutMinutes: 30, maxSessions: 10 } })
    }

    if (req.method === 'PUT' && action === 'policy') {
      const timeoutMinutes = Math.max(5, Math.min(1440, Number(req.body?.timeoutMinutes) || 30))
      const maxSessions = Math.max(1, Math.min(100, Number(req.body?.maxSessions) || 10))
      const result = await sql`
        INSERT INTO security_session_policies (id, tenant_id, timeout_minutes, max_sessions, updated_by)
        VALUES (${crypto.randomUUID()}, ${tenantId}, ${timeoutMinutes}, ${maxSessions}, ${userId})
        ON CONFLICT (tenant_id) DO UPDATE SET timeout_minutes = EXCLUDED.timeout_minutes,
          max_sessions = EXCLUDED.max_sessions, updated_by = EXCLUDED.updated_by, updated_at = NOW()
        RETURNING timeout_minutes AS "timeoutMinutes", max_sessions AS "maxSessions", updated_at AS "updatedAt"
      `
      await logSecurityEvent(tenantId, userId, 'session_policy_updated', `Session policy updated: ${timeoutMinutes} minutes, ${maxSessions} sessions`, 'medium')
      return res.status(200).json({ data: result.rows[0] })
    }

    if (req.method === 'GET' && action === 'history') {
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100))
      const result = await sql`
        SELECT se.id, COALESCE(s.name, 'System') AS "user", se.event_type AS action,
          se.description, se.created_at AS "createdAt"
        FROM security_events se LEFT JOIN staff s ON se.user_id = s.id
        WHERE se.tenant_id = ${tenantId} AND se.event_type IN ('session_terminated', 'session_timeout', 'logout')
        ORDER BY se.created_at DESC LIMIT ${limit}
      `
      return res.status(200).json({ data: result.rows })
    }

    if (req.method === 'POST' && action === 'logout' && id) {
      const closed = await terminateSession(tenantId, id)
      if (!closed) return res.status(404).json({ error: 'Session not found or already terminated' })
      await logSecurityEvent(tenantId, userId, 'session_terminated', 'Session terminated by administrator', 'medium')
      return res.status(200).json({ success: true })
    }

    if (req.method === 'GET') {
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50))
      const result = await sql`
        SELECT us.id, COALESCE(s.name, us.user_id, 'Unknown user') AS "user", COALESCE(s.role, 'Unknown') AS role,
          us.device_info AS "deviceInfo", us.ip_address AS "ipAddress", us.location,
          us.risk_level AS risk, us.last_activity AS "lastActivity", us.expires_at AS "expiresAt"
        FROM user_sessions us LEFT JOIN staff s ON us.user_id = s.id
        WHERE us.tenant_id = ${tenantId} AND us.terminated_at IS NULL AND us.expires_at > NOW()
        ORDER BY us.last_activity DESC NULLS LAST LIMIT ${limit}
      `
      return res.status(200).json({ data: result.rows })
    }

    if (req.method === 'POST' && !action) {
      const sessionId = await recordSession(tenantId, userId, req, 86400)
      return sessionId ? res.status(201).json({ data: { id: sessionId } }) : res.status(500).json({ error: 'Failed to create session' })
    }

    res.setHeader('Allow', 'GET, POST, PUT')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Security sessions handler error:', error)
    return res.status(500).json({ error: 'Failed to process session request' })
  }
}
