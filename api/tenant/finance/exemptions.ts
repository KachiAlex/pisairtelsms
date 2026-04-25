import type { VercelRequest, VercelResponse } from '@vercel/node'

function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET,POST,PUT,DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
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

// Mock database for exemptions
const exemptionsDb: Record<string, any[]> = {}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { feeAssignmentId, exemptionId, action } = req.query

  // GET /api/tenant/finance/fee-assignments/:feeAssignmentId/exemptions
  if (req.method === 'GET' && feeAssignmentId && !exemptionId && !action) {
    try {
      const exemptions = exemptionsDb[feeAssignmentId as string] || []
      return res.status(200).json({ exemptions })
    } catch (error) {
      console.error('Error fetching exemptions:', error)
      return res.status(500).json({ error: 'Failed to fetch exemptions' })
    }
  }

  // GET /api/tenant/finance/fee-assignments/:feeAssignmentId/exemptions/:exemptionId
  if (req.method === 'GET' && feeAssignmentId && exemptionId && !action) {
    try {
      const exemptions = exemptionsDb[feeAssignmentId as string] || []
      const exemption = exemptions.find((e) => e.id === exemptionId)
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
      const exemption = {
        id: `exemption_${Date.now()}`,
        studentId,
        feeAssignmentId,
        exemptionType,
        amount: amount || null,
        percentage: percentage || null,
        reason,
        approvedBy: approvedBy || 'system',
        approvalDate: new Date().toISOString(),
        effectiveFrom,
        effectiveTo: effectiveTo || null,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }

      if (!exemptionsDb[feeAssignmentId as string]) {
        exemptionsDb[feeAssignmentId as string] = []
      }
      exemptionsDb[feeAssignmentId as string].push(exemption)

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
      const exemptions = exemptionsDb[feeAssignmentId as string] || []
      const index = exemptions.findIndex((e) => e.id === exemptionId)
      if (index === -1) {
        return res.status(404).json({ error: 'Exemption not found' })
      }

      const updated = {
        ...exemptions[index],
        ...body,
        id: exemptions[index].id,
        createdAt: exemptions[index].createdAt,
      }
      exemptions[index] = updated

      return res.status(200).json({ data: updated })
    } catch (error) {
      console.error('Error updating exemption:', error)
      return res.status(500).json({ error: 'Failed to update exemption' })
    }
  }

  // POST /api/tenant/finance/fee-assignments/:feeAssignmentId/exemptions/:exemptionId/approve
  if (req.method === 'POST' && feeAssignmentId && exemptionId && action === 'approve') {
    try {
      const exemptions = exemptionsDb[feeAssignmentId as string] || []
      const exemption = exemptions.find((e) => e.id === exemptionId)
      if (!exemption) {
        return res.status(404).json({ error: 'Exemption not found' })
      }

      exemption.status = 'approved'
      exemption.approvalDate = new Date().toISOString()

      return res.status(200).json({ data: exemption })
    } catch (error) {
      console.error('Error approving exemption:', error)
      return res.status(500).json({ error: 'Failed to approve exemption' })
    }
  }

  // POST /api/tenant/finance/fee-assignments/:feeAssignmentId/exemptions/:exemptionId/reject
  if (req.method === 'POST' && feeAssignmentId && exemptionId && action === 'reject') {
    try {
      const exemptions = exemptionsDb[feeAssignmentId as string] || []
      const exemption = exemptions.find((e) => e.id === exemptionId)
      if (!exemption) {
        return res.status(404).json({ error: 'Exemption not found' })
      }

      exemption.status = 'rejected'
      exemption.approvalDate = new Date().toISOString()

      return res.status(200).json({ data: exemption })
    } catch (error) {
      console.error('Error rejecting exemption:', error)
      return res.status(500).json({ error: 'Failed to reject exemption' })
    }
  }

  // DELETE /api/tenant/finance/fee-assignments/:feeAssignmentId/exemptions/:exemptionId
  if (req.method === 'DELETE' && feeAssignmentId && exemptionId && !action) {
    try {
      const exemptions = exemptionsDb[feeAssignmentId as string] || []
      const index = exemptions.findIndex((e) => e.id === exemptionId)
      if (index === -1) {
        return res.status(404).json({ error: 'Exemption not found' })
      }

      exemptions.splice(index, 1)
      return res.status(204).send('')
    } catch (error) {
      console.error('Error deleting exemption:', error)
      return res.status(500).json({ error: 'Failed to delete exemption' })
    }
  }

  return methodNotAllowed(res)
}
