import type { ApiRequest, ApiResponse } from '../_lib/http-types.js';
import { sql } from '../_lib/sql.js';
import { requireRole } from '../_lib/auth-middleware.js';

interface Announcement {
  id: string;
  title: string;
  date: string;
  sender: string;
  preview: string;
  body: string;
  audience: string;
}

interface StudentAnnouncementsResponse {
  announcements: Announcement[];
  total: number;
  limit: number;
  offset: number;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = await requireRole(req, res, ['student']);
  if (!decoded) return;

  const tenantId = decoded.tenantId || 'default-tenant';

  try {
    const { limit = '10', offset = '0' } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 10, 100);
    const offsetNum = parseInt(offset as string) || 0;

    const countResult = await sql`
      SELECT COUNT(*) AS total FROM announcements
      WHERE tenant_id = ${tenantId}
        AND COALESCE(status, 'sent') = 'sent'
        AND COALESCE(audience, 'all') IN ('all', 'students')
    `;
    const total = parseInt(countResult.rows[0]?.total ?? '0');

    const dbResult = await sql`
      SELECT id::text, title, created_at::date::text AS date,
             COALESCE(author, 'Admin') AS sender,
             LEFT(body, 120) AS preview, body,
             COALESCE(audience, 'public') AS audience
      FROM announcements
      WHERE tenant_id = ${tenantId}
        AND COALESCE(status, 'sent') = 'sent'
        AND COALESCE(audience, 'all') IN ('all', 'students')
      ORDER BY created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `;

    const announcements: Announcement[] = dbResult.rows.map(r => ({
      id: r.id, title: r.title, date: r.date,
      sender: r.sender, preview: r.preview, body: r.body, audience: r.audience,
    }));

    return res.status(200).json({ announcements, total, limit: limitNum, offset: offsetNum });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return res.status(500).json({ error: 'Failed to fetch announcements' });
  }
}
