import { Router } from 'express';
import { db } from '../../_lib/db';

const router = Router();

// GET MFA status for all users
router.get('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'x-tenant-id header required' });
    }

    const mfaStatus = db
      .prepare(`
        SELECT id, name, email, mfaEnabled, mfaMethod, createdAt
        FROM mfa_settings
        WHERE tenantId = ?
        ORDER BY createdAt DESC
      `)
      .all(tenantId);

    res.json({ data: