import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js'
import { requireRole } from '../../_lib/auth-middleware.js'
import {
  createExemption,
  getExemptions,
  getExemptionById,
  updateExemption,
  approveExemption,
  rejectExemption,
  deleteExemption,
} from './_lib/fee-assignments.js'

function methodNotAllowed(res: ApiResponse) {
  res.setHeader('Allow', 'GET,POST,PUT,DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}

function parseBody(req: ApiRequest) {
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

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'

  const { feeAssignmentId, exemptionId, action } = req.query

  // GET /api/tenant/finance/fee-assignments/:feeAssignmentId/exemptions
  if (req.method === 'GET' && feeAssignmentId && !exemptionId && !action) {
    try {
      const exemptions = await getExemptions(tenantId, feeAssignmentId as string)
      return res.status(200).json({ exemptions })
    } catch (error) {
      console.error('Error fetching exemptions:', error)
      return res.status(500).json({ error: 'Failed to fetch exemptions' })
    }
  }

  // GET /api/tenant/finance/fee-assignments/:feeAssignmentId/exemptions/:exemptionId
  if (req.method === 'GET' && feeAssignmentId && exemptionId && !action) {
    try {
      const exemption = await getExemptionById(tenantId, exemptionId as string)
      if (!exemption) {
        return res.status(404).json({ error: 'Exemption not found' })
      }
      return res.status(200).json({ data: exemption })
    } catch (error) {
      console.error('Error fetching exemption:', error)
      return res.status(500).json({ error: 'Failed to fetch exemption' })
    }
  }

  // POST /api/tenant/finance/fee-assignments/:feeAssignmentId/exemptions
  if (req.method === 'POST' && feeAssignmentId && !exemptionId && !action) {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const {
      studentId,
      exemptionType,
      amount,
      percentage,
      reason,
      approvedBy,
      effectiveFrom,
      effectiveTo,
    } = body

    const missing: string[] = []
    if (!studentId) missing.push('studentId')
    if (!exemptionType) missing.push('exemptionType')
    if (amount === undefined && percentage === undefined) missing.push('amount or percentage')
    if (!reason) missing.push('reason')
    if (!effectiveFrom) missing.push('effectiveFrom')

    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing required fields', details: missing })
    }

    try {
      const exemption = await createExemption(
        tenantId,
        studentId,
        feeAssignmentId as string,
        exemptionType,
        amount ?? null,
        percentage ?? null,
        reason,
        approvedBy || 'system',
        effectiveFrom,
        effectiveTo || null
      )

      return res.status(201).json({ data: exemption })
    } catch (error) {
      console.error('Error creating exemption:', error)
      return res.status(500).json({ error: 'Failed to create exemption' })
    }
  }

  // PUT /api/tenant/finance/fee-assignments/:feeAssignmentId/exemptions/:exemptionId
  if (req.method === 'PUT' && feeAssignmentId && exemptionId && !action) {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    try {
      const updated = await updateExemption(tenantId, exemptionId as string, {
        exemptionType: body.exemptionType,
        amount: body.amount,
        percentage: body.percentage,
        reason: body.reason,
        effectiveFrom: body.effectiveFrom,
        effectiveTo: body.effectiveTo,
      })

      if (!updated) {
        return res.status(404).json({ error: 'Exemption not found' })
      }

      return res.status(200).json({ data: updated })
    } catch (error) {
      console.error('Error updating exemption:', error)
      return res.status(500).json({ error: 'Failed to update exemption' })
    }
  }

  // POST /api/tenant/finance/fee-assignments/:feeAssignmentId/exemptions/:exemptionId/approve
  if (req.method === 'POST' && feeAssignmentId && exemptionId && action === 'approve') {
    try {
      const exemption = await approveExemption(tenantId, exemptionId as string)
      if (!exemption) {
        return res.status(404).json({ error: 'Exemption not found' })
      }

      return res.status(200).json({ data: exemption })
    } catch (error) {
      console.error('Error approving exemption:', error)
      return res.status(500).json({ error: 'Failed to approve exemption' })
    }
  }

  // POST /api/tenant/finance/fee-assignments/:feeAssignmentId/exemptions/:exemptionId/reject
  if (req.method === 'POST' && feeAssignmentId && exemptionId && action === 'reject') {
    try {
      const exemption = await rejectExemption(tenantId, exemptionId as string)
      if (!exemption) {
        return res.status(404).json({ error: 'Exemption not found' })
      }

      return res.status(200).json({ data: exemption })
    } catch (error) {
      console.error('Error rejecting exemption:', error)
      return res.status(500).json({ error: 'Failed to reject exemption' })
    }
  }

  // DELETE /api/tenant/finance/fee-assignments/:feeAssignmentId/exemptions/:exemptionId
  if (req.method === 'DELETE' && feeAssignmentId && exemptionId && !action) {
    try {
      const deleted = await deleteExemption(tenantId, exemptionId as string)
      if (!deleted) {
        return res.status(404).json({ error: 'Exemption not found' })
      }

      return res.status(204).send('')
    } catch (error) {
      console.error('Error deleting exemption:', error)
      return res.status(500).json({ error: 'Failed to delete exemption' })
    }
  }

  return methodNotAllowed(res)
}
