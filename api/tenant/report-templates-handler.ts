import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireRole } from '../_lib/auth-middleware.js';

/**
 * Report Templates API Handler — backed by real DB
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Require authentication - only staff or tenant_admin can access tenant report templates
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId =
    (req.headers['x-tenant-id'] as string) ||
    (req.query.tenantId as string) ||
    'default-tenant';

  const userId =
    (req.headers['x-user-id'] as string) ||
    (req.query.userId as string) ||
    'system';

  const { id, action, fieldId } = req.query;
  const idStr      = Array.isArray(id)      ? id[0]      : id;
  const actionStr  = Array.isArray(action)  ? action[0]  : action;
  const fieldIdStr = Array.isArray(fieldId) ? fieldId[0] : fieldId;

  try {
    // POST /:id/publish
    if (req.method === 'POST' && idStr && actionStr === 'publish') {
      const r = await sql.query(
        `UPDATE report_templates SET status='live', published_at=NOW(), published_by=$1, updated_at=NOW()
         WHERE tenant_id=$2 AND id=$3 RETURNING *`,
        [userId, tenantId, idStr]
      );
      if (!r.rows[0]) return res.status(404).json({ success: false, error: 'Not found' });
      return res.status(200).json({ success: true, data: r.rows[0] });
    }

    // POST /:id/archive
    if (req.method === 'POST' && idStr && actionStr === 'archive') {
      const r = await sql.query(
        `UPDATE report_templates SET status='archived', updated_by=$1, updated_at=NOW() WHERE tenant_id=$2 AND id=$3 RETURNING *`,
        [userId, tenantId, idStr]
      );
      if (!r.rows[0]) return res.status(404).json({ success: false, error: 'Not found' });
      return res.status(200).json({ success: true, data: r.rows[0] });
    }

    // DELETE /:id/fields/:fieldId
    if (req.method === 'DELETE' && idStr && actionStr === 'fields' && fieldIdStr) {
      await sql.query(`DELETE FROM report_template_fields WHERE id=$1 AND template_id=$2`, [fieldIdStr, idStr]);
      return res.status(200).json({ success: true });
    }

    // POST /:id/fields
    if (req.method === 'POST' && idStr && actionStr === 'fields') {
      const { name, label, type, required, sortOrder, config } = req.body || {};
      const r = await sql.query(
        `INSERT INTO report_template_fields(id,template_id,tenant_id,name,label,type,required,sort_order,config)
         VALUES(gen_random_uuid()::text,$1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [idStr, tenantId, name, label, type||'text', required||false, sortOrder||0, config ? JSON.stringify(config) : null]
      );
      return res.status(201).json({ success: true, data: r.rows[0] });
    }

    // GET /:id/fields
    if (req.method === 'GET' && idStr && actionStr === 'fields') {
      const r = await sql.query(
        `SELECT * FROM report_template_fields WHERE template_id=$1 ORDER BY sort_order ASC`, [idStr]
      );
      return res.status(200).json({ success: true, data: r.rows });
    }

    // GET /:id (single template with fields)
    if (req.method === 'GET' && idStr && !actionStr) {
      const r = await sql.query(`SELECT * FROM report_templates WHERE tenant_id=$1 AND id=$2`, [tenantId, idStr]);
      if (!r.rows[0]) return res.status(404).json({ success: false, error: 'Not found' });
      const fields = await sql.query(`SELECT * FROM report_template_fields WHERE template_id=$1 ORDER BY sort_order`, [idStr]);
      return res.status(200).json({ success: true, data: { ...r.rows[0], fields: fields.rows } });
    }

    // PUT /:id
    if (req.method === 'PUT' && idStr) {
      const { name, description, audience, format } = req.body || {};
      const r = await sql.query(
        `UPDATE report_templates SET
           name=COALESCE($1,name), description=COALESCE($2,description),
           audience=COALESCE($3,audience), format=COALESCE($4,format),
           updated_by=$5, updated_at=NOW()
         WHERE tenant_id=$6 AND id=$7 RETURNING *`,
        [name||null, description||null, audience||null, format||null, userId, tenantId, idStr]
      );
      if (!r.rows[0]) return res.status(404).json({ success: false, error: 'Not found' });
      return res.status(200).json({ success: true, data: r.rows[0] });
    }

    // DELETE /:id
    if (req.method === 'DELETE' && idStr) {
      await sql.query(`DELETE FROM report_templates WHERE tenant_id=$1 AND id=$2`, [tenantId, idStr]);
      return res.status(200).json({ success: true });
    }

    // GET / (list)
    if (req.method === 'GET') {
      const limit    = parseInt((req.query.limit    as string) || '50');
      const offset   = parseInt((req.query.offset   as string) || '0');
      const status   = req.query.status   as string | undefined;
      const audience = req.query.audience as string | undefined;
      let q = `SELECT * FROM report_templates WHERE tenant_id=$1`;
      const params: any[] = [tenantId];
      let p = 2;
      if (status)   { q += ` AND status=$${p++}`;   params.push(status); }
      if (audience) { q += ` AND audience=$${p++}`; params.push(audience); }
      q += ` ORDER BY created_at DESC LIMIT $${p++} OFFSET $${p++}`;
      params.push(limit, offset);
      const r = await sql.query(q, params);
      return res.status(200).json({ success: true, data: r.rows });
    }

    // POST / (create)
    if (req.method === 'POST') {
      const { name, description, audience, format } = req.body || {};
      if (!name) return res.status(400).json({ success: false, error: 'name required' });
      const r = await sql.query(
        `INSERT INTO report_templates(id,tenant_id,name,description,audience,format,created_by,updated_by)
         VALUES(gen_random_uuid()::text,$1,$2,$3,$4,$5,$6,$6) RETURNING *`,
        [tenantId, name, description||null, audience||'parents', format||'PDF', userId]
      );
      return res.status(201).json({ success: true, data: r.rows[0] });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('[report-templates-handler]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ success: false, error: message });
  }
}
