import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { ensureStaffTables } from '../tenant/_lib/staff.js';

interface Task {
  id: string;
  staffId: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string | null;
  assignedBy: string | null;
  assignedByRole: 'admin' | 'system' | 'self';
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

interface TasksListResponse {
  tasks: Task[];
  summary: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
}

interface CreateTaskBody {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
}

interface UpdateTaskBody {
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string | null;
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
  const staffId = extractStaffIdFromToken(req);
  if (!staffId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
  }

  await ensureStaffTables();

  if (req.method === 'GET') {
    try {
      const { status, priority } = req.query;

      const result = await sql`
        SELECT id::text, staff_id, title, description, status, priority, due_date::text, assigned_by, assigned_by_role, created_at::text, updated_at::text, completed_at::text
        FROM staff_tasks WHERE staff_id = ${staffId}
      `;
      let tasks: Task[] = result.rows.map(r => ({
        id: r.id,
        staffId: r.staff_id,
        title: r.title,
        description: r.description || '',
        status: r.status as Task['status'],
        priority: r.priority as Task['priority'],
        dueDate: r.due_date || null,
        assignedBy: r.assigned_by || null,
        assignedByRole: r.assigned_by_role as Task['assignedByRole'],
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        completedAt: r.completed_at || null,
      }));

      if (status) {
        tasks = tasks.filter(t => t.status === status);
      }
      if (priority) {
        tasks = tasks.filter(t => t.priority === priority);
      }

      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      tasks.sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

      const now = new Date().toISOString().split('T')[0];
      const summary = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        overdue: tasks.filter(t => t.dueDate && t.dueDate < now && t.status !== 'completed').length,
      };

      return res.status(200).json({ tasks, summary });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  } else if (req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { title, description, priority = 'medium', dueDate } = body as CreateTaskBody;

      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      await sql`
        INSERT INTO staff_tasks (id, staff_id, title, description, status, priority, due_date, assigned_by_role, created_at, updated_at)
        VALUES (${id}, ${staffId}, ${title}, ${description || ''}, 'pending', ${priority}, ${dueDate || null}, 'self', ${now}, ${now})
      `;

      const newTask: Task = {
        id,
        staffId,
        title,
        description: description || '',
        status: 'pending',
        priority,
        dueDate: dueDate || null,
        assignedBy: null,
        assignedByRole: 'self',
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      };

      return res.status(201).json(newTask);
    } catch (error) {
      console.error('Error creating task:', error);
      return res.status(500).json({ error: 'Failed to create task' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Task ID is required' });
      }

      const body = await parseBody(req);
      const updates = body as UpdateTaskBody;
      const now = new Date().toISOString();

      const existing = await sql`SELECT * FROM staff_tasks WHERE id = ${id as string} AND staff_id = ${staffId}`;
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const task = existing.rows[0];
      const completedAt = updates.status === 'completed' ? now : updates.status ? null : task.completed_at;

      await sql`
        UPDATE staff_tasks SET
          title = COALESCE(${updates.title ?? null}, title),
          description = COALESCE(${updates.description ?? null}, description),
          priority = COALESCE(${updates.priority ?? null}, priority),
          due_date = COALESCE(${updates.dueDate ?? null}, due_date),
          status = COALESCE(${updates.status ?? null}, status),
          completed_at = ${completedAt},
          updated_at = ${now}
        WHERE id = ${id as string} AND staff_id = ${staffId}
      `;

      const updated = await sql`
        SELECT id::text, staff_id, title, description, status, priority, due_date::text, assigned_by, assigned_by_role, created_at::text, updated_at::text, completed_at::text
        FROM staff_tasks WHERE id = ${id as string} AND staff_id = ${staffId}
      `;
      const r = updated.rows[0];

      return res.status(200).json({
        id: r.id,
        staffId: r.staff_id,
        title: r.title,
        description: r.description || '',
        status: r.status as Task['status'],
        priority: r.priority as Task['priority'],
        dueDate: r.due_date || null,
        assignedBy: r.assigned_by || null,
        assignedByRole: r.assigned_by_role as Task['assignedByRole'],
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        completedAt: r.completed_at || null,
      });
    } catch (error) {
      console.error('Error updating task:', error);
      return res.status(500).json({ error: 'Failed to update task' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Task ID is required' });
      }

      await sql`DELETE FROM staff_tasks WHERE id = ${id as string} AND staff_id = ${staffId}`;
      return res.status(200).json({ success: true, message: 'Task deleted' });
    } catch (error) {
      console.error('Error deleting task:', error);
      return res.status(500).json({ error: 'Failed to delete task' });
    }
  } else {
    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
