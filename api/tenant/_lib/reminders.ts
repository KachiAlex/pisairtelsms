import { Router } from 'express';
import { db } from '../_lib/db';

const router = Router();

// GET all reminders for tenant
router.get('/', async (req, res) => {
  try {
    const tenantId = decoded.tenantId || 'default-tenant';

    const reminders = db
      .prepare('SELECT * FROM reminders WHERE tenantId = ? ORDER BY scheduledTime ASC')
      .all(tenantId);

    res.json({ data: reminders });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

// GET reminders for a task
router.get('/task/:taskId', async (req, res) => {
  try {
    const tenantId = decoded.tenantId || 'default-tenant';

    const reminders = db
      .prepare('SELECT * FROM reminders WHERE tenantId = ? AND taskId = ? ORDER BY scheduledTime ASC')
      .all(tenantId, req.params.taskId);

    res.json({ data: reminders });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

// POST create reminder
router.post('/', async (req, res) => {
  try {
    const tenantId = decoded.tenantId || 'default-tenant';

    const { taskId, channel, scheduledTime } = req.body;

    if (!taskId || !channel || !scheduledTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = `reminder_${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO reminders (id, tenantId, taskId, channel, scheduledTime, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      tenantId,
      taskId,
      channel,
      scheduledTime,
      now
    );

    const reminder = db
      .prepare('SELECT * FROM reminders WHERE id = ?')
      .get(id);

    res.status(201).json({ data: reminder });
  } catch (error) {
    console.error('Error creating reminder:', error);
    res.status(500).json({ error: 'Failed to create reminder' });
  }
});

// PUT update reminder
router.put('/:id', async (req, res) => {
  try {
    const tenantId = decoded.tenantId || 'default-tenant';

    const { channel, scheduledTime } = req.body;

    const reminder = db
      .prepare('SELECT * FROM reminders WHERE id = ? AND tenantId = ?')
      .get(req.params.id, tenantId);

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    db.prepare(`
      UPDATE reminders
      SET channel = ?, scheduledTime = ?
      WHERE id = ? AND tenantId = ?
    `).run(
      channel || reminder.channel,
      scheduledTime || reminder.scheduledTime,
      req.params.id,
      tenantId
    );

    const updated = db
      .prepare('SELECT * FROM reminders WHERE id = ?')
      .get(req.params.id);

    res.json({ data: updated });
  } catch (error) {
    console.error('Error updating reminder:', error);
    res.status(500).json({ error: 'Failed to update reminder' });
  }
});

// DELETE reminder
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = decoded.tenantId || 'default-tenant';

    const reminder = db
      .prepare('SELECT * FROM reminders WHERE id = ? AND tenantId = ?')
      .get(req.params.id, tenantId);

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    db.prepare('DELETE FROM reminders WHERE id = ? AND tenantId = ?')
      .run(req.params.id, tenantId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
});

export default router;
