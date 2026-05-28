import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

interface ScheduleEntry {
  id: string;
  dayOfWeek: number;
  timeSlot: string;
  subject: string;
  className: string;
  room: string;
  startTime: string;
  endTime: string;
}

interface ExamEntry {
  id: string;
  subject: string;
  date: string;
  time: string;
  room: string;
  duration: number;
}

interface Term {
  id: string;
  name: string;
}

interface StaffTimetableResponse {
  schedule: ScheduleEntry[];
  examSchedule: ExamEntry[];
  currentTerm: string;
  availableTerms: Term[];
}

function extractStaffIdFromToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const parts = authHeader.substring(7).split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.staffId || payload.userId || payload.sub || null;
    }
  } catch { /* not a JWT */ }
  return null;
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

    await sql`
      CREATE TABLE IF NOT EXISTS timetable (
        id SERIAL PRIMARY KEY,
        staff_id VARCHAR(255) NOT NULL,
        day VARCHAR(20) NOT NULL,
        subject VARCHAR(255),
        class_name VARCHAR(255),
        room VARCHAR(255),
        start_time VARCHAR(10),
        end_time VARCHAR(10),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS exams (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        exam_date DATE,
        start_time TIME,
        end_time TIME,
        room VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    const dayOrder: Record<string, number> = {
      monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7
    };

    const ttResult = await sql`
      SELECT id::text, day, start_time, end_time,
             start_time || ' - ' || end_time AS time_slot,
             subject, class_name, room
      FROM timetable
      WHERE staff_id = ${staffId}
      ORDER BY day, start_time
    `;

    const schedule: ScheduleEntry[] = ttResult.rows.map(r => ({
      id: r.id,
      dayOfWeek: dayOrder[r.day?.toLowerCase()] ?? 0,
      timeSlot: r.time_slot,
      subject: r.subject,
      className: r.class_name,
      room: r.room,
      startTime: r.start_time,
      endTime: r.end_time,
    }));

    const examResult = await sql`
      SELECT e.id::text, e.title AS subject, e.exam_date::text AS date,
             e.start_time AS time, e.room,
             EXTRACT(EPOCH FROM (e.end_time::time - e.start_time::time))/60 AS duration
      FROM exams e
      WHERE e.exam_date >= CURRENT_DATE
        AND EXISTS (
          SELECT 1 FROM timetable tt
          WHERE tt.staff_id = ${staffId} AND LOWER(tt.subject) = LOWER(e.title)
        )
      ORDER BY e.exam_date, e.start_time
    `;

    const examSchedule: ExamEntry[] = examResult.rows.map(r => ({
      id: r.id, subject: r.subject, date: r.date,
      time: r.time ?? '', room: r.room ?? '', duration: Number(r.duration ?? 0),
    }));

    let availableTerms: Term[] = [];
    let currentTerm = '';
    try {
      const termResult = await sql`SELECT id::text, name FROM terms ORDER BY name`;
      if (termResult.rows.length > 0) {
        availableTerms = termResult.rows.map(r => ({ id: r.id, name: r.name }));
        currentTerm = availableTerms[0].id;
      }
    } catch { /* terms table may not exist */ }

    return res.status(200).json({ schedule, examSchedule, currentTerm, availableTerms });
  } catch (error) {
    console.error('Error fetching staff timetable:', error);
    return res.status(500).json({ error: 'Failed to fetch timetable data' });
  }
}
