import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole, requireAuth } from '../_lib/auth-middleware.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireAuth(req, res)
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const userId = decoded.userId || decoded.sub || 'system'
  const userRole = decoded.role

  try {
    // GET - list requests (filtered by role)
    if (req.method === 'GET') {
      const { status, teacherId, studentId } = req.query
      let result

      if (userRole === 'tenant_admin') {
        // Admin sees all requests
        if (status) {
          result = await sql`
            SELECT plr.*, t.name as teacher_name, s.name as subject_name
            FROM private_lesson_requests plr
            LEFT JOIN staff t ON t.id = plr.teacher_id
            LEFT JOIN subjects s ON s.id = plr.subject_id
            WHERE plr.tenant_id = ${tenantId} AND plr.status = ${status as string}
            ORDER BY plr.created_at DESC
          `
        } else {
          result = await sql`
            SELECT plr.*, t.name as teacher_name, s.name as subject_name
            FROM private_lesson_requests plr
            LEFT JOIN staff t ON t.id = plr.teacher_id
            LEFT JOIN subjects s ON s.id = plr.subject_id
            WHERE plr.tenant_id = ${tenantId}
            ORDER BY plr.created_at DESC
          `
        }
      } else if (userRole === 'staff') {
        // Teacher sees their own requests
        result = await sql`
          SELECT plr.*, t.name as teacher_name, s.name as subject_name
          FROM private_lesson_requests plr
          LEFT JOIN staff t ON t.id = plr.teacher_id
          LEFT JOIN subjects s ON s.id = plr.subject_id
          WHERE plr.tenant_id = ${tenantId} AND plr.teacher_id = ${userId}
          ORDER BY plr.created_at DESC
        `
      } else if (userRole === 'parent') {
        // Parent sees requests for their children
        result = await sql`
          SELECT plr.*, t.name as teacher_name, s.name as subject_name
          FROM private_lesson_requests plr
          LEFT JOIN staff t ON t.id = plr.teacher_id
          LEFT JOIN subjects s ON s.id = plr.subject_id
          WHERE plr.tenant_id = ${tenantId}
            AND ${userId} = ANY(string_to_array(array_to_string(plr.student_ids, ','), ',')::text[])
          ORDER BY plr.created_at DESC
        `
        // Fallback: parent sees all pending_parent requests if student_ids match fails
        if (!result.rows.length) {
          result = await sql`
            SELECT plr.*, t.name as teacher_name, s.name as subject_name
            FROM private_lesson_requests plr
            LEFT JOIN staff t ON t.id = plr.teacher_id
            LEFT JOIN subjects s ON s.id = plr.subject_id
            WHERE plr.tenant_id = ${tenantId} AND plr.parent_status = 'pending'
            ORDER BY plr.created_at DESC
          `
        }
      } else {
        return res.status(403).json({ error: 'Not authorized to view private lesson requests' })
      }

      return res.status(200).json({ data: result.rows })
    }

    // POST - create request (teachers only)
    if (req.method === 'POST') {
      if (userRole !== 'staff' && userRole !== 'tenant_admin') {
        return res.status(403).json({ error: 'Only teachers can request private lessons' })
      }
      const { studentIds, subjectId, classroomId, purpose, proposedSchedule, durationMinutes, numSessions } = req.body || {}
      if (!studentIds || !studentIds.length || !purpose || !proposedSchedule) {
        return res.status(400).json({ error: 'studentIds, purpose, and proposedSchedule are required' })
      }

      // Calculate fee from rate card
      let feeAmount: number | null = null
      let feeCurrency = 'NGN'
      let paymentMode = 'direct_payment'
      try {
        const rateResult = await sql`
          SELECT * FROM private_lesson_rates
          WHERE tenant_id = ${tenantId} AND is_active = true
          ORDER BY (subject_id = ${subjectId || null}) DESC, subject_id NULLS LAST
          LIMIT 1
        `
        if (rateResult.rows[0]) {
          const rate = rateResult.rows[0]
          feeCurrency = rate.currency || 'NGN'
          paymentMode = rate.payment_mode || 'direct_payment'
          const duration = durationMinutes || 60
          if (rate.rate_type === 'per_session') {
            feeAmount = rate.amount * (numSessions || 1)
          } else if (rate.rate_type === 'per_hour') {
            feeAmount = rate.amount * (duration / 60) * (numSessions || 1)
          } else {
            feeAmount = rate.amount * (numSessions || 1)
          }
        }
      } catch {
        // Rate card not set up yet — fee will be null until admin confirms
      }

      const result = await sql`
        INSERT INTO private_lesson_requests (
          tenant_id, teacher_id, student_ids, subject_id, classroom_id,
          purpose, proposed_schedule, duration_minutes, num_sessions,
          fee_amount, fee_currency, payment_mode, status
        )
        VALUES (
          ${tenantId}, ${userId}, ${studentIds}, ${subjectId || null}, ${classroomId || null},
          ${purpose}, ${proposedSchedule}, ${durationMinutes || 60}, ${numSessions || 1},
          ${feeAmount}, ${feeCurrency}, ${paymentMode}, 'pending_admin'
        )
        RETURNING *
      `

      // Create notification for admin
      try {
        await sql`
          INSERT INTO virtual_learning_notifications (
            tenant_id, user_id, user_role, type, title, message,
            related_entity_type, related_entity_id
          )
          VALUES (
            ${tenantId}, 'admin', 'tenant_admin', 'approval_request',
            'New private lesson request',
            ${`Private lesson request for ${studentIds.length} student(s): ${purpose}`},
            'private_lesson_request', ${result.rows[0].id}
          )
        `
      } catch {
        // Notification is non-critical
      }

      return res.status(201).json({ data: result.rows[0] })
    }

    // PUT - update request (admin approve/reject, parent approve/decline)
    if (req.method === 'PUT') {
      const { id, action, notes, feeAmount, paymentMode } = req.body || {}
      if (!id || !action) {
        return res.status(400).json({ error: 'id and action are required' })
      }

      // Fetch the request first
      const existing = await sql`
        SELECT * FROM private_lesson_requests WHERE id = ${id} AND tenant_id = ${tenantId}
      `
      if (!existing.rows[0]) {
        return res.status(404).json({ error: 'Request not found' })
      }
      const request = existing.rows[0]

      // Admin approval flow
      if (action === 'admin_approve') {
        if (userRole !== 'tenant_admin') {
          return res.status(403).json({ error: 'Only admins can approve requests' })
        }
        const finalFee = feeAmount !== undefined ? feeAmount : request.fee_amount
        const finalPaymentMode = paymentMode || request.payment_mode
        const result = await sql`
          UPDATE private_lesson_requests SET
            admin_status = 'approved',
            admin_approved_by = ${userId},
            admin_approved_at = NOW(),
            admin_notes = ${notes || null},
            fee_amount = ${finalFee},
            payment_mode = ${finalPaymentMode},
            parent_status = 'pending',
            status = 'pending_parent',
            updated_at = NOW()
          WHERE id = ${id} AND tenant_id = ${tenantId}
          RETURNING *
        `

        // Notify parent
        try {
          await sql`
            INSERT INTO virtual_learning_notifications (
              tenant_id, user_id, user_role, type, title, message,
              related_entity_type, related_entity_id
            )
            VALUES (
              ${tenantId}, ${request.student_ids[0] || 'parent'}, 'parent', 'approval_request',
              'Private lesson approval needed',
              ${`A private lesson has been approved by admin. Fee: ${finalFee} ${request.fee_currency}. Please review and approve.`},
              'private_lesson_request', ${id}
            )
          `
        } catch {}

        return res.status(200).json({ data: result.rows[0] })
      }

      // Admin rejection
      if (action === 'admin_reject') {
        if (userRole !== 'tenant_admin') {
          return res.status(403).json({ error: 'Only admins can reject requests' })
        }
        const result = await sql`
          UPDATE private_lesson_requests SET
            admin_status = 'rejected',
            admin_approved_by = ${userId},
            admin_approved_at = NOW(),
            admin_notes = ${notes || null},
            status = 'rejected',
            updated_at = NOW()
          WHERE id = ${id} AND tenant_id = ${tenantId}
          RETURNING *
        `
        return res.status(200).json({ data: result.rows[0] })
      }

      // Parent approval
      if (action === 'parent_approve') {
        if (userRole !== 'parent') {
          return res.status(403).json({ error: 'Only parents can approve for their children' })
        }
        if (request.admin_status !== 'approved') {
          return res.status(400).json({ error: 'Request must be admin-approved first' })
        }
        const result = await sql`
          UPDATE private_lesson_requests SET
            parent_status = 'approved',
            parent_approved_by = ${userId},
            parent_approved_at = NOW(),
            parent_notes = ${notes || null},
            status = 'approved',
            updated_at = NOW()
          WHERE id = ${id} AND tenant_id = ${tenantId}
          RETURNING *
        `

        // Create payment record if fee > 0
        if (request.fee_amount && request.fee_amount > 0) {
          try {
            await sql`
              INSERT INTO private_lesson_payments (
                tenant_id, request_id, parent_id, student_id,
                amount, currency, payment_method, payment_status
              )
              VALUES (
                ${tenantId}, ${id}, ${userId}, ${request.student_ids[0] || userId},
                ${request.fee_amount}, ${request.fee_currency}, ${request.payment_mode}, 'pending'
              )
            `
          } catch {}
        }

        // Notify teacher
        try {
          await sql`
            INSERT INTO virtual_learning_notifications (
              tenant_id, user_id, user_role, type, title, message,
              related_entity_type, related_entity_id
            )
            VALUES (
              ${tenantId}, ${request.teacher_id}, 'staff', 'approval_result',
              'Private lesson approved by parent',
              ${`Your private lesson request has been approved by the parent. You can now schedule the lesson.`},
              'private_lesson_request', ${id}
            )
          `
        } catch {}

        return res.status(200).json({ data: result.rows[0] })
      }

      // Parent decline
      if (action === 'parent_decline') {
        if (userRole !== 'parent') {
          return res.status(403).json({ error: 'Only parents can decline for their children' })
        }
        const result = await sql`
          UPDATE private_lesson_requests SET
            parent_status = 'declined',
            parent_approved_by = ${userId},
            parent_approved_at = NOW(),
            parent_notes = ${notes || null},
            status = 'declined',
            updated_at = NOW()
          WHERE id = ${id} AND tenant_id = ${tenantId}
          RETURNING *
        `

        // Notify teacher
        try {
          await sql`
            INSERT INTO virtual_learning_notifications (
              tenant_id, user_id, user_role, type, title, message,
              related_entity_type, related_entity_id
            )
            VALUES (
              ${tenantId}, ${request.teacher_id}, 'staff', 'approval_result',
              'Private lesson declined by parent',
              ${`Your private lesson request was declined by the parent. Notes: ${notes || 'No notes provided'}`},
              'private_lesson_request', ${id}
            )
          `
        } catch {}

        return res.status(200).json({ data: result.rows[0] })
      }

      // Teacher cancel
      if (action === 'cancel') {
        if (userRole !== 'staff' && userRole !== 'tenant_admin') {
          return res.status(403).json({ error: 'Only the requesting teacher can cancel' })
        }
        const result = await sql`
          UPDATE private_lesson_requests SET
            status = 'cancelled',
            updated_at = NOW()
          WHERE id = ${id} AND tenant_id = ${tenantId} AND teacher_id = ${userId}
          RETURNING *
        `
        if (!result.rows[0]) {
          return res.status(404).json({ error: 'Request not found or not yours' })
        }
        return res.status(200).json({ data: result.rows[0] })
      }

      return res.status(400).json({ error: 'Unknown action' })
    }

    res.setHeader('Allow', 'GET,POST,PUT')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('[private-lesson-requests]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}
