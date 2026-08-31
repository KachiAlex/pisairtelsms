import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchFeeRecords, createFeeRecord, recordPayment, sendFeeReminders, generateFeeRecordsFromAssignments, type FeeRecordPayload, type PaymentPayload } from './_lib/finance.js'
import { requireRole } from '../_lib/auth-middleware.js'
import { initializeDatabase, runMigrations } from './cbt/_lib/db.js'

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
  res.setHeader('Allow', 'GET,POST')
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
  await ensureMigrations()

  // Require authentication - only staff or tenant_admin can access tenant finance
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'

  if (req.method === 'GET') {
    const { academicSession, term, class: className } = req.query
    try {
      const records = await fetchFeeRecords(
        tenantId,
        academicSession as string | undefined,
        term as string | undefined,
        className as string | undefined
      )
      return res.status(200).json({ data: records })
    } catch (error) {
      console.error('Error fetching fee records:', error)
      return res.status(500).json({ error: 'Failed to fetch fee records' })
    }
  }

  if (req.method === 'POST') {
    const { action } = req.query
    const body = parseBody(req)

    if (action === 'send-reminders') {
      try {
        const result = await sendFeeReminders(tenantId)
        return res.status(200).json({ data: result })
      } catch (error) {
        console.error('Error sending fee reminders:', error)
        return res.status(500).json({ error: 'Failed to send fee reminders' })
      }
    }

    if (action === 'generate-bills') {
      const feeStructureId = body?.feeStructureId as string | undefined
      try {
        const result = await generateFeeRecordsFromAssignments(tenantId, feeStructureId)
        return res.status(200).json({ data: result })
      } catch (error) {
        console.error('Error generating bills:', error)
        return res.status(500).json({ error: 'Failed to generate bills' })
      }
    }

    if (!body) return res.status(400).json({ error: 'Request body is required' })

    // Payment recording
    if (body.feeRecordId) {
      const { feeRecordId, amountPaid, paymentMethod, transactionRef } = body
      if (!feeRecordId || amountPaid === undefined || !paymentMethod || !transactionRef) {
        return res.status(400).json({ error: 'feeRecordId, amountPaid, paymentMethod, and transactionRef are required' })
      }
      if (Number(amountPaid) <= 0) {
        return res.status(400).json({ error: 'amountPaid must be greater than 0' })
      }
      try {
        const updated = await recordPayment(tenantId, { feeRecordId, amountPaid: Number(amountPaid), paymentMethod, transactionRef })
        return res.status(200).json({ data: updated })
      } catch (error: any) {
        if (error.message === 'Fee record not found') return res.status(404).json({ error: 'Fee record not found' })
        console.error('Error recording payment:', error)
        return res.status(500).json({ error: 'Failed to record payment' })
      }
    }

    // New fee record creation
    const { studentId, studentName, admissionNo, class: className, feeType, amount, academicSession, term } = body
    const missing: string[] = []
    if (!studentId) missing.push('studentId')
    if (!studentName) missing.push('studentName')
    if (!admissionNo) missing.push('admissionNo')
    if (!className) missing.push('class')
    if (!feeType) missing.push('feeType')
    if (amount === undefined) missing.push('amount')
    if (!academicSession) missing.push('academicSession')
    if (!term) missing.push('term')

    if (missing.length > 0) return res.status(400).json({ error: 'Missing required fields', details: missing })

    try {
      const payload: FeeRecordPayload = { studentId, studentName, admissionNo, class: className, feeType, amount: Number(amount), academicSession, term }
      const record = await createFeeRecord(tenantId, payload)
      return res.status(201).json({ data: record })
    } catch (error) {
      console.error('Error creating fee record:', error)
      return res.status(500).json({ error: 'Failed to create fee record' })
    }
  }

  return methodNotAllowed(res)
}
