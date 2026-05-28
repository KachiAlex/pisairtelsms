import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

interface Message {
  id: string;
  sender: string;
  senderRole: string;
  subject: string;
  body: string;
  date: string;
  isRead: boolean;
  replies?: Message[];
}

interface MessagesListResponse {
  messages: Message[];
}

interface NewMessageBody {
  recipientId: string;
  subject: string;
  body: string;
}

interface NewMessageResponse {
  id: string;
  sender: string;
  subject: string;
  body: string;
  date: string;
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

function parseBody(req: VercelRequest): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const staffId = extractStaffIdFromToken(req);
  if (!staffId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
  }

  // Ensure staff_messages table exists with body column
  await sql``
    CREATE TABLE IF NOT EXISTS staff_messages (
      id SERIAL PRIMARY KEY,
      staff_id VARCHAR(255) NOT NULL,
      sender_name VARCHAR(255),
      subject VARCHAR(255),
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  ``;
  await sql``ALTER TABLE staff_messages ADD COLUMN IF NOT EXISTS body TEXT``;
  await sql``ALTER TABLE staff_messages ADD COLUMN IF NOT EXISTS sender_role VARCHAR(255)``;

  if (req.method === 'GET') {
    try {
      const { limit = '20', offset = '0' } = req.query;

      const result = await sql``
        SELECT id::text, staff_id, sender_name, subject, body, sender_role, is_read, created_at::date::text AS date
        FROM staff_messages
        WHERE staff_id = ${staffId}
        ORDER BY created_at DESC
        LIMIT ${Math.min(parseInt(limit as string), 100)}
        OFFSET ${parseInt(offset as string)}
      ``;

      const messages: Message[] = result.rows.map(r => ({
        id: r.id,
        sender: r.sender_name || 'Admin',
        senderRole: r.sender_role || 'Admin',
        subject: r.subject || '',
        body: r.body || '',
        date: r.date,
        isRead: !!r.is_read,
      }));

      return res.status(200).json({ messages });
    } catch (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }
  } else if (req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { recipientId, subject, body: messageBody } = body as NewMessageBody;

      const senderRes = await sql``SELECT name FROM staff WHERE id = ${staffId} LIMIT 1``;
      const senderName = senderRes.rows[0]?.name || 'Unknown';

      const result = await sql``
        INSERT INTO staff_messages (staff_id, sender_name, subject, body, sender_role, is_read, created_at)
        VALUES (${recipientId || staffId}, ${senderName}, ${subject}, ${messageBody || ''}, 'staff', false, NOW())
        RETURNING id::text, sender_name, subject, body, created_at::text AS date, is_read
      ``;
      const r = result.rows[0];

      const response: NewMessageResponse = {
        id: r.id,
        sender: r.sender_name,
        subject: r.subject,
        body: r.body || '',
        date: r.date,
        isRead: !!r.is_read,
      };

      return res.status(201).json(response);
    } catch (error) {
      console.error('Error creating message:', error);
      return res.status(500).json({ error: 'Failed to create message' });
    }
  } else {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
