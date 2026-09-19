import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireAuth } from '../_lib/auth-middleware.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireAuth(req, res)
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  // Parent tokens carry parentId (not userId) — normalize so 'system' is never used
  const userId = decoded.userId || decoded.parentId || decoded.staffId || decoded.studentId || decoded.sub || 'system'
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
            SELECT plr.*, t.name as teacher_name, s.name as subject_name,
              (SELECT array_agg(st.name ORDER BY st.name) FROM students st
               WHERE st.id::text = ANY(plr.student_ids)) AS student_names
            FROM private_lesson_requests plr
            LEFT JOIN staff t ON t.id = plr.teacher_id
            LEFT JOIN subjects s ON s.id::text = plr.subject_id
            WHERE plr.tenant_id = ${tenantId} AND plr.status = ${status as string}
            ORDER BY plr.created_at DESC
          `
        } else {
          result = await sql`
            SELECT plr.*, t.name as teacher_name, s.name as subject_name,
              (SELECT array_agg(st.name ORDER BY st.name) FROM students st
               WHERE st.id::text = ANY(plr.student_ids)) AS student_names
            FROM private_lesson_requests plr
            LEFT JOIN staff t ON t.id = plr.teacher_id
            LEFT JOIN subjects s ON s.id::text = plr.subject_id
            WHERE plr.tenant_id = ${tenantId}
            ORDER BY plr.created_at DESC
          `
        }
      } else if (userRole === 'staff') {
        // Teacher sees their own requests
        result = await sql`
          SELECT plr.*, t.name as teacher_name, s.name as subject_name,
            (SELECT array_agg(st.name ORDER BY st.name) FROM students st
             WHERE st.id::text = ANY(plr.student_ids)) AS student_names
          FROM private_lesson_requests plr
          LEFT JOIN staff t ON t.id = plr.teacher_id
          LEFT JOIN subjects s ON s.id::text = plr.subject_id
          WHERE plr.tenant_id = ${tenantId} AND plr.teacher_id = ${userId}
          ORDER BY plr.created_at DESC
        `
      } else if (userRole === 'parent') {
        // Parent sees requests covering their own children (via parent_students link)
        result = await sql`
          SELECT plr.*, t.name as teacher_name, s.name as subject_name,
            (SELECT array_agg(st.name ORDER BY st.name) FROM students st
             WHERE st.id::text = ANY(plr.student_ids)) AS student_names
          FROM private_lesson_requests plr
          LEFT JOIN staff t ON t.id = plr.teacher_id
          LEFT JOIN subjects s ON s.id::text = plr.subject_id
          WHERE plr.tenant_id = ${tenantId}
            AND plr.student_ids && COALESCE(
              (SELECT array_agg(ps.student_id) FROM parent_students ps
               WHERE ps.parent_id = ${userId} AND ps.tenant_id = ${tenantId}),
              '{}'::text[])
          ORDER BY plr.created_at DESC
        `
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
      if (!Array.isArray(studentIds) || !studentIds.length || !purpose || !proposedSchedule) {
        return res.status(400).json({ error: 'studentIds (array), purpose, and proposedSchedule are required' })
      }

      // Validate all students exist in this tenant
      const validStudents = await sql`
        SELECT id FROM students
        WHERE id::text = ANY(${studentIds}) AND tenant_id = ${tenantId}
      `
      if (validStudents.rows.length !== studentIds.length) {
        return res.status(400).json({ error: 'One or more student IDs are invalid' })
      }

      // Enforce max private lessons per student per week
      const settingsRes = await sql`
        SELECT max_private_lessons_per_week FROM virtual_learning_settings WHERE tenant_id = ${tenantId}
      `
      const maxPerWeek = settingsRes.rows[0]?.max_private_lessons_per_week ?? 3
      if (maxPerWeek > 0) {
        const weekCount = await sql`
          SELECT COUNT(*)::int AS n FROM private_lesson_requests
          WHERE tenant_id = ${tenantId}
            AND status NOT IN ('cancelled', 'rejected', 'declined')
            AND student_ids && ${studentIds}
            AND created_at >= date_trunc('week', NOW())
        `
        if ((weekCount.rows[0]?.n || 0) >= maxPerWeek) {
          return res.status(400).json({
            error: `Weekly private lesson limit reached (${maxPerWeek} per student per week)`,
          })
        }
      }

      // Calculate fee from rate card — prefer a subject-specific rate, else the global one
      let feeAmount: number | null = null
      let feeCurrency = 'NGN'
      let paymentMode = 'direct_payment'
      try {
        const rateResult = await sql`
          SELECT * FROM private_lesson_rates
          WHERE tenant_id = ${tenantId} AND is_active = true
            AND (subject_id IS NULL OR subject_id = ${subjectId || null})
          ORDER BY (subject_id IS NOT NULL) DESC, created_at DESC
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

      // Notify all tenant admins (staff with admin/principal roles)
      try {
        await sql`
          INSERT INTO virtual_learning_notifications (
            tenant_id, user_id, user_role, type, title, message,
            related_entity_type, related_entity_id
          )
          SELECT ${tenantId}, s.id, 'tenant_admin', 'approval_request',
            'New private lesson request',
            ${`Private lesson request for ${studentIds.length} student(s): ${purpose}`},
            'private_lesson_request', ${result.rows[0].id}
          FROM staff s
          WHERE s.tenant_id = ${tenantId}
            AND (LOWER(s.role) LIKE '%admin%' OR LOWER(s.role) LIKE '%principal%')
        `
      } catch (err) {
        console.warn('Failed to notify admins of private lesson request:', err)
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

        // Notify the parents of the students on this request (respects auto_notify_parents)
        try {
          const notifySetting = await sql`
            SELECT auto_notify_parents FROM virtual_learning_settings WHERE tenant_id = ${tenantId}
          `.catch(() => ({ rows: [] as any[] }))
          const autoNotify = notifySetting.rows[0]?.auto_notify_parents !== false
          if (autoNotify) {
            await sql`
            INSERT INTO virtual_learning_notifications (
              tenant_id, user_id, user_role, type, title, message,
              related_entity_type, related_entity_id
            )
            SELECT ${tenantId}, ps.parent_id, 'parent', 'approval_request',
              'Private lesson approval needed',
              ${`A private lesson has been approved by admin. Fee: ${finalFee} ${request.fee_currency}. Please review and approve.`},
              'private_lesson_request', ${id}
            FROM parent_students ps
            WHERE ps.tenant_id = ${tenantId} AND ps.student_id = ANY(${request.student_ids || []})
          `
          }
        } catch (err) {
          // QUAL-02: best-effort notification — log but don't fail the request
          console.warn('Failed to insert approval notification:', err);
        }

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
        // Verify via parent_students that this parent owns a student on the request
        const owned = await sql`
          SELECT ps.student_id FROM parent_students ps
          WHERE ps.parent_id = ${userId} AND ps.tenant_id = ${tenantId}
            AND ps.student_id = ANY(${request.student_ids || []})
          LIMIT 1
        `
        const ownedStudentId = owned.rows[0]?.student_id
        if (!ownedStudentId) {
          return res.status(403).json({ error: 'You can only approve requests for your own children' })
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
                ${tenantId}, ${id}, ${userId}, ${ownedStudentId},
                ${request.fee_amount}, ${request.fee_currency}, ${request.payment_mode}, 'pending'
              )
            `
          } catch (err) {
            // QUAL-02: best-effort payment record — log but don't fail approval
            console.warn('Failed to create private lesson payment record:', err);
          }
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
        } catch (err) {
          // QUAL-02: best-effort notification — log but don't fail approval
          console.warn('Failed to notify teacher of parent approval:', err);
        }

        return res.status(200).json({ data: result.rows[0] })
      }

      // Parent decline
      if (action === 'parent_decline') {
        if (userRole !== 'parent') {
          return res.status(403).json({ error: 'Only parents can decline for their children' })
        }
        const owned = await sql`
          SELECT 1 FROM parent_students ps
          WHERE ps.parent_id = ${userId} AND ps.tenant_id = ${tenantId}
            AND ps.student_id = ANY(${request.student_ids || []})
          LIMIT 1
        `
        if (!owned.rows[0]) {
          return res.status(403).json({ error: 'You can only decline requests for your own children' })
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
        } catch (err) {
          // QUAL-02: best-effort notification — log but don't fail decline
          console.warn('Failed to notify teacher of parent decline:', err);
        }

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
