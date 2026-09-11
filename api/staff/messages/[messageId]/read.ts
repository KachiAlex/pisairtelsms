import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireRole } from '../../../_lib/auth-middleware.js';
import { requireCSRF } from '../../../_lib/csrf.js';

interface MarkReadResponse {
  id: string;
  isRead: boolean;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const decoded = await requireRole(req, res, ['staff']);
    if (!decoded) return;
    const staffId = decoded.staffId || decoded.userId;
    if (!staffId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
    }

    // CSRF protection for state-changing request
    if (requireCSRF(req, res, staffId)) return;

    const { messageId } = req.query;
    if (!messageId || typeof messageId !== 'string') {
      return res.status(400).json({ error: 'messageId is required' });
    }

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
