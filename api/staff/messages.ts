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
  recipientId?: string;
  subject?: string;
  body: string;
  parentMessageId?: string;
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

      // Inbound parent→teacher conversations live in parent_messages.
      if (!sentOnly) {
        const pmResult = await sql`
          SELECT id::text, parent_name, student_name, subject, COALESCE(body, message) AS body,
                 is_read, replies, COALESCE(updated_at, sent_at, created_at)::date::text AS date
          FROM parent_messages
          WHERE staff_id = ${staffId} AND tenant_id = ${tenantId}
          ORDER BY COALESCE(updated_at, sent_at, created_at) DESC
          LIMIT ${Math.min(parseInt(limit as string), 100)}
        `.catch(() => ({ rows: [] as any[] }));

        for (const r of pmResult.rows) {
          const thread = Array.isArray(r.replies) ? r.replies : [];
          messages.push({
            id: `pm_${r.id}`,
            sender: r.parent_name || 'Parent',
            senderRole: 'Parent',
            subject: r.subject || (r.student_name ? `Re: ${r.student_name}` : 'Parent message'),
            body: r.body || '',
            date: r.date,
            isRead: !!r.is_read,
            direction: 'inbound',
            replies: thread.map((rp: any) => ({
              id: rp.id,
              sender: rp.sender === 'teacher' ? 'You' : (r.parent_name || 'Parent'),
              senderRole: rp.sender === 'teacher' ? 'staff' : 'Parent',
              subject: '',
              body: rp.body || rp.message || '',
              date: (rp.created_at || rp.sentAt || '').slice(0, 10),
              isRead: true,
            })),
          });
        }
        messages.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      }

      return res.status(200).json({ messages });
    } catch (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }
  } else if (req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { recipientId, subject, body: messageBody, parentMessageId } = body as NewMessageBody;

      const senderName = await getStaffName(staffId);

      // Reply to a parent→teacher conversation: appends to the thread the
      // parent sees, marks the inbound message read and the convo replied.
      if (parentMessageId) {
        // Inbox ids are displayed as pm_<rowId>; row ids themselves may start
        // with pm_ too, so resolve against both forms.
        const stripped = parentMessageId.startsWith('pm_') ? parentMessageId.slice(3) : parentMessageId;
        const candidates = [stripped, parentMessageId];
        const convo = await sql`
          SELECT id FROM parent_messages
          WHERE id = ANY(${candidates}) AND staff_id = ${staffId} AND tenant_id = ${tenantId} LIMIT 1
        `.catch(() => ({ rows: [] as any[] }));
        if (!convo.rows[0]) {
          return res.status(404).json({ error: 'Conversation not found' });
        }
        const pmId = convo.rows[0].id;
        if (!messageBody?.trim()) {
          return res.status(400).json({ error: 'body is required' });
        }
        const replyId = `pmsg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const replyEntry = JSON.stringify([{ id: replyId, sender: 'teacher', body: messageBody, created_at: new Date().toISOString() }]);
        await sql`
          UPDATE parent_messages SET
            replies = COALESCE(replies, '[]'::jsonb) || ${replyEntry}::jsonb,
            is_read = TRUE,
            status = 'replied',
            updated_at = NOW()
          WHERE id = ${pmId} AND tenant_id = ${tenantId}
        `;
        return res.status(201).json({
          id: replyId,
          sender: 'You',
          subject: '',
          body: messageBody,
          date: new Date().toISOString().slice(0, 10),
          isRead: true,
        });
      }

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
