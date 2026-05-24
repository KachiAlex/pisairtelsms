import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

/**
 * Grading Scales API Handler
 * Routes:
 *   GET    /api/tenant/grading-scales                           - List scales
 *   POST   /api/tenant/grading-scales                          - Create scale
 *   GET    /api/tenant/grading-scales/:id                      - Get scale by ID
 *   PUT    /api/tenant/grading-scales/:id                      - Update scale
 *   DELETE /api/tenant/grading-scales/:id                      - Delete scale
 *   POST   /api/tenant/grading-scales/:id/publish              - Publish scale
 *   POST   /api/tenant/grading-scales/:id/archive              - Archive scale
 *   POST   /api/tenant/grading-scales/:id/duplicate            - Duplicate scale
 *   GET    /api/tenant/grading-scales/:id/versions             - Get versions
 *   POST   /api/tenant/grading-scales/:id/bands                - Add/update band
 *   DELETE /api/tenant/grading-scales/:id/bands/:bandId        - Remove band
 *   GET    /api/tenant/grading-scales/:id/policy-rules         - Get policy rules
 *   POST   /api/tenant/grading-scales/:id/policy-rules         - Add policy rule
 *   PUT    /api/tenant/grading-scales/:id/policy-rules/:ruleId - Update policy rule
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const tenantId =
    (req.headers['x-tenant-id'] as string) ||
    (req.query.tenantId as string) ||
    'default-tenant';

  const userId =
    (req.headers['x-user-id'] as string) ||
    (req.query.userId as string) ||
    'system';

  const { id, action, bandId } = req.query;
  const idStr     = Array.isArray(id)     ? id[0]     : id;
  const actionStr = Array.isArray(action) ? action[0] : action;
  const bandIdStr = Array.isArray(bandId) ? bandId[0] : bandId;

  try {
    // POST /api/tenant/grading-scales/:id/publish
    if (req.method === 'POST' && idStr && actionStr === 'publish') {
      const r = await sql.query(
        `UPDATE grading_scales SET status='live', published_at=NOW(), published_by=$1, updated_at=NOW()
         WHERE tenant_id=$2 AND id=$3 RETURNING *`,
        [userId, tenantId, idStr]
      );
      if (!r.rows[0]) return res.status(404).json({ success: false, error: 'Not found' });
      await sql.query(
        `INSERT INTO grading_scale_audit(tenant_id,scale_id,action,description,performed_by) VALUES($1,$2,'published','Scale published',$3)`,
        [tenantId, idStr, userId]
      );
      return res.status(200).json({ success: true, data: r.rows[0] });
    }

    // POST /api/tenant/grading-scales/:id/archive
    if (req.method === 'POST' && idStr && actionStr === 'archive') {
      const r = await sql.query(
        `UPDATE grading_scales SET status='archived', updated_at=NOW(), updated_by=$1 WHERE tenant_id=$2 AND id=$3 RETURNING *`,
        [userId, tenantId, idStr]
      );
      if (!r.rows[0]) return res.status(404).json({ success: false, error: 'Not found' });
      return res.status(200).json({ success: true, data: r.rows[0] });
    }

    // DELETE /api/tenant/grading-scales/:id/bands/:bandId
    if (req.method === 'DELETE' && idStr && actionStr === 'bands' && bandIdStr) {
      await sql.query(`DELETE FROM grading_scale_bands WHERE id=$1 AND scale_id=$2`, [bandIdStr, idStr]);
      return res.status(200).json({ success: true });
    }

    // POST /api/tenant/grading-scales/:id/bands
    if (req.method === 'POST' && idStr && actionStr === 'bands') {
      const { grade, minScore, maxScore, remark, gpaWeight, color } = req.body || {};
      const r = await sql.query(
        `INSERT INTO grading_scale_bands(id,scale_id,tenant_id,grade,min_score,max_score,remark,gpa_weight,color)
         VALUES(gen_random_uuid()::text,$1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [idStr, tenantId, grade, minScore, maxScore, remark || null, gpaWeight || 0, color || null]
      );
      return res.status(201).json({ success: true, data: r.rows[0] });
    }

    // GET /api/tenant/grading-scales/:id/bands
    if (req.method === 'GET' && idStr && actionStr === 'bands') {
      const r = await sql.query(
        `SELECT * FROM grading_scale_bands WHERE scale_id=$1 ORDER BY min_score DESC`, [idStr]
      );
      return res.status(200).json({ success: true, data: r.rows });
    }

    // GET /api/tenant/grading-scales/:id/audit
    if (req.method === 'GET' && idStr && actionStr === 'audit') {
      const r = await sql.query(
        `SELECT * FROM grading_scale_audit WHERE scale_id=$1 ORDER BY created_at DESC LIMIT 50`, [idStr]
      );
      return res.status(200).json({ success: true, data: r.rows });
    }

    // GET /api/tenant/grading-scales/audit
    if (req.method === 'GET' && idStr === 'audit') {
      const limit = parseInt((req.query.limit as string) || '20');
      const r = await sql.query(
        `SELECT * FROM grading_scale_audit WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT $2`,
        [tenantId, limit]
      );
      return res.status(200).json({ success: true, data: r.rows });
    }

    // GET /api/tenant/grading-scales/:id
    if (req.method === 'GET' && idStr && !actionStr) {
      const r = await sql.query(`SELECT * FROM grading_scales WHERE tenant_id=$1 AND id=$2`, [tenantId, idStr]);
      if (!r.rows[0]) return res.status(404).json({ success: false, error: 'Not found' });
      const bands = await sql.query(`SELECT * FROM grading_scale_bands WHERE scale_id=$1 ORDER BY min_score DESC`, [idStr]);
      return res.status(200).json({ success: true, data: { ...r.rows[0], bands: bands.rows } });
    }

    // PUT /api/tenant/grading-scales/:id
    if (req.method === 'PUT' && idStr) {
      const { name, description, type, minimumPassMark, distinctionThreshold, remediationTrigger } = req.body || {};
      const r = await sql.query(
        `UPDATE grading_scales SET
           name=COALESCE($1,name), description=COALESCE($2,description), type=COALESCE($3,type),
           minimum_pass_mark=COALESCE($4,minimum_pass_mark), distinction_threshold=COALESCE($5,distinction_threshold),
           remediation_trigger=COALESCE($6,remediation_trigger), updated_by=$7, updated_at=NOW()
         WHERE tenant_id=$8 AND id=$9 RETURNING *`,
        [name||null, description||null, type||null, minimumPassMark||null,
         distinctionThreshold||null, remediationTrigger||null, userId, tenantId, idStr]
      );
      if (!r.rows[0]) return res.status(404).json({ success: false, error: 'Not found' });
      return res.status(200).json({ success: true, data: r.rows[0] });
    }

    // DELETE /api/tenant/grading-scales/:id
    if (req.method === 'DELETE' && idStr) {
      await sql.query(`DELETE FROM grading_scales WHERE tenant_id=$1 AND id=$2`, [tenantId, idStr]);
      return res.status(200).json({ success: true });
    }

    // GET /api/tenant/grading-scales
    if (req.method === 'GET') {
      const limit  = parseInt((req.query.limit  as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      const type   = req.query.type   as string | undefined;
      const status = req.query.status as string | undefined;
      let q = `SELECT * FROM grading_scales WHERE tenant_id=$1`;
      const params: any[] = [tenantId];
      let p = 2;
      if (type)   { q += ` AND type=$${p++}`;   params.push(type); }
      if (status) { q += ` AND status=$${p++}`; params.push(status); }
      q += ` ORDER BY created_at DESC LIMIT $${p++} OFFSET $${p++}`;
      params.push(limit, offset);
      const r = await sql.query(q, params);
      return res.status(200).json({ success: true, data: r.rows });
    }

    // POST /api/tenant/grading-scales
    if (req.method === 'POST') {
      const { name, description, type, minimumPassMark, distinctionThreshold, remediationTrigger } = req.body || {};
      if (!name) return res.status(400).json({ success: false, error: 'name required' });
      const r = await sql.query(
        `INSERT INTO grading_scales(id,tenant_id,name,description,type,minimum_pass_mark,distinction_threshold,remediation_trigger,created_by,updated_by)
         VALUES(gen_random_uuid()::text,$1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING *`,
        [tenantId, name, description||null, type||'primary',
         minimumPassMark||null, distinctionThreshold||null, remediationTrigger||null, userId]
      );
      await sql.query(
        `INSERT INTO grading_scale_audit(tenant_id,scale_id,action,description,performed_by) VALUES($1,$2,'created',$3,$4)`,
        [tenantId, r.rows[0].id, `Scale "${name}" created`, userId]
      );
      return res.status(201).json({ success: true, data: r.rows[0] });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('[grading-scales-handler]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ success: false, error: message });
  }
}
