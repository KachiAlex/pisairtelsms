import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

interface VerificationRecord {
  id: string;
  tenantId: string;
  certificateCode: string;
  holder: string;
  credential: string;
  status: 'validated' | 'manual_review' | 'rejected';
  method: string;
  latency: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RegistryIntegration {
  id: string;
  tenantId: string;
  provider: string;
  status: 'live' | 'sync_lag' | 'offline';
  uptime: number;
  coverage: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FraudSignal {
  id: string;
  tenantId: string;
  flag: string;
  severity: 'high' | 'medium' | 'low';
  volume: number;
  createdAt: Date;
  updatedAt: Date;
}

interface IssuanceRecord {
  id: string;
  tenantId: string;
  certificateCode: string;
  studentId: string;
  examId: string;
  issuedAt: Date;
  blockchainAnchor?: string;
  revoked: boolean;
  revokedAt?: Date;
  revokedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AuditLog {
  id: string;
  tenantId: string;
  certificateCode: string;
  action: 'issued' | 'verified' | 'revoked' | 'manual_review';
  actor: string;
  details: string;
  createdAt: Date;
}

const verifications: VerificationRecord[] = [];
const registries: RegistryIntegration[] = [];
const fraudSignals: FraudSignal[] = [];
const issuances: IssuanceRecord[] = [];
const auditLogs: AuditLog[] = [];

// Certificate code generation with checksum
const generateCertificateCode = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const checksum = crypto.createHash('md5').update(`${timestamp}${random}`).digest('hex').substring(0, 4).toUpperCase();
  return `CERT-${timestamp}-${random}-${checksum}`;
};

export const certificateVerificationApi = {
  // List verification records
  listVerifications: (tenantId: string, filters?: { status?: string; limit?: number; offset?: number }) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const { status, limit = 50, offset = 0 } = filters || {};

    let filtered = verifications.filter(v => v.tenantId === tenantId);
    if (status) filtered = filtered.filter(v => v.status === status);

    const data = filtered
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(offset, offset + limit);

    return { data, total: filtered.length };
  },

  // Create verification record
  createVerification: (tenantId: string, payload: { certificateCode: string; holder: string; credential: string; status: string; method: string; latency: string }) => {
    if (!tenantId || !payload.certificateCode || !payload.holder) {
      throw new Error('Missing required fields');
    }

    const verification: VerificationRecord = {
      id: uuidv4(),
      tenantId,
      certificateCode: payload.certificateCode,
      holder: payload.holder,
      credential: payload.credential,
      status: payload.status as any,
      method: payload.method,
      latency: payload.latency,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    verifications.push(verification);
    
    // Log audit
    auditLogs.push({
      id: uuidv4(),
      tenantId,
      certificateCode: payload.certificateCode,
      action: 'verified',
      actor: 'system',
      details: `Certificate verified via ${payload.method}`,
      createdAt: new Date(),
    });

    return verification;
  },

  // Verify certificate code
  verifyCertificate: (tenantId: string, certificateCode: string) => {
    if (!tenantId || !certificateCode) throw new Error('Missing required fields');

    const issuance = issuances.find(i => i.tenantId === tenantId && i.certificateCode === certificateCode && !i.revoked);
    if (!issuance) throw new Error('Certificate not found or revoked');

    return {
      valid: true,
      certificateCode: issuance.certificateCode,
      studentId: issuance.studentId,
      examId: issuance.examId,
      issuedAt: issuance.issuedAt,
      blockchainAnchor: issuance.blockchainAnchor,
    };
  },

  // List registry integrations
  listRegistries: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    return registries
      .filter(r => r.tenantId === tenantId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  // Create registry integration
  createRegistry: (tenantId: string, payload: { provider: string; status: string; uptime: number; coverage: string }) => {
    if (!tenantId || !payload.provider) {
      throw new Error('Missing required fields');
    }

    const registry: RegistryIntegration = {
      id: uuidv4(),
      tenantId,
      provider: payload.provider,
      status: payload.status as any,
      uptime: payload.uptime,
      coverage: payload.coverage,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    registries.push(registry);
    return registry;
  },

  // List fraud signals
  listFraudSignals: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    return fraudSignals
      .filter(f => f.tenantId === tenantId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  // Create fraud signal
  createFraudSignal: (tenantId: string, payload: { flag: string; severity: string; volume: number }) => {
    if (!tenantId || !payload.flag) {
      throw new Error('Missing required fields');
    }

    const signal: FraudSignal = {
      id: uuidv4(),
      tenantId,
      flag: payload.flag,
      severity: payload.severity as any,
      volume: payload.volume,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    fraudSignals.push(signal);
    return signal;
  },

  // Issue certificate with generated code
  issueCertificate: (tenantId: string, payload: { studentId: string; examId: string; blockchainAnchor?: string }) => {
    if (!tenantId || !payload.studentId || !payload.examId) {
      throw new Error('Missing required fields');
    }

    const certificateCode = generateCertificateCode();

    const issuance: IssuanceRecord = {
      id: uuidv4(),
      tenantId,
      certificateCode,
      studentId: payload.studentId,
      examId: payload.examId,
      issuedAt: new Date(),
      blockchainAnchor: payload.blockchainAnchor,
      revoked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    issuances.push(issuance);

    // Log audit
    auditLogs.push({
      id: uuidv4(),
      tenantId,
      certificateCode,
      action: 'issued',
      actor: 'system',
      details: `Certificate issued to student ${payload.studentId}`,
      createdAt: new Date(),
    });

    return issuance;
  },

  // Revoke certificate
  revokeCertificate: (tenantId: string, certificateCode: string, payload: { reason: string; actor: string }) => {
    if (!tenantId || !certificateCode) throw new Error('Missing required fields');

    const issuance = issuances.find(i => i.tenantId === tenantId && i.certificateCode === certificateCode);
    if (!issuance) throw new Error('Certificate not found');

    issuance.revoked = true;
    issuance.revokedAt = new Date();
    issuance.revokedReason = payload.reason;
    issuance.updatedAt = new Date();

    // Log audit
    auditLogs.push({
      id: uuidv4(),
      tenantId,
      certificateCode,
      action: 'revoked',
      actor: payload.actor,
      details: `Certificate revoked: ${payload.reason}`,
      createdAt: new Date(),
    });

    return issuance;
  },

  // List audit logs
  listAuditLogs: (tenantId: string, filters?: { certificateCode?: string; limit?: number; offset?: number }) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const { certificateCode, limit = 50, offset = 0 } = filters || {};

    let filtered = auditLogs.filter(l => l.tenantId === tenantId);
    if (certificateCode) filtered = filtered.filter(l => l.certificateCode === certificateCode);

    const data = filtered
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    return { data, total: filtered.length };
  },

  // Get verification statistics
  getStatistics: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const tenantIssuances = issuances.filter(i => i.tenantId === tenantId);
    const tenantVerifications = verifications.filter(v => v.tenantId === tenantId);
    const validatedCount = tenantVerifications.filter(v => v.status === 'validated').length;
    const revokedCount = tenantIssuances.filter(i => i.revoked).length;

    return {
      certificatesIssued: tenantIssuances.length,
      certificatesRevoked: revokedCount,
      validationSuccess: tenantVerifications.length > 0 ? ((validatedCount / tenantVerifications.length) * 100).toFixed(0) : '0',
      blockchainAnchor: tenantIssuances.filter(i => i.blockchainAnchor).length,
    };
  },
};

export default certificateVerificationApi;
