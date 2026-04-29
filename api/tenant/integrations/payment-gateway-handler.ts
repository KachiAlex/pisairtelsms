import type { VercelRequest, VercelResponse } from '@vercel/node';
import paymentGatewayApi from './payment-gateway';

/**
 * Payment Gateway Integration API Handler
 * Routes:
 *   GET    /api/tenant/integrations/payment-gateway/config          - Get config
 *   PUT    /api/tenant/integrations/payment-gateway/config          - Upsert config
 *   GET    /api/tenant/integrations/payment-gateway/transactions     - Get transactions
 *   POST   /api/tenant/integrations/payment-gateway/transactions     - Record transaction
 *   GET    /api/tenant/integrations/payment-gateway/statistics       - Get statistics
 *   GET    /api/tenant/integrations/payment-gateway/webhooks         - Get webhook logs
 *   POST   /api/tenant/integrations/payment-gateway/webhooks         - Log webhook
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

  const { action, id } = req.query;

  try {
    // GET /api/tenant/integrations/payment-gateway/statistics
    if (req.method === 'GET' && action === 'statistics') {
      const stats = paymentGatewayApi.getStatistics(tenantId);
      return res.status(200).json({ data: stats });
    }

    // GET /api/tenant/integrations/payment-gateway/webhooks
    if (req.method === 'GET' && action === 'webhooks') {
      const limit = parseInt((req.query.limit as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      const logs = paymentGatewayApi.getWebhookLogs(tenantId, limit, offset);
      return res.status(200).json(logs);
    }

    // POST /api/tenant/integrations/payment-gateway/webhooks
    if (req.method === 'POST' && action === 'webhooks') {
      const { provider, event, payload } = req.body || {};
      const log = paymentGatewayApi.logWebhook(tenantId, provider, event, payload || {});
      return res.status(201).json({ data: log });
    }

    // GET /api/tenant/integrations/payment-gateway/transactions
    if (req.method === 'GET' && action === 'transactions') {
      const limit = parseInt((req.query.limit as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');
      const status = req.query.status as string | undefined;
      const provider = req.query.provider as string | undefined;
      const result = paymentGatewayApi.getTransactions(tenantId, limit, offset, { status, provider });
      return res.status(200).json(result);
    }

    // POST /api/tenant/integrations/payment-gateway/transactions
    if (req.method === 'POST' && action === 'transactions') {
      const transaction = paymentGatewayApi.recordTransaction(tenantId, req.body || {});
      return res.status(201).json({ data: transaction });
    }

    // PUT /api/tenant/integrations/payment-gateway/transactions/:id/status
    if (req.method === 'PUT' && action === 'transaction-status' && id) {
      const { status, metadata } = req.body || {};
      const transaction = paymentGatewayApi.updateTransactionStatus(tenantId, id as string, status, metadata);
      return res.status(200).json({ data: transaction });
    }

    // GET /api/tenant/integrations/payment-gateway/config
    if (req.method === 'GET' && action === 'config') {
      const config = paymentGatewayApi.getConfig(tenantId);
      return res.status(200).json({ data: config });
    }

    // PUT /api/tenant/integrations/payment-gateway/config
    if (req.method === 'PUT' && action === 'config') {
      const config = paymentGatewayApi.upsertConfig(tenantId, userId, req.body || {});
      return res.status(200).json({ data: config });
    }

    // GET /api/tenant/integrations/payment-gateway (all configs)
    if (req.method === 'GET') {
      const configs = paymentGatewayApi.getAllConfigs(tenantId);
      return res.status(200).json({ data: configs });
    }

    res.setHeader('Allow', 'GET, PUT, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: message });
  }
}
