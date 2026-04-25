import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  createPayment,
  getPayments,
  getPaymentById,
  updatePaymentStatus,
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id, action } = req.query

  // GET /api/tenant/finance/payments
  if (req.method === 'GET' && !id) {
    const { feeAssignmentId, paymentDate, status } = req.query
    try {
      const payments = await getPayments(
        feeAssignmentId as string | undefined,
        paymentDate as string | undefined,
        status as string | undefined
      )
      return res.status(200).json({ data: payments })
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

  // POST /api/tenant/finance/payments
  if (req.method === 'POST' && !id && !action) {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const {
      feeAssignmentId,
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
    if (!feeAssignmentId) missing.push('feeAssignmentId')
    if (amount === undefined) missing.push('amount')
    if (!paymentMethod) missing.push('paymentMethod')
    if (!referenceNumber) missing.push('referenceNumber')
    if (!receiptNumber) missing.push('receiptNumber')
    if (!paymentDate) missing.push('paymentDate')
    if (!paymentTime) missing.push('paymentTime')
    if (!recordedBy) missing.push('recordedBy')

    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing required fields', details: missing })
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'amount must be greater than 0' })
    }

    try {
      const payment = await createPayment(
        feeAssignmentId,
        amount,
        paymentMethod,
        referenceNumber,
        receiptNumber,
        paymentDate,
        paymentTime,
        recordedBy,
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
          feeAssignmentId,
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
        if (!feeAssignmentId) missing.push('feeAssignmentId')
        if (amount === undefined) missing.push('amount')
        if (!paymentMethod) missing.push('paymentMethod')
        if (!referenceNumber) missing.push('referenceNumber')
        if (!receiptNumber) missing.push('receiptNumber')
        if (!paymentDate) missing.push('paymentDate')
        if (!paymentTime) missing.push('paymentTime')
        if (!recordedBy) missing.push('recordedBy')

        if (missing.length > 0) {
          return res.status(400).json({ error: 'Missing required fields in payment', details: missing })
        }

        if (amount <= 0) {
          return res.status(400).json({ error: 'amount must be greater than 0' })
        }

        const result = await createPayment(
          feeAssignmentId,
          amount,
          paymentMethod,
          referenceNumber,
          receiptNumber,
          paymentDate,
          paymentTime,
          recordedBy,
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

      // Return receipt data (in a real app, this would generate a PDF)
      const receipt = {
        receiptNumber: payment.receiptNumber,
        paymentDate: payment.paymentDate,
        paymentTime: payment.paymentTime,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        referenceNumber: payment.referenceNumber,
        recordedBy: payment.recordedBy,
        notes: payment.notes,
      }

      return res.status(200).json({ data: receipt })
    } catch (error) {
      console.error('Error generating receipt:', error)
      return res.status(500).json({ error: 'Failed to generate receipt' })
    }
  }

  return methodNotAllowed(res)
}
