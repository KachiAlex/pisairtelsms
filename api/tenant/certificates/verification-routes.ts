import { NextApiRequest, NextApiResponse } from 'next';
import certificateVerificationApi from './verification';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { tenantId } = req.query;

  if (!tenantId || typeof tenantId !== 'string') {
    return res.status(400).json({ error: 'Missing tenant ID' });
  }

  try {
    if (req.method === 'GET') {
      const { type, status, limit, offset, code } = req.query;

      if (type === 'verify' && code) {
        const result = certificateVerificationApi.verifyCertificate(tenantId, code as string);
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

      if (type === 'statistics') {
        const result = certificateVerificationApi.getStatistics(tenantId);
        return res.status(200).json(result);
      }

      return res.status(400).json({ error: 'Invalid type parameter' });
    }

    if (req.method === 'POST') {
      const { action, payload } = req.body;

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

      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in certificate verification routes:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
