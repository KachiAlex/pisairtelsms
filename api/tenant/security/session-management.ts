import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'

function getTenantId(req: VercelRequest): string | null {
  const tenantId = req.headers['x-tenant-id'] as string | undefined
  if (tenantId) return tenantId
  const queryTenantId = req.query['tenantId'] as string | undefined
  if (queryTenantId) return queryTenantId
  return null
}

/**
 * GET /api/tenant/security/session-management
 * Returns session management data including active sessions, anomalies, and history
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const tenantId = getTenantId(req)
  if (!tenantId) {
    return res.status(401).json({ success: false, error: 'Tenant context required (x-tenant-id header)' })
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
      JOIN users u ON us.user_id = u.id
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
      label: row.description,
      owner: 'Security Ops',
      severity: row.severity,
      action: row.severity === 'critical' ? 'Auto terminate session' : 'Force MFA challenge',
    }))

    // Get session controls (mock data for now)
    const sessionControls = [
      { id: 'control-1', label: 'Adaptive idle timeout', value: '15 mins (critical roles)', status: 'Live' },
      { id: 'control-2', label: 'Device trust checks', value: 'Last seen < 30 days', status: 'Live' },
      { id: 'control-3', label: 'Emergency kill switch', value: 'Available', status: 'Ready' },
    ]

    // Get session history
    const historyResult = await sql`
      SELECT se.id, se.event_type, se.description, u.name as actor, se.created_at
      FROM security_events se
      LEFT JOIN users u ON se.user_id = u.id
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

    // Calculate metrics
    const activeCount = activeSessions.length
    const terminatedToday = historyLog.filter(h => h.time.includes('hr') || h.time.includes('min')).length
    const highRiskSignals = anomalySignals.filter(a => a.severity === 'high').length
    const avgSessionLength = 47 // Mock calculation

    const data = {
      activeSessions,
      activeCount,
      terminatedToday,
      highRiskSignals,
      avgSessionLength,
      anomalySignals,
      sessionControls,
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
  const info = typeof deviceInfo === 'string' ? JSON.parse(deviceInfo) : deviceInfo
  return `${info.type || 'Device'} • ${info.os || 'Unknown OS'}`
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 5) return 'Just now'
  if (minutes < 60) return `${minutes} mins ago`
  if (hours < 24) return `${hours} hr ago`
  return `${days} day${days > 1 ? 's' : ''} ago`
}
