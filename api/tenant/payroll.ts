import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  ensurePayrollTables,
  // Schedules
  fetchSchedules, createSchedule, updateSchedule, deleteSchedule,
  // Rules
  fetchRules, createRule, deleteRule,
  // Runs
  fetchRuns, fetchRun, fetchRunItems, createPayrollRun, submitRunForApproval,
  approveRun, rejectRun, fetchApprovals, disburseRun,
  // Payslips
  fetchPayslips, generatePayslipsForRun, markPayslipEmailed,
  // Advances
  fetchAdvances, createAdvance, approveAdvance, rejectAdvance,
  // Tax
  getTaxConfig, updateTaxConfig,
  // Compliance
  generateComplianceReport,
} from './_lib/payroll.js'
import { requireRole } from '../_lib/auth-middleware.js'

function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET,POST,PUT,DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}

function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return null }
  }
  return req.body
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const actualTenantId = decoded.tenantId || 'default-tenant'
  const { resource, id, staffId, status, year, runId } = req.query

  // ── Schedules ────────────────────────────────────────────────────────────
  if (resource === 'schedules') {
    if (req.method === 'GET') {
      const schedules = await fetchSchedules(actualTenantId)
      return res.status(200).json({ data: schedules })
    }
    if (req.method === 'POST') {
      const body = parseBody(req)
      if (!body?.name) return res.status(400).json({ error: 'Schedule name is required' })
      const schedule = await createSchedule(body, actualTenantId)
      return res.status(201).json({ data: schedule })
    }
    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Schedule ID is required' })
      const body = parseBody(req)
      if (!body) return res.status(400).json({ error: 'Request body is required' })
      const schedule = await updateSchedule(id as string, body, actualTenantId)
      if (!schedule) return res.status(404).json({ error: 'Schedule not found' })
      return res.status(200).json({ data: schedule })
    }
    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Schedule ID is required' })
      const success = await deleteSchedule(id as string, actualTenantId)
      if (!success) return res.status(500).json({ error: 'Failed to delete schedule' })
      return res.status(200).json({ message: 'Schedule deleted' })
    }
    return methodNotAllowed(res)
  }

  // ── Rules ────────────────────────────────────────────────────────────────
  if (resource === 'rules') {
    if (req.method === 'GET') {
      const rules = await fetchRules(actualTenantId, staffId as string | undefined)
      return res.status(200).json({ data: rules })
    }
    if (req.method === 'POST') {
      const body = parseBody(req)
      if (!body?.staffId || !body?.category || !body?.label) {
        return res.status(400).json({ error: 'staffId, category, and label are required' })
      }
      const rule = await createRule(body, actualTenantId)
      return res.status(201).json({ data: rule })
    }
    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Rule ID is required' })
      const success = await deleteRule(id as string, actualTenantId)
      if (!success) return res.status(500).json({ error: 'Failed to delete rule' })
      return res.status(200).json({ message: 'Rule deleted' })
    }
    return methodNotAllowed(res)
  }

  // ── Runs ──────────────────────────────────────────────────────────────────
  if (resource === 'runs') {
    if (req.method === 'GET') {
      if (id) {
        const run = await fetchRun(id as string, actualTenantId)
        if (!run) return res.status(404).json({ error: 'Run not found' })
        const items = await fetchRunItems(id as string, actualTenantId)
        const approvals = await fetchApprovals(id as string, actualTenantId)
        return res.status(200).json({ data: { ...run, items, approvals } })
      }
      const runs = await fetchRuns(actualTenantId, status as string | undefined)
      return res.status(200).json({ data: runs })
    }
    if (req.method === 'POST') {
      const body = parseBody(req)
      if (!body?.month || !body?.year) {
        return res.status(400).json({ error: 'month and year are required' })
      }
      try {
        const run = await createPayrollRun(body.month, body.year, body.scheduleId || null, actualTenantId)
        return res.status(201).json({ data: run })
      } catch (err) {
        return res.status(400).json({ error: String(err instanceof Error ? err.message : err) })
      }
    }
    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Run ID is required' })
      const body = parseBody(req)
      if (!body?.action) return res.status(400).json({ error: 'action is required' })

      if (body.action === 'submit') {
        const run = await submitRunForApproval(id as string, actualTenantId)
        if (!run) return res.status(400).json({ error: 'Run cannot be submitted (must be in draft status)' })
        return res.status(200).json({ data: run })
      }
      if (body.action === 'approve') {
        const result = await approveRun(id as string, decoded.userId || decoded.sub || '', decoded.name || decoded.email || '', body.approverRole || 'tenant_admin', body.comment || null, actualTenantId)
        if (!result.run) return res.status(400).json({ error: 'Approval failed' })
        return res.status(200).json({ data: result })
      }
      if (body.action === 'reject') {
        const result = await rejectRun(id as string, decoded.userId || decoded.sub || '', decoded.name || decoded.email || '', body.approverRole || 'tenant_admin', body.comment || 'Rejected', actualTenantId)
        if (!result.run) return res.status(400).json({ error: 'Rejection failed' })
        return res.status(200).json({ data: result })
      }
      if (body.action === 'disburse') {
        const result = await disburseRun(id as string, actualTenantId)
        return res.status(result.success ? 200 : 400).json({ data: result.run, error: result.error })
      }
      return res.status(400).json({ error: 'Unknown action' })
    }
    return methodNotAllowed(res)
  }

  // ── Payslips ──────────────────────────────────────────────────────────────
  if (resource === 'payslips') {
    if (req.method === 'GET') {
      const payslips = await fetchPayslips(actualTenantId, staffId as string | undefined)
      return res.status(200).json({ data: payslips })
    }
    if (req.method === 'POST') {
      // Generate payslips for a run
      const body = parseBody(req)
      if (!body?.runId) return res.status(400).json({ error: 'runId is required' })
      const count = await generatePayslipsForRun(body.runId, actualTenantId)
      return res.status(200).json({ data: { generated: count } })
    }
    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Payslip ID is required' })
      const body = parseBody(req)
      if (body?.action === 'email') {
        await markPayslipEmailed(id as string)
        return res.status(200).json({ message: 'Payslip marked as emailed' })
      }
      return res.status(400).json({ error: 'Unknown action' })
    }
    return methodNotAllowed(res)
  }

  // ── Salary Advances ───────────────────────────────────────────────────────
  if (resource === 'advances') {
    if (req.method === 'GET') {
      const advances = await fetchAdvances(actualTenantId, staffId as string | undefined, status as string | undefined)
      return res.status(200).json({ data: advances })
    }
    if (req.method === 'POST') {
      const body = parseBody(req)
      if (!body?.staffId || !body?.amount) {
        return res.status(400).json({ error: 'staffId and amount are required' })
      }
      const advance = await createAdvance(body, actualTenantId)
      return res.status(201).json({ data: advance })
    }
    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Advance ID is required' })
      const body = parseBody(req)
      if (body?.action === 'approve') {
        const advance = await approveAdvance(id as string, decoded.userId || decoded.sub || '', decoded.name || decoded.email || '', actualTenantId)
        if (!advance) return res.status(400).json({ error: 'Advance cannot be approved' })
        return res.status(200).json({ data: advance })
      }
      if (body?.action === 'reject') {
        const advance = await rejectAdvance(id as string, actualTenantId)
        if (!advance) return res.status(400).json({ error: 'Advance cannot be rejected' })
        return res.status(200).json({ data: advance })
      }
      return res.status(400).json({ error: 'Unknown action' })
    }
    return methodNotAllowed(res)
  }

  // ── Tax Config ────────────────────────────────────────────────────────────
  if (resource === 'tax') {
    if (req.method === 'GET') {
      const config = await getTaxConfig(actualTenantId)
      return res.status(200).json({ data: config })
    }
    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Tax config ID is required' })
      const body = parseBody(req)
      if (!body) return res.status(400).json({ error: 'Request body is required' })
      const config = await updateTaxConfig(id as string, body, actualTenantId)
      if (!config) return res.status(404).json({ error: 'Tax config not found' })
      return res.status(200).json({ data: config })
    }
    return methodNotAllowed(res)
  }

  // ── Compliance Reports ────────────────────────────────────────────────────
  if (resource === 'compliance') {
    if (req.method === 'GET') {
      const reportYear = year ? Number(year) : new Date().getFullYear()
      const report = await generateComplianceReport(actualTenantId, reportYear)
      return res.status(200).json({ data: report })
    }
    return methodNotAllowed(res)
  }

  return res.status(400).json({ error: 'Invalid resource. Available: schedules, rules, runs, payslips, advances, tax, compliance' })
}
