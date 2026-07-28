import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getChangeRequests, createChangeRequest, updateChangeRequest, type ChangeRequestStatus } from './_lib/change-requests.js'
import { requireRole } from '../../_lib/auth-middleware.js'

function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') { try { return JSON.parse(req.body) } catch { return null } }
  return req.body
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Require authentication - only staff or tenant_admin can access tenant timetable
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  try {
    const tenantId = decoded.tenantId || 'default-tenant'
    const { method, query } = req
    const id = query.id as string | undefined

    if (method === 'GET') {
      const status = query.status as string | undefined
      return res.status(200).json({ data: getChangeRequests(tenantId, status) })
    }

    if (method === 'POST') {
      const body = parseBody(req)
      if (!body) return res.status(400).json({ error: 'Request body is required' })
      const { requesterId, requesterName, entityType, entityId, changeDescription, sla } = body
      if (!requesterId || !entityType || !entityId || !changeDescription) {
        return res.status(400).json({ error: 'requesterId, entityType, entityId, changeDescription are required' })
      }
      return res.status(201).json({
        data: createChangeRequest(tenantId, {
          requesterId,
          requesterName: requesterName || requesterId,
          entityType,
          entityId,
          changeDescription,
          sla: sla || 'No SLA set',
        }),
      })
    }

    if (method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'id query param is required' })
      const body = parseBody(req)
      if (!body) return res.status(400).json({ error: 'Request body is required' })
      const { status, reviewerId, reviewComments } = body
      const validStatuses: ChangeRequestStatus[] = ['pending', 'approved', 'rejected', 'applied']
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` })
      }
      const updated = updateChangeRequest(id, status, reviewerId, reviewComments)
      if (!updated) return res.status(404).json({ error: 'Change request not found' })
      return res.status(200).json({ data: updated })
    }

    res.setHeader('Allow', 'GET,POST,PUT')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Change requests API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
