import { v4 as uuidv4 } from 'uuid';

interface LMSConfig {
  id: string;
  tenantId: string;
  provider: 'moodle' | 'canvas';
  baseUrl: string;
  apiKey: string;
  isActive: boolean;
  lastSyncAt?: Date;
  syncStatus: 'synced' | 'pending' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

interface StudentSync {
  id: string;
  tenantId: string;
  lmsConfigId: string;
  provider: 'moodle' | 'canvas';
  syncType: 'student' | 'grade' | 'course';
  status: 'in_progress' | 'completed' | 'failed';
  recordsProcessed: number;
  recordsFailed: number;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
}

interface SyncLog {
  id: string;
  tenantId: string;
  lmsConfigId: string;
  logType: 'connection' | 'sync' | 'error' | 'warning';
  message: string;
  details?: Record<string, any>;
  createdAt: Date;
}

const lmsConfigs: LMSConfig[] = [];
const studentSyncs: StudentSync[] = [];
const syncLogs: SyncLog[] = [];

export const lmsApi = {
  // Get LMS config
  getConfig: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const config = lmsConfigs.find(l => l.tenantId === tenantId && l.isActive);
    return config || null;
  },

  // Create or update LMS config
  upsertConfig: (tenantId: string, userId: string, payload: Partial<LMSConfig>) => {
    if (!tenantId || !userId) throw new Error('Missing tenant or user ID');
    if (!payload.provider || !payload.baseUrl || !payload.apiKey) {
      throw new Error('Missing required fields: provider, baseUrl, apiKey');
    }

    // Deactivate existing config
    const existing = lmsConfigs.find(l => l.tenantId === tenantId && l.isActive);
    if (existing) {
      existing.isActive = false;
    }

    const config: LMSConfig = {
      id: uuidv4(),
      tenantId,
      provider: payload.provider,
      baseUrl: payload.baseUrl,
      apiKey: payload.apiKey,
      isActive: true,
      syncStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      updatedBy: userId,
    };

    lmsConfigs.push(config);

    // Log connection
    syncLogs.push({
      id: uuidv4(),
      tenantId,
      lmsConfigId: config.id,
      logType: 'connection',
      message: `LMS connection established: ${payload.provider}`,
      createdAt: new Date(),
    });

    return config;
  },

