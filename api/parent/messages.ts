import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../_lib/auth-middleware.js'
import { verifyParentChildRelationship } from '../../src/lib/parentAuth'

const VIOLATION_ALERT_THRESHOLD = 5

async function ensureParentChildViolationTable() {
  }

async function logParentChildViolation(parentId: string | undefined, childId: string | null, context: string, tenantId?: string) {
  await ensureParentChildViolationTable()
  const result = await sql`
    INSERT INTO parent_child_violations (parent_id, child_id, context, attempts)
    VALUES (${parentId}, ${childId}, ${context}, 1)
    ON CONFLICT (parent_id, child_id, context) DO UPDATE SET
      attempts = parent_child_violations.attempts + 1,
      last_attempt = NOW()
    RETURNING attempts`

  const attempts = (result.rows[0]?.attempts ?? 1) as number
  if (attempts >= VIOLATION_ALERT_THRESHOLD) {
    const message = `Parent-child verification failed ${attempts} times for ${parentId}:${childId} (${context})`
    console.warn(message)
    await sendViolationAlert(parentId, childId, context, attempts, message, tenantId)
  }
}

async function sendViolationAlert(
  parentId: string | undefined,
  childId: string | null,
  context: string,
  attempts: number,
  message: string,
  tenantId?: string
) {
  // Try tenant-specific webhook first, fallback to global
  let webhookUrl: string | null = null
  
  if (tenantId) {
    try {
      const tenantResult = await sql`
        SELECT security_webhook_url FROM tenants WHERE id = ${tenantId}
      `
      webhookUrl = tenantResult.rows[0]?.security_webhook_url || null
    } catch {
      // Ignore tenant lookup errors, fallback to global
    }
  }
  
  webhookUrl = webhookUrl || process.env.PARENT_CHILD_VIOLATION_WEBHOOK || null
  if (!webhookUrl) return

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId, childId, context, attempts, message, tenantId, timestamp: new Date().toISOString() }),
    })
  } catch (error) {
    console.warn('Failed to notify violation webhook:', error)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res)
  } else if (req.method === 'POST') {
    return handlePost(req, res)
  } else {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    const decoded = await requireRole(req, res, ['parent'])
    if (!decoded) return
    if (!decoded.parentId) {
      return res.status(401).json({ error: 'Unauthorized: Missing parentId claim' })
    }

    const parentInfo = { parentId: decoded.parentId, childrenIds: decoded.childrenIds || [], role: decoded.role }

    const childIdParam = req.query.childId
    if (Array.isArray(childIdParam)) {
      return res.status(400).json({ error: 'Bad request: childId must be a single value' })
    }
    if (typeof childIdParam !== 'string' || !childIdParam.trim()) {
      return res.status(400).json({ error: 'Bad request: childId is required' })
    }
    const childId = childIdParam as string
    const limit = parseInt(req.query.limit as string) || 20

    if (!childId) {
      return res.status(400).json({ error: 'Bad request: childId is required' })
    }

    if (!verifyParentChildRelationship(parentInfo.parentId, childId, parentInfo.childrenIds)) {
      logParentChildViolation(parentInfo.parentId, childId, 'GET /parent/messages', decoded.tenantId)
      return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
    }

    const convResult = await sql`
      SELECT pm.id::text, pm.subject, pm.body AS last_message,
             pm.created_at::text AS last_message_date, pm.is_read,
             st.id::text AS teacher_id, st.name AS teacher_name,
             COALESCE(st.email, '') AS teacher_email,
             COALESCE((SELECT subject FROM timetable WHERE staff_id = st.id LIMIT 1), '') AS teacher_subject
      FROM parent_messages pm
      JOIN staff st ON st.id = pm.staff_id
      WHERE pm.parent_id = ${parentInfo.parentId}
      ORDER BY pm.created_at DESC LIMIT ${limit}
    `

    const childRow = await sql`SELECT class FROM students WHERE id = ${childId} AND deleted_at IS NULL LIMIT 1`
    const studentClass = childRow.rows[0]?.class ?? ''

    const teachersResult = await sql`
      SELECT DISTINCT st.id::text, st.name, COALESCE(st.email, '') AS email,
             COALESCE((SELECT tt.subject FROM timetable tt WHERE tt.staff_id = st.id AND tt.class_name LIKE ${studentClass + '%'} LIMIT 1), '') AS subject
      FROM staff st
      JOIN timetable tt ON tt.staff_id = st.id AND tt.class_name LIKE ${studentClass + '%'}
      ORDER BY st.name LIMIT 20
    `

    return res.status(200).json({
      conversations: convResult.rows.map(r => ({
        id: r.id,
        teacherId: r.teacher_id,
        teacherName: r.teacher_name,
        subject: r.teacher_subject || r.subject || 'Teacher conversation',
        lastMessage: r.last_message || '',
        lastMessageTime: r.last_message_date || new Date().toISOString(),
        unreadCount: r.is_read ? 0 : 1,
        messages: r.last_message
          ? [
              {
                id: `${r.id}_last`,
                senderId: 'teacher',
                content: r.last_message,
                timestamp: r.last_message_date || new Date().toISOString(),
              },
            ]
          : [],
      })),
      availableTeachers: teachersResult.rows.map(r => ({ id: r.id, name: r.name, subject: r.subject, email: r.email })),
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return res.status(500).json({ error: 'Failed to fetch messages' })
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
    const decoded = await requireRole(req, res, ['parent'])
    if (!decoded) return

    const parentInfo = { parentId: decoded.parentId, childrenIds: decoded.childrenIds || [], role: decoded.role }

    const { conversationId, teacherId, childId, content } = req.body
    const sanitizedChildId = typeof childId === 'string' && childId.trim() ? childId : null
    if (!sanitizedChildId || !content) {
      return res.status(400).json({ error: 'Bad request: Missing required fields' })
    }
    const safeChildId = sanitizedChildId

    if (!verifyParentChildRelationship(parentInfo.parentId, safeChildId, parentInfo.childrenIds)) {
      logParentChildViolation(parentInfo.parentId, sanitizedChildId, 'POST /parent/messages', decoded.tenantId)
      return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
    }

    let targetTeacherId = teacherId
    if (conversationId) {
      const existing = await sql`
        SELECT staff_id FROM parent_messages WHERE id = ${conversationId} LIMIT 1
      `
      if (!existing.rows[0]) {
        return res.status(404).json({ error: 'Conversation not found' })
      }
      targetTeacherId = existing.rows[0].staff_id
    }

    if (!targetTeacherId) {
      return res.status(400).json({ error: 'Teacher ID is required when starting a conversation' })
    }

    const childRow = await sql`
      SELECT class FROM students WHERE id = ${safeChildId} AND deleted_at IS NULL LIMIT 1
    `
    const studentClass = childRow.rows[0]?.class ?? ''

    const subjectResult = await sql`
      SELECT COALESCE((SELECT subject FROM timetable tt WHERE tt.staff_id = ${targetTeacherId} AND tt.class_name LIKE ${studentClass + '%'} LIMIT 1), '') AS subject
    `
    const conversationSubject = subjectResult.rows[0]?.subject || 'Teacher conversation'

    const now = new Date().toISOString()
    const messageId = conversationId || `pm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`

    await sql`
      INSERT INTO parent_messages (id, parent_id, staff_id, child_id, subject, body, is_read, created_at)
      VALUES (${messageId}, ${parentInfo.parentId}, ${targetTeacherId}, ${safeChildId}, ${conversationSubject}, ${content}, false, ${now})
      ON CONFLICT (id) DO UPDATE SET
        subject = EXCLUDED.subject,
        body = EXCLUDED.body,
        child_id = EXCLUDED.child_id,
        staff_id = EXCLUDED.staff_id,
        is_read = FALSE,
        created_at = EXCLUDED.created_at
    `

    return res.status(200).json({
      id: messageId,
      senderId: 'parent',
      senderName: parentInfo.parentId,
      content,
      timestamp: now,
    })
  } catch (error) {
    console.error('Error sending message:', error)
    return res.status(500).json({ error: 'Failed to send message' })
  }
}
