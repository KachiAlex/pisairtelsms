import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../../_lib/auth-middleware.js'
import { initializeDatabase, runMigrations } from '../../cbt/_lib/db.js'
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureMigrations()

  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const { id, action } = req.query

  // GET /api/tenant/finance/fee-assignments
  if (req.method === 'GET' && !id) {
    const { studentId, academicSession, term } = req.query
    try {
      const assignments = await getFeeAssignments(
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
      const assignment = await getFeeAssignmentById(id as string)
      if (!assignment) {
        return res.status(404).json({ error: 'Fee assignment not found' })
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
      const ledger = await getFeeAssignmentLedger(id as string)
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

    try {
      const assignment = await createFeeAssignment(
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
      const updated = await updateFeeAssignment(id as string, {
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
