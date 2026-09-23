import type { ApiRequest, ApiResponse } from '../_lib/http-types.js';
import { sql } from '../_lib/sql.js';
import { requireRole } from '../_lib/auth-middleware.js';

interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;
  audience: string;
  sentBy: string;
}

interface AnnouncementsResponse {
  announcements: Announcement[];
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const decoded = await requireRole(req, res, ['staff', 'tenant_admin']);
    if (!decoded) return;

    const tenantId = decoded.tenantId || 'default-tenant';

    const { limit = '10', offset = '0' } = req.query;

    // Ensure announcements table exists with extra columns
    const result = await sql`
      SELECT id::text, title, body, created_at::date::text AS date, audience, sent_by
      FROM announcements
      WHERE tenant_id = ${tenantId}
        AND COALESCE(status, 'sent') = 'sent'
        AND COALESCE(audience, 'all') IN ('all', 'staff')
      ORDER BY created_at DESC
      LIMIT ${Math.min(parseInt(limit as string), 100)}
      OFFSET ${parseInt(offset as string)}
    `;

    const announcements: Announcement[] = result.rows.map(r => ({
      id: r.id,
      title: r.title,
      body: r.body || '',
      date: r.date,
      audience: r.audience || 'All Staff',
      sentBy: r.sent_by || 'Admin',
    }));

    return res.status(200).json({ announcements });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return res.status(500).json({ error: 'Failed to fetch announcements' });
  }
}
