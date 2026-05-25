import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { extractTokenFromHeader, extractParentInfoFromJWT, verifyParentChildRelationship } from '../../src/lib/parentAuth'

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
    const token = extractTokenFromHeader(req.headers.authorization)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' })
    }

    const parentInfo = extractParentInfoFromJWT(token)
    if (!parentInfo) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    const childId = req.query.childId as string
    const limit = parseInt(req.query.limit as string) || 20

    if (!childId) {
      return res.status(400).json({ error: 'Bad request: childId is required' })
    }

    if (!verifyParentChildRelationship(parentInfo.parentId, childId, parentInfo.childrenIds)) {
      return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
    }

    const convResult = await sql`
      SELECT pm.id::text, pm.subject, pm.body AS last_message,
             pm.created_at::date::text AS last_message_date, pm.is_read,
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
        teacher: { id: r.teacher_id, name: r.teacher_name, subject: r.teacher_subject, email: r.teacher_email },
        subject: r.subject, lastMessage: r.last_message, lastMessageDate: r.last_message_date,
        isRead: r.is_read, messageCount: 1,
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
    const token = extractTokenFromHeader(req.headers.authorization)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' })
    }

    const parentInfo = extractParentInfoFromJWT(token)
    if (!parentInfo) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    const { childId, teacherId, subject, body } = req.body

    if (!childId || !teacherId || !subject || !body) {
      return res.status(400).json({ error: 'Bad request: Missing required fields' })
    }

    if (!verifyParentChildRelationship(parentInfo.parentId, childId, parentInfo.childrenIds)) {
      return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
    }

    const msgId = `pm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    await sql`
      INSERT INTO parent_messages (id, parent_id, staff_id, child_id, subject, body, is_read, created_at)
      VALUES (${msgId}, ${parentInfo.parentId}, ${teacherId}, ${childId}, ${subject}, ${body}, false, NOW())
    `
    return res.status(201).json({
      id: msgId, sender: parentInfo.parentId, senderRole: 'parent' as const,
      body, date: new Date().toISOString(), attachments: [],
    })
  } catch (error) {
    console.error('Error sending message:', error)
    return res.status(500).json({ error: 'Failed to send message' })
  }
}
