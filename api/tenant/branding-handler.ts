import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireRole } from '../_lib/auth-middleware';

/**
 * Branding API Handler
 * Routes:
 *   GET    /api/tenant/branding                    - Get branding config
 *   PUT    /api/tenant/branding                    - Update branding config
 *   POST   /api/tenant/branding/logo               - Upload logo
 *   POST   /api/tenant/branding/publish            - Publish branding
 *   GET    /api/tenant/branding/history            - Get branding history
 *   GET    /api/tenant/branding/audit-logs         - Get audit logs
 */
async function ensureColumns() {
  await sql`ALTER TABLE branding_configs ADD COLUMN IF NOT EXISTS school_address TEXT`;
  await sql`ALTER TABLE branding_configs ADD COLUMN IF NOT EXISTS school_email TEXT`;
  await sql`ALTER TABLE branding_configs ADD COLUMN IF NOT EXISTS school_phone TEXT`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Require authentication - only staff or tenant_admin can access tenant branding
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId =
    (req.headers['x-tenant-id'] as string) ||
    (req.query.tenantId as string) ||
    'default-tenant';

  const userId =
    (req.headers['x-user-id'] as string) ||
    (req.query.userId as string) ||
    'system';

  const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;

  try {
    await ensureColumns();

    // POST /api/tenant/branding/logo
    if (req.method === 'POST' && action === 'logo') {
      const { logoUrl, fileName } = req.body || {};
      if (!logoUrl) return res.status(400).json({ error: 'logoUrl is required' });
      const result = await sql.query(
        `INSERT INTO branding_configs (id, tenant_id, logo_url, logo_file_name, updated_by, updated_at)
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW())
         ON CONFLICT (tenant_id)
         DO UPDATE SET logo_url = EXCLUDED.logo_url, logo_file_name = EXCLUDED.logo_file_name,
                       updated_by = EXCLUDED.updated_by, updated_at = NOW()
         RETURNING *`,
        [tenantId, logoUrl, fileName || 'logo', userId]
      );
      return res.status(200).json({ success: true, data: result.rows[0] });
    }

    // POST /api/tenant/branding/publish
    if (req.method === 'POST' && action === 'publish') {
      const result = await sql.query(
        `UPDATE branding_configs SET is_published = true, published_at = NOW(), updated_by = $1, updated_at = NOW()
         WHERE tenant_id = $2 RETURNING *`,
        [userId, tenantId]
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'No branding config found to publish' });
      return res.status(200).json({ success: true, data: result.rows[0] });
    }

    // GET /api/tenant/branding/history
    if (req.method === 'GET' && action === 'history') {
      const limit = parseInt((req.query.limit as string) || '10');
      const result = await sql.query(
        `SELECT * FROM branding_audit_logs WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [tenantId, limit]
      );
      return res.status(200).json({ success: true, data: result.rows });
    }

    // GET /api/tenant/branding/audit-logs
    if (req.method === 'GET' && action === 'audit-logs') {
      const limit = parseInt((req.query.limit as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      const result = await sql.query(
        `SELECT * FROM branding_audit_logs WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [tenantId, limit, offset]
      );
      const count = await sql.query(
        `SELECT COUNT(*) as total FROM branding_audit_logs WHERE tenant_id = $1`,
        [tenantId]
      );
      return res.status(200).json({ success: true, data: result.rows, total: parseInt(count.rows[0]?.total || '0') });
    }

    // GET /api/tenant/branding
    if (req.method === 'GET') {
      const result = await sql.query(
        `SELECT * FROM branding_configs WHERE tenant_id = $1 LIMIT 1`,
        [tenantId]
      );
      const config = result.rows[0] || {
        tenant_id: tenantId,
        school_name: 'Your School',
        school_motto: '',
        school_address: '',
        school_email: '',
        school_phone: '',
        primary_color: '#1E3A8A',
        secondary_color: '#10B981',
        accent_color: '#F59E0B',
        logo_url: null,
        favicon_url: null,
        is_published: false,
      };
      return res.status(200).json({ success: true, data: config });
    }

    // PUT /api/tenant/branding
    if (req.method === 'PUT') {
      const { schoolName, schoolMotto, schoolAddress, schoolEmail, schoolPhone, primaryColor, secondaryColor, accentColor, faviconUrl } = req.body || {};
      const result = await sql.query(
        `INSERT INTO branding_configs (id, tenant_id, school_name, school_motto, school_address, school_email, school_phone, primary_color, secondary_color, accent_color, favicon_url, updated_by, updated_at)
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
         ON CONFLICT (tenant_id)
         DO UPDATE SET
           school_name     = COALESCE(EXCLUDED.school_name, branding_configs.school_name),
           school_motto    = COALESCE(EXCLUDED.school_motto, branding_configs.school_motto),
           school_address  = COALESCE(EXCLUDED.school_address, branding_configs.school_address),
           school_email    = COALESCE(EXCLUDED.school_email, branding_configs.school_email),
           school_phone    = COALESCE(EXCLUDED.school_phone, branding_configs.school_phone),
           primary_color   = COALESCE(EXCLUDED.primary_color, branding_configs.primary_color),
           secondary_color = COALESCE(EXCLUDED.secondary_color, branding_configs.secondary_color),
           accent_color    = COALESCE(EXCLUDED.accent_color, branding_configs.accent_color),
           favicon_url     = COALESCE(EXCLUDED.favicon_url, branding_configs.favicon_url),
           updated_by      = EXCLUDED.updated_by,
           updated_at      = NOW()
         RETURNING *`,
        [tenantId, schoolName || null, schoolMotto || null, schoolAddress || null,
         schoolEmail || null, schoolPhone || null, primaryColor || null,
         secondaryColor || null, accentColor || null, faviconUrl || null, userId]
      );
      return res.status(200).json({ success: true, data: result.rows[0] });
    }

    res.setHeader('Allow', 'GET, PUT, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[branding-handler]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
