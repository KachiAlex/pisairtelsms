import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireRole } from '../_lib/auth-middleware';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['student']);
  if (!decoded) return;

  const studentId = decoded.studentId || decoded.userId;
  if (!studentId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
  }

  if (req.method === 'GET') {
    try {
      const { limit = '20', offset = '0' } = req.query;
      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const offsetNum = parseInt(offset as string) || 0;

      const countResult = await sql`SELECT COUNT(*) AS total FROM student_messages WHERE student_id = ${studentId}`;
      const total = parseInt(countResult.rows[0]?.total ?? '0');

      const dbResult = await sql`
        SELECT id::text, sender_name AS sender, subject,
               created_at::date::text AS date, body, is_read
        FROM student_messages
        WHERE student_id = ${studentId}
        ORDER BY created_at DESC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `;

      const messages: Message[] = await Promise.all(dbResult.rows.map(async r => {
        const repliesResult = await sql`
          SELECT id::text, sender_name AS sender, created_at::date::text AS date, body
          FROM student_message_replies WHERE message_id = ${r.id} ORDER BY created_at ASC
        `;
        return {
          id: r.id, sender: r.sender, subject: r.subject,
          date: r.date, body: r.body, isRead: r.is_read,
          replies: repliesResult.rows.map(rr => ({ id: rr.id, sender: rr.sender, date: rr.date, body: rr.body })),
        };
      }));

      return res.status(200).json({ messages, total, limit: limitNum, offset: offsetNum });
    } catch (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Message ID is required' });
      }

      await sql`UPDATE student_messages SET is_read = true WHERE id = ${id} AND student_id = ${studentId}`;
      return res.status(200).json({ success: true, message: 'Message marked as read' });
    } catch (error) {
      console.error('Error marking message as read:', error);
      return res.status(500).json({ error: 'Failed to mark message as read' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Message ID is required' });
      }

      const body = req.body;
      if (!body || typeof body !== 'object' || !body.reply) {
        return res.status(400).json({ error: 'Reply text is required' });
      }

      const replyId = `reply_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      await sql`
        INSERT INTO student_message_replies (id, message_id, sender_name, body, created_at)
        VALUES (${replyId}, ${id}, 'Student', ${body.reply}, NOW())
      `;
      const newReply: Reply = {
        id: replyId, sender: 'Student',
        date: new Date().toISOString().split('T')[0], body: body.reply,
      };
      return res.status(201).json({ success: true, reply: newReply });
    } catch (error) {
      console.error('Error adding reply:', error);
      return res.status(500).json({ error: 'Failed to add reply' });
    }
  }

  res.setHeader('Allow', 'GET,PUT,POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
