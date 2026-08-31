import { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeDatabase, query, queryOne } from './cbt/_lib/db.js'
import { requireRole } from '../_lib/auth-middleware.js'

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

function mapBulkNotification(row: any): BulkNotification {
  const deliveryStatus = typeof row.delivery_status === 'string'
    ? JSON.parse(row.delivery_status)
    : (row.delivery_status || { pending: 0, delivered: 0, failed: 0 })
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    channels: row.channels || [],
    recipientCount: row.recipient_count,
    scheduledFor: row.scheduled_for,
    sentAt: row.sent_at,
    status: row.status,
    deliveryStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function initializeTable() {
  try {
    initializeDatabase()

    await query(`
      CREATE TABLE IF NOT EXISTS bulk_notifications (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
        title TEXT NOT NULL,
        message TEXT,
        channels TEXT[],
        recipient_count INTEGER,
        scheduled_for TIMESTAMP,
        sent_at TIMESTAMP,
        status TEXT DEFAULT 'scheduled',
        delivery_status TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    await query(`
      ALTER TABLE IF EXISTS bulk_notifications
        ADD COLUMN IF NOT EXISTS tenant_id TEXT,
        ADD COLUMN IF NOT EXISTS title TEXT,
        ADD COLUMN IF NOT EXISTS message TEXT,
        ADD COLUMN IF NOT EXISTS channels TEXT[],
        ADD COLUMN IF NOT EXISTS recipient_count INTEGER,
        ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP,
        ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS status TEXT,
        ADD COLUMN IF NOT EXISTS delivery_status TEXT,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP
    `)

    await query('CREATE INDEX IF NOT EXISTS idx_bulk_notifications_tenant_id ON bulk_notifications(tenant_id)')
  } catch (err) {
    console.error('bulk_notifications init error:', err)
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
      const result = await query(
        'SELECT * FROM bulk_notifications WHERE tenant_id = $1 ORDER BY created_at DESC',
        [tenantId]
      )
      res.status(200).json({ data: (result.rows || []).map(mapBulkNotification) })
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
         (id, tenant_id, title, message, channels, recipient_count, scheduled_for, sent_at, status, delivery_status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [id, tenantId, title, message, channels, recipientCount, scheduledFor || null, null, 'scheduled', deliveryStatus, now, now]
      )

      res.status(201).json({ data: mapBulkNotification(result.rows[0]) })
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
         WHERE id = $5 AND tenant_id = $6
         RETURNING *`,
        [status, JSON.stringify(deliveryStatus), sentAt, now, id, tenantId]
      )

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: 'Notification not found' })
      }

      res.status(200).json({ data: mapBulkNotification(result.rows[0]) })
    } catch (err) {
      console.error('Error updating bulk notification:', err)
      res.status(500).json({ error: 'Failed to update bulk notification' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
