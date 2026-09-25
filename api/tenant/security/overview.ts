import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js'
import { poolQuery } from '../../_lib/pg-pool.js'
import { requireRole } from '../../_lib/auth-middleware.js'

/**
 * GET /api/tenant/security/overview
 * Returns security overview metrics
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['tenant_admin'])
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
    // Note: "ensure tables exist" bootstrap was removed — it was an empty
    // no-op block that only swallowed errors. Table creation is owned by the
    // consolidated migration runner.

    // Get active sessions count
    let activeSessions = 0
    try {
      const sessionsResult = await poolQuery(
        'SELECT COUNT(*) as count FROM user_sessions WHERE tenant_id = $1 AND terminated_at IS NULL AND expires_at > NOW()',
        [tenantId]
      )
      activeSessions = parseInt(sessionsResult.rows[0]?.count || '0')
    } catch (e) { console.error('user_sessions query error:', e) }

    // Get privileged identities count
    let privilegedIdentities = 0
    try {
      const privilegedResult = await poolQuery(
        'SELECT COUNT(*) as count FROM role_assignments ra JOIN privileged_roles pr ON ra.role_id = pr.id WHERE ra.tenant_id = $1 AND ra.is_active = true AND pr.is_active = true',
        [tenantId]
      )
      privilegedIdentities = parseInt(privilegedResult.rows[0]?.count || '0')
    } catch (e) { console.error('role_assignments query error:', e) }

    // Get MFA coverage: enrolled users / total tenant users
    let mfaCoverage: number | null = null
    try {
      const mfaResult = await poolQuery(
        `SELECT
           (SELECT COUNT(*) FROM user_mfa WHERE tenant_id = $1 AND is_enabled = true) as enabled,
           (SELECT COUNT(*) FROM tenant_users WHERE tenant_id = $1) as total_users`,
        [tenantId]
      )
      const enabled = parseInt(mfaResult.rows[0]?.enabled || '0')
      const totalUsers = parseInt(mfaResult.rows[0]?.total_users || '0')
      mfaCoverage = totalUsers > 0 ? Math.round((enabled / totalUsers) * 100) : null
    } catch (e) { console.error('user_mfa query error:', e) }

    // Get encryption coverage
    let encryptionCoverage = 0
    try {
      const encryptionResult = await poolQuery(
        "SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'active' THEN 1 END) as active FROM encryption_keys WHERE tenant_id = $1",
        [tenantId]
      )
      const totalKeys = parseInt(encryptionResult.rows[0]?.total || '0')
      const activeKeys = parseInt(encryptionResult.rows[0]?.active || '0')
      encryptionCoverage = totalKeys > 0 ? Math.round((activeKeys / totalKeys) * 100) : 0
    } catch (e) { console.error('encryption_keys query error:', e) }

    // Get critical alerts
    let criticalAlerts = 0
    try {
      const alertsResult = await poolQuery(
        "SELECT COUNT(*) as count FROM security_events WHERE tenant_id = $1 AND severity IN ('high', 'critical') AND created_at > NOW() - INTERVAL '24 hours'",
        [tenantId]
      )
      criticalAlerts = parseInt(alertsResult.rows[0]?.count || '0')
    } catch (e) { console.error('security_events query error:', e) }

    // Get pending reviews
    let pendingReviews = 0
    try {
      const reviewsResult = await poolQuery(
        "SELECT COUNT(*) as count FROM privileged_roles WHERE tenant_id = $1 AND next_review_date < NOW() + INTERVAL '7 days'",
        [tenantId]
      )
      pendingReviews = parseInt(reviewsResult.rows[0]?.count || '0')
    } catch (e) { console.error('privileged_roles query error:', e) }

    // Get backup success rate (null when no backups ran in the window)
    let backupSuccessRate: number | null = null
    try {
      const backupResult = await poolQuery(
        "SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as succeeded FROM backup_jobs WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '24 hours'",
        [tenantId]
      )
      const totalBackups = parseInt(backupResult.rows[0]?.total || '0')
      const succeededBackups = parseInt(backupResult.rows[0]?.succeeded || '0')
      backupSuccessRate = totalBackups > 0 ? Math.round((succeededBackups / totalBackups) * 100) : null
    } catch (e) { console.error('backup_jobs query error:', e) }

    // Get compliance tasks
    let complianceTasks = 0
    try {
      const complianceResult = await poolQuery(
        "SELECT COUNT(*) as count FROM compliance_tasks WHERE tenant_id = $1 AND status NOT IN ('completed', 'overdue')",
        [tenantId]
      )
      complianceTasks = parseInt(complianceResult.rows[0]?.count || '0')
    } catch (e) { console.error('compliance_tasks query error:', e) }

    const data = {
      activeSessions,
      privilegedIdentities,
      mfaCoverage,
      encryptionCoverage,
      criticalAlerts,
      pendingReviews,
      backupSuccessRate,
      complianceTasks,
    }

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Error fetching security overview:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch security overview',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}
