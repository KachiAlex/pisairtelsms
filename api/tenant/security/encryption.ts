import { v4 as uuidv4 } from 'uuid';

// In-memory storage for encryption config
interface EncryptedFieldRecord {
  field: string;
  enabled: boolean;
}

interface EncryptionConfigRecord {
  id: string;
  tenantId: string;
  algorithm: string;
  keyRotationDays: number;
  encryptedFields: EncryptedFieldRecord[];
  lastKeyRotation: Date;
  nextKeyRotation: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface EncryptionAuditLogRecord {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  changes: any;
  timestamp: Date;
}

const encryptionConfigs: Map<string, EncryptionConfigRecord> = new Map();
const encryptionAuditLogs: EncryptionAuditLogRecord[] = [];

// Default encryptable fields
const DEFAULT_FIELDS: EncryptedFieldRecord[] = [
  { field: 'studentSSN', enabled: true },
  { field: 'parentPhone', enabled: true },
  { field: 'bankAccount', enabled: true },
  { field: 'parentEmail', enabled: false },
];

/**
 * Helper: Get or create encryption config for tenant
 */
function getOrCreateEncryptionConfig(tenantId: string): EncryptionConfigRecord {
  if (encryptionConfigs.has(tenantId)) {
    return encryptionConfigs.get(tenantId)!;
  }

  const now = new Date();
  const config: EncryptionConfigRecord = {
    id: uuidv4(),
    tenantId,
    algorithm: 'AES-256',
    keyRotationDays: 90,
    encryptedFields: [...DEFAULT_FIELDS],
    lastKeyRotation: now,
    nextKeyRotation: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
  };

  encryptionConfigs.set(tenantId, config);
  return config;
}

// ============================================================================
// GET /api/tenant/security/encryption/config - Get encryption settings
// ============================================================================
export const getEncryptionConfig = (tenantId: string) => {
  if (!tenantId) {
    throw new Error('Missing tenant ID');
  }

  const config = getOrCreateEncryptionConfig(tenantId);

  return {
    id: config.id,
    algorithm: config.algorithm,
    keyRotationDays: config.keyRotationDays,
    encryptedFields: config.encryptedFields,
    lastKeyRotation: config.lastKeyRotation,
    nextKeyRotation: config.nextKeyRotation,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
};

// ============================================================================
// PUT /api/tenant/security/encryption/config - Update encryption settings
// ============================================================================
export const updateEncryptionConfig = (
  tenantId: string,
  userId: string,
  algorithm?: string,
  keyRotationDays?: number,
  encryptedFields?: EncryptedFieldRecord[]
) => {
  if (!tenantId || !userId) {
    throw new Error('Missing tenant or user ID');
  }

  // Validate algorithm
  const validAlgorithms = ['AES-256', 'AES-192', 'AES-128'];
  if (algorithm && !validAlgorithms.includes(algorithm)) {
    throw new Error('Invalid algorithm');
  }

  // Validate key rotation days
  if (keyRotationDays && (keyRotationDays < 7 || keyRotationDays > 365)) {
    throw new Error('Key rotation days must be between 7 and 365');
  }

  const config = getOrCreateEncryptionConfig(tenantId);

  // Track changes for audit log
  const changes: any = {};

  if (algorithm) {
    changes.algorithm = { from: config.algorithm, to: algorithm };
    config.algorithm = algorithm;
  }

  if (keyRotationDays) {
    changes.keyRotationDays = { from: config.keyRotationDays, to: keyRotationDays };
    config.keyRotationDays = keyRotationDays;
  }

  if (encryptedFields) {
    changes.encryptedFields = { from: config.encryptedFields, to: encryptedFields };
    config.encryptedFields = encryptedFields;
  }

  config.updatedAt = new Date();

  // Log audit
  encryptionAuditLogs.push({
    id: uuidv4(),
    tenantId,
    userId,
    action: 'UPDATE_ENCRYPTION_CONFIG',
    changes,
    timestamp: new Date(),
  });

  return {
    id: config.id,
    algorithm: config.algorithm,
    keyRotationDays: config.keyRotationDays,
    encryptedFields: config.encryptedFields,
    lastKeyRotation: config.lastKeyRotation,
    nextKeyRotation: config.nextKeyRotation,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
};

// ============================================================================
// GET /api/tenant/security/encryption/audit-logs - Get audit logs
// ============================================================================
export const getEncryptionAuditLogs = (
  tenantId: string,
  limit: number = 50,
  offset: number = 0
) => {
  if (!tenantId) {
    throw new Error('Missing tenant ID');
  }

  const logs = encryptionAuditLogs
    .filter(log => log.tenantId === tenantId)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(offset, offset + limit)
    .map(log => ({
      id: log.id,
      tenantId: log.tenantId,
      userId: log.userId,
      action: log.action,
      changes: log.changes,
      timestamp: log.timestamp,
    }));

  const total = encryptionAuditLogs.filter(log => log.tenantId === tenantId).length;

  return {
    data: logs,
    total,
    limit,
    offset,
  };
};

// ============================================================================
// POST /api/tenant/security/encryption/rotate-keys - Rotate encryption keys
// ============================================================================
export const rotateEncryptionKeys = (tenantId: string, userId: string) => {
  if (!tenantId || !userId) {
    throw new Error('Missing tenant or user ID');
  }

  const config = getOrCreateEncryptionConfig(tenantId);

  // Simulate key rotation
  const now = new Date();
  config.lastKeyRotation = now;
  config.nextKeyRotation = new Date(
    now.getTime() + config.keyRotationDays * 24 * 60 * 60 * 1000
  );

  // Log audit
  encryptionAuditLogs.push({
    id: uuidv4(),
    tenantId,
    userId,
    action: 'ROTATE_ENCRYPTION_KEYS',
    changes: {
      lastKeyRotation: config.lastKeyRotation,
      nextKeyRotation: config.nextKeyRotation,
    },
    timestamp: now,
  });

  return {
    message: 'Encryption keys rotated successfully',
    data: {
      lastKeyRotation: config.lastKeyRotation,
      nextKeyRotation: config.nextKeyRotation,
    },
  };
};

// ============================================================================
// GET /api/tenant/security/encryption/fields - Get encryptable fields
// ============================================================================
export const getEncryptableFields = (tenantId: string) => {
  if (!tenantId) {
    throw new Error('Missing tenant ID');
  }

  const config = getOrCreateEncryptionConfig(tenantId);

  return {
    data: config.encryptedFields,
  };
};

// ============================================================================
// PUT /api/tenant/security/encryption/fields - Update encrypted fields
// ============================================================================
export const updateEncryptedFields = (
  tenantId: string,
  userId: string,
  encryptedFields: EncryptedFieldRecord[]
) => {
  if (!tenantId || !userId) {
    throw new Error('Missing tenant or user ID');
  }

  const config = getOrCreateEncryptionConfig(tenantId);

  const changes = {
    from: config.encryptedFields,
    to: encryptedFields,
  };

  config.encryptedFields = encryptedFields;
  config.updatedAt = new Date();

  // Log audit
  encryptionAuditLogs.push({
    id: uuidv4(),
    tenantId,
    userId,
    action: 'UPDATE_ENCRYPTED_FIELDS',
    changes,
    timestamp: new Date(),
  });

  return {
    data: config.encryptedFields,
  };
};

export default {
  getEncryptionConfig,
  updateEncryptionConfig,
  getEncryptionAuditLogs,
  rotateEncryptionKeys,
  getEncryptableFields,
  updateEncryptedFields,
};
