import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../../_lib/auth-middleware.js'

function getTenantId(req: VercelRequest): string | null {
  const tenantId = req.headers['x-tenant-id'] as string | undefined
  if (tenantId) return tenantId
  const queryTenantId = req.query['tenantId'] as string | undefined
  if (queryTenantId) return queryTenantId
  return null
}

/**
 * GET /api/tenant/security/overview
 * Returns security overview metrics
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const tenantId = getTenantId(req)
  if (!tenantId) {
    return res.status(401).json({ success: false, error: 'Tenant context required (x-tenant-id header)' })
  }

  try {
    // Get active sessions count
    const sessionsResult = await sql`
      SELECT COUNT(*) as count FROM user_sessions 
      WHERE tenant_id = ${tenantId} AND terminated_at IS NULL AND expires_at > NOW()
    `
    const activeSessions = parseInt(sessionsResult.rows[0]?.count || '0')

    // Get privileged identities count
    const privilegedResult = await sql`
      SELECT COUNT(*) as count FROM role_assignments ra
      JOIN privileged_roles pr ON ra.role_id = pr.id
      WHERE ra.tenant_id = ${tenantId} AND ra.is_active = true AND pr.is_active = true
    `
    const privilegedIdentities = parseInt(privilegedResult.rows[0]?.count || '0')

    // Get MFA coverage (mock calculation - in production, query user MFA status)
    const mfaCoverage = 92

    // Get encryption coverage
    const encryptionResult = await sql`
      SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'active' THEN 1 END) as active
      FROM encryption_keys WHERE tenant_id = ${tenantId}
    `
    const totalKeys = parseInt(encryptionResult.rows[0]?.total || '0')
    const activeKeys = parseInt(encryptionResult.rows[0]?.active || '0')
    const encryptionCoverage = totalKeys > 0 ? Math.round((activeKeys / totalKeys) * 100) : 0

    // Get critical alerts
    const alertsResult = await sql`
      SELECT COUNT(*) as count FROM security_events 
      WHERE tenant_id = ${tenantId} AND severity IN ('high', 'critical') 
      AND created_at > NOW() - INTERVAL '24 hours'
    `
    const criticalAlerts = parseInt(alertsResult.rows[0]?.count || '0')

    // Get pending reviews
    const reviewsResult = await sql`
      SELECT COUNT(*) as count FROM privileged_roles 
      WHERE tenant_id = ${tenantId} AND next_review_date < NOW() + INTERVAL '7 days'
    `
    const pendingReviews = parseInt(reviewsResult.rows[0]?.count || '0')

    // Get backup success rate
    const backupResult = await sql`
      SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as succeeded
      FROM backup_jobs 
      WHERE tenant_id = ${tenantId} AND created_at > NOW() - INTERVAL '24 hours'
    `
    const totalBackups = parseInt(backupResult.rows[0]?.total || '0')
    const succeededBackups = parseInt(backupResult.rows[0]?.succeeded || '0')
    const backupSuccessRate = totalBackups > 0 ? Math.round((succeededBackups / totalBackups) * 100) : 100

    // Get compliance tasks
    const complianceResult = await sql`
      SELECT COUNT(*) as count FROM compliance_tasks 
      WHERE tenant_id = ${tenantId} AND status NOT IN ('completed', 'overdue')
    `
    const complianceTasks = parseInt(complianceResult.rows[0]?.count || '0')

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
