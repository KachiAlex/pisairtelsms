import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getConflicts, resolveConflict } from './_lib/conflicts.js'
import { requireRole } from '../../_lib/auth-middleware.js'

const TENANT_ID = 'demo-tenant-001'

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
    const { method, query } = req
    const id = query.id as string | undefined
    const action = query.action as string | undefined

    if (method === 'GET') {
      const status = query.status as string | undefined
      const severity = query.severity as string | undefined
      const entityType = query.entityType as string | undefined
      return res.status(200).json({ data: getConflicts(TENANT_ID, status, severity, entityType) })
    }

    // POST /conflicts?id=xxx&action=resolve
    if (method === 'POST' && id && action === 'resolve') {
      const body = parseBody(req)
      const resolutionNotes = body?.resolutionNotes || ''
      const updated = resolveConflict(id, resolutionNotes)
      if (!updated) return res.status(404).json({ error: 'Conflict not found' })
      return res.status(200).json({ data: updated })
    }

    res.setHeader('Allow', 'GET,POST')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Conflicts API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
