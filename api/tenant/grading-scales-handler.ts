import type { VercelRequest, VercelResponse } from '@vercel/node';
import gradingScalesApi from './_lib/grading-scales';

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

  const { id, action, bandId, ruleId } = req.query;

  try {
    // POST /api/tenant/grading-scales/:id/publish
    if (req.method === 'POST' && id && action === 'publish') {
      const scale = gradingScalesApi.publish(tenantId, userId, id as string);
      return res.status(200).json({ data: scale });
    }

    // POST /api/tenant/grading-scales/:id/archive
    if (req.method === 'POST' && id && action === 'archive') {
      const scale = gradingScalesApi.archive(tenantId, userId, id as string);
      return res.status(200).json({ data: scale });
    }

    // POST /api/tenant/grading-scales/:id/duplicate
    if (req.method === 'POST' && id && action === 'duplicate') {
      const { name } = req.body || {};
      const scale = gradingScalesApi.duplicate(tenantId, userId, id as string, name || 'Copy');
      return res.status(201).json({ data: scale });
    }

    // GET /api/tenant/grading-scales/:id/versions
    if (req.method === 'GET' && id && action === 'versions') {
      const versions = gradingScalesApi.getVersions(tenantId, id as string);
      return res.status(200).json({ data: versions });
    }

    // DELETE /api/tenant/grading-scales/:id/bands/:bandId
    if (req.method === 'DELETE' && id && action === 'bands' && bandId) {
      const scale = gradingScalesApi.removeBand(tenantId, userId, id as string, bandId as string);
      return res.status(200).json({ data: scale });
    }

    // POST /api/tenant/grading-scales/:id/bands
    if (req.method === 'POST' && id && action === 'bands') {
      const scale = gradingScalesApi.addBand(tenantId, userId, id as string, req.body);
      return res.status(200).json({ data: scale });
    }

    // GET /api/tenant/grading-scales/:id/policy-rules
    if (req.method === 'GET' && id && action === 'policy-rules') {
      const rules = gradingScalesApi.getPolicyRules(tenantId, id as string);
      return res.status(200).json({ data: rules });
    }

    // PUT /api/tenant/grading-scales/:id/policy-rules/:ruleId
    if (req.method === 'PUT' && id && action === 'policy-rules' && ruleId) {
      const rule = gradingScalesApi.updatePolicyRule(tenantId, id as string, ruleId as string, req.body || {});
      return res.status(200).json({ data: rule });
    }

    // POST /api/tenant/grading-scales/:id/policy-rules
    if (req.method === 'POST' && id && action === 'policy-rules') {
      const rule = gradingScalesApi.addPolicyRule(tenantId, userId, id as string, req.body);
      return res.status(201).json({ data: rule });
    }

    // GET /api/tenant/grading-scales/:id
    if (req.method === 'GET' && id && !action) {
      const scale = gradingScalesApi.getById(tenantId, id as string);
      return res.status(200).json({ data: scale });
    }

    // PUT /api/tenant/grading-scales/:id
    if (req.method === 'PUT' && id) {
      const scale = gradingScalesApi.update(tenantId, userId, id as string, req.body || {});
      return res.status(200).json({ data: scale });
    }

    // DELETE /api/tenant/grading-scales/:id
    if (req.method === 'DELETE' && id) {
      const result = gradingScalesApi.delete(tenantId, id as string);
      return res.status(200).json(result);
    }

    // GET /api/tenant/grading-scales
    if (req.method === 'GET') {
      const limit = parseInt((req.query.limit as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      const type = req.query.type as string | undefined;
      const status = req.query.status as string | undefined;
      const result = gradingScalesApi.list(tenantId, { type, status, limit, offset });
      return res.status(200).json(result);
    }

    // POST /api/tenant/grading-scales
    if (req.method === 'POST') {
      const scale = gradingScalesApi.create(tenantId, userId, req.body || {});
      return res.status(201).json({ data: scale });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: message });
  }
}
