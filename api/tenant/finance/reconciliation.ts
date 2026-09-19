import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js'
import { requireRole } from '../../_lib/auth-middleware.js'
import {
  createBankDeposit,
  getReconciliationData,
  getPaymentReconciliations,
  matchPaymentToDeposit,
  PaymentValidationError,
} from './_lib/payments.js'
import { sql } from './_lib/db.js'
import type { BankDepositRow } from './_lib/payments.js'

function methodNotAllowed(res: ApiResponse) {
  res.setHeader('Allow', 'GET,POST')
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

  const tenantId = decoded.tenantId
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant could not be determined from the session' })
  }

  const { action } = req.query
  const actor = decoded.email || decoded.userId || decoded.staffId || 'system'

  // GET /api/tenant/finance/reconciliation?action=unmatched (or /reconciliation/unmatched)
  if (req.method === 'GET' && action === 'unmatched') {
    try {
      const data = await getReconciliationData(tenantId)
      return res.status(200).json(data)
    } catch (error) {
      console.error('Error fetching reconciliation data:', error)
      return res.status(500).json({ error: 'Failed to fetch reconciliation data' })
    }
  }

  // GET /api/tenant/finance/reconciliation?action=report
  if (req.method === 'GET' && action === 'report') {
    try {
      const matched = await getPaymentReconciliations(tenantId, 'matched')
      const pending = await getPaymentReconciliations(tenantId, 'pending')
      const exceptions = await getPaymentReconciliations(tenantId, 'exception')

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

  // GET /api/tenant/finance/reconciliation?action=deposits — all deposits
  if (req.method === 'GET' && action === 'deposits') {
    try {
      const result = await sql<BankDepositRow>`
        SELECT * FROM bank_deposits WHERE tenant_id = ${tenantId} ORDER BY deposit_date DESC
      `
      return res.status(200).json({ data: result.rows })
    } catch (error) {
      console.error('Error fetching deposits:', error)
      return res.status(500).json({ error: 'Failed to fetch deposits' })
    }
  }

  // POST /api/tenant/finance/reconciliation?action=deposits — record a bank deposit
  if (req.method === 'POST' && action === 'deposits') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const { depositDate, amount, reference, description } = body

    const missing: string[] = []
    if (!depositDate) missing.push('depositDate')
    if (amount === undefined) missing.push('amount')
    if (!reference) missing.push('reference')

    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing required fields', details: missing })
    }
    if (amount <= 0) {
      return res.status(400).json({ error: 'amount must be greater than 0' })
    }

    try {
      const deposit = await createBankDeposit(tenantId, depositDate, amount, reference, description)
      return res.status(201).json({ data: deposit })
    } catch (error) {
      console.error('Error creating deposit:', error)
      return res.status(500).json({ error: 'Failed to create deposit' })
    }
  }

  // POST /api/tenant/finance/reconciliation?action=match
  if (req.method === 'POST' && action === 'match') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const { paymentId, depositId, bankReference } = body

    if (!paymentId || !depositId) {
      return res.status(400).json({ error: 'Missing required fields', details: ['paymentId', 'depositId'] })
    }

    try {
      const reconciliation = await matchPaymentToDeposit(
        tenantId,
        paymentId,
        depositId,
        bankReference,
        actor
      )
      return res.status(201).json({ data: reconciliation })
    } catch (error) {
      if (error instanceof PaymentValidationError) {
        return res.status(400).json({ error: error.message })
      }
      console.error('Error creating reconciliation:', error)
      return res.status(500).json({ error: 'Failed to create reconciliation' })
    }
  }

  // POST /api/tenant/finance/reconciliation?action=bulk-match
  if (req.method === 'POST' && action === 'bulk-match') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const { reconciliations } = body

    if (!reconciliations || !Array.isArray(reconciliations) || reconciliations.length === 0) {
      return res.status(400).json({ error: 'reconciliations array is required' })
    }

    const created = []
    const errors: string[] = []
    for (const item of reconciliations) {
      const { paymentId, depositId, bankReference } = item
      if (!paymentId || !depositId) {
        errors.push(`Row missing paymentId/depositId: ${JSON.stringify(item)}`)
        continue
      }
      try {
        created.push(await matchPaymentToDeposit(tenantId, paymentId, depositId, bankReference, actor))
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Match failed')
      }
    }

    if (created.length === 0 && errors.length > 0) {
      return res.status(400).json({ error: 'No matches could be applied', details: errors })
    }

    return res.status(201).json({ data: created, errors })
  }

  return methodNotAllowed(res)
}
