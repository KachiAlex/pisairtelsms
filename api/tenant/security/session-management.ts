import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js'
import { sql } from '../../_lib/sql.js'
import { requireRole } from '../../_lib/auth-middleware.js'
import { terminateSession, terminateAllSessions, logSecurityEvent } from '../../_lib/session-tracker.js'

/**
 * GET /api/tenant/security/session-management
 * Returns session management data including active sessions, anomalies, and history
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId
  if (!tenantId) {
    return res.status(401).json({ success: false, error: 'Tenant context required' })
  }

  // POST ?action=terminate&id=<sessionId> — force-logout one session.
  // POST ?action=terminate-all — force-logout every session but the caller's.
  if (req.method === 'POST') {
    const { action, id } = req.query as { action?: string; id?: string }
    try {
      if (action === 'terminate' && id) {
        const closed = await terminateSession(tenantId, String(id))
        if (!closed) {
          return res.status(404).json({ success: false, error: 'Session not found or already terminated' })
        }
        await logSecurityEvent(tenantId, decoded.userId || decoded.staffId || null, 'session_terminated', 'Session terminated by administrator', 'medium')
        return res.status(200).json({ success: true, message: 'Session terminated' })
      }
      if (action === 'terminate-all') {
        const count = await terminateAllSessions(tenantId, decoded.sid)
        await logSecurityEvent(tenantId, decoded.userId || decoded.staffId || null, 'session_terminated', `All sessions terminated by administrator (${count} closed)`, 'high')
        return res.status(200).json({ success: true, message: `${count} session(s) terminated` })
      }
      return res.status(400).json({ success: false, error: 'Unknown action' })
    } catch (error) {
      console.error('Error terminating session:', error)
      return res.status(500).json({ success: false, error: 'Failed to terminate session' })
    }
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    // Get active sessions
    const sessionsResult = await sql`
      SELECT 
        us.id,
        u.name as user,
        u.role,
        us.device_info,
        us.ip_address,
        us.location,
        us.risk_level,
        us.last_activity,
        us.expires_at
      FROM user_sessions us
      LEFT JOIN staff u ON us.user_id = u.id
      WHERE us.tenant_id = ${tenantId} AND us.terminated_at IS NULL AND us.expires_at > NOW()
      ORDER BY us.last_activity DESC
      LIMIT 20
    `
    const activeSessions = sessionsResult.rows.map(row => ({
      id: row.id,
      user: row.user,
      role: row.role,
      device: formatDeviceInfo(row.device_info),
      lastActive: getTimeAgo(row.last_activity),
      risk: row.risk_level,
    }))

    // Get anomaly signals (recent high-severity security events)
    const anomaliesResult = await sql`
      SELECT id, event_type, description, severity, created_at
      FROM security_events
      WHERE tenant_id = ${tenantId} AND severity IN ('high', 'critical')
      AND created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
    `
    const anomalySignals = anomaliesResult.rows.map(row => ({
      id: row.id,
      label: row.description || row.event_type,
      owner: 'Unassigned',
      severity: row.severity,
      action: 'Review required',
    }))

    // Get session history
    const historyResult = await sql`
      SELECT se.id, se.event_type, se.description, u.name as actor, se.created_at
      FROM security_events se
      LEFT JOIN staff u ON se.user_id = u.id
      WHERE se.tenant_id = ${tenantId} AND se.event_type IN ('session_terminated', 'session_timeout', 'logout')
      ORDER BY se.created_at DESC
      LIMIT 10
    `
    const historyLog = historyResult.rows.map(row => ({
      id: row.id,
      user: row.actor || 'System',
      action: row.description,
      time: getTimeAgo(row.created_at),
    }))

    // Sessions terminated today
    const terminatedResult = await sql`
      SELECT COUNT(*) as count
      FROM security_events
      WHERE tenant_id = ${tenantId}
        AND event_type IN ('session_terminated', 'session_timeout', 'logout')
        AND created_at >= CURRENT_DATE
    `
    const terminatedToday = parseInt(terminatedResult.rows[0]?.count || '0')

    // Average session length across sessions ended in the last 30 days
    const avgResult = await sql`
      SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(terminated_at, last_activity) - created_at)) / 60) as avg_minutes
      FROM user_sessions
      WHERE tenant_id = ${tenantId}
        AND created_at > NOW() - INTERVAL '30 days'
        AND (terminated_at IS NOT NULL OR last_activity IS NOT NULL)
    `
    const avgSessionLength = Math.round(parseFloat(avgResult.rows[0]?.avg_minutes || '0'))

    // Calculate metrics
    const activeCount = activeSessions.length
    const highRiskSignals = anomalySignals.filter(a => a.severity === 'high').length

    const data = {
      activeSessions,
      activeCount,
      terminatedToday,
      highRiskSignals,
      avgSessionLength,
      anomalySignals,
      sessionControls: [],
      historyLog,
    }

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Error fetching session management data:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch session management data',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}

function formatDeviceInfo(deviceInfo: any): string {
  if (!deviceInfo) return 'Unknown Device'
  try {
    const info = typeof deviceInfo === 'string' ? JSON.parse(deviceInfo) : deviceInfo
    return `${info.type || 'Device'} • ${info.os || 'Unknown OS'}`
  } catch {
    return 'Unknown Device'
  }
}

function getTimeAgo(date: Date | null | undefined): string {
  const timestamp = date ? new Date(date).getTime() : NaN
  if (!Number.isFinite(timestamp)) return 'Unknown'
  const now = new Date()
  const diff = now.getTime() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 5) return 'Just now'
  if (minutes < 60) return `${minutes} mins ago`
  if (hours < 24) return `${hours} hr ago`
  return `${days} day${days > 1 ? 's' : ''} ago`
}
