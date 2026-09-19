import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireAuth } from '../_lib/auth-middleware.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireAuth(req, res)
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  // Parent tokens carry parentId (not userId) — normalize
  const userId = decoded.userId || decoded.parentId || decoded.staffId || decoded.studentId || decoded.sub || 'system'
  const userRole = decoded.role

  try {
    if (req.method === 'GET') {
      const { requestId, parentId } = req.query
      let result
      if (requestId) {
        if (userRole === 'tenant_admin') {
          result = await sql`
            SELECT * FROM private_lesson_payments
            WHERE request_id = ${requestId as string} AND tenant_id = ${tenantId}
            ORDER BY created_at DESC
          `
        } else if (userRole === 'parent') {
          result = await sql`
            SELECT * FROM private_lesson_payments
            WHERE request_id = ${requestId as string} AND tenant_id = ${tenantId}
              AND parent_id = ${userId}
            ORDER BY created_at DESC
          `
        } else {
          return res.status(403).json({ error: 'Not authorized' })
        }
      } else if (userRole === 'parent') {
        result = await sql`
          SELECT * FROM private_lesson_payments
          WHERE parent_id = ${userId} AND tenant_id = ${tenantId}
          ORDER BY created_at DESC
        `
      } else if (userRole === 'tenant_admin') {
        result = await sql`
          SELECT * FROM private_lesson_payments
          WHERE tenant_id = ${tenantId}
          ORDER BY created_at DESC
        `
      } else {
        return res.status(403).json({ error: 'Not authorized' })
      }
      return res.status(200).json({ data: result.rows })
    }

    if (req.method === 'PUT') {
      const { id, paymentStatus, paymentMethod, transactionRef } = req.body || {}
      if (!id) {
        return res.status(400).json({ error: 'id is required' })
      }

      const existing = await sql`
        SELECT * FROM private_lesson_payments WHERE id = ${id} AND tenant_id = ${tenantId}
      `
      const existingPayment = existing.rows[0]
      if (!existingPayment) {
        return res.status(404).json({ error: 'Payment not found' })
      }

      // Authorization: tenant_admin can edit anything; the owning parent may
      // only confirm their own payment (e.g. marking a manual transfer paid).
      const isAdmin = userRole === 'tenant_admin'
      const isOwnerParent = userRole === 'parent' && existingPayment.parent_id === userId
      if (!isAdmin && !(isOwnerParent && paymentStatus === 'paid')) {
        return res.status(403).json({ error: 'Not authorized to update this payment' })
      }

      // Don't wipe an existing paid_at when editing other fields or when
      // re-confirming an already-paid record.
      const paidAt = paymentStatus === 'paid'
        ? (existingPayment.paid_at || new Date().toISOString())
        : paymentStatus
          ? null
          : existingPayment.paid_at
      const result = await sql`
        UPDATE private_lesson_payments SET
          payment_status = COALESCE(${paymentStatus || null}, payment_status),
          payment_method = COALESCE(${paymentMethod || null}, payment_method),
          transaction_ref = COALESCE(${transactionRef || null}, transaction_ref),
          paid_at = ${paidAt},
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `

      // If paid, update request status to scheduled
      if (paymentStatus === 'paid' && existingPayment.request_id) {
        await sql`
          UPDATE private_lesson_requests SET
            status = 'scheduled',
            updated_at = NOW()
          WHERE id = ${existingPayment.request_id} AND tenant_id = ${tenantId}
        `

        // Notify teacher
        try {
          await sql`
            INSERT INTO virtual_learning_notifications (
              tenant_id, user_id, user_role, type, title, message,
              related_entity_type, related_entity_id
            )
            SELECT ${tenantId}, plr.teacher_id, 'staff', 'payment_confirmed',
              'Payment confirmed for private lesson',
              ${`Payment has been confirmed. You can now schedule and host the lesson.`},
              'private_lesson_request', ${existingPayment.request_id}
            FROM private_lesson_requests plr
            WHERE plr.id = ${existingPayment.request_id} AND plr.tenant_id = ${tenantId}
          `
        } catch (err) {
          // QUAL-02: best-effort notification — log but don't fail the payment
          console.warn('Failed to insert payment notification:', err);
        }
      }

      return res.status(200).json({ data: result.rows[0] })
    }

    res.setHeader('Allow', 'GET,PUT')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('[private-lesson-payments]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}
