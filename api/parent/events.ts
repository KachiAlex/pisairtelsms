import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireRole } from '../_lib/auth-middleware.js';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['parent']);
  if (!decoded) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { category } = req.query;
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
    } catch (err) {
      // QUAL-02: previously silent — log so missing/misconfigured terms table is diagnosable
      console.warn('terms lookup failed; using fallback', err);
    }

    return res.status(200).json({ events, academicSession: academicSession || '2024/2025', term: term || 'First Term' } as EventsResponse);
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
}
