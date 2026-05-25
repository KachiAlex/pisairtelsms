import type { VercelRequest, VercelResponse } from '@vercel/node';

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

// Mock tasks storage (replace with database)
const mockTasks: Record<string, Task[]> = {};

function getMockTasks(staffId: string): Task[] {
  if (!mockTasks[staffId]) {
    const now = new Date();
    mockTasks[staffId] = [
      {
        id: `task-${staffId}-1`,
        staffId,
        title: 'Complete mid-term exam grading',
        description: 'Grade all JSS3 Mathematics papers before Friday',
        status: 'in_progress',
        priority: 'high',
        dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        assignedBy: 'Academic Officer',
        assignedByRole: 'admin',
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      },
      {
        id: `task-${staffId}-2`,
        staffId,
        title: 'Submit lesson plan for next week',
        description: 'Upload lesson plans for SS1 and SS2 classes',
        status: 'pending',
        priority: 'medium',
        dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        assignedBy: 'Principal',
        assignedByRole: 'admin',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      },
      {
        id: `task-${staffId}-3`,
        staffId,
        title: 'Parent-Teacher meeting preparation',
        description: 'Prepare progress reports for upcoming PTA meeting',
        status: 'pending',
        priority: 'urgent',
        dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        assignedBy: 'Admin Office',
        assignedByRole: 'admin',
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      },
      {
        id: `task-${staffId}-4`,
        staffId,
        title: 'Prepare laboratory equipment',
        description: 'Set up chemistry lab for practical exam',
        status: 'completed',
        priority: 'medium',
        dueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        assignedBy: 'Science Coordinator',
        assignedByRole: 'admin',
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: `task-${staffId}-5`,
        staffId,
        title: 'Update student attendance records',
        description: 'Verify and update attendance for last week',
        status: 'pending',
        priority: 'low',
        dueDate: null,
        assignedBy: null,
        assignedByRole: 'self',
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      },
    ];
  }
  return mockTasks[staffId];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const staffId = extractStaffIdFromToken(req);
  if (!staffId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
  }

  if (req.method === 'GET') {
    try {
      const { status, priority } = req.query;
      let tasks = getMockTasks(staffId);

      // Apply filters
      if (status) {
        tasks = tasks.filter(t => t.status === status);
      }
      if (priority) {
        tasks = tasks.filter(t => t.priority === priority);
      }

      // Sort by priority and due date
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

      const response: TasksListResponse = {
        tasks,
        summary,
      };

      return res.status(200).json(response);
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

      const now = new Date().toISOString();
      const newTask: Task = {
        id: `task-${staffId}-${Date.now()}`,
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

      mockTasks[staffId] = [newTask, ...getMockTasks(staffId)];

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

      const tasks = getMockTasks(staffId);
      const taskIndex = tasks.findIndex(t => t.id === id);

      if (taskIndex === -1) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const task = tasks[taskIndex];
      const now = new Date().toISOString();

      // Update fields
      if (updates.title !== undefined) task.title = updates.title;
      if (updates.description !== undefined) task.description = updates.description;
      if (updates.priority !== undefined) task.priority = updates.priority;
      if (updates.dueDate !== undefined) task.dueDate = updates.dueDate;
      if (updates.status !== undefined) {
        task.status = updates.status;
        if (updates.status === 'completed') {
          task.completedAt = now;
        } else {
          task.completedAt = null;
        }
      }
      task.updatedAt = now;

      return res.status(200).json(task);
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

      const tasks = getMockTasks(staffId);
      const taskIndex = tasks.findIndex(t => t.id === id);

      if (taskIndex === -1) {
        return res.status(404).json({ error: 'Task not found' });
      }

      mockTasks[staffId] = tasks.filter(t => t.id !== id);

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
