import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireAuth } from '../_lib/auth-middleware.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireAuth(req, res)
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const userId = decoded.userId || decoded.sub || 'system'
  const userRole = decoded.role

  try {
    if (req.method === 'GET') {
      const { requestId, parentId } = req.query
      let result
      if (requestId) {
        result = await sql`
          SELECT * FROM private_lesson_payments
          WHERE request_id = ${requestId as string} AND tenant_id = ${tenantId}
          ORDER BY created_at DESC
        `
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
      if (!existing.rows[0]) {
        return res.status(404).json({ error: 'Payment not found' })
      }

      const paidAt = paymentStatus === 'paid' ? new Date().toISOString() : null
      const result = await sql`
        UPDATE private_lesson_payments SET
          payment_status = COALESCE(${paymentStatus || null}, payment_status),
          payment_method = COALESCE(${paymentMethod || null}, payment_method),
          transaction_ref = COALESCE(${transactionRef || null}, transaction_ref),
          paid_at = ${paymentStatus === 'paid' ? new Date().toISOString() : null},
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `

      // If paid, update request status to scheduled
      if (paymentStatus === 'paid' && existing.rows[0].request_id) {
        await sql`
          UPDATE private_lesson_requests SET
            status = 'scheduled',
            updated_at = NOW()
          WHERE id = ${existing.rows[0].request_id}
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
              'private_lesson_request', ${existing.rows[0].request_id}
            FROM private_lesson_requests plr WHERE plr.id = ${existing.rows[0].request_id}
          `
        } catch {}
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
