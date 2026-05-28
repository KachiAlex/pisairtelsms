import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

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
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const staffId = extractStaffIdFromToken(req);
    if (!staffId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
    }

    const { limit = '10', offset = '0' } = req.query;

    // Ensure announcements table exists with extra columns
    await sql``
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        body TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    ``;
    await sql``ALTER TABLE announcements ADD COLUMN IF NOT EXISTS audience VARCHAR(255)``;
    await sql``ALTER TABLE announcements ADD COLUMN IF NOT EXISTS sent_by VARCHAR(255)``;

    const result = await sql``
      SELECT id::text, title, body, created_at::date::text AS date, audience, sent_by
      FROM announcements
      ORDER BY created_at DESC
      LIMIT ${Math.min(parseInt(limit as string), 100)}
      OFFSET ${parseInt(offset as string)}
    ``;

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
