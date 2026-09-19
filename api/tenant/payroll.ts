import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import {
  ensurePayrollTables,
  PayrollError,
  // Schedules
  fetchSchedules, createSchedule, updateSchedule, deleteSchedule,
  // Rules
  fetchRules, createRule, deleteRule,
  // Runs
  fetchRuns, fetchRun, fetchRunItems, createPayrollRun, submitRunForApproval,
  approveRun, rejectRun, fetchApprovals, disburseRun, fetchAuditLog, deletePayrollRun,
  addStaffToRun, updateRunItem, deleteRunItem,
  // Payslips
  fetchPayslips, generatePayslipsForRun, emailPayslip,
  // Advances
  fetchAdvances, createAdvance, approveAdvance, rejectAdvance,
  // Tax
  getTaxConfig, updateTaxConfig, createTaxConfig,
  // Compliance
  generateComplianceReport,
} from './_lib/payroll.js'
import { requireRole } from '../_lib/auth-middleware.js'
import { sql } from '../_lib/sql.js'

function methodNotAllowed(res: ApiResponse) {
  res.setHeader('Allow', 'GET,POST,PUT,DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}

function parseBody(req: ApiRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return null }
  }
  return req.body
}

// Maps a staff member's free-text role to the approval-chain role it satisfies.
// tenant_admin may act at any level (segregation of duties in the lib prevents
// one person approving multiple levels of the same run).
const APPROVER_ROLE_KEYWORDS: Record<string, string[]> = {
  hr_admin: ['hr', 'human resource', 'admin'],
  principal: ['principal', 'head', 'director'],
  bursar: ['bursar', 'accountant', 'finance', 'accounts'],
}

