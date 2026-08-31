import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

function extractStaffIdFromToken(req: VercelRequest): string | null {
  const xUserId = req.headers['x-user-id'];
  if (xUserId && typeof xUserId === 'string' && xUserId.trim()) return xUserId.trim();
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

function parseBody(req: VercelRequest): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve(null); }
    });
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const staffId = extractStaffIdFromToken(req);
  if (!staffId) return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });

  try {
    try { } catch (e) { /* ignore */ }
    try { } catch (e) { /* ignore */ }
  } catch (e) {
    console.error('Schema setup error:', e);
  }

  if (req.method === 'GET') {
    try {
      const result = await sql`
        SELECT title, description, subject, due_date::text AS due_date,
          max_score, type, instructions, created_at::text AS created_at,
          COUNT(*) AS student_count
        FROM student_assignments
        WHERE teacher_id = ${staffId}
        GROUP BY title, description, subject, due_date, max_score, type, instructions, created_at
        ORDER BY created_at DESC
        LIMIT 100
      `;

      return res.status(200).json({
        assignments: result.rows.map(r => ({
          title: r.title,
          description: r.description,
          subject: r.subject,
          dueDate: r.due_date,
          maxScore: Number(r.max_score),
          type: r.type,
          instructions: r.instructions,
          createdAt: r.created_at,
          studentCount: parseInt(r.student_count),
        }))
      });
    } catch (error) {
      console.error('Error fetching teacher assignments:', error);
      return res.status(500).json({ error: 'Failed to fetch assignments' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { title, description, subject, className, arm, dueDate, type, maxScore, instructions, attachments } = body || {};

      if (!title || !subject || !className || !dueDate) {
        return res.status(400).json({ error: 'Missing required fields: title, subject, className, dueDate' });
      }

      const staffRes = await sql`SELECT name FROM staff WHERE id = ${staffId} LIMIT 1`;
      const staffName = staffRes.rows[0]?.name || 'Teacher';

      let studentsRes;
      if (arm) {
        studentsRes = await sql`
          SELECT id, name FROM students
          WHERE class = ${className} AND arm = ${arm} AND deleted_at IS NULL AND status = 'Active'
        `;
      } else {
        studentsRes = await sql`
          SELECT id, name FROM students
          WHERE (class || COALESCE(arm, '') = ${className} OR class = ${className})
            AND deleted_at IS NULL AND status = 'Active'
        `;
      }
      const students = studentsRes.rows;

      if (students.length === 0) {
        return res.status(404).json({ error: 'No students found in the specified class' });
      }

      const now = new Date().toISOString();
      const assignmentType = type || 'homework';
      const maxScoreVal = maxScore || 100;
      let counter = 0;

      for (const student of students) {
        const assignmentId = `asgn_${Date.now()}_${counter++}_${Math.random().toString(36).substr(2, 9)}`;
        await sql`
          INSERT INTO student_assignments (
            id, student_id, title, description, subject, teacher, teacher_id, due_date,
            status, submission_type, type, max_score, attachments, instructions, created_at
          ) VALUES (
            ${assignmentId}, ${student.id}, ${title}, ${description || ''}, ${subject},
            ${staffName}, ${staffId}, ${dueDate}, 'pending', 'online',
            ${assignmentType}, ${maxScoreVal}, ${JSON.stringify(attachments || [])}::jsonb,
            ${instructions || ''}, ${now}
          )
        `;
      }

      let notifiedCount = 0;
      for (const student of students) {
        const parentsRes = await sql`
          SELECT parent_id FROM parent_students WHERE student_id = ${student.id}
        `;
        for (const parent of parentsRes.rows) {
          const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await sql`
            INSERT INTO parent_notifications (
              id, parent_id, student_id, type, title, message, action_url, created_at
            ) VALUES (
              ${notifId}, ${parent.parent_id}, ${student.id}, 'academic',
              ${`New ${assignmentType}: ${title}`},
              ${`A new ${assignmentType} has been assigned in ${subject} for ${student.name}. Due: ${dueDate}.`},
              '/parent/assignments', ${now}
            )
          `;
          notifiedCount++;
        }
      }

      return res.status(201).json({
        success: true,
        message: `Assignment created for ${students.length} students and ${notifiedCount} parents notified.`,
        studentCount: students.length,
        notifiedParentsCount: notifiedCount,
      });
    } catch (error) {
      console.error('Error creating assignment:', error);
      return res.status(500).json({ error: 'Failed to create assignment' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
