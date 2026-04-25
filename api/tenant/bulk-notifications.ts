import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
)

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
    await supabase.rpc('create_bulk_notifications_table', {})
  } catch (err) {
    // Table might already exist
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  await initializeTable()

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('bulk_notifications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      res.status(200).json({ data: data || [] })
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

      const notification: BulkNotification = {
        id: `notif_${Date.now()}`,
        title,
        message,
        channels,
        recipientCount,
        scheduledFor,
        sentAt: null,
        status: 'scheduled',
        deliveryStatus: {
          pending: recipientCount,
          delivered: 0,
          failed: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('bulk_notifications')
        .insert([notification])
        .select()

      if (error) throw error

      res.status(201).json({ data: data?.[0] })
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

      const { data, error } = await supabase
        .from('bulk_notifications')
        .update({
          status,
          delivery_status: deliveryStatus,
          sent_at: status === 'sent' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Notification not found' })
      }

      res.status(200).json({ data: data[0] })
    } catch (err) {
      console.error('Error updating bulk notification:', err)
      res.status(500).json({ error: 'Failed to update bulk notification' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
