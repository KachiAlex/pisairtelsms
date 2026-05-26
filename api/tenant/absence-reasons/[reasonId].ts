import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getAbsenceReasonById,
  updateAbsenceReason,
  deleteAbsenceReason,
  type UpdateAbsenceReasonPayload,
} from '../_lib/absence-reasons.js'
import { requireRole } from '../../_lib/auth-middleware'

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

  const { reasonId } = req.query

  if (!reasonId || typeof reasonId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'reasonId is required',
    })
  }

  // GET /api/tenant/absence-reasons/[reasonId] - Get single absence reason
  if (req.method === 'GET') {
    try {
      const reason = await getAbsenceReasonById(tenantId, reasonId)

      if (!reason) {
        return res.status(404).json({
          success: false,
          error: 'Absence reason not found',
        })
      }

      return res.status(200).json({
        success: true,
        data: reason,
      })
    } catch (error) {
      console.error('Error fetching absence reason:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch absence reason',
        details: error instanceof Error ? error.message : undefined,
      })
    }
  }

  // PUT /api/tenant/absence-reasons/[reasonId] - Update absence reason
  if (req.method === 'PUT') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({
        success: false,
        error: 'Request body is required',
      })
    }

    const { reasonName, description, isActive } = body

    // Validate that at least one field is provided
    if (reasonName === undefined && description === undefined && isActive === undefined) {
      return res.status(400).json({
        success: false,
        error: 'At least one field (reasonName, description, or isActive) is required',
      })
    }

    // Validate field types
    if (reasonName !== undefined && typeof reasonName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'reasonName must be a string',
      })
    }

    if (description !== undefined && description !== null && typeof description !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'description must be a string or null',
      })
    }

    if (isActive !== undefined && typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isActive must be a boolean',
      })
    }

    try {
      const payload: UpdateAbsenceReasonPayload = {
        reasonName,
        description,
        isActive,
      }

      const reason = await updateAbsenceReason(tenantId, reasonId, payload)

      return res.status(200).json({
        success: true,
        data: reason,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update absence reason'

      if (message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: message,
        })
      }

      if (message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: message,
        })
      }

      console.error('Error updating absence reason:', error)
      return res.status(500).json({
        success: false,
        error: message,
        details: error instanceof Error ? error.message : undefined,
      })
    }
  }

  // DELETE /api/tenant/absence-reasons/[reasonId] - Delete absence reason
  if (req.method === 'DELETE') {
    try {
      await deleteAbsenceReason(tenantId, reasonId)

      return res.status(200).json({
        success: true,
        data: {
          message: 'Absence reason deleted successfully',
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete absence reason'

      if (message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: message,
        })
      }

      console.error('Error deleting absence reason:', error)
      return res.status(500).json({
        success: false,
        error: message,
        details: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return methodNotAllowed(res, ['GET', 'PUT', 'DELETE'])
}
