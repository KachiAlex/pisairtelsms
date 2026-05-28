import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

interface StudentAttendanceRecord {
  id: string;
  studentId: string;
  name: string;
  admissionNumber: string;
  currentStatus: 'present' | 'absent' | 'late' | null;
}

interface AttendanceHistory {
  date: string;
  classId: string;
  recordCount: number;
}

interface AttendanceListResponse {
  classId: string;
  date: string;
  students: StudentAttendanceRecord[];
  history: AttendanceHistory[];
}

interface AttendanceSubmissionBody {
  classId: string;
  date: string;
  records: Array<{
    studentId: string;
    status: 'present' | 'absent' | 'late';
  }>;
}

interface AttendanceSubmissionResponse {
  count: number;
  message: string;
}

function extractPayload(req: VercelRequest): { staffId: string | null; tenantId: string } {
  const xUserId = req.headers['x-user-id'];
  if (xUserId && typeof xUserId === 'string' && xUserId.trim()) {
    return { staffId: xUserId.trim(), tenantId: (req.headers['x-tenant-id'] as string) || 'default-tenant' };
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { staffId: null, tenantId: (req.headers['x-tenant-id'] as string) || 'default-tenant' };
  }

  const token = authHeader.substring(7);
  if (!token) return { staffId: null, tenantId: (req.headers['x-tenant-id'] as string) || 'default-tenant' };

  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return { staffId: payload.staffId || payload.userId || payload.sub || null, tenantId: payload.tenantId || (req.headers['x-tenant-id'] as string) || 'default-tenant' };
    }
  } catch {
    // not a JWT
  }

  return { staffId: token || null, tenantId: (req.headers['x-tenant-id'] as string) || 'default-tenant' };
}

function parseBody(req: VercelRequest): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { staffId, tenantId } = extractPayload(req);
  if (!staffId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
  }

  if (req.method === 'GET') {
    try {
      const { classId, date } = req.query;

      await sql`
        CREATE TABLE IF NOT EXISTS students (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          admission_no TEXT,
          name TEXT NOT NULL,
          class TEXT,
          arm TEXT,
          gender TEXT,
          status TEXT,
          guardian TEXT,
          phone TEXT,
          guardian_email TEXT,
          deleted_at TIMESTAMP WITH TIME ZONE
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS attendance_records (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          student_id TEXT NOT NULL,
          class TEXT,
          date DATE NOT NULL,
          status TEXT NOT NULL,
          absence_reason_id TEXT,
          source TEXT,
          device_id TEXT,
          user_id TEXT,
          academic_session TEXT,
          term TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_by TEXT,
          updated_by TEXT
        )
      `;

      const studentsResult = await sql`
        SELECT id, name, admission_no
        FROM students
        WHERE tenant_id = ${tenantId}
          AND class = ${classId as string}
          AND deleted_at IS NULL
        ORDER BY name ASC
      `;

      const attendanceResult = await sql`
        SELECT student_id, status
        FROM attendance_records
        WHERE tenant_id = ${tenantId}
          AND class = ${classId as string}
          AND date = ${date as string}
      `;

      const attendanceMap = new Map<string, string>();
      for (const row of attendanceResult.rows) {
        attendanceMap.set(row.student_id, row.status);
      }

      const students: StudentAttendanceRecord[] = studentsResult.rows.map(r => ({
        id: r.id,
        studentId: r.id,
        name: r.name,
        admissionNumber: r.admission_no || '',
        currentStatus: (attendanceMap.get(r.id) as 'present' | 'absent' | 'late') || null,
      }));

      const historyResult = await sql`
        SELECT date::text, class, COUNT(*)::text as record_count
        FROM attendance_records
        WHERE tenant_id = ${tenantId} AND class = ${classId as string}
        GROUP BY date, class
        ORDER BY date DESC
        LIMIT 7
      `;

      const history: AttendanceHistory[] = historyResult.rows.map(r => ({
        date: r.date,
        classId: r.class,
        recordCount: parseInt(r.record_count, 10),
      }));

      const response: AttendanceListResponse = {
        classId: classId as string,
        date: date as string,
        students,
        history,
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      return res.status(500).json({ error: 'Failed to fetch attendance records' });
    }
  } else if (req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { classId, date, records } = body as AttendanceSubmissionBody;

      const term = 'First Term';
      const year = new Date().getFullYear();
      const academicSession = `${year}/${year + 1}`;

      for (const record of records) {
        const id = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await sql`
          INSERT INTO attendance_records (id, tenant_id, student_id, class, date, status, source, user_id, academic_session, term, created_at, updated_at)
          VALUES (${id}, ${tenantId}, ${record.studentId}, ${classId}, ${date}, ${record.status}, 'teacher_entry', ${staffId}, ${academicSession}, ${term}, NOW(), NOW())
          ON CONFLICT DO NOTHING
        `;
      }

      const response: AttendanceSubmissionResponse = {
        count: records.length,
        message: `Attendance marked for ${records.length} students`,
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error marking attendance:', error);
      return res.status(500).json({ error: 'Failed to mark attendance' });
    }
  } else {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
