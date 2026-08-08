import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../../_lib/auth-middleware.js'
import {
  createPayment,
  getPayments,
  getPaymentById,
  updatePaymentStatus,
  getTenantPaymentSettings,
  upsertTenantPaymentSetting,
  getActivePaymentGateway,
  initiatePayment,
  verifyPayment,
  createManualPayment,
  addPaymentProof,
  getPaymentProofs,
  confirmPayment,
  rejectPayment,
  getPendingPayments,
} from './_lib/payments.js'
import {
  createAdminNotification,
  ensureAdminNotificationsTable,
} from './_lib/admin-notifications.js'
import { initializeDatabase, runMigrations } from '../cbt/_lib/db.js'

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
  const tenantId = decoded.tenantId || 'default-tenant'

  console.log('Payments request:', { method: req.method, id, action, tenantId })

  if (!tenantId) {
    return res.status(400).json({ error: 'x-tenant-id header is required' })
  }

  // ─── PAYMENT SETTINGS ─────────────────────────────────────────────────────

  // GET /api/tenant/finance/payments?action=settings
  if (req.method === 'GET' && !id && action === 'settings') {
    try {
      const settings = await getTenantPaymentSettings(tenantId)
      return res.status(200).json({ data: settings })
    } catch (error) {
      console.error('Error fetching payment settings:', error)
      return res.status(500).json({ error: 'Failed to fetch payment settings' })
    }
  }

  // PUT /api/tenant/finance/payments?action=settings
  if (req.method === 'PUT' && !id && action === 'settings') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const { gateway, publicKey, secretKey, isActive, metadata } = body
    if (!gateway || !publicKey || !secretKey) {
      return res.status(400).json({ error: 'Missing required fields', details: ['gateway', 'publicKey', 'secretKey'] })
    }

    try {
      const setting = await upsertTenantPaymentSetting(tenantId, gateway, publicKey, secretKey, !!isActive, metadata)
      return res.status(200).json({ data: setting })
    } catch (error) {
      console.error('Error saving payment settings:', error)
      return res.status(500).json({ error: 'Failed to save payment settings' })
    }
  }

  // ─── ACTIVE GATEWAY ───────────────────────────────────────────────────────

  // GET /api/tenant/finance/payments?action=active-gateway
  if (req.method === 'GET' && !id && action === 'active-gateway') {
    try {
      const gateway = await getActivePaymentGateway(tenantId)
      if (!gateway) {
        return res.status(404).json({ error: 'No active payment gateway configured' })
      }
      // Never return secret key to client
      return res.status(200).json({
        data: {
          id: gateway.id,
          gateway: gateway.gateway,
          publicKey: gateway.publicKey,
          isActive: gateway.isActive,
          metadata: gateway.metadata,
        }
      })
    } catch (error) {
      console.error('Error fetching active gateway:', error)
      return res.status(500).json({ error: 'Failed to fetch active gateway' })
    }
  }

  // ─── INITIATE ONLINE PAYMENT ────────────────────────────────────────────────

  // POST /api/tenant/finance/payments?action=initiate
  if (req.method === 'POST' && !id && action === 'initiate') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const { studentId, feeAssignmentId, feeStructureId, amount, gatewayRef } = body

    const missing: string[] = []
    if (!studentId) missing.push('studentId')
    if (!feeAssignmentId) missing.push('feeAssignmentId')
    if (!feeStructureId) missing.push('feeStructureId')
    if (amount === undefined) missing.push('amount')
    if (!gatewayRef) missing.push('gatewayRef')

    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing required fields', details: missing })
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'amount must be greater than 0' })
    }

    // Check active gateway
    const activeGateway = await getActivePaymentGateway(tenantId)
    if (!activeGateway) {
      return res.status(400).json({ error: 'No active payment gateway configured for this institution' })
    }

    try {
      const payment = await initiatePayment(
        tenantId,
        studentId,
        feeAssignmentId,
        feeStructureId,
        amount,
        activeGateway.gateway,
        gatewayRef
      )
      return res.status(201).json({ data: payment })
    } catch (error) {
      console.error('Error initiating payment:', error)
      return res.status(500).json({ error: 'Failed to initiate payment' })
    }
  }

  // ─── VERIFY PAYMENT (WEBHOOK / CALLBACK) ──────────────────────────────────

  // POST /api/tenant/finance/payments?action=verify
  if (req.method === 'POST' && !id && action === 'verify') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const { gatewayRef, gatewayResponse } = body
    if (!gatewayRef) {
      return res.status(400).json({ error: 'gatewayRef is required' })
    }

    try {
      const payment = await verifyPayment(gatewayRef, gatewayResponse)
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found or already processed' })
      }
      return res.status(200).json({ data: payment })
    } catch (error) {
      console.error('Error verifying payment:', error)
      return res.status(500).json({ error: 'Failed to verify payment' })
    }
  }

  // ─── MANUAL PAYMENT UPLOAD ────────────────────────────────────────────────

  // POST /api/tenant/finance/payments?action=manual
  if (req.method === 'POST' && !id && action === 'manual') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const { studentId, feeAssignmentId, feeStructureId, amount, paymentMethod, notes, proofUrl, proofType, studentName } = body

    const missing: string[] = []
    if (!studentId) missing.push('studentId')
    if (!feeAssignmentId) missing.push('feeAssignmentId')
    if (!feeStructureId) missing.push('feeStructureId')
    if (amount === undefined) missing.push('amount')
    if (!paymentMethod) missing.push('paymentMethod')

    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing required fields', details: missing })
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'amount must be greater than 0' })
    }

    try {
      await ensureAdminNotificationsTable()

      const payment = await createManualPayment(
        tenantId,
        studentId,
        feeAssignmentId,
        feeStructureId,
        amount,
        paymentMethod,
        notes
      )

      // Attach proof if provided
      if (proofUrl) {
        await addPaymentProof(payment.id, proofUrl, proofType || 'receipt')
      }

      // Create admin notification for manual payment review
      await createAdminNotification(
        tenantId,
        'payment_pending',
        payment.id,
        studentId,
        studentName,
        amount,
        { paymentMethod, notes }
      )

      return res.status(201).json({ data: payment })
    } catch (error) {
      console.error('Error creating manual payment:', error)
      return res.status(500).json({ error: 'Failed to create manual payment' })
    }
  }

  // ─── PENDING PAYMENTS QUEUE ───────────────────────────────────────────────

  // GET /api/tenant/finance/payments?action=pending
  if (req.method === 'GET' && !id && action === 'pending') {
    try {
      const payments = await getPendingPayments(tenantId)
      return res.status(200).json({ data: payments })
    } catch (error) {
      console.error('Error fetching pending payments:', error)
      return res.status(500).json({ error: 'Failed to fetch pending payments' })
    }
  }

  // ─── ADMIN CONFIRM / REJECT ───────────────────────────────────────────────

  // POST /api/tenant/finance/payments/:id/confirm
  if (req.method === 'POST' && id && action === 'confirm') {
    const body = parseBody(req)
    const confirmedBy = body?.confirmedBy || 'admin'

    try {
      await ensureAdminNotificationsTable()
      const payment = await confirmPayment(id as string, confirmedBy)
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found or not pending' })
      }

      // Create admin notification for confirmed payment
      await createAdminNotification(
        tenantId,
        'payment_confirmed',
        payment.id,
        payment.studentId,
        body?.studentName,
        payment.amount,
        { confirmedBy }
      )

      return res.status(200).json({ data: payment })
    } catch (error) {
      console.error('Error confirming payment:', error)
      return res.status(500).json({ error: 'Failed to confirm payment' })
    }
  }

  // POST /api/tenant/finance/payments/:id/reject
  if (req.method === 'POST' && id && action === 'reject') {
    const body = parseBody(req)
    const reason = body?.reason

    try {
      await ensureAdminNotificationsTable()
      const payment = await rejectPayment(id as string, reason)
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found or not pending' })
      }

      // Create admin notification for rejected payment
      await createAdminNotification(
        tenantId,
        'payment_rejected',
        payment.id,
        payment.studentId,
        body?.studentName,
        payment.amount,
        { rejectionReason: reason, rejectedBy: body?.rejectedBy || 'admin' }
      )

      return res.status(200).json({ data: payment })
    } catch (error) {
      console.error('Error rejecting payment:', error)
      return res.status(500).json({ error: 'Failed to reject payment' })
    }
  }

  // ─── GET PAYMENT PROOFS ───────────────────────────────────────────────────

  // GET /api/tenant/finance/payments/:id/proofs
  if (req.method === 'GET' && id && action === 'proofs') {
    try {
      const proofs = await getPaymentProofs(id as string)
      return res.status(200).json({ data: proofs })
    } catch (error) {
      console.error('Error fetching payment proofs:', error)
      return res.status(500).json({ error: 'Failed to fetch payment proofs' })
    }
  }

  // ─── EXISTING ADMIN RECORDED PAYMENTS ─────────────────────────────────────

  // GET /api/tenant/finance/payments
  if (req.method === 'GET' && !id && !action) {
    const { feeAssignmentId, paymentDate, status, studentId, gateway, dateFrom, dateTo } = req.query
    try {
      const payments = await getPayments(
        tenantId,
        feeAssignmentId as string | undefined,
        paymentDate as string | undefined,
        status as string | undefined,
        gateway as string | undefined,
        dateFrom as string | undefined,
        dateTo as string | undefined
      )
      // Filter by student if requested
      const filtered = studentId
        ? payments.filter(p => p.studentId === studentId)
        : payments
      return res.status(200).json({ data: filtered })
    } catch (error) {
      console.error('Error fetching payments:', error)
      return res.status(500).json({ error: 'Failed to fetch payments' })
    }
  }

  // GET /api/tenant/finance/payments/:id
  if (req.method === 'GET' && id && !action) {
    try {
      const payment = await getPaymentById(id as string)
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' })
      }
      return res.status(200).json({ data: payment })
    } catch (error) {
      console.error('Error fetching payment:', error)
      return res.status(500).json({ error: 'Failed to fetch payment' })
    }
  }

  // POST /api/tenant/finance/payments (admin recorded)
  if (req.method === 'POST' && !id && !action) {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const {
      studentId,
      feeAssignmentId,
      feeStructureId,
      amount,
      paymentMethod,
      referenceNumber,
      receiptNumber,
      paymentDate,
      paymentTime,
      recordedBy,
      notes,
    } = body

    const missing: string[] = []
    if (!studentId) missing.push('studentId')
    if (!feeAssignmentId) missing.push('feeAssignmentId')
    if (!feeStructureId) missing.push('feeStructureId')
    if (amount === undefined) missing.push('amount')
    if (!paymentMethod) missing.push('paymentMethod')
    if (!referenceNumber) missing.push('referenceNumber')
    if (!receiptNumber) missing.push('receiptNumber')
    if (!paymentDate) missing.push('paymentDate')
    if (!paymentTime) missing.push('paymentTime')

    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing required fields', details: missing })
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'amount must be greater than 0' })
    }

    try {
      const payment = await createPayment(
        tenantId,
        studentId,
        feeAssignmentId,
        feeStructureId,
        amount,
        paymentMethod,
        referenceNumber,
        receiptNumber,
        paymentDate,
        paymentTime,
        recordedBy || null,
        notes
      )
      return res.status(201).json({ data: payment })
    } catch (error) {
      console.error('Error creating payment:', error)
      return res.status(500).json({ error: 'Failed to create payment' })
    }
  }

  // POST /api/tenant/finance/payments/bulk
  if (req.method === 'POST' && action === 'bulk') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const { payments: paymentsList } = body

    if (!paymentsList || !Array.isArray(paymentsList) || paymentsList.length === 0) {
      return res.status(400).json({ error: 'payments array is required' })
    }

    try {
      const created = []
      for (const payment of paymentsList) {
        const {
          studentId,
          feeAssignmentId,
          feeStructureId,
          amount,
          paymentMethod,
          referenceNumber,
          receiptNumber,
          paymentDate,
          paymentTime,
          recordedBy,
          notes,
        } = payment

        const missing: string[] = []
        if (!studentId) missing.push('studentId')
        if (!feeAssignmentId) missing.push('feeAssignmentId')
        if (!feeStructureId) missing.push('feeStructureId')
        if (amount === undefined) missing.push('amount')
        if (!paymentMethod) missing.push('paymentMethod')
        if (!referenceNumber) missing.push('referenceNumber')
        if (!receiptNumber) missing.push('receiptNumber')
        if (!paymentDate) missing.push('paymentDate')
        if (!paymentTime) missing.push('paymentTime')

        if (missing.length > 0) {
          return res.status(400).json({ error: 'Missing required fields in payment', details: missing })
        }

        if (amount <= 0) {
          return res.status(400).json({ error: 'amount must be greater than 0' })
        }

        const result = await createPayment(
          tenantId,
          studentId,
          feeAssignmentId,
          feeStructureId,
          amount,
          paymentMethod,
          referenceNumber,
          receiptNumber,
          paymentDate,
          paymentTime,
          recordedBy || null,
          notes
        )
        created.push(result)
      }

      return res.status(201).json({ data: created })
    } catch (error) {
      console.error('Error bulk creating payments:', error)
      return res.status(500).json({ error: 'Failed to bulk create payments' })
    }
  }

  // POST /api/tenant/finance/payments/:id/reverse
  if (req.method === 'POST' && id && action === 'reverse') {
    try {
      const updated = await updatePaymentStatus(id as string, 'reversed')
      if (!updated) {
        return res.status(404).json({ error: 'Payment not found' })
      }
      return res.status(200).json({ data: updated })
    } catch (error) {
      console.error('Error reversing payment:', error)
      return res.status(500).json({ error: 'Failed to reverse payment' })
    }
  }

  // POST /api/tenant/finance/payments/:id/receipt
  if (req.method === 'POST' && id && action === 'receipt') {
    try {
      const payment = await getPaymentById(id as string)
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' })
      }

      const receipt = {
        receiptNumber: payment.receiptNumber,
        paymentDate: payment.paymentDate,
        paymentTime: payment.paymentTime,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        referenceNumber: payment.referenceNumber,
        recordedBy: payment.recordedBy,
        notes: payment.notes,
        status: payment.status,
        paidAt: payment.paidAt,
      }

      return res.status(200).json({ data: receipt })
    } catch (error) {
      console.error('Error generating receipt:', error)
      return res.status(500).json({ error: 'Failed to generate receipt' })
    }
  }

  return methodNotAllowed(res)
}
