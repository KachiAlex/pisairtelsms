import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
)

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
    await supabase.rpc('create_parent_messages_table', {})
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
      const { studentName, status } = req.query

      let query = supabase.from('parent_messages').select('*')

      if (studentName) {
        query = query.eq('student_name', studentName)
      }

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      res.status(200).json({ data: data || [] })
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

      const parentMessage: ParentMessage = {
        id: `msg_${Date.now()}`,
        parentName,
        studentName,
        message,
        messageType: messageType || 'update',
        priority: priority || 'normal',
        sentAt: new Date().toISOString(),
        status: 'sent',
        replies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('parent_messages')
        .insert([parentMessage])
        .select()

      if (error) throw error

      res.status(201).json({ data: data?.[0] })
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

      let updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      }

      if (reply) {
        // Add reply to the replies array
        const { data: existing } = await supabase
          .from('parent_messages')
          .select('replies')
          .eq('id', id)
          .single()

        const replies = existing?.replies || []
        replies.push({
          id: `reply_${Date.now()}`,
          message: reply,
          sentAt: new Date().toISOString(),
          sentBy: 'Parent',
        })

        updateData.replies = replies
        updateData.status = 'replied'
      }

      const { data, error } = await supabase
        .from('parent_messages')
        .update(updateData)
        .eq('id', id)
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Message not found' })
      }

      res.status(200).json({ data: data[0] })
    } catch (err) {
      console.error('Error updating parent message:', err)
      res.status(500).json({ error: 'Failed to update parent message' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
