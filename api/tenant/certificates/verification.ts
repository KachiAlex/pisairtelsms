import { v4 as uuidv4 } from 'uuid';

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
  createdAt: Date;
  updatedAt: Date;
}

const verifications: VerificationRecord[] = [];
const registries: RegistryIntegration[] = [];
const fraudSignals: FraudSignal[] = [];
const issuances: IssuanceRecord[] = [];

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
    return verification;
  },

  // Verify certificate code
  verifyCertificate: (tenantId: string, certificateCode: string) => {
    if (!tenantId || !certificateCode) throw new Error('Missing required fields');

    const issuance = issuances.find(i => i.tenantId === tenantId && i.certificateCode === certificateCode);
    if (!issuance) throw new Error('Certificate not found');

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

  // Issue certificate
  issueCertificate: (tenantId: string, payload: { studentId: string; examId: string; blockchainAnchor?: string }) => {
    if (!tenantId || !payload.studentId || !payload.examId) {
      throw new Error('Missing required fields');
    }

    const certificateCode = `CERT-${uuidv4().substring(0, 8).toUpperCase()}`;

    const issuance: IssuanceRecord = {
      id: uuidv4(),
      tenantId,
      certificateCode,
      studentId: payload.studentId,
      examId: payload.examId,
      issuedAt: new Date(),
      blockchainAnchor: payload.blockchainAnchor,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    issuances.push(issuance);
    return issuance;
  },

  // Get issuance statistics
  getStatistics: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const tenantIssuances = issuances.filter(i => i.tenantId === tenantId);
    const tenantVerifications = verifications.filter(v => v.tenantId === tenantId);
    const validatedCount = tenantVerifications.filter(v => v.status === 'validated').length;

    return {
      certificatesIssued: tenantIssuances.length,
      validationSuccess: tenantVerifications.length > 0 ? ((validatedCount / tenantVerifications.length) * 100).toFixed(0) : '0',
      blockchainAnchor: tenantIssuances.filter(i => i.blockchainAnchor).length,
    };
  },
};

export default certificateVerificationApi;
