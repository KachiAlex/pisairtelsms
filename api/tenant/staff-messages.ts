import type { ApiRequest, ApiResponse } from '../_lib/http-types.js';
import { sql } from '../_lib/sql.js';
import { ensureStaffTables } from './_lib/staff.js';
import { requireRole } from '../_lib/auth-middleware.js';
import { requireCSRF } from '../_lib/csrf.js';

function parseBody(req: ApiRequest): Promise<any> {
  if (req.body !== undefined && req.body !== null) return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve(null); }
    });
  });
}

async function ensureColumns() {
  await sql`ALTER TABLE staff_messages ADD COLUMN IF NOT EXISTS sender_id TEXT`.catch(() => {});
  await sql`ALTER TABLE staff_messages ADD COLUMN IF NOT EXISTS admin_read_at TIMESTAMP`.catch(() => {});
}

/**
 * Admin view of the staff messaging channel.
 * Inbound: messages staff sent to any tenant_admin staff row.
 * Outbound: messages admins sent to staff (sender_role = 'admin').
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['tenant_admin']);
  if (!decoded) return;
  const adminId = decoded.staffId || decoded.userId;
  const tenantId = decoded.tenantId || 'default-tenant';
  if (!adminId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
  }

  await ensureStaffTables();
  await ensureColumns();

  if (req.method === 'GET') {
    try {
      const result = await sql`
        SELECT m.id::text, m.staff_id, m.sender_id, m.sender_name, m.sender_role,
          m.subject, m.body, m.is_read, m.admin_read_at::text AS admin_read_at,
          m.created_at::text AS created_at,
          s.name AS recipient_name
        FROM staff_messages m
        LEFT JOIN staff s ON s.id::text = m.staff_id
        WHERE m.tenant_id = ${tenantId}
          AND (
            m.sender_role = 'admin'
            OR m.staff_id IN (
              SELECT id FROM staff WHERE tenant_id = ${tenantId} AND role = 'tenant_admin'
            )
          )
        ORDER BY m.created_at DESC
        LIMIT 200
      `;

      return res.status(200).json({
        messages: result.rows.map(r => ({
          id: r.id,
          direction: r.sender_role === 'admin' ? 'outbound' : 'inbound',
          sender: r.sender_name || 'Staff',
          senderId: r.sender_id || null,
          recipientId: r.staff_id,
          recipientName: r.recipient_name || 'Admin',
          subject: r.subject || '',
          body: r.body || '',
          isRead: !!r.is_read,
          adminReadAt: r.admin_read_at,
          date: r.created_at,
        })),
      });
    } catch (error) {
      console.error('Error fetching staff messages:', error);
      return res.status(500).json({ error: 'Failed to fetch staff messages' });
    }
  }

  if (req.method === 'POST') {
    if (requireCSRF(req, res, adminId)) return;
    try {
      const body = await parseBody(req);
      const { recipientId, subject, body: messageBody } = body || {};

      if (!recipientId || !subject || !messageBody) {
        return res.status(400).json({ error: 'recipientId, subject, and body are required' });
      }

      const recipient = await sql`
        SELECT id, name FROM staff WHERE id = ${recipientId} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!recipient.rows[0]) {
        return res.status(404).json({ error: 'Staff member not found' });
      }

      const adminRes = await sql`SELECT name FROM staff WHERE id = ${adminId} LIMIT 1`;
      const senderName = adminRes.rows[0]?.name || 'Admin';

      const ins = await sql`
        INSERT INTO staff_messages (staff_id, tenant_id, sender_id, sender_name, sender_role, subject, body, is_read, created_at)
        VALUES (${recipientId}, ${tenantId}, ${adminId}, ${senderName}, 'admin', ${subject}, ${messageBody}, false, NOW())
        RETURNING id::text
      `;

      return res.status(201).json({
        success: true,
        id: ins.rows[0].id,
        message: `Message sent to ${recipient.rows[0].name}.`,
      });
    } catch (error) {
      console.error('Error sending staff message:', error);
      return res.status(500).json({ error: 'Failed to send message' });
    }
  }

  if (req.method === 'PUT') {
    if (requireCSRF(req, res, adminId)) return;
    try {
      const body = await parseBody(req);
      const { id } = body || {};
      if (!id) return res.status(400).json({ error: 'id is required' });

      const result = await sql`
        UPDATE staff_messages SET admin_read_at = NOW()
        WHERE id::text = ${id} AND tenant_id = ${tenantId}
          AND staff_id IN (SELECT id FROM staff WHERE tenant_id = ${tenantId} AND role = 'tenant_admin')
        RETURNING id::text
      `;
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Message not found' });
      }
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error marking staff message read:', error);
      return res.status(500).json({ error: 'Failed to update message' });
    }
  }

  res.setHeader('Allow', 'GET, POST, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
}
