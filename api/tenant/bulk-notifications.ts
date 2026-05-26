import { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeDatabase, query, queryOne } from './cbt/_lib/db.js'
import { requireRole } from '../_lib/auth-middleware'

interface BulkNotification {
  id: string
  title: string
  message: string
  channels: string[]
  recipientCount: number
  scheduledFor: string
  sentAt: string | null
  status: 'scheduled' | 'sent' | 'failed'
  deliveryStatus: {
    pending: number
    delivered: number
    failed: number
  }
  createdAt: string
  updatedAt: string
}

async function initializeTable() {
  try {
    initializeDatabase()
    await query(`
      CREATE TABLE IF NOT EXISTS bulk_notifications (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        channels TEXT[],
        recipient_count INTEGER DEFAULT 0,
        scheduled_for TIMESTAMP WITH TIME ZONE,
        sent_at TIMESTAMP WITH TIME ZONE,
        status TEXT DEFAULT 'scheduled',
        delivery_status JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)
  } catch (err) {
    console.error('bulk_notifications init error:', err)
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
      const result = await query(
        'SELECT * FROM bulk_notifications ORDER BY created_at DESC'
      )
      res.status(200).json({ data: result.rows || [] })
    } catch (err) {
      console.error('Error fetching bulk notifications:', err)
      res.status(500).json({ error: 'Failed to fetch bulk notifications' })
    }
  } else if (req.method === 'POST') {
    try {
      const { title, message, channels, recipientCount, scheduledFor } = req.body

      if (!title || !message || !channels || !recipientCount) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      const id = `notif_${Date.now()}`
      const deliveryStatus = JSON.stringify({
        pending: recipientCount,
        delivered: 0,
        failed: 0,
      })
      const now = new Date().toISOString()

      const result = await query(
        `INSERT INTO bulk_notifications
         (id, title, message, channels, recipient_count, scheduled_for, sent_at, status, delivery_status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [id, title, message, channels, recipientCount, scheduledFor || null, null, 'scheduled', deliveryStatus, now, now]
      )

      res.status(201).json({ data: result.rows[0] })
    } catch (err) {
      console.error('Error creating bulk notification:', err)
      res.status(500).json({ error: 'Failed to create bulk notification' })
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, status, deliveryStatus } = req.body

      if (!id) {
        return res.status(400).json({ error: 'Notification ID is required' })
      }

      const sentAt = status === 'sent' ? new Date().toISOString() : null
      const now = new Date().toISOString()

      const result = await query(
        `UPDATE bulk_notifications
         SET status = $1, delivery_status = $2, sent_at = $3, updated_at = $4
         WHERE id = $5
         RETURNING *`,
        [status, JSON.stringify(deliveryStatus), sentAt, now, id]
      )

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: 'Notification not found' })
      }

      res.status(200).json({ data: result.rows[0] })
    } catch (err) {
      console.error('Error updating bulk notification:', err)
      res.status(500).json({ error: 'Failed to update bulk notification' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
