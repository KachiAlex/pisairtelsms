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

function getTenantId(req: VercelRequest): string | null {
  const tenantId = req.headers['x-tenant-id'] as string | undefined
  return tenantId || null
}

async function ensureFeeAdjustmentsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS fee_adjustments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      fee_assignment_id TEXT NOT NULL,
      adjustment_type TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      reason TEXT NOT NULL,
      requires_approval BOOLEAN DEFAULT false,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_fee_adjustments_tenant ON fee_adjustments(tenant_id)`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = getTenantId(req)
  if (!tenantId) {
    return res.status(400).json({ error: 'x-tenant-id header is required' })
  }

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
