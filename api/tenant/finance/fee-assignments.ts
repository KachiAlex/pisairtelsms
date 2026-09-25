import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js'
import { sql } from '../../_lib/sql.js'
import { requireRole } from '../../_lib/auth-middleware.js'
import { initializeDatabase, runMigrations } from '../cbt/_lib/db.js'
import { getAcademicSessionNames } from '../_lib/academic-calendar.js'
import { verifyParentChildAccess } from '../../parent/_lib/verify-child.js'
import {
  createFeeAssignment,
  getFeeAssignments,
  getFeeAssignmentById,
  updateFeeAssignment,
  getFeeAssignmentLedger,
} from './_lib/fee-assignments.js'

let migrationsInitialized = false

async function ensureMigrations() {
  if (migrationsInitialized) return
  migrationsInitialized = true
  try {
    initializeDatabase()
    await runMigrations()
  } catch (err) {
    console.error('Migration initialization error:', err)
  }
}

function methodNotAllowed(res: ApiResponse) {
  res.setHeader('Allow', 'GET,POST,PUT')
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
  await ensureMigrations()

  const decoded = await requireRole(req, res, ['staff', 'tenant_admin', 'parent', 'student'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'

  // Parents are read-only and scoped to their own children; students are
  // read-only and scoped to their own record.
  const isParent = decoded.role === 'parent'
  const isStudent = decoded.role === 'student'
  const studentOwns = (studentId?: string) =>
    !!studentId && studentId === (decoded.studentId || decoded.userId)
  const parentOwns = (studentId?: string) =>
    verifyParentChildAccess(decoded.parentId, studentId, tenantId)
  if ((isParent || isStudent) && req.method !== 'GET') {
    return res.status(403).json({ error: 'You can only view fee assignments for your own account' })
  }

  const { id, action } = req.query

  // GET /api/tenant/finance/fee-assignments
  if (req.method === 'GET' && !id) {
    const { studentId, academicSession, term } = req.query
    if (isParent && (!studentId || !await parentOwns(studentId as string))) {
      return res.status(403).json({ error: 'You can only view fee assignments for your own children' })
    }
    if (isStudent && !studentOwns(studentId as string)) {
      return res.status(403).json({ error: 'You can only view your own fee assignments' })
    }
    try {
      const assignments = await getFeeAssignments(
        tenantId,
        studentId as string | undefined,
        academicSession as string | undefined,
        term as string | undefined
      )
      return res.status(200).json({ data: assignments })
    } catch (error) {
      console.error('Error fetching fee assignments:', error)
      return res.status(500).json({ error: 'Failed to fetch fee assignments' })
    }
  }

  // GET /api/tenant/finance/fee-assignments/:id
  if (req.method === 'GET' && id && !action) {
    try {
      const assignment = await getFeeAssignmentById(tenantId, id as string)
      if (!assignment) {
        return res.status(404).json({ error: 'Fee assignment not found' })
      }
      if (isParent && !await parentOwns(assignment.studentId)) {
        return res.status(403).json({ error: 'You can only view fee assignments for your own children' })
      }
      if (isStudent && !studentOwns(assignment.studentId)) {
        return res.status(403).json({ error: 'You can only view your own fee assignments' })
      }
      return res.status(200).json({ data: assignment })
    } catch (error) {
      console.error('Error fetching fee assignment:', error)
      return res.status(500).json({ error: 'Failed to fetch fee assignment' })
    }
  }

  // GET /api/tenant/finance/fee-assignments/:id/ledger
  if (req.method === 'GET' && id && action === 'ledger') {
    try {
      if (isParent || isStudent) {
        const assignment = await getFeeAssignmentById(tenantId, id as string)
        if (!assignment) return res.status(404).json({ error: 'Fee assignment not found' })
        if (isParent && !await parentOwns(assignment.studentId)) {
          return res.status(403).json({ error: 'You can only view fee assignments for your own children' })
        }
        if (isStudent && !studentOwns(assignment.studentId)) {
          return res.status(403).json({ error: 'You can only view your own fee assignments' })
        }
      }
      const ledger = await getFeeAssignmentLedger(tenantId, id as string)
      return res.status(200).json({ data: ledger })
    } catch (error: any) {
      if (error.message === 'Fee assignment not found') {
        return res.status(404).json({ error: 'Fee assignment not found' })
      }
      console.error('Error fetching fee ledger:', error)
      return res.status(500).json({ error: 'Failed to fetch fee ledger' })
    }
  }

  // POST /api/tenant/finance/fee-assignments
  if (req.method === 'POST' && !id && !action) {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const { studentId, feeStructureId, academicSession, term, totalAmount, dueDate } = body

    const missing: string[] = []
    if (!studentId) missing.push('studentId')
    if (!feeStructureId) missing.push('feeStructureId')
    if (!academicSession) missing.push('academicSession')
    if (!term) missing.push('term')
    if (totalAmount === undefined) missing.push('totalAmount')
    if (!dueDate) missing.push('dueDate')

    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing required fields', details: missing })
    }

    // Term must exist in Timetable & Scheduling (timetable_terms).
    try {
      const termCheck = await sql`SELECT name FROM timetable_terms WHERE tenant_id = ${tenantId}`
      const validTerms = termCheck.rows.map(r => r.name)
      if (!validTerms.includes(term)) {
        return res.status(400).json({
          error: validTerms.length === 0
            ? 'No terms configured — create terms in Timetable & Scheduling first'
            : `Invalid term — must be one of: ${validTerms.join(', ')}`,
        })
      }
    } catch (err) {
      if ((err as any)?.code !== '42P01') throw err
    }

    // Academic session must exist in Timetable & Scheduling (academic_years).
    const validSessions = await getAcademicSessionNames(tenantId)
    if (validSessions !== null && !validSessions.includes(academicSession)) {
      return res.status(400).json({
        error: validSessions.length === 0
          ? 'No academic sessions configured — create academic years in Timetable & Scheduling first'
          : `Invalid academic session — must be one of: ${validSessions.join(', ')}`,
      })
    }

    try {
      const assignment = await createFeeAssignment(
        tenantId,
        studentId,
        feeStructureId,
        academicSession,
        term,
        totalAmount,
        dueDate
      )
      return res.status(201).json({ data: assignment })
    } catch (error) {
      console.error('Error creating fee assignment:', error)
      return res.status(500).json({ error: 'Failed to create fee assignment' })
    }
  }

  // POST /api/tenant/finance/fee-assignments/bulk
  if (req.method === 'POST' && action === 'bulk') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const { assignments } = body

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: 'assignments array is required' })
    }

    // Terms must exist in Timetable & Scheduling (timetable_terms).
    let validTermSet: Set<string> | null = null
    try {
      const termCheck = await sql`SELECT name FROM timetable_terms WHERE tenant_id = ${tenantId}`
      validTermSet = new Set(termCheck.rows.map(r => r.name))
    } catch (err) {
      if ((err as any)?.code !== '42P01') throw err
    }
    if (validTermSet !== null) {
      const bad = assignments.find((a: any) => a.term && !validTermSet.has(a.term))
      if (bad) {
        return res.status(400).json({
          error: validTermSet.size === 0
            ? 'No terms configured — create terms in Timetable & Scheduling first'
            : `Invalid term — must be one of: ${[...validTermSet].join(', ')}`,
        })
      }
    }

    // Academic sessions must exist in Timetable & Scheduling (academic_years).
    const validSessions = await getAcademicSessionNames(tenantId)
    if (validSessions !== null) {
      const sessionSet = new Set(validSessions)
      const bad = assignments.find((a: any) => a.academicSession && !sessionSet.has(a.academicSession))
      if (bad) {
        return res.status(400).json({
          error: sessionSet.size === 0
            ? 'No academic sessions configured — create academic years in Timetable & Scheduling first'
            : `Invalid academic session — must be one of: ${validSessions.join(', ')}`,
        })
      }
    }

    try {
      const created = []
      for (const assignment of assignments) {
        const { studentId, feeStructureId, academicSession, term, totalAmount, dueDate } = assignment

        const missing: string[] = []
        if (!studentId) missing.push('studentId')
        if (!feeStructureId) missing.push('feeStructureId')
        if (!academicSession) missing.push('academicSession')
        if (!term) missing.push('term')
        if (totalAmount === undefined) missing.push('totalAmount')
        if (!dueDate) missing.push('dueDate')

        if (missing.length > 0) {
          return res.status(400).json({ error: 'Missing required fields in assignment', details: missing })
        }

        const result = await createFeeAssignment(
          tenantId,
          studentId,
          feeStructureId,
          academicSession,
          term,
          totalAmount,
          dueDate
        )
        created.push(result)
      }

      return res.status(201).json({ data: created })
    } catch (error) {
      console.error('Error bulk creating fee assignments:', error)
      return res.status(500).json({ error: 'Failed to bulk create fee assignments' })
    }
  }

  // PUT /api/tenant/finance/fee-assignments/:id
  if (req.method === 'PUT' && id && !action) {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const { totalAmount, totalPaid, totalBalance, status, dueDate } = body

    try {
      const updated = await updateFeeAssignment(tenantId, id as string, {
        totalAmount,
        totalPaid,
        totalBalance,
        status,
        dueDate,
      })

      if (!updated) {
        return res.status(404).json({ error: 'Fee assignment not found' })
      }

      return res.status(200).json({ data: updated })
    } catch (error) {
      console.error('Error updating fee assignment:', error)
      return res.status(500).json({ error: 'Failed to update fee assignment' })
    }
  }

  return methodNotAllowed(res)
}
