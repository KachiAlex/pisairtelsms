/**
 * Audit Logging API Endpoints
 * Handles audit log retrieval and analysis
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getAuditLogs,
  getEntityAuditLogs,
  getUserActivityLogs,
  getAuditStatistics,
} from './_lib/audit.js'

/**
 * Method not allowed response
 */
function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET')
  return res.status(405).json({ error: 'Method not allowed' })
}

/**
 * Validate tenant ID
 */
function validateTenantId(tenantId: string | undefined, res: VercelResponse): boolean {
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header is required' })
    return false
  }
  return true
}

/**
 * Main handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const tenantId = req.headers['x-tenant-id'] as string
  const { id, action } = req.query

  // Validate tenant ID
  if (!validateTenantId(tenantId, res)) {
    return
  }

  // Only GET requests allowed
  if (req.method !== 'GET') {
    return methodNotAllowed(res)
  }

  // GET /api/tenant/cbt/audit
  if (!id && !action) {
    try {
      const { userId, action: auditAction, entityType, entityId, startDate, endDate, page, limit } = req.query

      const result = await getAuditLogs(tenantId, {
        userId: userId as string | undefined,
        action: auditAction as string | undefined,
        entityType: entityType as string | undefined,
        entityId: entityId as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
      })

      return res.status(200).json(result)
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch audit logs' })
    }
  }

  // GET /api/tenant/cbt/audit/entity/:entityType/:entityId
  if (id === 'entity' && action) {
    const entityType = action as string
    const entityId = req.query.entityId as string

    if (!entityId) {
      return res.status(400).json({ success: false, error: 'entityId is required' })
    }

    try {
      const logs = await getEntityAuditLogs(tenantId, entityType, entityId)
      return res.status(200).json({ success: true, data: logs })
    } catch (error) {
      console.error('Error fetching entity audit logs:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch entity audit logs' })
    }
  }

  // GET /api/tenant/cbt/audit/user/:userId
  if (id === 'user' && action) {
    const userId = action as string
    const { startDate, endDate, page, limit } = req.query

    try {
      const result = await getUserActivityLogs(tenantId, userId, {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
      })

      return res.status(200).json(result)
    } catch (error) {
      console.error('Error fetching user activity logs:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch user activity logs' })
    }
  }

  // GET /api/tenant/cbt/audit/statistics
  if (id === 'statistics') {
    try {
      const { startDate, endDate } = req.query

      const stats = await getAuditStatistics(
        tenantId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      )

      return res.status(200).json({ success: true, data: stats })
    } catch (error) {
      console.error('Error fetching audit statistics:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch audit statistics' })
    }
  }

  return methodNotAllowed(res)
}