async function resolveApproverRoles(decoded: { userId?: string; sub?: string; staffId?: string; email?: string; role?: string }, tenantId: string): Promise<string[]> {
  if (decoded.role === 'tenant_admin' || decoded.role === 'super_admin') {
    return Object.keys(APPROVER_ROLE_KEYWORDS)
  }
  const userId = decoded.staffId || decoded.userId || decoded.sub || ''
  const result = await sql`
    SELECT role FROM staff
    WHERE tenant_id = ${tenantId} AND (id = ${userId} OR staff_id = ${userId} OR email = ${decoded.email || ''})
    LIMIT 1
  `
  const staffRole = String(result.rows[0]?.role || '').toLowerCase()
  if (!staffRole) return []
  return Object.entries(APPROVER_ROLE_KEYWORDS)
    .filter(([, keywords]) => keywords.some(k => staffRole.includes(k)))
    .map(([role]) => role)
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  // Payroll is tenant-scoped financial data — a missing tenant claim is a hard failure
  if (!decoded.tenantId) {
    return res.status(401).json({ error: 'Authenticated tenant context is required' })
  }
  const actualTenantId = decoded.tenantId
  const actor = decoded.email || decoded.userId || decoded.sub || 'unknown'
  const { resource, id, staffId, status, year } = req.query

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
      try {
        const rule = await createRule(body, actualTenantId)
        return res.status(201).json({ data: rule })
      } catch (err) {
        if (err instanceof PayrollError) return res.status(400).json({ error: err.message })
        throw err
      }
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
        const auditLog = await fetchAuditLog(id as string, actualTenantId)
        return res.status(200).json({ data: { ...run, items, approvals, auditLog } })
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
        const run = await createPayrollRun(body.month, Number(body.year), body.scheduleId || null, actualTenantId, {
          supplementary: body.supplementary === true,
          actor,
        })
        return res.status(201).json({ data: run })
      } catch (err) {
        if (err instanceof PayrollError) return res.status(409).json({ error: err.message })
        return res.status(400).json({ error: String(err instanceof Error ? err.message : err) })
      }
    }
    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Run ID is required' })
      const body = parseBody(req)
      if (!body?.action) return res.status(400).json({ error: 'action is required' })

      if (body.action === 'submit') {
        const run = await submitRunForApproval(id as string, actualTenantId, actor)
        if (!run) return res.status(400).json({ error: 'Run cannot be submitted (must be in draft status)' })
        return res.status(200).json({ data: run })
      }
      if (body.action === 'approve' || body.action === 'reject') {
        // The approver role is validated against the authenticated user's staff
        // role — the request body only selects which level they are acting on.
        const requestedRole = body.approverRole
        if (!requestedRole) return res.status(400).json({ error: 'approverRole is required' })
        const allowedRoles = await resolveApproverRoles(decoded, actualTenantId)
        if (!allowedRoles.includes(requestedRole)) {
          return res.status(403).json({ error: `You are not authorized to approve as '${requestedRole}'` })
        }
        try {
          const fn = body.action === 'approve' ? approveRun : rejectRun
          const result = await fn(
            id as string,
            decoded.userId || decoded.sub || '',
            decoded.email || '',
            requestedRole,
            body.comment || (body.action === 'reject' ? 'Rejected' : null),
            actualTenantId
          )
          if (!result.run) {
            return res.status(400).json({ error: `No pending '${requestedRole}' approval found for this run` })
          }
          return res.status(200).json({ data: result })
        } catch (err) {
          if (err instanceof PayrollError) return res.status(409).json({ error: err.message })
          throw err
        }
      }
      if (body.action === 'disburse') {
        const result = await disburseRun(id as string, actualTenantId, {
          manualConfirmation: body.manualConfirmation === true,
          manualReference: body.manualReference || null,
          actor,
        })
        return res.status(result.success ? 200 : 400).json({
          data: result.run,
          error: result.error,
          code: result.code,
        })
      }
      return res.status(400).json({ error: 'Unknown action' })
    }
    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Run ID is required' })
      const result = await deletePayrollRun(id as string, actualTenantId, actor)
      if (!result.deleted) return res.status(400).json({ error: result.error })
      return res.status(200).json({ message: 'Run deleted' })
    }
    return methodNotAllowed(res)
  }

  // ── Run Items (add/edit/remove staff on a draft run) ───────────────────────
  if (resource === 'items') {
    if (req.method === 'POST') {
      const body = parseBody(req)
      if (!body?.runId || !body?.staffId) return res.status(400).json({ error: 'runId and staffId are required' })
      try {
        const item = await addStaffToRun(body.runId, body.staffId, actualTenantId, actor)
        return res.status(201).json({ data: item })
      } catch (err) {
        if (err instanceof PayrollError) return res.status(400).json({ error: err.message })
        throw err
      }
    }
    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Item ID is required' })
      const body = parseBody(req)
      try {
        const item = await updateRunItem(id as string, actualTenantId, {
          basicSalary: body?.basicSalary != null ? Number(body.basicSalary) : undefined,
          extraEarnings: Array.isArray(body?.extraEarnings) ? body.extraEarnings : undefined,
          extraDeductions: Array.isArray(body?.extraDeductions) ? body.extraDeductions : undefined,
        }, actor)
        return res.status(200).json({ data: item })
      } catch (err) {
        if (err instanceof PayrollError) return res.status(400).json({ error: err.message })
        throw err
      }
    }
    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Item ID is required' })
      try {
        await deleteRunItem(id as string, actualTenantId, actor)
        return res.status(200).json({ message: 'Item removed' })
      } catch (err) {
        if (err instanceof PayrollError) return res.status(400).json({ error: err.message })
        throw err
      }
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
        const result = await emailPayslip(id as string, actualTenantId)
        if (!result.sent) return res.status(400).json({ error: result.error || 'Failed to email payslip' })
        return res.status(200).json({ message: 'Payslip emailed to staff member' })
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
      try {
        const advance = await createAdvance(body, actualTenantId)
        return res.status(201).json({ data: advance })
      } catch (err) {
        if (err instanceof PayrollError) return res.status(400).json({ error: err.message })
        throw err
      }
    }
    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Advance ID is required' })
      const body = parseBody(req)
      if (body?.action === 'approve') {
        const advance = await approveAdvance(id as string, decoded.userId || decoded.sub || '', decoded.email || '', actualTenantId)
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
    if (req.method === 'POST') {
      const body = parseBody(req)
      if (!body) return res.status(400).json({ error: 'Request body is required' })
      const config = await createTaxConfig(body, actualTenantId)
      return res.status(201).json({ data: config })
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
