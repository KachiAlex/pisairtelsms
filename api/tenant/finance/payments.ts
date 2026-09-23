import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js'
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
  PaymentValidationError,
} from './_lib/payments.js'
import {
  createAdminNotification,
  ensureAdminNotificationsTable,
} from './_lib/admin-notifications.js'
import { sql } from '../../_lib/sql.js'
import { verifyParentChildRelationship } from '../../../src/lib/parentAuth'
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

  const decoded = await requireRole(req, res, ['staff', 'tenant_admin', 'parent'])
  if (!decoded) return

  const { id, action } = req.query
  const tenantId = decoded.tenantId || 'default-tenant'

  // Parents may only view and pay fees for their own children — everything
  // else (settings, pending queue, confirm/reject, proofs) stays staff/admin.
  const isParent = decoded.role === 'parent'
  const parentOwns = (studentId?: string) =>
    verifyParentChildRelationship(decoded.parentId, studentId, decoded.childrenIds || [])

  if (isParent) {
    const allowed =
      (req.method === 'GET' && !id && (action === 'active-gateway' || !action)) ||
      (req.method === 'GET' && !!id && !action) ||
      (req.method === 'POST' && !id && (action === 'initiate' || action === 'verify' || action === 'manual'))
    if (!allowed) {
      return res.status(403).json({ error: 'Parents can only view and make payments for their children' })
    }
  }

  console.log('Payments request:', { method: req.method, id, action, tenantId })

  if (!tenantId) {
    return res.status(400).json({ error: 'x-tenant-id header is required' })
  }

  // ─── PAYMENT SETTINGS ─────────────────────────────────────────────────────

  // Gateway settings manage live payment credentials — tenant_admin only.
  const isAdmin = decoded.role === 'tenant_admin'

  // GET /api/tenant/finance/payments?action=settings
  if (req.method === 'GET' && !id && action === 'settings') {
    if (!isAdmin) return res.status(403).json({ error: 'Only tenant admins can view payment gateway settings' })
    try {
      const settings = await getTenantPaymentSettings(tenantId)
      // Never return raw secret keys — mask to last 4 chars. An empty
      // secretKey field on PUT means "keep the existing key".
      const masked = settings.map(s => ({
        ...s,
        secretKey: '',
        hasSecretKey: !!s.secretKey,
        secretKeyLast4: s.secretKey ? s.secretKey.slice(-4) : '',
      }))
      return res.status(200).json({ data: masked })
    } catch (error) {
      console.error('Error fetching payment settings:', error)
      return res.status(500).json({ error: 'Failed to fetch payment settings' })
    }
  }

  // PUT /api/tenant/finance/payments?action=settings
  if (req.method === 'PUT' && !id && action === 'settings') {
    if (!isAdmin) return res.status(403).json({ error: 'Only tenant admins can change payment gateway settings' })
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const { gateway, publicKey, secretKey, isActive, metadata } = body
    if (!gateway || !publicKey) {
      return res.status(400).json({ error: 'Missing required fields', details: ['gateway', 'publicKey'] })
    }
    if (!['paystack', 'flutterwave', 'moniepoint'].includes(gateway)) {
      return res.status(400).json({ error: 'Unsupported gateway' })
    }

    try {
      // Empty secretKey = keep the stored one (it was never sent to the client)
      let effectiveSecret = typeof secretKey === 'string' ? secretKey.trim() : ''
      if (!effectiveSecret) {
        const existing = (await getTenantPaymentSettings(tenantId)).find(s => s.gateway === gateway)
        effectiveSecret = existing?.secretKey || ''
      }
      if (!effectiveSecret) {
        return res.status(400).json({ error: 'Secret key is required when configuring a gateway for the first time' })
      }
      const setting = await upsertTenantPaymentSetting(tenantId, gateway, publicKey, effectiveSecret, !!isActive, metadata)
      return res.status(200).json({ data: { ...setting, secretKey: '', hasSecretKey: true, secretKeyLast4: effectiveSecret.slice(-4) } })
    } catch (error) {
      console.error('Error saving payment settings:', error)
      return res.status(500).json({ error: 'Failed to save payment settings' })
    }
  }

  // POST /api/tenant/finance/payments?action=test-gateway — validate keys live
  if (req.method === 'POST' && !id && action === 'test-gateway') {
    if (!isAdmin) return res.status(403).json({ error: 'Only tenant admins can test gateway credentials' })
    const body = parseBody(req)
    const gateway = body?.gateway
    if (!['paystack', 'flutterwave'].includes(gateway)) {
      return res.status(400).json({ error: 'Supported testable gateways: paystack, flutterwave' })
    }
    let secretKey = typeof body?.secretKey === 'string' ? body.secretKey.trim() : ''
    if (!secretKey) {
      const existing = (await getTenantPaymentSettings(tenantId)).find(s => s.gateway === gateway)
      secretKey = existing?.secretKey || ''
    }
    if (!secretKey) {
      return res.status(400).json({ error: 'No secret key provided or saved for this gateway' })
    }
    try {
      // Paystack's /bank list is public — /balance actually validates the key.
      const url = gateway === 'paystack'
        ? 'https://api.paystack.co/balance'
        : 'https://api.flutterwave.com/v3/banks/NG'
      const gwRes = await fetch(url, { headers: { Authorization: `Bearer ${secretKey}` } })
      const data = await gwRes.json().catch(() => null)
      const ok = gateway === 'paystack' ? data?.status === true : data?.status === 'success'
      if (ok) {
        const detail = gateway === 'paystack'
          ? `${data.data?.length ?? 0} balance account(s) reachable`
          : `${data.data?.length ?? 0} banks reachable`
        return res.status(200).json({ data: { ok: true, gateway, detail } })
      }
      return res.status(400).json({ error: data?.message || `${gateway} rejected the key`, data: { ok: false } })
    } catch (error) {
      return res.status(500).json({ error: `Could not reach ${gateway}: ${error instanceof Error ? error.message : String(error)}` })
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
    if (amount === undefined) missing.push('amount')
    if (!gatewayRef) missing.push('gatewayRef')

    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing required fields', details: missing })
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'amount must be greater than 0' })
    }

    if (isParent && !parentOwns(studentId)) {
      return res.status(403).json({ error: 'You can only pay fees for your own children' })
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
      if (error instanceof PaymentValidationError) {
        return res.status(400).json({ error: error.message })
      }
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

    if (isParent) {
      const refRow = await sql`
        SELECT student_id FROM payments WHERE gateway_ref = ${gatewayRef} AND tenant_id = ${tenantId} LIMIT 1
      `.catch(() => ({ rows: [] as any[] }))
      const refStudent = refRow.rows[0]?.student_id
      if (!refStudent || !parentOwns(refStudent)) {
        return res.status(403).json({ error: 'You can only verify payments for your own children' })
      }
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
    if (amount === undefined) missing.push('amount')
    if (!paymentMethod) missing.push('paymentMethod')

    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing required fields', details: missing })
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'amount must be greater than 0' })
    }

    if (isParent && !parentOwns(studentId)) {
      return res.status(403).json({ error: 'You can only submit payments for your own children' })
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
      if (error instanceof PaymentValidationError) {
        return res.status(400).json({ error: error.message })
      }
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

      // Send confirmation email to student/guardian
      try {
        const { queryOne } = await import('../cbt/_lib/db.js')
        const { sendEmail } = await import('../../_lib/email.js')
        const { emailTemplates } = await import('../../_lib/email-templates.js')
        const student = await queryOne<any>(
          'SELECT email, name FROM students WHERE id = $1',
          [payment.studentId]
        )
        if (student?.email) {
          const { html, subject } = emailTemplates.paymentConfirmation({
            studentName: student.name || body?.studentName,
            paymentId: payment.id,
            description: body?.description || 'School Fees',
            amount: payment.amount,
            date: new Date().toLocaleDateString(),
            method: 'Manual',
          })
          await sendEmail({ to: student.email, subject, html })
        }
      } catch (emailErr) {
        console.error('Payment confirmation email failed:', emailErr)
      }

      return res.status(200).json({ data: payment })
    } catch (error) {
      if (error instanceof PaymentValidationError) {
        return res.status(400).json({ error: error.message })
      }
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

      // Send rejection email to student/guardian
      try {
        const { queryOne } = await import('../cbt/_lib/db.js')
        const { sendEmail } = await import('../../_lib/email.js')
        const { emailTemplates } = await import('../../_lib/email-templates.js')
        const student = await queryOne<any>(
          'SELECT email, name FROM students WHERE id = $1',
          [payment.studentId]
        )
        if (student?.email) {
          const { html, subject } = emailTemplates.paymentRejected({
            studentName: student.name || body?.studentName,
            paymentId: payment.id,
            amount: payment.amount,
            reason: reason || 'Payment could not be verified',
          })
          await sendEmail({ to: student.email, subject, html })
        }
      } catch (emailErr) {
        console.error('Payment rejection email failed:', emailErr)
      }

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
    const { feeAssignmentId, paymentDate, status, studentId, paymentMethod, gateway, dateFrom, dateTo } = req.query
    if (isParent && (!studentId || !parentOwns(studentId as string))) {
      return res.status(403).json({ error: 'You can only view payments for your own children' })
    }
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
      // Filter by student / method if requested
      const filtered = payments.filter(p =>
        (!studentId || p.studentId === studentId) &&
        (!paymentMethod || p.paymentMethod === paymentMethod)
      )
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
      if (isParent && !parentOwns(payment.studentId)) {
        return res.status(403).json({ error: 'You can only view payments for your own children' })
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
      amount,
      paymentMethod,
      referenceNumber,
      receiptNumber,
      paymentDate,
      paymentTime,
      notes,
    } = body

    const missing: string[] = []
    if (!studentId) missing.push('studentId')
    if (!feeAssignmentId) missing.push('feeAssignmentId')
    if (amount === undefined) missing.push('amount')
    if (!paymentMethod) missing.push('paymentMethod')
    // referenceNumber optional for cash — the generated receipt number is the audit anchor

    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing required fields', details: missing })
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'amount must be greater than 0' })
    }

    // Server-side defaults — receipt number is generated, not user-supplied;
    // recordedBy comes from the verified JWT, not the request body.
    const now = new Date()
    const effectiveReceiptNumber = receiptNumber || `RCP-${now.getTime()}`
    const effectivePaymentDate = paymentDate || now.toISOString().split('T')[0]
    const effectivePaymentTime = paymentTime || now.toTimeString().slice(0, 8)
    const recordedByUser = decoded.email || decoded.userId || decoded.staffId || 'system'

    try {
      const payment = await createPayment(
        tenantId,
        studentId,
        feeAssignmentId,
        '',
        amount,
        paymentMethod,
        referenceNumber || effectiveReceiptNumber,
        effectiveReceiptNumber,
        effectivePaymentDate,
        effectivePaymentTime,
        recordedByUser,
        notes
      )

      // Surface the recorded payment in the pending queue for confirmation
      try {
        await ensureAdminNotificationsTable()
        await createAdminNotification(
          tenantId,
          'payment_pending',
          payment.id,
          studentId,
          undefined,
          amount,
          { paymentMethod, recordedBy: recordedByUser, notes }
        )
      } catch (notifyErr) {
        console.error('Payment notification failed:', notifyErr)
      }

      return res.status(201).json({ data: payment })
    } catch (error) {
      if (error instanceof PaymentValidationError) {
        return res.status(400).json({ error: error.message })
      }
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
          amount,
          paymentMethod,
          referenceNumber,
          receiptNumber,
          paymentDate,
          paymentTime,
          notes,
        } = payment

        const missing: string[] = []
        if (!studentId) missing.push('studentId')
        if (!feeAssignmentId) missing.push('feeAssignmentId')
        if (amount === undefined) missing.push('amount')
        if (!paymentMethod) missing.push('paymentMethod')

        if (missing.length > 0) {
          return res.status(400).json({ error: 'Missing required fields in payment', details: missing })
        }

        if (amount <= 0) {
          return res.status(400).json({ error: 'amount must be greater than 0' })
        }

        const now = new Date()
        const result = await createPayment(
          tenantId,
          studentId,
          feeAssignmentId,
          '',
          amount,
          paymentMethod,
          referenceNumber || `RCP-${now.getTime()}`,
          receiptNumber || `RCP-${now.getTime()}`,
          paymentDate || now.toISOString().split('T')[0],
          paymentTime || now.toTimeString().slice(0, 8),
          decoded.email || decoded.userId || decoded.staffId || 'system',
          notes
        )
        created.push(result)
      }

      return res.status(201).json({ data: created })
    } catch (error) {
      if (error instanceof PaymentValidationError) {
        return res.status(400).json({ error: error.message })
      }
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
