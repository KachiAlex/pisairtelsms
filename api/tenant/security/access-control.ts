import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js'
import { sql } from '../../_lib/sql.js'
import { requireRole } from '../../_lib/auth-middleware.js'

/**
 * GET /api/tenant/security/access-control
 * Returns access control data including privileged roles, approval policies, and activity
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const tenantId = decoded.tenantId
  if (!tenantId) {
    return res.status(401).json({ success: false, error: 'Tenant context required' })
  }

  try {
    // Get privileged roles with member counts
    const rolesResult = await sql`
      SELECT 
        pr.role_name,
        pr.description,
        pr.mfa_required,
        pr.last_review_date,
        COUNT(ra.id) as members,
        COUNT(CASE WHEN ra.is_active = true THEN 1 END) as active_members
      FROM privileged_roles pr
      LEFT JOIN role_assignments ra ON pr.id = ra.role_id AND ra.tenant_id = pr.tenant_id
      WHERE pr.tenant_id = ${tenantId} AND pr.is_active = true
      GROUP BY pr.id, pr.role_name, pr.description, pr.mfa_required, pr.last_review_date
      ORDER BY pr.role_name
    `
    const privilegedRoles = rolesResult.rows.map(row => ({
      role: row.role_name,
      members: parseInt(row.members || '0'),
      lastReview: row.last_review_date ? new Date(row.last_review_date).toLocaleDateString() : 'Never',
      mfa: row.mfa_required ? '100%' : '0%',
    }))

    // Get approval policies
    const policiesResult = await sql`
      SELECT action_type, policy_type, approvers, sla_hours, is_active
      FROM approval_policies
      WHERE tenant_id = ${tenantId} AND is_active = true
      ORDER BY action_type
    `
    const approvalMatrix = policiesResult.rows.map(row => ({
      action: row.action_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      policy: row.policy_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      owners: Array.isArray(row.approvers) ? row.approvers.join(', ') : 'Security Team',
      sla: row.sla_hours ? `${row.sla_hours} hrs` : 'n/a',
    }))

    // Get recent security events for activity feed
    const eventsResult = await sql`
      SELECT se.id, se.event_type, se.description, se.created_at, u.name as actor
      FROM security_events se
      LEFT JOIN staff u ON se.user_id = u.id
      WHERE se.tenant_id = ${tenantId}
      ORDER BY se.created_at DESC
      LIMIT 10
    `
    const activityFeed = eventsResult.rows.map(row => ({
      id: row.id,
      actor: row.actor || 'System',
      event: row.description,
      time: getTimeAgo(row.created_at),
    }))

    // Calculate metrics from tenant records, not role configuration defaults.
    const mfaResult = await sql`
      SELECT COUNT(*) FILTER (WHERE um.is_enabled = true) AS enabled,
             COUNT(tu.id) AS total
      FROM tenant_users tu
      LEFT JOIN user_mfa um ON um.tenant_id = tu.tenant_id AND um.user_id = tu.id
      WHERE tu.tenant_id = ${tenantId} AND tu.status = 'active'
    `
    const mfaTotal = Number(mfaResult.rows[0]?.total || 0)
    const mfaCoverage = mfaTotal > 0 ? Math.round(Number(mfaResult.rows[0]?.enabled || 0) / mfaTotal * 100) : null
    const privilegedIdentities = privilegedRoles.reduce((sum, r) => sum + r.members, 0)
    const pendingReviews = privilegedRoles.filter(r => r.lastReview === 'Never').length
    const anomalyAlerts = eventsResult.rows.filter(r => ['anomaly_detected', 'login_failed'].includes(r.event_type)).length

    const data = {
      privilegedIdentities,
      pendingReviews,
      mfaCoverage,
      anomalyAlerts,
      privilegedRoles,
      approvalMatrix,
      activityFeed,
    }

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Error fetching access control data:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch access control data',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 60) return `${minutes} mins ago`
  if (hours < 24) return `${hours} hr ago`
  return `${days} day${days > 1 ? 's' : ''} ago`
}
