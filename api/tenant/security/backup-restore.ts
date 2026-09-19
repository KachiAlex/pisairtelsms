import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js'
import { sql } from '../../_lib/sql.js'
import { requireRole } from '../../_lib/auth-middleware.js'

/**
 * GET /api/tenant/security/backup-restore
 * Returns backup and restore data including jobs, requests, and compliance
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const tenantId = decoded.tenantId || 'default-tenant'

  try {
    // Get backup jobs
    const jobsResult = await sql`
      SELECT id, job_type, schedule, status, size_bytes, location, started_at, completed_at
      FROM backup_jobs
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
      LIMIT 20
    `
    const backupJobs = jobsResult.rows.map(row => ({
      id: `BK-${row.id.substring(0, 4)}`,
      type: `${row.job_type} ${row.schedule}`,
      window: row.started_at 
        ? `${new Date(row.started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${row.completed_at ? new Date(row.completed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '...'}`
        : 'Scheduled',
      status: row.status === 'succeeded' ? 'Succeeded' : row.status === 'running' ? 'Running' : row.status === 'failed' ? 'Failed' : 'Pending',
      size: row.size_bytes ? formatBytes(row.size_bytes) : '—',
      location: row.location,
    }))

    // Get restore requests
    const restoreResult = await sql`
      SELECT id, scope, requested_by, status, approved_by, approved_at, completed_at
      FROM restore_requests
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
      LIMIT 10
    `
    const restoreRequests = restoreResult.rows.map(row => ({
      id: `RS-${row.id.substring(0, 3)}`,
      cohort: 'All',
      scope: row.scope,
      requestedBy: row.requested_by,
      eta: row.status === 'completed' ? 'Ready' : row.status === 'processing' ? 'In progress' : 'Awaiting approval',
      status: row.status === 'completed' ? 'Ready' : row.status === 'processing' ? 'Processing' : row.status === 'approved' ? 'Approved' : 'Pending',
    }))

    // Get compliance signals
    const complianceResult = await sql`
      SELECT id, task_name, task_type, owner, due_date, status
      FROM compliance_tasks
      WHERE tenant_id = ${tenantId} AND task_type = 'bcp_drill'
      AND status NOT IN ('completed', 'overdue')
      ORDER BY due_date ASC
    `
    const complianceSignals = complianceResult.rows.map(row => ({
      id: `cmp-${row.id.substring(0, 8)}`,
      label: row.task_name,
      owner: row.owner,
      due: new Date(row.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      status: row.status === 'due_soon' ? 'Due soon' : 'Scheduled',
    }))

    // BCP compliance: share of bcp_drill tasks completed
    const bcpResult = await sql`
      SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM compliance_tasks
      WHERE tenant_id = ${tenantId} AND task_type = 'bcp_drill'
    `
    const bcpTotal = parseInt(bcpResult.rows[0]?.total || '0')
    const bcpDone = parseInt(bcpResult.rows[0]?.completed || '0')

    // Calculate metrics
    const successfulJobs = backupJobs.filter(j => j.status === 'Succeeded').length
    const restoreRequestsActive = restoreRequests.filter(r => r.status !== 'Completed').length
    const storageUtilization = null // No storage quota is configured to measure against
    const bcpCompliance = bcpTotal > 0 ? Math.round((bcpDone / bcpTotal) * 100) : null

    const data = {
      successfulJobs,
      restoreRequestsActive,
      storageUtilization,
      bcpCompliance,
      backupJobs,
      restoreRequests,
      redundancyMatrix: [],
      complianceSignals,
    }

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Error fetching backup restore data:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch backup restore data',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}

function formatBytes(bytes: string): string {
  const num = parseInt(bytes)
  if (num < 1024) return `${num} B`
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`
  if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`
  return `${(num / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
