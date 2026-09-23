import type { ApiRequest, ApiResponse } from '../_lib/http-types.js';
import { sql } from '../_lib/sql.js';
import { requireRole } from '../_lib/auth-middleware.js';
import { verifyParentChildAccess } from './_lib/verify-child.js';

interface Assignment {
  id: string; subject: string; title: string; description: string;
  dueDate: string; status: 'pending' | 'submitted' | 'graded' | 'overdue';
  type: 'homework' | 'project' | 'essay' | 'quiz' | 'reading';
  teacherName: string; submittedAt?: string; score?: number; maxScore: number; feedback?: string;
}

interface AssignmentsResponse {
  assignments: Assignment[];
  summary: { total: number; pending: number; submitted: number; graded: number; overdue: number };
  childName: string;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['parent']);
  if (!decoded) return;
  const parentId = decoded.parentId!;
  const childrenIds = decoded.childrenIds || [];

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { childId, status, type } = req.query;
    if (!childId) return res.status(400).json({ error: 'childId is required' });

    // Verify parent-child relationship (SEC-05)
    if (!await verifyParentChildAccess(parentId, childId as string, decoded.tenantId || 'default-tenant')) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this child' });
    }

    const childRes = await sql`
      SELECT name, tenant_id, class, arm FROM students
      WHERE id = ${childId as string} AND deleted_at IS NULL LIMIT 1
    `;
    const child = childRes.rows[0];
    if (!child) return res.status(404).json({ error: 'Child not found' });
    const tenantId = child.tenant_id || 'default-tenant';
    const childName = child.name || '';

    await sql`ALTER TABLE assignments ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'homework'`.catch(() => {});

    const result = await sql`
      SELECT a.id::text, a.title, a.instructions, a.points, a.type,
        a.due_date::text AS due_date,
        s.name AS subject_name,
        st.name AS teacher_name,
        sub.status AS sub_status, sub.submitted_at::text AS submitted_at,
        sub.grade, sub.feedback
      FROM assignments a
      JOIN virtual_classrooms vc ON vc.id = a.classroom_id
      LEFT JOIN subjects s ON s.id::text = vc.subject_id
      LEFT JOIN staff st ON st.id = a.created_by OR st.id = vc.teacher_id
      LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = ${childId as string}
      WHERE a.tenant_id = ${tenantId} AND a.is_published = true
        AND (
          (vc.class_arm_id IS NULL OR vc.class_arm_id = '')
            AND (vc.class_level IS NULL OR vc.class_level = '')
          OR (vc.class_level IS NOT NULL AND vc.class_level != ''
            AND LOWER(vc.class_level) = LOWER(${child.class || ''}))
          OR EXISTS (
            SELECT 1 FROM classes c
            WHERE c.id::text = vc.class_arm_id AND c.tenant_id = ${tenantId}
              AND LOWER(c.name) = LOWER(${child.class || ''})
              AND (c.arm IS NULL OR c.arm = '' OR LOWER(c.arm) = LOWER(${child.arm || ''}))
          )
        )
      ORDER BY a.due_date DESC
    `;

    const now = new Date();
    let assignments: Assignment[] = result.rows.map(r => {
      let st: Assignment['status'] = 'pending';
      if (r.sub_status) {
        st = r.sub_status === 'graded' ? 'graded' : 'submitted';
      }
      if (st === 'pending' && r.due_date && new Date(r.due_date) < now) st = 'overdue';
      return {
        id: r.id,
        subject: r.subject_name || '',
        title: r.title,
        description: r.instructions || '',
        dueDate: r.due_date || '',
        status: st,
        type: (r.type || 'homework') as Assignment['type'],
        teacherName: r.teacher_name || '',
        submittedAt: r.submitted_at || undefined,
        score: r.grade != null ? Number(r.grade) : undefined,
        maxScore: Number(r.points) || 100,
        feedback: r.feedback || undefined,
      };
    });

    if (status) assignments = assignments.filter(a => a.status === status);
    if (type) assignments = assignments.filter(a => a.type === type);
    assignments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const summary = {
      total: assignments.length,
      pending: assignments.filter(a => a.status === 'pending').length,
      submitted: assignments.filter(a => a.status === 'submitted').length,
      graded: assignments.filter(a => a.status === 'graded').length,
      overdue: assignments.filter(a => a.status === 'overdue').length,
    };

    return res.status(200).json({ assignments, summary, childName } as AssignmentsResponse);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return res.status(500).json({ error: 'Failed to fetch assignments' });
  }
}
