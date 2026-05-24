import type { VercelRequest, VercelResponse } from '@vercel/node';
import reportTemplatesApi from './_lib/report-templates';

/**
 * Report Templates API Handler
 * Routes:
 *   GET    /api/tenant/report-templates                          - List templates
 *   POST   /api/tenant/report-templates                         - Create template
 *   GET    /api/tenant/report-templates/:id                     - Get template by ID
 *   PUT    /api/tenant/report-templates/:id                     - Update template
 *   DELETE /api/tenant/report-templates/:id                     - Delete template
 *   POST   /api/tenant/report-templates/:id/publish             - Publish template
 *   POST   /api/tenant/report-templates/:id/archive             - Archive template
 *   POST   /api/tenant/report-templates/:id/duplicate           - Duplicate template
 *   GET    /api/tenant/report-templates/:id/versions            - Get versions
 *   POST   /api/tenant/report-templates/:id/fields              - Add/update field
 *   DELETE /api/tenant/report-templates/:id/fields/:fieldId     - Remove field
 *   PUT    /api/tenant/report-templates/:id/fields/reorder      - Reorder fields
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

  const { id, action, fieldId } = req.query;

  try {
    // POST /api/tenant/report-templates/:id/publish
    if (req.method === 'POST' && id && action === 'publish') {
      const template = reportTemplatesApi.publish(tenantId, userId, id as string);
      return res.status(200).json({ data: template });
    }

    // POST /api/tenant/report-templates/:id/archive
    if (req.method === 'POST' && id && action === 'archive') {
      const template = reportTemplatesApi.archive(tenantId, userId, id as string);
      return res.status(200).json({ data: template });
    }

    // POST /api/tenant/report-templates/:id/duplicate
    if (req.method === 'POST' && id && action === 'duplicate') {
      const { name } = req.body || {};
      const template = reportTemplatesApi.duplicate(tenantId, userId, id as string, name || 'Copy');
      return res.status(201).json({ data: template });
    }

    // GET /api/tenant/report-templates/:id/versions
    if (req.method === 'GET' && id && action === 'versions') {
      const versions = reportTemplatesApi.getVersions(tenantId, id as string);
      return res.status(200).json({ data: versions });
    }

    // DELETE /api/tenant/report-templates/:id/fields/:fieldId
    if (req.method === 'DELETE' && id && action === 'fields' && fieldId) {
      const template = reportTemplatesApi.removeField(tenantId, userId, id as string, fieldId as string);
      return res.status(200).json({ data: template });
    }

    // PUT /api/tenant/report-templates/:id/fields/reorder
    if (req.method === 'PUT' && id && action === 'fields-reorder') {
      const { fieldIds } = req.body || {};
      const template = reportTemplatesApi.reorderFields(tenantId, userId, id as string, fieldIds);
      return res.status(200).json({ data: template });
    }

    // POST /api/tenant/report-templates/:id/fields
    if (req.method === 'POST' && id && action === 'fields') {
      const template = reportTemplatesApi.addField(tenantId, userId, id as string, req.body);
      return res.status(200).json({ data: template });
    }

    // GET /api/tenant/report-templates/:id
    if (req.method === 'GET' && id && !action) {
      const template = reportTemplatesApi.getById(tenantId, id as string);
      return res.status(200).json({ data: template });
    }

    // PUT /api/tenant/report-templates/:id
    if (req.method === 'PUT' && id) {
      const template = reportTemplatesApi.update(tenantId, userId, id as string, req.body || {});
      return res.status(200).json({ data: template });
    }

    // DELETE /api/tenant/report-templates/:id
    if (req.method === 'DELETE' && id) {
      const result = reportTemplatesApi.delete(tenantId, id as string);
      return res.status(200).json(result);
    }

    // GET /api/tenant/report-templates
    if (req.method === 'GET') {
      const limit = parseInt((req.query.limit as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      const status = req.query.status as string | undefined;
      const audience = req.query.audience as string | undefined;
      const result = reportTemplatesApi.list(tenantId, { status, audience, limit, offset });
      return res.status(200).json(result);
    }

    // POST /api/tenant/report-templates
    if (req.method === 'POST') {
      const template = reportTemplatesApi.create(tenantId, userId, req.body || {});
      return res.status(201).json({ data: template });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: message });
  }
}
