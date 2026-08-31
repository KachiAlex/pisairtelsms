import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireRole } from '../../_lib/auth-middleware.js';
import certificateVerificationApi from './verification';

/**
 * Certificate Verification API Handler
 * Routes:
 *   GET  /api/tenant/certificates/verification?type=verify|verifications|registries|fraud-signals|audit-logs|statistics
 *   POST /api/tenant/certificates/verification  (action: create-verification|create-registry|create-fraud-signal|issue-certificate|revoke-certificate)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin']);
  if (!decoded) return;
  const tenantId = decoded.tenantId || 'default-tenant';

  try {
    if (req.method === 'GET') {
      const { type, status, limit, offset, code, certificateCode } = req.query;

      if (type === 'verify' && (code || certificateCode)) {
        const certCode = (code || certificateCode) as string;
        const result = certificateVerificationApi.verifyCertificate(tenantId, certCode);
        return res.status(200).json(result);
      }

      if (type === 'verifications') {
        const result = certificateVerificationApi.listVerifications(tenantId, {
          status: status as string,
          limit: limit ? parseInt(limit as string) : 50,
          offset: offset ? parseInt(offset as string) : 0,
        });
        return res.status(200).json(result);
      }

      if (type === 'registries') {
        const result = certificateVerificationApi.listRegistries(tenantId);
        return res.status(200).json({ data: result });
      }

      if (type === 'fraud-signals') {
        const result = certificateVerificationApi.listFraudSignals(tenantId);
        return res.status(200).json({ data: result });
      }

      if (type === 'audit-logs') {
        const result = certificateVerificationApi.listAuditLogs(tenantId, {
          certificateCode: certificateCode as string,
          limit: limit ? parseInt(limit as string) : 50,
          offset: offset ? parseInt(offset as string) : 0,
        });
        return res.status(200).json(result);
      }

      if (type === 'statistics') {
        const result = certificateVerificationApi.getStatistics(tenantId);
        return res.status(200).json(result);
      }

      return res.status(400).json({ error: 'Invalid type parameter' });
    }

    if (req.method === 'POST') {
      const { action, payload } = req.body || {};

      if (action === 'create-verification') {
        const verification = certificateVerificationApi.createVerification(tenantId, payload);
        return res.status(201).json(verification);
      }

      if (action === 'create-registry') {
        const registry = certificateVerificationApi.createRegistry(tenantId, payload);
        return res.status(201).json(registry);
      }

      if (action === 'create-fraud-signal') {
        const signal = certificateVerificationApi.createFraudSignal(tenantId, payload);
        return res.status(201).json(signal);
      }

      if (action === 'issue-certificate') {
        const issuance = certificateVerificationApi.issueCertificate(tenantId, payload);
        return res.status(201).json(issuance);
      }

      if (action === 'revoke-certificate') {
        const issuance = certificateVerificationApi.revokeCertificate(tenantId, payload.certificateCode, payload);
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
