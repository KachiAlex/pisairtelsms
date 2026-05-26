import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../../_lib/auth-middleware'
import {
  createPaymentPlan,
  getPaymentPlanById,
  getPaymentPlanInstallments,
  updatePaymentPlan,
} from './_lib/payments.js'

function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET,POST,PUT')
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = getTenantId(req)
  if (!tenantId) {
    return res.status(400).json({ error: 'x-tenant-id header is required' })
  }

  const { id, action } = req.query

  // GET /api/tenant/finance/payment-plans/:id
  if (req.method === 'GET' && id && !action) {
    try {
      const plan = await getPaymentPlanById(id as string)
      if (!plan) {
        return res.status(404).json({ error: 'Payment plan not found' })
      }
      return res.status(200).json({ data: plan })
    } catch (error) {
      console.error('Error fetching payment plan:', error)
      return res.status(500).json({ error: 'Failed to fetch payment plan' })
    }
  }

  // GET /api/tenant/finance/payment-plans/:id/installments
  if (req.method === 'GET' && id && action === 'installments') {
    try {
      const installments = await getPaymentPlanInstallments(id as string)
      return res.status(200).json({ data: installments })
    } catch (error) {
      console.error('Error fetching installments:', error)
      return res.status(500).json({ error: 'Failed to fetch installments' })
    }
  }

  // POST /api/tenant/finance/payment-plans
  if (req.method === 'POST' && !id) {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const { feeAssignmentId, numberOfInstallments, installmentAmount, startDate, createdBy } = body

    const missing: string[] = []
    if (!feeAssignmentId) missing.push('feeAssignmentId')
    if (!numberOfInstallments) missing.push('numberOfInstallments')
    if (!installmentAmount) missing.push('installmentAmount')
    if (!startDate) missing.push('startDate')
    if (!createdBy) missing.push('createdBy')

    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing required fields', details: missing })
    }

    if (numberOfInstallments <= 0) {
      return res.status(400).json({ error: 'numberOfInstallments must be greater than 0' })
    }

    if (installmentAmount <= 0) {
      return res.status(400).json({ error: 'installmentAmount must be greater than 0' })
    }

    try {
      const plan = await createPaymentPlan(
        feeAssignmentId,
        numberOfInstallments,
        installmentAmount,
        startDate,
        createdBy
      )
      return res.status(201).json({ data: plan })
    } catch (error) {
      console.error('Error creating payment plan:', error)
      return res.status(500).json({ error: 'Failed to create payment plan' })
    }
  }

  // PUT /api/tenant/finance/payment-plans/:id
  if (req.method === 'PUT' && id && !action) {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const { status } = body

    try {
      const updated = await updatePaymentPlan(id as string, { status })

      if (!updated) {
        return res.status(404).json({ error: 'Payment plan not found' })
      }

      return res.status(200).json({ data: updated })
    } catch (error) {
      console.error('Error updating payment plan:', error)
      return res.status(500).json({ error: 'Failed to update payment plan' })
    }
  }

  return methodNotAllowed(res)
}
