import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../../_lib/auth-middleware.js'

function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET,POST')
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

async function ensureFeeAdjustmentsTable() {
  }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'

  // GET /api/tenant/finance/fee-adjustments
  if (req.method === 'GET') {
    const { feeAssignmentId } = req.query
    try {
      await ensureFeeAdjustmentsTable()
      let query = sql`SELECT * FROM fee_adjustments WHERE tenant_id = ${tenantId}`
      if (feeAssignmentId) {
        query = sql`SELECT * FROM fee_adjustments WHERE tenant_id = ${tenantId} AND fee_assignment_id = ${feeAssignmentId as string}`
      }
      const result = await query
      return res.status(200).json({ data: result.rows })
    } catch (error) {
      console.error('Error fetching fee adjustments:', error)
      return res.status(500).json({ error: 'Failed to fetch fee adjustments' })
    }
  }

  // POST /api/tenant/finance/fee-adjustments
  if (req.method === 'POST') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const { feeAssignmentId, adjustmentType, amount, reason, requiresApproval } = body
    if (!feeAssignmentId || !adjustmentType || amount === undefined || !reason) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: ['feeAssignmentId', 'adjustmentType', 'amount', 'reason'],
      })
    }

    try {
      await ensureFeeAdjustmentsTable()
      const id = `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await sql`
        INSERT INTO fee_adjustments
          (id, tenant_id, fee_assignment_id, adjustment_type, amount, reason, requires_approval, status)
        VALUES
          (${id}, ${tenantId}, ${feeAssignmentId}, ${adjustmentType}, ${amount}, ${reason}, ${!!requiresApproval}, 'pending')
      `
      return res.status(201).json({
        data: {
          id,
          tenantId,
          feeAssignmentId,
          adjustmentType,
          amount,
          reason,
          requiresApproval: !!requiresApproval,
          status: 'pending',
        },
      })
    } catch (error) {
      console.error('Error creating fee adjustment:', error)
      return res.status(500).json({ error: 'Failed to create fee adjustment' })
    }
  }

  return methodNotAllowed(res)
}
