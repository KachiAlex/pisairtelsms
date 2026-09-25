import type { ApiRequest, ApiResponse } from '../_lib/http-types.js';
import { sql } from '../_lib/sql.js';
import { requireRole } from '../_lib/auth-middleware.js';

interface SchoolEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  venue: string;
  category: 'academic' | 'sports' | 'cultural' | 'pta' | 'holiday' | 'general';
  isMandatory: boolean;
}

// Same derivation as /api/parent/events: timetable_terms + timetable_holidays +
// academic_milestones — the centralized academic calendar is the single source.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['student']);
  if (!decoded) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const tenantId = decoded.tenantId || 'default-tenant';
    const { category, includePast } = req.query;

    const events: SchoolEvent[] = [];

    const [termRes, holRes, milestoneRes] = await Promise.all([
      sql`SELECT id::text, name, academic_year, start_date::text AS start_date, end_date::text AS end_date
          FROM timetable_terms WHERE tenant_id = ${tenantId} ORDER BY start_date`,
      sql`SELECT h.id::text, h.name, h.start_date::text AS start_date, h.end_date::text AS end_date, t.name AS term_name
          FROM timetable_holidays h
          LEFT JOIN timetable_terms t ON t.id = h.term_id AND t.tenant_id = h.tenant_id
          WHERE h.tenant_id = ${tenantId} ORDER BY h.start_date`,
      sql`SELECT id::text, title, date::text AS date, status FROM academic_milestones
          WHERE tenant_id = ${tenantId} ORDER BY date`.catch(() => ({ rows: [] as any[] })),
    ]);

    for (const t of termRes.rows) {
      events.push({
        id: `term-start-${t.id}`,
        title: `${t.name} begins`,
        description: `Start of ${t.name}, ${t.academic_year} session`,
        date: t.start_date,
        venue: '',
        category: 'academic',
        isMandatory: true,
      });
      events.push({
        id: `term-end-${t.id}`,
        title: `${t.name} ends`,
        description: `End of ${t.name}, ${t.academic_year} session`,
        date: t.end_date,
        venue: '',
        category: 'academic',
        isMandatory: true,
      });
    }

    for (const h of holRes.rows) {
      events.push({
        id: `holiday-${h.id}`,
        title: h.name,
        description: h.term_name ? `Holiday during ${h.term_name}` : 'School holiday',
        date: h.start_date,
        venue: '',
        category: 'holiday',
        isMandatory: false,
      });
    }

    for (const m of milestoneRes.rows) {
      events.push({
        id: `milestone-${m.id}`,
        title: m.title,
        description: m.status === 'High priority' ? 'High priority calendar item' : 'Academic calendar item',
        date: m.date,
        venue: '',
        category: 'academic',
        isMandatory: m.status === 'High priority',
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const filtered = events
      .filter(e => includePast === '1' || e.date >= today)
      .filter(e => !category || e.category.toLowerCase() === String(category).toLowerCase())
      .sort((a, b) => a.date.localeCompare(b.date));

    let academicSession = '', term = '';
    const current = termRes.rows.find(t => t.start_date <= today && today <= t.end_date) || termRes.rows[0];
    if (current) {
      term = current.name;
      academicSession = current.academic_year;
    }

    return res.status(200).json({ events: filtered, academicSession, term });
  } catch (error) {
    console.error('Error fetching student events:', error);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
}
