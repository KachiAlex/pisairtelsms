import { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeDatabase, query, queryOne } from './cbt/_lib/db.js'
import { requireRole } from '../_lib/auth-middleware.js'

interface ParentMessage {
  id: string
  parentName: string
  studentName: string
  message: string
  messageType: 'alert' | 'update' | 'request'
  priority: 'normal' | 'urgent'
  sentAt: string
  status: 'sent' | 'read' | 'replied'
  replies: Array<{
    id: string
    message: string
    sentAt: string
    sentBy: string
  }>
  createdAt: string
  updatedAt: string
}

async function initializeTable() {
  try {
    initializeDatabase()
    await query(`
      CREATE TABLE IF NOT EXISTS parent_messages (
        id TEXT PRIMARY KEY,
        parent_name TEXT NOT NULL,
        student_name TEXT NOT NULL,
        message TEXT NOT NULL,
        message_type TEXT DEFAULT 'update',
        priority TEXT DEFAULT 'normal',
        sent_at TIMESTAMP WITH TIME ZONE,
        status TEXT DEFAULT 'sent',
        replies JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)
  } catch (err) {
    console.error('parent_messages init error:', err)
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  await initializeTable()

  if (req.method === 'GET') {
    try {
      const { studentName, status } = req.query

      let sql = 'SELECT * FROM parent_messages WHERE 1=1'
      const params: any[] = []
      let p = 0

      if (studentName) {
        p++; sql += ` AND student_name = $${p}`; params.push(studentName)
      }
      if (status) {
        p++; sql += ` AND status = $${p}`; params.push(status)
      }
      sql += ' ORDER BY created_at DESC'

      const result = await query(sql, params)
      res.status(200).json({ data: result.rows || [] })
    } catch (err) {
      console.error('Error fetching parent messages:', err)
      res.status(500).json({ error: 'Failed to fetch parent messages' })
    }
  } else if (req.method === 'POST') {
    try {
      const { parentName, studentName, message, messageType, priority } = req.body

      if (!parentName || !studentName || !message) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      const id = `msg_${Date.now()}`
      const now = new Date().toISOString()

      const result = await query(
        `INSERT INTO parent_messages (id, parent_name, student_name, message, message_type, priority, sent_at, status, replies, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)
         RETURNING *`,
        [id, parentName, studentName, message, messageType || 'update', priority || 'normal', now, 'sent', '[]', now, now]
      )

      res.status(201).json({ data: result.rows[0] })
    } catch (err) {
      console.error('Error creating parent message:', err)
      res.status(500).json({ error: 'Failed to create parent message' })
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, status, reply } = req.body

      if (!id) {
        return res.status(400).json({ error: 'Message ID is required' })
      }

      if (reply) {
        const newReply = {
          id: `reply_${Date.now()}`,
          message: reply,
          sentAt: new Date().toISOString(),
          sentBy: 'Parent',
        }

        const result = await query(
          `UPDATE parent_messages
           SET replies = replies || $1::jsonb,
               status = 'replied',
               updated_at = $2
           WHERE id = $3
           RETURNING *`,
          [JSON.stringify([newReply]), new Date().toISOString(), id]
        )

        if (!result.rows || result.rows.length === 0) {
          return res.status(404).json({ error: 'Message not found' })
        }

        return res.status(200).json({ data: result.rows[0] })
      }

      const result = await query(
        `UPDATE parent_messages SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *`,
        [status, new Date().toISOString(), id]
      )

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: 'Message not found' })
      }

      res.status(200).json({ data: result.rows[0] })
    } catch (err) {
      console.error('Error updating parent message:', err)
      res.status(500).json({ error: 'Failed to update parent message' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
