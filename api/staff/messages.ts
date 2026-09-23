import type { ApiRequest, ApiResponse } from '../_lib/http-types.js';
import { sql } from '../_lib/sql.js';
import { ensureStaffTables } from '../tenant/_lib/staff.js';
import { requireRole } from '../_lib/auth-middleware.js';

interface Message {
  id: string;
  sender: string;
  senderRole: string;
  subject: string;
  body: string;
  date: string;
  isRead: boolean;
  direction?: 'inbound' | 'outbound';
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

function parseBody(req: ApiRequest): Promise<any> {
  if (req.body !== undefined && req.body !== null) return Promise.resolve(req.body);
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

async function getStaffName(staffId: string): Promise<string> {
  try {
    const res = await sql`SELECT name FROM staff WHERE id = ${staffId} OR staff_id = ${staffId} LIMIT 1`;
    if (res.rows[0]?.name) return res.rows[0].name;
  } catch {
    // ignore
  }
  try {
    const res = await sql`SELECT name FROM users WHERE id = ${staffId} LIMIT 1`;
    if (res.rows[0]?.name) return res.rows[0].name;
  } catch {
    // ignore
  }
  return 'Unknown';
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin']);
  if (!decoded) return;
  const staffId = decoded.staffId || decoded.userId || decoded.sub;
  if (!staffId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
  }

  const tenantId = decoded.tenantId || 'default-tenant';

  await ensureStaffTables();
  await sql`ALTER TABLE staff_messages ADD COLUMN IF NOT EXISTS sender_id TEXT`.catch(() => {});

  if (req.method === 'GET') {
    try {
      const { limit = '20', offset = '0' } = req.query;
      const sentOnly = req.query.sent === 'true';

      const result = sentOnly
        ? await sql`
          SELECT id::text, staff_id, sender_name, subject, body, sender_role, is_read, created_at::date::text AS date
          FROM staff_messages
          WHERE sender_id = ${staffId} AND tenant_id = ${tenantId}
          ORDER BY created_at DESC
          LIMIT ${Math.min(parseInt(limit as string), 100)}
          OFFSET ${parseInt(offset as string)}
        `
        : await sql`
          SELECT id::text, staff_id, sender_name, subject, body, sender_role, is_read, created_at::date::text AS date
          FROM staff_messages
          WHERE staff_id = ${staffId} AND tenant_id = ${tenantId}
          ORDER BY created_at DESC
          LIMIT ${Math.min(parseInt(limit as string), 100)}
          OFFSET ${parseInt(offset as string)}
        `;

      const messages: Message[] = result.rows.map(r => ({
        id: r.id,
        sender: sentOnly ? 'You' : (r.sender_name || 'Admin'),
        senderRole: r.sender_role || 'Admin',
        subject: r.subject || '',
        body: r.body || '',
        date: r.date,
        isRead: !!r.is_read,
        direction: sentOnly ? 'outbound' : 'inbound',
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

      const senderName = await getStaffName(staffId);

      if (!recipientId) {
        return res.status(400).json({ error: 'recipientId is required' });
      }
      if (recipientId === staffId) {
        return res.status(400).json({ error: 'Cannot send a message to yourself' });
      }
      const recipient = await sql`
        SELECT id FROM staff WHERE id = ${recipientId} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!recipient.rows[0]) {
        return res.status(404).json({ error: 'Recipient not found' });
      }

      const result = await sql`
        INSERT INTO staff_messages (staff_id, tenant_id, sender_id, sender_name, subject, body, sender_role, is_read, created_at)
        VALUES (${recipientId}, ${tenantId}, ${staffId}, ${senderName}, ${subject}, ${messageBody || ''}, 'staff', false, NOW())
        RETURNING id::text, sender_name, subject, body, created_at::text AS date, is_read
      `;
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
