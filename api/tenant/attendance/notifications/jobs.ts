import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getBulkNotificationJobs, getBulkNotificationJob } from '../../_lib/guardian-notifications.js'

function getTenantId(req: VercelRequest): string | null {
  const tenantId = req.headers['x-tenant-id'] as string | undefined
  if (tenantId) return tenantId
  const queryTenantId = req.query['tenantId'] as string | undefined
  if (queryTenantId) return queryTenantId
  return null
}

/**
 * GET /api/tenant/attendance/notifications/jobs
 * Get bulk notification jobs for a tenant
 * Query params: jobId?, limit? (default 50), offset? (default 0)
 * Validates: Requirements 18
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
    const { jobId, limit: limitParam = '50', offset: offsetParam = '0' } = req.query

    // If jobId is provided, get specific job
    if (jobId) {
      const job = await getBulkNotificationJob(jobId as string)

      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Bulk notification job not found',
        })
      }

      // Verify job belongs to tenant
      if (job.tenantId !== tenantId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized: Job does not belong to this tenant',
        })
      }

      return res.status(200).json({
        success: true,
        data: job,
      })
    }

    // Parse and validate pagination parameters
    let limit = parseInt(limitParam as string, 10)
    let offset = parseInt(offsetParam as string, 10)

    if (isNaN(limit) || limit < 1) limit = 50
    if (isNaN(offset) || offset < 0) offset = 0
    if (limit > 500) limit = 500

    const result = await getBulkNotificationJobs(tenantId, limit, offset)

    return res.status(200).json({
      success: true,
      data: result.jobs,
      pagination: {
        total: result.total,
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error('Error fetching bulk notification jobs:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch bulk notification jobs',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}
