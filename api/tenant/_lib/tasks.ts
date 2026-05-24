import { v4 as uuidv4 } from 'uuid';

interface TaskRecord {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  createdBy: string;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const tasks: TaskRecord[] = [];
const comments: TaskComment[] = [];

export const tasksApi = {
  // List tasks
  list: (tenantId: string, filters?: { status?: string; assignedTo?: string; priority?: string; limit?: number; offset?: number }) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const { status, assignedTo, priority, limit = 50, offset = 0 } = filters || {};

    let filtered = tasks.filter(t => t.tenantId === tenantId);
    if (status) filtered = filtered.filter(t => t.status === status);
    if (assignedTo) filtered = filtered.filter(t => t.assignedTo === assignedTo);
    if (priority) filtered = filtered.filter(t => t.priority === priority);

    const data = filtered
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    return { data, total: filtered.length };
  },

  // Create task
  create: (tenantId: string, userId: string, payload: { title: string; description?: string; assignedTo?: string; priority?: string; dueDate?: string }) => {
    if (!tenantId || !userId || !payload.title) {
      throw new Error('Missing required fields');
    }

    const task: TaskRecord = {
      id: uuidv4(),
      tenantId,
      title: payload.title,
      description: payload.description,
      status: 'open',
      priority: (payload.priority || 'medium') as any,
      assignedTo: payload.assignedTo,
      createdBy: userId,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    tasks.push(task);
    return task;
  },

  // Get task by ID
  getById: (tenantId: string, id: string) => {
    const task = tasks.find(t => t.id === id && t.tenantId === tenantId);
    if (!task) throw new Error('Task not found');

    const taskComments = comments
      .filter(c => c.taskId === id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return { ...task, comments: taskComments };
  },

  // Update task
  update: (tenantId: string, id: string, payload: { title?: string; description?: string; status?: string; priority?: string; assignedTo?: string; dueDate?: string }) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const task = tasks.find(t => t.id === id && t.tenantId === tenantId);
    if (!task) throw new Error('Task not found');

    if (payload.title) task.title = payload.title;
    if (payload.description) task.description = payload.description;
    if (payload.status) {
      task.status = payload.status as any;
      if (payload.status === 'completed') {
        task.completedAt = new Date();
      }
    }
    if (payload.priority) task.priority = payload.priority as any;
    if (payload.assignedTo !== undefined) task.assignedTo = payload.assignedTo;
    if (payload.dueDate) task.dueDate = new Date(payload.dueDate);

    task.updatedAt = new Date();
    return task;
  },

  // Delete task
  delete: (tenantId: string, id: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const index = tasks.findIndex(t => t.id === id && t.tenantId === tenantId);
    if (index === -1) throw new Error('Task not found');

    const deleted = tasks.splice(index, 1)[0];
    return deleted;
  },

  // Add comment to task
  addComment: (tenantId: string, userId: string, taskId: string, text: string) => {
    if (!tenantId || !userId || !text) {
      throw new Error('Missing required fields');
    }

    const task = tasks.find(t => t.id === taskId && t.tenantId === tenantId);
    if (!task) throw new Error('Task not found');

    const comment: TaskComment = {
      id: uuidv4(),
      taskId,
      userId,
      text,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    comments.push(comment);
    return comment;
  },

  // Get task comments
  getComments: (tenantId: string, taskId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const task = tasks.find(t => t.id === taskId && t.tenantId === tenantId);
    if (!task) throw new Error('Task not found');

    return comments
      .filter(c => c.taskId === taskId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  // Get task statistics
  getStatistics: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const tenantTasks = tasks.filter(t => t.tenantId === tenantId);
    return {
      total: tenantTasks.length,
      open: tenantTasks.filter(t => t.status === 'open').length,
      inProgress: tenantTasks.filter(t => t.status === 'in_progress').length,
      completed: tenantTasks.filter(t => t.status === 'completed').length,
      byPriority: {
        high: tenantTasks.filter(t => t.priority === 'high').length,
        medium: tenantTasks.filter(t => t.priority === 'medium').length,
        low: tenantTasks.filter(t => t.priority === 'low').length,
      },
    };
  },
};

export default tasksApi;


// Get task statistics (for compatibility with existing code)
export const getStatistics = (tenantId: string) => {
  return tasksApi.getStatistics(tenantId);
};
