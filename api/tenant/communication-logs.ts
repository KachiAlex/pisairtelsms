import { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeDatabase, query, queryOne } from './cbt/_lib/db.js'
import { requireRole } from '../_lib/auth-middleware.js'

interface CommunicationLog {
  id: string
  type: 'announcement' | 'notification' | 'message'
  recipient: string
  channel: 'email' | 'sms' | 'in-app' | 'push'
  sentAt: string
  deliveredAt: string | null
  readAt: string | null
  status: 'sent' | 'delivered' | 'read' | 'failed'
  errorMessage: string | null
  createdAt: string
}

async function initializeTable() {
  try {
    initializeDatabase()
    await query(`
      CREATE TABLE IF NOT EXISTS communication_logs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        recipient TEXT NOT NULL,
        channel TEXT NOT NULL,
        sent_at TIMESTAMP WITH TIME ZONE,
        delivered_at TIMESTAMP WITH TIME ZONE,
        read_at TIMESTAMP WITH TIME ZONE,
        status TEXT DEFAULT 'sent',
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)
  } catch (err) {
    console.error('communication_logs init error:', err)
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
      const { type, channel, status, recipient, startDate, endDate } = req.query

      let sql = 'SELECT * FROM communication_logs WHERE 1=1'
      const params: any[] = []
      let p = 0

      if (type) {
        p++; sql += ` AND type = $${p}`; params.push(type)
      }
      if (channel) {
        p++; sql += ` AND channel = $${p}`; params.push(channel)
      }
      if (status) {
        p++; sql += ` AND status = $${p}`; params.push(status)
      }
      if (recipient) {
        p++; sql += ` AND recipient ILIKE $${p}`; params.push(`%${recipient}%`)
      }
      if (startDate) {
        p++; sql += ` AND sent_at >= $${p}`; params.push(startDate)
      }
      if (endDate) {
        p++; sql += ` AND sent_at <= $${p}`; params.push(endDate)
      }
      sql += ' ORDER BY sent_at DESC LIMIT 100'

      const result = await query(sql, params)
      res.status(200).json({ data: result.rows || [] })
    } catch (err) {
      console.error('Error fetching communication logs:', err)
      res.status(500).json({ error: 'Failed to fetch communication logs' })
    }
  } else if (req.method === 'POST') {
    try {
      const { type, recipient, channel, status, errorMessage } = req.body

      if (!type || !recipient || !channel) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      const id = `log_${Date.now()}`
      const now = new Date().toISOString()
      const deliveredAt = status === 'delivered' || status === 'read' ? now : null
      const readAtVal = status === 'read' ? now : null
      const statusVal = status || 'sent'

      const result = await query(
        `INSERT INTO communication_logs (id, type, recipient, channel, sent_at, delivered_at, read_at, status, error_message, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [id, type, recipient, channel, now, deliveredAt, readAtVal, statusVal, errorMessage || null, now]
      )

      res.status(201).json({ data: result.rows[0] })
    } catch (err) {
      console.error('Error creating communication log:', err)
      res.status(500).json({ error: 'Failed to create communication log' })
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, status, deliveredAt, readAt } = req.body

      if (!id) {
        return res.status(400).json({ error: 'Log ID is required' })
      }

      const fields: string[] = []
      const values: any[] = []
      let p = 0

      if (status !== undefined) {
        p++; fields.push(`status = $${p}`); values.push(status)
      }
      if (deliveredAt !== undefined) {
        p++; fields.push(`delivered_at = $${p}`); values.push(deliveredAt)
      }
      if (readAt !== undefined) {
        p++; fields.push(`read_at = $${p}`); values.push(readAt)
      }
      if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' })
      }
      p++; fields.push(`updated_at = $${p}`); values.push(new Date().toISOString())
      p++; values.push(id)

      const result = await query(
        `UPDATE communication_logs SET ${fields.join(', ')} WHERE id = $${p} RETURNING *`,
        values
      )

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: 'Log not found' })
      }

      res.status(200).json({ data: result.rows[0] })
    } catch (err) {
      console.error('Error updating communication log:', err)
      res.status(500).json({ error: 'Failed to update communication log' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
