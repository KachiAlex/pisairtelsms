import crypto from 'crypto';
import { sql } from '../../_lib/sql.js';

// Certificate code generation with checksum
const generateCertificateCode = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const checksum = crypto.createHash('md5').update(`${timestamp}${random}`).digest('hex').substring(0, 4).toUpperCase();
  return `CERT-${timestamp}-${random}-${checksum}`;
};

const toVerification = (r: any) => ({
  id: r.id,
  tenantId: r.tenant_id,
  certificateCode: r.certificate_code,
  holder: r.holder,
  credential: r.credential,
  status: r.status,
  method: r.method,
  latency: r.latency,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toRegistry = (r: any) => ({
  id: r.id,
  tenantId: r.tenant_id,
  provider: r.provider,
  status: r.status,
  uptime: parseFloat(r.uptime || '0'),
  coverage: r.coverage,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toFraudSignal = (r: any) => ({
  id: r.id,
  tenantId: r.tenant_id,
  flag: r.flag,
  severity: r.severity,
  volume: r.volume,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toIssuance = (r: any) => ({
  id: r.id,
  tenantId: r.tenant_id,
  certificateCode: r.certificate_code,
  studentId: r.student_id,
  examId: r.exam_id,
  issuedAt: r.issued_at,
  blockchainAnchor: r.blockchain_anchor,
  revoked: r.revoked,
  revokedAt: r.revoked_at,
  revokedReason: r.revoked_reason,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toAuditLog = (r: any) => ({
  id: r.id,
  tenantId: r.tenant_id,
  certificateCode: r.certificate_code,
  action: r.action,
  actor: r.actor,
  details: r.details,
  createdAt: r.created_at,
});

async function writeAuditLog(tenantId: string, certificateCode: string, action: string, actor: string, details: string) {
  await sql.query(
    `INSERT INTO certificate_audit_log (id, tenant_id, certificate_code, action, actor, details, created_at)
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW())`,
    [tenantId, certificateCode, action, actor, details]
  );
}

export const certificateVerificationApi = {
  // List verification records
  listVerifications: async (tenantId: string, filters?: { status?: string; limit?: number; offset?: number }) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const { status, limit = 50, offset = 0 } = filters || {};

    const params: any[] = [tenantId];
    let query = `SELECT * FROM certificate_verifications WHERE tenant_id = $1`;
    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }
    query += ` ORDER BY updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await sql.query(query, params);
    const countResult = await sql.query(
      `SELECT COUNT(*) as total FROM certificate_verifications WHERE tenant_id = $1${status ? ' AND status = $2' : ''}`,
      status ? [tenantId, status] : [tenantId]
    );

    return { data: result.rows.map(toVerification), total: parseInt(countResult.rows[0]?.total || '0') };
  },

  // Create verification record
  createVerification: async (tenantId: string, payload: { certificateCode: string; holder: string; credential: string; status: string; method: string; latency: string }) => {
    if (!tenantId || !payload.certificateCode || !payload.holder) {
      throw new Error('Missing required fields');
    }

    const result = await sql.query(
      `INSERT INTO certificate_verifications (id, tenant_id, certificate_code, holder, credential, status, method, latency, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [tenantId, payload.certificateCode, payload.holder, payload.credential || null, payload.status || 'validated', payload.method || null, payload.latency || null]
    );

    await writeAuditLog(tenantId, payload.certificateCode, 'verified', 'system', `Certificate verified via ${payload.method}`);

    return toVerification(result.rows[0]);
  },

  // Verify certificate code
  verifyCertificate: async (tenantId: string, certificateCode: string) => {
    if (!tenantId || !certificateCode) throw new Error('Missing required fields');

    const result = await sql.query(
      `SELECT * FROM certificate_issuances WHERE tenant_id = $1 AND certificate_code = $2 AND revoked = false`,
      [tenantId, certificateCode]
    );
    const issuance = result.rows[0];
    if (!issuance) throw new Error('Certificate not found or revoked');

    return {
      valid: true,
      certificateCode: issuance.certificate_code,
      studentId: issuance.student_id,
      examId: issuance.exam_id,
      issuedAt: issuance.issued_at,
      blockchainAnchor: issuance.blockchain_anchor,
    };
  },

  // List registry integrations
  listRegistries: async (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');
    const result = await sql.query(
      `SELECT * FROM certificate_registries WHERE tenant_id = $1 ORDER BY updated_at DESC`,
      [tenantId]
    );
    return result.rows.map(toRegistry);
  },

  // Create registry integration
  createRegistry: async (tenantId: string, payload: { provider: string; status: string; uptime: number; coverage: string }) => {
    if (!tenantId || !payload.provider) {
      throw new Error('Missing required fields');
    }

    const result = await sql.query(
      `INSERT INTO certificate_registries (id, tenant_id, provider, status, uptime, coverage, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [tenantId, payload.provider, payload.status || 'live', payload.uptime || 0, payload.coverage || null]
    );
    return toRegistry(result.rows[0]);
  },

  // List fraud signals
  listFraudSignals: async (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');
    const result = await sql.query(
      `SELECT * FROM certificate_fraud_signals WHERE tenant_id = $1 ORDER BY updated_at DESC`,
      [tenantId]
    );
    return result.rows.map(toFraudSignal);
  },

  // Create fraud signal
  createFraudSignal: async (tenantId: string, payload: { flag: string; severity: string; volume: number }) => {
    if (!tenantId || !payload.flag) {
      throw new Error('Missing required fields');
    }

    const result = await sql.query(
      `INSERT INTO certificate_fraud_signals (id, tenant_id, flag, severity, volume, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [tenantId, payload.flag, payload.severity || 'low', payload.volume || 0]
    );
    return toFraudSignal(result.rows[0]);
  },

  // Issue certificate with generated code
  issueCertificate: async (tenantId: string, payload: { studentId: string; examId: string; blockchainAnchor?: string }) => {
    if (!tenantId || !payload.studentId || !payload.examId) {
      throw new Error('Missing required fields');
    }

    const certificateCode = generateCertificateCode();

    const result = await sql.query(
      `INSERT INTO certificate_issuances (id, tenant_id, certificate_code, student_id, exam_id, issued_at, blockchain_anchor, revoked, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW(), $5, false, NOW(), NOW())
       RETURNING *`,
      [tenantId, certificateCode, payload.studentId, payload.examId, payload.blockchainAnchor || null]
    );

    await writeAuditLog(tenantId, certificateCode, 'issued', 'system', `Certificate issued to student ${payload.studentId}`);

    return toIssuance(result.rows[0]);
  },

  // Revoke certificate
  revokeCertificate: async (tenantId: string, certificateCode: string, payload: { reason: string; actor: string }) => {
    if (!tenantId || !certificateCode) throw new Error('Missing required fields');

    const result = await sql.query(
      `UPDATE certificate_issuances
       SET revoked = true, revoked_at = NOW(), revoked_reason = $3, updated_at = NOW()
       WHERE tenant_id = $1 AND certificate_code = $2
       RETURNING *`,
      [tenantId, certificateCode, payload.reason || null]
    );
    const issuance = result.rows[0];
    if (!issuance) throw new Error('Certificate not found');

    await writeAuditLog(tenantId, certificateCode, 'revoked', payload.actor, `Certificate revoked: ${payload.reason}`);

    return toIssuance(issuance);
  },

  // List audit logs
  listAuditLogs: async (tenantId: string, filters?: { certificateCode?: string; limit?: number; offset?: number }) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const { certificateCode, limit = 50, offset = 0 } = filters || {};

    const params: any[] = [tenantId];
    let query = `SELECT * FROM certificate_audit_log WHERE tenant_id = $1`;
    if (certificateCode) {
      query += ` AND certificate_code = $2`;
      params.push(certificateCode);
    }
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await sql.query(query, params);
    const countResult = await sql.query(
      `SELECT COUNT(*) as total FROM certificate_audit_log WHERE tenant_id = $1${certificateCode ? ' AND certificate_code = $2' : ''}`,
      certificateCode ? [tenantId, certificateCode] : [tenantId]
    );

    return { data: result.rows.map(toAuditLog), total: parseInt(countResult.rows[0]?.total || '0') };
  },

  // Get verification statistics
  getStatistics: async (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const issuanceResult = await sql.query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE revoked) as revoked,
              COUNT(*) FILTER (WHERE blockchain_anchor IS NOT NULL) as anchored
       FROM certificate_issuances WHERE tenant_id = $1`,
      [tenantId]
    );
    const verificationResult = await sql.query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'validated') as validated
       FROM certificate_verifications WHERE tenant_id = $1`,
      [tenantId]
    );

    const i = issuanceResult.rows[0];
    const v = verificationResult.rows[0];
    const totalVerifications = parseInt(v?.total || '0');

    return {
      certificatesIssued: parseInt(i?.total || '0'),
      certificatesRevoked: parseInt(i?.revoked || '0'),
      validationSuccess: totalVerifications > 0 ? Math.round((parseInt(v?.validated || '0') / totalVerifications) * 100).toString() : '0',
      blockchainAnchor: parseInt(i?.anchored || '0'),
    };
  },
};

export default certificateVerificationApi;
