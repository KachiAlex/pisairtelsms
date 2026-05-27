import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../../_lib/auth-middleware.js'
import {
  getAuditLogEntries,
  getAuditLogByEntityId,
} from './_lib/adjustments-audit.js'

function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET')
  return res.status(405).json({ error: 'Method not allowed' })
}

function getTenantId(req: VercelRequest): string | null {
  const tenantId = req.headers['x-tenant-id'] as string | undefined
  return tenantId || null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = getTenantId(req)
  if (!tenantId) {
    return res.status(400).json({ error: 'x-tenant-id header is required' })
  }

  const { entityId } = req.query

  if (req.method !== 'GET') {
    return methodNotAllowed(res)
  }

  // GET /api/tenant/finance/audit-log/:entity_id
  if (entityId) {
    try {
      const entries = await getAuditLogByEntityId(entityId as string)
      return res.status(200).json({ data: entries })
    } catch (error) {
      console.error('Error fetching audit log by entity:', error)
      return res.status(500).json({ error: 'Failed to fetch audit log' })
    }
  }

  // GET /api/tenant/finance/audit-log
  const { entityType, action } = req.query

  try {
    const entries = await getAuditLogEntries(
      entityType as string | undefined,
      undefined,
      action as string | undefined
    )
    return res.status(200).json({ data: entries })
  } catch (error) {
    console.error('Error fetching audit log:', error)
    return res.status(500).json({ error: 'Failed to fetch audit log' })
  }
}
