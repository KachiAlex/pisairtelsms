import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

interface MarkReadResponse {
  id: string;
  isRead: boolean;
}

function extractStaffIdFromToken(req: VercelRequest): string | null {
  const xUserId = req.headers['x-user-id'];
  if (xUserId && typeof xUserId === 'string' && xUserId.trim()) {
    return xUserId.trim();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.staffId || payload.userId || payload.sub || null;
    }
  } catch {
    // not a JWT
  }

  return token || null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const staffId = extractStaffIdFromToken(req);
    if (!staffId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
    }

    const { messageId } = req.query;
    if (!messageId || typeof messageId !== 'string') {
      return res.status(400).json({ error: 'messageId is required' });
    }

    await sql`CREATE TABLE IF NOT EXISTS staff_messages (
      id SERIAL PRIMARY KEY,
      staff_id VARCHAR(255) NOT NULL,
      sender_name VARCHAR(255),
      sender_id VARCHAR(255),
      subject VARCHAR(255),
      body TEXT,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )`;

    // Verify staff member is recipient (staff_id matches) or sender
    const msgRes = await sql`
      SELECT staff_id, sender_id FROM staff_messages WHERE id = ${messageId} LIMIT 1
    `;
    if (!msgRes.rows[0]) {
      return res.status(404).json({ error: 'Message not found' });
    }
    const msg = msgRes.rows[0];
    if (msg.staff_id !== staffId && msg.sender_id !== staffId) {
      return res.status(403).json({ error: 'Forbidden: Not authorized to mark this message as read' });
    }

    // Mark message as read
    await sql`
      UPDATE staff_messages SET is_read = TRUE WHERE id = ${messageId}
    `;

    const response: MarkReadResponse = {
      id: messageId,
      isRead: true,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error marking message as read:', error);
    return res.status(500).json({ error: 'Failed to mark message as read' });
  }
}
