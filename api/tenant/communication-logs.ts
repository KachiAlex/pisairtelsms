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

function mapCommunicationLog(row: any): CommunicationLog {
  return {
    id: row.id,
    type: row.type,
    recipient: row.recipient,
    channel: row.channel,
    sentAt: row.sent_at,
    deliveredAt: row.delivered_at,
    readAt: row.read_at,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  }
}

async function initializeTable() {
  try {
    initializeDatabase()

    await query(`
      CREATE TABLE IF NOT EXISTS communication_logs (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
        type TEXT,
        recipient TEXT,
        channel TEXT,
        sent_at TIMESTAMP,
        delivered_at TIMESTAMP,
        read_at TIMESTAMP,
        status TEXT DEFAULT 'sent',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    await query(`
      ALTER TABLE IF EXISTS communication_logs
        ADD COLUMN IF NOT EXISTS tenant_id TEXT,
        ADD COLUMN IF NOT EXISTS type TEXT,
        ADD COLUMN IF NOT EXISTS recipient TEXT,
        ADD COLUMN IF NOT EXISTS channel TEXT,
        ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS read_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS status TEXT,
        ADD COLUMN IF NOT EXISTS error_message TEXT,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP
    `)

    await query('CREATE INDEX IF NOT EXISTS idx_communication_logs_tenant_id ON communication_logs(tenant_id)')
  } catch (err) {
    console.error('communication_logs init error:', err)
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void | VercelResponse> {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  await initializeTable()

  const tenantId = decoded.tenantId || 'default-tenant'

  if (req.method === 'GET') {
    try {
      const { type, channel, status, recipient, startDate, endDate } = req.query

      let sql = 'SELECT * FROM communication_logs WHERE tenant_id = $1'
      const params: any[] = [tenantId]
      let p = 1

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
      res.status(200).json({ data: (result.rows || []).map(mapCommunicationLog) })
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
        `INSERT INTO communication_logs (id, tenant_id, type, recipient, channel, sent_at, delivered_at, read_at, status, error_message, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [id, tenantId, type, recipient, channel, now, deliveredAt, readAtVal, statusVal, errorMessage || null, now, now]
      )

      res.status(201).json({ data: mapCommunicationLog(result.rows[0]) })
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
      p++; values.push(tenantId)

      const result = await query(
        `UPDATE communication_logs SET ${fields.join(', ')} WHERE id = $${p} AND tenant_id = $${p + 1} RETURNING *`,
        values
      )

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: 'Log not found' })
      }

      res.status(200).json({ data: mapCommunicationLog(result.rows[0]) })
    } catch (err) {
      console.error('Error updating communication log:', err)
      res.status(500).json({ error: 'Failed to update communication log' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
