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
 * GET /api/tenant/security/backup-restore
 * Returns backup and restore data including jobs, requests, and compliance
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
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
      eta: row.status === 'completed' ? 'Ready' : row.status === 'processing' ? 'In 40 mins' : 'Awaiting approval',
      status: row.status === 'completed' ? 'Ready' : row.status === 'processing' ? 'Processing' : row.status === 'approved' ? 'Approved' : 'Pending',
    }))

    // Get redundancy matrix (mock data for now)
    const redundancyMatrix = [
      { id: 'tier-1', label: 'Primary cloud', region: 'Azure West EU', retention: '35 days', integrity: 99 },
      { id: 'tier-2', label: 'Secondary cloud', region: 'AWS eu-west-2', retention: '180 days', integrity: 96 },
      { id: 'tier-3', label: 'On-prem NAS', region: 'Lagos data room', retention: '14 days', integrity: 91 },
    ]

    // Get compliance signals
    const complianceResult = await sql`
      SELECT task_name, task_type, owner, due_date, status
      FROM compliance_tasks
      WHERE tenant_id = ${tenantId} AND task_type = 'bcp_drill'
      AND status NOT IN ('completed', 'overdue')
      ORDER BY due_date ASC
    `
    const complianceSignals = complianceResult.rows.map(row => ({
      id: `cmp-${Math.floor(Math.random() * 100)}`,
      label: row.task_name,
      owner: row.owner,
      due: new Date(row.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      status: row.status === 'due_soon' ? 'Due soon' : 'Scheduled',
    }))

    // Calculate metrics
    const successfulJobs = backupJobs.filter(j => j.status === 'Succeeded').length
    const restoreRequestsActive = restoreRequests.filter(r => r.status !== 'Completed').length
    const storageUtilization = 62 // Mock value
    const bcpCompliance = 95 // Mock value

    const data = {
      successfulJobs,
      restoreRequestsActive,
      storageUtilization,
      bcpCompliance,
      backupJobs,
      restoreRequests,
      redundancyMatrix,
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
