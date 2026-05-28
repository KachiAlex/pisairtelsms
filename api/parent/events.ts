import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

interface SchoolEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime?: string;
  endTime?: string;
  venue: string;
  category: 'academic' | 'sports' | 'cultural' | 'pta' | 'holiday' | 'general';
  isMandatory: boolean;
}

interface EventsResponse {
  events: SchoolEvent[];
  academicSession: string;
  term: string;
}

function extractParentId(req: VercelRequest): string | null {
  const xUserId = req.headers['x-user-id'];
  if (xUserId && typeof xUserId === 'string' && xUserId.trim()) return xUserId.trim();
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.parentId || payload.userId || payload.sub || null;
    }
  } catch {}
  return token || null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const parentId = extractParentId(req);
  if (!parentId) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { category } = req.query;
    await sql`CREATE TABLE IF NOT EXISTS school_events (
      id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, description TEXT,
      event_date DATE, start_time TIME, end_time TIME, venue VARCHAR(255),
      category VARCHAR(50), is_mandatory BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT NOW()
    )`;

    let result;
    if (category) {
      result = await sql`SELECT id::text, title, COALESCE(description, '') AS description,
        event_date::text AS date, start_time::text AS start_time, end_time::text AS end_time,
        COALESCE(venue, '') AS venue, COALESCE(category, 'general') AS category, is_mandatory
        FROM school_events
        WHERE event_date >= CURRENT_DATE AND LOWER(category) = LOWER(${category as string})
        ORDER BY event_date`;
    } else {
      result = await sql`SELECT id::text, title, COALESCE(description, '') AS description,
        event_date::text AS date, start_time::text AS start_time, end_time::text AS end_time,
        COALESCE(venue, '') AS venue, COALESCE(category, 'general') AS category, is_mandatory
        FROM school_events
        WHERE event_date >= CURRENT_DATE
        ORDER BY event_date`;
    }

    const events: SchoolEvent[] = result.rows.map(r => ({
      id: r.id, title: r.title, description: r.description, date: r.date,
      startTime: r.start_time ? r.start_time.slice(0,5) : undefined,
      endTime: r.end_time ? r.end_time.slice(0,5) : undefined,
      venue: r.venue, category: r.category as SchoolEvent['category'],
      isMandatory: !!r.is_mandatory,
    }));

    let academicSession = '', term = '';
    try {
      const termRes = await sql`SELECT name FROM terms ORDER BY created_at DESC LIMIT 1`;
      if (termRes.rows[0]) {
        term = termRes.rows[0].name;
        const year = new Date().getFullYear();
        academicSession = `${year}/${year+1}`;
      }
    } catch {}

    return res.status(200).json({ events, academicSession: academicSession || '2024/2025', term: term || 'First Term' } as EventsResponse);
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
}
