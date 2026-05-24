import { Router } from 'express';
import { db } from '../_lib/db';

const router = Router();

// GET all notifications for tenant
router.get('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'x-tenant-id header required' });
    }

    const notifications = db
      .prepare(`
        SELECT * FROM notifications 
        WHERE tenantId = ? 
        ORDER BY createdAt DESC
      `)
      .all(tenantId);

    res.json({ data: notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET unread notifications count
router.get('/unread/count', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'x-tenant-id header required' });
    }

    const result = db
      .prepare('SELECT COUNT(*) as count FROM notifications WHERE tenantId = ? AND read = 0')
      .get(tenantId) as { count: number };

    res.json({ data: { unreadCount: result.count } });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// POST create notification
router.post('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'x-tenant-id header required' });
    }

    const { userId, type, title, body } = req.body;

    if (!userId || !type || !title || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = `notif_${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO notifications (id, tenantId, userId, type, title, body, read, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      tenantId,
      userId,
      type,
      title,
      body,
      0,
      now
    );

    const notification = db
      .prepare('SELECT * FROM notifications WHERE id = ?')
      .get(id);

    res.status(201).json({ data: notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// PUT mark as read
router.put('/:id/read', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'x-tenant-id header required' });
    }

    const notification = db
      .prepare('SELECT * FROM notifications WHERE id = ? AND tenantId = ?')
      .get(req.params.id, tenantId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    db.prepare('UPDATE notifications SET read = 1 WHERE id = ?')
      .run(req.params.id);

    const updated = db
      .prepare('SELECT * FROM notifications WHERE id = ?')
      .get(req.params.id);

    res.json({ data: updated });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// PUT archive notification
router.put('/:id/archive', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'x-tenant-id header required' });
    }

    const notification = db
      .prepare('SELECT * FROM notifications WHERE id = ? AND tenantId = ?')
      .get(req.params.id, tenantId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE notifications SET archivedAt = ? WHERE id = ?')
      .run(now, req.params.id);

    const updated = db
      .prepare('SELECT * FROM notifications WHERE id = ?')
      .get(req.params.id);

    res.json({ data: updated });
  } catch (error) {
    console.error('Error archiving notification:', error);
    res.status(500).json({ error: 'Failed to archive notification' });
  }
});

// DELETE notification
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'x-tenant-id header required' });
    }

    const notification = db
      .prepare('SELECT * FROM notifications WHERE id = ? AND tenantId = ?')
      .get(req.params.id, tenantId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    db.prepare('DELETE FROM notifications WHERE id = ? AND tenantId = ?')
      .run(req.params.id, tenantId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;
