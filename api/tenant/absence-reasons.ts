import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getAbsenceReasons,
  getAbsenceReasonById,
  createAbsenceReason,
  updateAbsenceReason,
  deleteAbsenceReason,
  type CreateAbsenceReasonPayload,
  type UpdateAbsenceReasonPayload,
} from './_lib/absence-reasons.js'
import { requireRole } from '../_lib/auth-middleware'

function methodNotAllowed(res: VercelResponse, allowed: string[]) {
  res.setHeader('Allow', allowed.join(','))
  return res.status(405).json({ success: false, error: 'Method not allowed' })
}

function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return null
    }
  }
  return req.body
}

function getTenantId(req: VercelRequest): string | null {
  const tenantId = req.headers['x-tenant-id'] as string | undefined
  if (tenantId) return tenantId

  const queryTenantId = req.query['tenantId'] as string | undefined
  if (queryTenantId) return queryTenantId

  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Require authentication - only staff or tenant_admin can access tenant absence reasons
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  // Require tenant context
  const tenantId = getTenantId(req)
  if (!tenantId) {
    return res.status(401).json({
      success: false,
      error: 'Tenant context required (x-tenant-id header)',
    })
  }

  // GET /api/tenant/absence-reasons - List all absence reasons
  if (req.method === 'GET') {
    try {
      const { includeInactive } = req.query
      const inactive = includeInactive === 'true'

      const reasons = await getAbsenceReasons(tenantId, inactive)

      return res.status(200).json({
        success: true,
        data: reasons,
      })
    } catch (error) {
      console.error('Error fetching absence reasons:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch absence reasons',
        details: error instanceof Error ? error.message : undefined,
      })
    }
  }

  // POST /api/tenant/absence-reasons - Create new absence reason
  if (req.method === 'POST') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({
        success: false,
        error: 'Request body is required',
      })
    }

    const { reasonName, description } = body

    // Validate required fields
    if (!reasonName || typeof reasonName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'reasonName is required and must be a string',
      })
    }

    try {
      const payload: CreateAbsenceReasonPayload = {
        reasonName,
        description: description || undefined,
      }

      const reason = await createAbsenceReason(tenantId, payload)

      return res.status(201).json({
        success: true,
        data: reason,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create absence reason'

      // Check if it's a duplicate error
      if (message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: message,
        })
      }

      console.error('Error creating absence reason:', error)
      return res.status(500).json({
        success: false,
        error: message,
        details: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return methodNotAllowed(res, ['GET', 'POST'])
}
