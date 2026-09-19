import type { ApiRequest, ApiResponse } from '../_lib/http-types.js';
import { sql } from '../_lib/sql.js';
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

export default async function handler(req: ApiRequest, res: ApiResponse) {
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

    // Session/term from Timetable & Scheduling — the single source of truth.
    let academicSession = '', term = '';
    try {
      const today = new Date().toISOString().slice(0, 10);
      const termRes = await sql`
        SELECT name, academic_year FROM timetable_terms
        WHERE tenant_id = ${decoded.tenantId || 'default-tenant'}
        ORDER BY (start_date <= ${today} AND ${today} <= end_date) DESC, start_date ASC
        LIMIT 1`;
      if (termRes.rows[0]) {
        term = termRes.rows[0].name;
        academicSession = termRes.rows[0].academic_year;
      }
    } catch (err) {
      console.warn('timetable_terms lookup failed', err);
    }

    return res.status(200).json({ events, academicSession, term } as EventsResponse);
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
}
