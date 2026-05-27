import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  fetchStaff, fetchStaffById, createStaffMember, updateStaffMember, deleteStaffMember,
  fetchLeaveRequests, createLeaveRequest, updateLeaveStatus,
  fetchAttendance, markAttendance,
  fetchPayroll, generatePayroll, updatePayrollStatus,
  type StaffPayload,
} from './_lib/staff.js'
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
  // Require authentication - only staff or tenant_admin can access tenant staff management
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const actualTenantId = decoded.tenantId || 'default-tenant'
  const { resource, id, department, status, date, staffId, month, year } = req.query

  // ── Staff Directory ──────────────────────────────────────────────────────
  if (!resource || resource === 'directory') {
    if (req.method === 'GET') {
      if (id) {
        const member = await fetchStaffById(id as string)
        if (!member) return res.status(404).json({ error: 'Staff member not found' })
        return res.status(200).json({ data: member })
      }
      const staff = await fetchStaff(department as string | undefined, status as string | undefined)
      return res.status(200).json({ data: staff })
    }

    if (req.method === 'POST') {
      const body = parseBody(req)
      if (!body) return res.status(400).json({ error: 'Request body is required' })
      const { name, role, department: dept, hireDate } = body
      const missing: string[] = []
      if (!name) missing.push('name')
      if (!role) missing.push('role')
      if (!dept) missing.push('department')
      if (!hireDate) missing.push('hireDate')
      if (missing.length > 0) return res.status(400).json({ error: 'Missing required fields', details: missing })
      const payload: StaffPayload = { ...body }
      const member = await createStaffMember(payload, actualTenantId)
      return res.status(201).json({ data: member })
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Staff ID is required' })
      const body = parseBody(req)
      if (!body) return res.status(400).json({ error: 'Request body is required' })
      const member = await updateStaffMember(id as string, body, actualTenantId)
      if (!member) return res.status(404).json({ error: 'Staff member not found' })
      return res.status(200).json({ data: member })
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Staff ID is required' })
      const success = await deleteStaffMember(id as string)
      if (!success) return res.status(500).json({ error: 'Failed to delete staff member' })
      return res.status(200).json({ message: 'Staff member deleted' })
    }

    return methodNotAllowed(res)
  }

  // ── Leave ────────────────────────────────────────────────────────────────
  if (resource === 'leave') {
    if (req.method === 'GET') {
      const leaves = await fetchLeaveRequests(staffId as string | undefined, status as string | undefined)
      return res.status(200).json({ data: leaves })
    }

    if (req.method === 'POST') {
      const body = parseBody(req)
      if (!body) return res.status(400).json({ error: 'Request body is required' })
      const leave = await createLeaveRequest(body)
      return res.status(201).json({ data: leave })
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Leave ID is required' })
      const body = parseBody(req)
      if (!body?.status) return res.status(400).json({ error: 'Status is required' })
      const leave = await updateLeaveStatus(id as string, body.status, body.approvedBy)
      if (!leave) return res.status(404).json({ error: 'Leave request not found' })
      return res.status(200).json({ data: leave })
    }

    return methodNotAllowed(res)
  }

  // ── Attendance ───────────────────────────────────────────────────────────
  if (resource === 'attendance') {
    if (req.method === 'GET') {
      const records = await fetchAttendance(date as string | undefined, staffId as string | undefined)
      return res.status(200).json({ data: records })
    }

    if (req.method === 'POST') {
      const body = parseBody(req)
      if (!body) return res.status(400).json({ error: 'Request body is required' })
      const record = await markAttendance(body)
      return res.status(201).json({ data: record })
    }

    return methodNotAllowed(res)
  }

  // ── Payroll ──────────────────────────────────────────────────────────────
  if (resource === 'payroll') {
    if (req.method === 'GET') {
      const records = await fetchPayroll(month as string | undefined, year ? Number(year) : undefined)
      return res.status(200).json({ data: records })
    }

    if (req.method === 'POST') {
      const body = parseBody(req)
      if (!body) return res.status(400).json({ error: 'Request body is required' })
      const { staffId: sid, staffName, month: m, year: y, basicSalary, allowances, deductions } = body
      if (!sid || !staffName || !m || !y) return res.status(400).json({ error: 'Missing required fields' })
      const record = await generatePayroll(sid, staffName, m, y, basicSalary || 0, allowances || 0, deductions || 0)
      return res.status(201).json({ data: record })
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Payroll ID is required' })
      const body = parseBody(req)
      if (!body?.status) return res.status(400).json({ error: 'Status is required' })
      const record = await updatePayrollStatus(id as string, body.status, body.paymentDate)
      if (!record) return res.status(404).json({ error: 'Payroll record not found' })
      return res.status(200).json({ data: record })
    }

    return methodNotAllowed(res)
  }

  return res.status(400).json({ error: 'Invalid resource' })
}
