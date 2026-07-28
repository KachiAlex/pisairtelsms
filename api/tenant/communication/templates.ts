import { Router } from 'express';
import { db } from '../../_lib/db';

const router = Router();

// GET all templates for tenant
router.get('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'x-tenant-id header required' });
    }

    const templates = db
      .prepare('SELECT * FROM communication_templates WHERE tenantId = ? ORDER BY createdAt DESC')
      .all(tenantId);

    res.json({ data: templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// GET single template
router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'x-tenant-id header required' });
    }

    const template = db
      .prepare('SELECT * FROM communication_templates WHERE id = ? AND tenantId = ?')
      .get(req.params.id, tenantId);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ data: template });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// POST create template
router.post('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'x-tenant-id header required' });
    }

    const { name, category, subject, body, channels, variables } = req.body;

    if (!name || !category || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = `template_${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO communication_templates (id, tenantId, name, category, subject, body, channels, variables, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      tenantId,
      name,
      category,
      subject,
      body,
      JSON.stringify(channels || []),
      JSON.stringify(variables || []),
      now,
      now
    );

    const template = db
      .prepare('SELECT * FROM communication_templates WHERE id = ?')
      .get(id);

    res.status(201).json({ data: template });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// PUT update template
router.put('/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'x-tenant-id header required' });
    }

    const { name, category, subject, body, channels, variables } = req.body;

    const template = db
      .prepare('SELECT * FROM communication_templates WHERE id = ? AND tenantId = ?')
      .get(req.params.id, tenantId);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE communication_templates
      SET name = ?, category = ?, subject = ?, body = ?, channels = ?, variables = ?, updatedAt = ?
      WHERE id = ? AND tenantId = ?
    `).run(
      name || template.name,
      category || template.category,
      subject || template.subject,
      body || template.body,
      channels ? JSON.stringify(channels) : template.channels,
      variables ? JSON.stringify(variables) : template.variables,
      now,
      req.params.id,
      tenantId
    );

    const updated = db
      .prepare('SELECT * FROM communication_templates WHERE id = ?')
      .get(req.params.id);

    res.json({ data: updated });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// DELETE template
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'x-tenant-id header required' });
    }

    const template = db
      .prepare('SELECT * FROM communication_templates WHERE id = ? AND tenantId = ?')
      .get(req.params.id, tenantId);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    db.prepare('DELETE FROM communication_templates WHERE id = ? AND tenantId = ?')
      .run(req.params.id, tenantId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;
