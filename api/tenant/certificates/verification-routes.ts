import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js';
import { requireRole } from '../../_lib/auth-middleware.js';
import certificateVerificationApi from './verification';

/**
 * Certificate Verification API Handler
 * Routes:
 *   GET  /api/tenant/certificates/verification?type=verify|verifications|registries|fraud-signals|audit-logs|statistics
 *   POST /api/tenant/certificates/verification  (action: create-verification|create-registry|create-fraud-signal|issue-certificate|revoke-certificate)
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin']);
  if (!decoded) return;
  const tenantId = decoded.tenantId || 'default-tenant';

  try {
    if (req.method === 'GET') {
      const { type, status, limit, offset, code, certificateCode } = req.query;

      if (type === 'verify' && (code || certificateCode)) {
        const certCode = (code || certificateCode) as string;
        const result = await certificateVerificationApi.verifyCertificate(tenantId, certCode);
        return res.status(200).json(result);
      }

      if (type === 'verifications') {
        const result = await certificateVerificationApi.listVerifications(tenantId, {
          status: status as string,
          limit: limit ? parseInt(limit as string) : 50,
          offset: offset ? parseInt(offset as string) : 0,
        });
        return res.status(200).json(result);
      }

      if (type === 'registries') {
        const result = await certificateVerificationApi.listRegistries(tenantId);
        return res.status(200).json({ data: result });
      }

      if (type === 'fraud-signals') {
        const result = await certificateVerificationApi.listFraudSignals(tenantId);
        return res.status(200).json({ data: result });
      }

      if (type === 'audit-logs') {
        const result = await certificateVerificationApi.listAuditLogs(tenantId, {
          certificateCode: certificateCode as string,
          limit: limit ? parseInt(limit as string) : 50,
          offset: offset ? parseInt(offset as string) : 0,
        });
        return res.status(200).json(result);
      }

      if (type === 'statistics') {
        const result = await certificateVerificationApi.getStatistics(tenantId);
        return res.status(200).json(result);
      }

      return res.status(400).json({ error: 'Invalid type parameter' });
    }

    if (req.method === 'POST') {
      const { action, payload } = req.body || {};

      if (action === 'create-verification') {
        const verification = await certificateVerificationApi.createVerification(tenantId, payload);
        return res.status(201).json(verification);
      }

      if (action === 'create-registry') {
        const registry = await certificateVerificationApi.createRegistry(tenantId, payload);
        return res.status(201).json(registry);
      }

      if (action === 'create-fraud-signal') {
        const signal = await certificateVerificationApi.createFraudSignal(tenantId, payload);
        return res.status(201).json(signal);
      }

      if (action === 'issue-certificate') {
        const issuance = await certificateVerificationApi.issueCertificate(tenantId, payload);
        return res.status(201).json(issuance);
      }

      if (action === 'revoke-certificate') {
        const issuance = await certificateVerificationApi.revokeCertificate(tenantId, payload.certificateCode, payload);
        return res.status(200).json(issuance);
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: message });
  }
}
