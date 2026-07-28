import type { VercelRequest, VercelResponse } from '@vercel/node';
import encryptionLib from './encryption';
import { requireRole } from '../../_lib/auth-middleware.js';

/**
 * Encryption API Handler
 * Routes:
 *   GET    /api/tenant/security/encryption/config       - Get encryption config
 *   PUT    /api/tenant/security/encryption/config       - Update encryption config
 *   GET    /api/tenant/security/encryption/audit-logs   - Get audit logs
 *   POST   /api/tenant/security/encryption/rotate-keys  - Rotate encryption keys
 *   GET    /api/tenant/security/encryption/fields       - Get encryptable fields
 *   PUT    /api/tenant/security/encryption/fields       - Update encrypted fields
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin']);
  if (!decoded) return;

  const tenantId =
    (req.headers['x-tenant-id'] as string) ||
    (req.query.tenantId as string) ||
    'default-tenant';

  const userId =
    (req.headers['x-user-id'] as string) ||
    (req.query.userId as string) ||
    'system';

  const { action } = req.query;

  try {
    // GET /api/tenant/security/encryption/audit-logs
    if (req.method === 'GET' && action === 'audit-logs') {
      const limit = parseInt((req.query.limit as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      const logs = encryptionLib.getEncryptionAuditLogs(tenantId, limit, offset);
      return res.status(200).json(logs);
    }

    // POST /api/tenant/security/encryption/rotate-keys
    if (req.method === 'POST' && action === 'rotate-keys') {
      const result = encryptionLib.rotateEncryptionKeys(tenantId, userId);
      return res.status(200).json(result);
    }

    // GET /api/tenant/security/encryption/fields
    if (req.method === 'GET' && action === 'fields') {
      const fields = encryptionLib.getEncryptableFields(tenantId);
      return res.status(200).json(fields);
    }

    // PUT /api/tenant/security/encryption/fields
    if (req.method === 'PUT' && action === 'fields') {
      const { encryptedFields } = req.body || {};
      if (!encryptedFields || !Array.isArray(encryptedFields)) {
        return res.status(400).json({ error: 'encryptedFields array is required' });
      }
      const result = encryptionLib.updateEncryptedFields(tenantId, userId, encryptedFields);
      return res.status(200).json(result);
    }

    // GET /api/tenant/security/encryption/config (default)
    if (req.method === 'GET') {
      const config = encryptionLib.getEncryptionConfig(tenantId);
      return res.status(200).json(config);
    }

    // PUT /api/tenant/security/encryption/config (default)
    if (req.method === 'PUT') {
      const { algorithm, keyRotationDays, encryptedFields } = req.body || {};
      const config = encryptionLib.updateEncryptionConfig(
        tenantId,
        userId,
        algorithm,
        keyRotationDays,
        encryptedFields
      );
      return res.status(200).json(config);
    }

    res.setHeader('Allow', 'GET, PUT, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: message });
  }
}
