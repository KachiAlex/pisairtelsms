import { Router } from 'express';
import { db } from '../_lib/db';

const router = Router();

// GET all tasks for tenant
router.get('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'x-tenant-id header required' });
    }

    const tasks = db
      .prepare('SELECT * FROM tasks WHERE tenantId = ? ORDER BY dueDate ASC, createdAt DESC')
      .all(tenantId);

    res.json({ data: tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET single task
router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'x-tenant-id header required' });
    }

    const task = db
      .prepare('SELECT * FROM tasks WHERE id = ? AND tenantId = ?')
      .get(req.params.id, tenantId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ data: task });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// POST create task
router.post('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'x-tenant-id header required' });
    }

    const { title, description, assignedTo, priority, status, dueDate, dependencies } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const id = `task_${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO tasks (id, tenantId, title, description, assignedTo, priority, status, dueDate, dependencies, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      tenantId,
      title,
      description || '',
      assignedTo || null,
      priority || 'Medium',
      status || 'Not Started',
      dueDate || null,
      dependencies ? JSON.stringify(dependencies) : JSON.stringify([]),
      now,
      now
    );

    const task = db
      .prepare('SELECT * FROM tasks WHERE id = ?')
      .get(id);

    res.status(201).json({ data: task });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PUT update task
router.put('/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'x-tenant-id header required' });
    }

    const { title, description, assignedTo, priority, status, dueDate, dependencies } = req.body;

    const task = db
      .prepare('SELECT * FROM tasks WHERE id = ? AND tenantId = ?')
      .get(req.params.id, tenantId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE tasks
      SET title = ?, description = ?, assignedTo = ?, priority = ?, status = ?, dueDate = ?, dependencies = ?, updatedAt = ?
      WHERE id = ? AND tenantId = ?
    `).run(
      title || task.title,
      description !== undefined ? description : task.description,
      assignedTo !== undefined ? assignedTo : task.assignedTo,
      priority || task.priority,
      status || task.status,
      dueDate !== undefined ? dueDate : task.dueDate,
      dependencies ? JSON.stringify(dependencies) : task.dependencies,
      now,
      req.params.id,
      tenantId
    );

    const updated = db
      .prepare('SELECT * FROM tasks WHERE id = ?')
      .get(req.params.id);

    res.json({ data: updated });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE task
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'x-tenant-id header required' });
    }

    const task = db
      .prepare('SELECT * FROM tasks WHERE id = ? AND tenantId = ?')
      .get(req.params.id, tenantId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    db.prepare('DELETE FROM tasks WHERE id = ? AND tenantId = ?')
      .run(req.params.id, tenantId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