  // Get all configs for tenant
  getAllConfigs: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    return lmsConfigs
      .filter(l => l.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  // Test connection
  testConnection: (tenantId: string, lmsConfigId: string) => {
    if (!tenantId || !lmsConfigId) throw new Error('Missing tenant or config ID');

    const config = lmsConfigs.find(l => l.tenantId === tenantId && l.id === lmsConfigId);
    if (!config) throw new Error('LMS config not found');

    // Simulate connection test
    const isConnected = Math.random() > 0.1; // 90% success rate

    syncLogs.push({
      id: uuidv4(),
      tenantId,
      lmsConfigId,
      logType: isConnected ? 'connection' : 'error',
      message: isConnected ? 'Connection test successful' : 'Connection test failed',
      createdAt: new Date(),
    });

    return { success: isConnected, message: isConnected ? 'Connected' : 'Connection failed' };
  },

  // Start student sync
  startStudentSync: (tenantId: string, lmsConfigId: string) => {
    if (!tenantId || !lmsConfigId) throw new Error('Missing tenant or config ID');

    const config = lmsConfigs.find(l => l.tenantId === tenantId && l.id === lmsConfigId);
    if (!config) throw new Error('LMS config not found');

    const sync: StudentSync = {
      id: uuidv4(),
      tenantId,
      lmsConfigId,
      provider: config.provider,
      syncType: 'student',
      status: 'in_progress',
      recordsProcessed: 0,
      recordsFailed: 0,
      startedAt: new Date(),
      createdAt: new Date(),
    };

    studentSyncs.push(sync);

    syncLogs.push({
      id: uuidv4(),
      tenantId,
      lmsConfigId,
      logType: 'sync',
      message: 'Student sync started',
      details: { syncId: sync.id },
      createdAt: new Date(),
    });

    return sync;
  },

  // Complete student sync
  completeStudentSync: (tenantId: string, syncId: string, recordsProcessed: number, recordsFailed: number, error?: string) => {
    if (!tenantId || !syncId) throw new Error('Missing tenant or sync ID');

    const sync = studentSyncs.find(s => s.tenantId === tenantId && s.id === syncId);
    if (!sync) throw new Error('Sync not found');

    sync.completedAt = new Date();
    sync.recordsProcessed = recordsProcessed;
    sync.recordsFailed = recordsFailed;
    sync.status = error ? 'failed' : 'completed';
    sync.error = error;

    // Update config sync status
    const config = lmsConfigs.find(l => l.tenantId === tenantId && l.id === sync.lmsConfigId);
    if (config) {
      config.syncStatus = error ? 'failed' : 'synced';
      config.lastSyncAt = new Date();
      config.updatedAt = new Date();
    }

    syncLogs.push({
      id: uuidv4(),
      tenantId,
      lmsConfigId: sync.lmsConfigId,
      logType: error ? 'error' : 'sync',
      message: error ? `Sync failed: ${error}` : `Student sync completed: ${recordsProcessed} records`,
      details: { recordsProcessed, recordsFailed, error },
      createdAt: new Date(),
    });

    return sync;
  },

  // Start grade sync
  startGradeSync: (tenantId: string, lmsConfigId: string) => {
    if (!tenantId || !lmsConfigId) throw new Error('Missing tenant or config ID');

    const config = lmsConfigs.find(l => l.tenantId === tenantId && l.id === lmsConfigId);
    if (!config) throw new Error('LMS config not found');

    const sync: StudentSync = {
      id: uuidv4(),
      tenantId,
      lmsConfigId,
      provider: config.provider,
      syncType: 'grade',
      status: 'in_progress',
      recordsProcessed: 0,
      recordsFailed: 0,
      startedAt: new Date(),
      createdAt: new Date(),
    };

    studentSyncs.push(sync);

    syncLogs.push({
      id: uuidv4(),
      tenantId,
      lmsConfigId,
      logType: 'sync',
      message: 'Grade sync started',
      details: { syncId: sync.id },
      createdAt: new Date(),
    });

    return sync;
  },

  // Complete grade sync
  completeGradeSync: (tenantId: string, syncId: string, recordsProcessed: number, recordsFailed: number, error?: string) => {
    if (!tenantId || !syncId) throw new Error('Missing tenant or sync ID');

    const sync = studentSyncs.find(s => s.tenantId === tenantId && s.id === syncId);
    if (!sync) throw new Error('Sync not found');

    sync.completedAt = new Date();
    sync.recordsProcessed = recordsProcessed;
    sync.recordsFailed = recordsFailed;
    sync.status = error ? 'failed' : 'completed';
    sync.error = error;

    syncLogs.push({
      id: uuidv4(),
      tenantId,
      lmsConfigId: sync.lmsConfigId,
      logType: error ? 'error' : 'sync',
      message: error ? `Grade sync failed: ${error}` : `Grade sync completed: ${recordsProcessed} records`,
      details: { recordsProcessed, recordsFailed, error },
      createdAt: new Date(),
    });

    return sync;
  },

  // Get sync history
  getSyncHistory: (tenantId: string, lmsConfigId: string, limit: number = 20) => {
    if (!tenantId || !lmsConfigId) throw new Error('Missing tenant or config ID');

    return studentSyncs
      .filter(s => s.tenantId === tenantId && s.lmsConfigId === lmsConfigId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  },

  // Get sync logs
  getSyncLogs: (tenantId: string, lmsConfigId: string, limit: number = 50, offset: number = 0) => {
    if (!tenantId || !lmsConfigId) throw new Error('Missing tenant or config ID');

    const filtered = syncLogs.filter(l => l.tenantId === tenantId && l.lmsConfigId === lmsConfigId);
    const sorted = filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const data = sorted.slice(offset, offset + limit);

    return {
      data,
      total: filtered.length,
      limit,
      offset,
    };
  },

  // Get sync statistics
  getStatistics: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const tenantSyncs = studentSyncs.filter(s => s.tenantId === tenantId);

    const completedCount = tenantSyncs.filter(s => s.status === 'completed').length;
    const failedCount = tenantSyncs.filter(s => s.status === 'failed').length;
    const inProgressCount = tenantSyncs.filter(s => s.status === 'in_progress').length;

    const totalRecordsProcessed = tenantSyncs.reduce((sum, s) => sum + s.recordsProcessed, 0);
    const totalRecordsFailed = tenantSyncs.reduce((sum, s) => sum + s.recordsFailed, 0);

    return {
      completedCount,
      failedCount,
      inProgressCount,
      totalRecordsProcessed,
      totalRecordsFailed,
      totalSyncs: tenantSyncs.length,
    };
  },
};

export default lmsApi;
