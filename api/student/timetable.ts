import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

interface TimeSlot {
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacher: string;
  room: string;
}

interface ExamSchedule {
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  room: string;
}

interface StudentTimetableResponse {
  schedule: TimeSlot[];
  examSchedule: ExamSchedule[];
  termId: string;
}

function extractStudentIdFromToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.userId || payload.sub || null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const studentId = extractStudentIdFromToken(req);
    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
    }

    const { termId } = req.query;

    // Get student's class
    const studentResult = await sql`
      SELECT class, arm FROM students WHERE id = ${studentId} AND deleted_at IS NULL LIMIT 1
    `;
    if (!studentResult.rows[0]) return res.status(404).json({ error: 'Student not found' });
    const { class: studentClass, arm } = studentResult.rows[0];
    const className = `${studentClass}${arm ? arm : ''}`;

    // Fetch timetable for this class
    const ttResult = await sql`
      SELECT tt.day, tt.start_time, tt.end_time, tt.subject, tt.room,
             COALESCE(st.name, '') AS teacher
      FROM timetable tt
      LEFT JOIN staff st ON st.id = tt.staff_id
      WHERE tt.class_name = ${className}
      ORDER BY tt.day, tt.start_time
    `;

    const schedule: TimeSlot[] = ttResult.rows.map(r => ({
      day: r.day,
      startTime: r.start_time,
      endTime: r.end_time,
      subject: r.subject,
      teacher: r.teacher,
      room: r.room,
    }));

    // Fetch upcoming exams for this class
    const examResult = await sql`
      SELECT title AS subject, exam_date::text AS date,
             start_time, end_time, room,
             EXTRACT(EPOCH FROM (end_time::time - start_time::time))/60 AS duration
      FROM exams
      WHERE (student_class = ${studentClass} OR student_class IS NULL)
        AND exam_date >= CURRENT_DATE
      ORDER BY exam_date, start_time
    `;

    const examSchedule: ExamSchedule[] = examResult.rows.map(r => ({
      subject: r.subject,
      date: r.date,
      startTime: r.start_time ?? '',
      endTime: r.end_time ?? '',
      duration: Number(r.duration ?? 0),
      room: r.room ?? '',
    }));

    return res.status(200).json({ schedule, examSchedule, termId: termId ?? 'current' });
  } catch (error) {
    console.error('Error fetching student timetable:', error);
    return res.status(500).json({ error: 'Failed to fetch timetable' });
  }
}
