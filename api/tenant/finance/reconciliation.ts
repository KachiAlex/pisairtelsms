import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../../_lib/auth-middleware.js'
import {
  createPaymentReconciliation,
  getPaymentReconciliations,
} from './_lib/payments.js'

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = getTenantId(req)
  if (!tenantId) {
    return res.status(400).json({ error: 'x-tenant-id header is required' })
  }

  const { action } = req.query

  // GET /api/tenant/finance/reconciliation/unmatched
  if (req.method === 'GET' && action === 'unmatched') {
    try {
      const unmatched = await getPaymentReconciliations('pending')
      const matched = await getPaymentReconciliations('matched')
      return res.status(200).json({ unmatched, matched })
    } catch (error) {
      console.error('Error fetching unmatched reconciliations:', error)
      return res.status(500).json({ error: 'Failed to fetch unmatched reconciliations' })
    }
  }

  // GET /api/tenant/finance/reconciliation/report
  if (req.method === 'GET' && action === 'report') {
    try {
      const matched = await getPaymentReconciliations('matched')
      const pending = await getPaymentReconciliations('pending')
      const exceptions = await getPaymentReconciliations('exception')

      const report = {
        matched: matched.length,
        pending: pending.length,
        exceptions: exceptions.length,
        total: matched.length + pending.length + exceptions.length,
        matchedAmount: matched.reduce((sum, r) => sum + r.bankDepositAmount, 0),
        pendingAmount: pending.reduce((sum, r) => sum + r.bankDepositAmount, 0),
        exceptionAmount: exceptions.reduce((sum, r) => sum + r.bankDepositAmount, 0),
      }

      return res.status(200).json({ data: report })
    } catch (error) {
      console.error('Error generating reconciliation report:', error)
      return res.status(500).json({ error: 'Failed to generate reconciliation report' })
    }
  }

  // POST /api/tenant/finance/reconciliation/match
  if (req.method === 'POST' && action === 'match') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const { paymentId, bankDepositDate, bankDepositAmount, bankReference, matchedBy } = body

    const missing: string[] = []
    if (!paymentId) missing.push('paymentId')
    if (!bankDepositDate) missing.push('bankDepositDate')
    if (bankDepositAmount === undefined) missing.push('bankDepositAmount')
    if (!bankReference) missing.push('bankReference')
    if (!matchedBy) missing.push('matchedBy')

    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing required fields', details: missing })
    }

    try {
      const reconciliation = await createPaymentReconciliation(
        paymentId,
        bankDepositDate,
        bankDepositAmount,
        bankReference,
        matchedBy
      )
      return res.status(201).json({ data: reconciliation })
    } catch (error) {
      console.error('Error creating reconciliation:', error)
      return res.status(500).json({ error: 'Failed to create reconciliation' })
    }
  }

  // POST /api/tenant/finance/reconciliation/bulk-match
  if (req.method === 'POST' && action === 'bulk-match') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const { reconciliations } = body

    if (!reconciliations || !Array.isArray(reconciliations) || reconciliations.length === 0) {
      return res.status(400).json({ error: 'reconciliations array is required' })
    }

    try {
      const created = []
      for (const reconciliation of reconciliations) {
        const { paymentId, bankDepositDate, bankDepositAmount, bankReference, matchedBy } = reconciliation

        const missing: string[] = []
        if (!paymentId) missing.push('paymentId')
        if (!bankDepositDate) missing.push('bankDepositDate')
        if (bankDepositAmount === undefined) missing.push('bankDepositAmount')
        if (!bankReference) missing.push('bankReference')
        if (!matchedBy) missing.push('matchedBy')

        if (missing.length > 0) {
          return res.status(400).json({ error: 'Missing required fields in reconciliation', details: missing })
        }

        const result = await createPaymentReconciliation(
          paymentId,
          bankDepositDate,
          bankDepositAmount,
          bankReference,
          matchedBy
        )
        created.push(result)
      }

      return res.status(201).json({ data: created })
    } catch (error) {
      console.error('Error bulk creating reconciliations:', error)
      return res.status(500).json({ error: 'Failed to bulk create reconciliations' })
    }
  }

  return methodNotAllowed(res)
}
