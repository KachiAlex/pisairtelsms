import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { initializeDatabase, query } from './cbt/_lib/db.js'

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
)

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
  await initializeTable()

  if (req.method === 'GET') {
    try {
      const { type, channel, status, recipient, startDate, endDate } = req.query

      let query = supabase.from('communication_logs').select('*')

      if (type) {
        query = query.eq('type', type)
      }

      if (channel) {
        query = query.eq('channel', channel)
      }

      if (status) {
        query = query.eq('status', status)
      }

      if (recipient) {
        query = query.ilike('recipient', `%${recipient}%`)
      }

      if (startDate) {
        query = query.gte('sent_at', startDate)
      }

      if (endDate) {
        query = query.lte('sent_at', endDate)
      }

      const { data, error } = await query
        .order('sent_at', { ascending: false })
        .limit(100)

      if (error) throw error

      res.status(200).json({ data: data || [] })
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

      const log: CommunicationLog = {
        id: `log_${Date.now()}`,
        type,
        recipient,
        channel,
        sentAt: new Date().toISOString(),
        deliveredAt: status === 'delivered' || status === 'read' ? new Date().toISOString() : null,
        readAt: status === 'read' ? new Date().toISOString() : null,
        status: status || 'sent',
        errorMessage: errorMessage || null,
        createdAt: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('communication_logs')
        .insert([log])
        .select()

      if (error) throw error

      res.status(201).json({ data: data?.[0] })
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

      const updateData: any = { status }

      if (deliveredAt) {
        updateData.delivered_at = deliveredAt
      }

      if (readAt) {
        updateData.read_at = readAt
      }

      const { data, error } = await supabase
        .from('communication_logs')
        .update(updateData)
        .eq('id', id)
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Log not found' })
      }

      res.status(200).json({ data: data[0] })
    } catch (err) {
      console.error('Error updating communication log:', err)
      res.status(500).json({ error: 'Failed to update communication log' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
