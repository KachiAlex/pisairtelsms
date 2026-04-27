import { v4 as uuidv4 } from 'uuid';

interface ErrorLog {
  id: string;
  tenantId: string;
  service: string;
  signature: string;
  severity: 'high' | 'medium' | 'low';
  lastSeen: string;
  hits: number;
  stackTrace?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface EnvironmentCoverage {
  id: string;
  tenantId: string;
  name: string;
  status: 'stable' | 'warning' | 'muted';
  coverage: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ErrorHeatmap {
  id: string;
  tenantId: string;
  window: string;
  value: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ErrorNotification {
  id: string;
  tenantId: string;
  errorLogId: string;
  message: string;
  sent: boolean;
  createdAt: Date;
}

const errorLogs: ErrorLog[] = [];
const environments: EnvironmentCoverage[] = [];
const heatmaps: ErrorHeatmap[] = [];
const notifications: ErrorNotification[] = [];

export const errorLogsApi = {
  // List error logs
  listLogs: (tenantId: string, filters?: { severity?: string; service?: string; limit?: number; offset?: number }) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const { severity, service, limit = 50, offset = 0 } = filters || {};

    let filtered = errorLogs.filter(l => l.tenantId === tenantId);
    if (severity) filtered = filtered.filter(l => l.severity === severity);
    if (service) filtered = filtered.filter(l => l.service === service);

    const data = filtered
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(offset, offset + limit);

    return { data, total: filtered.length };
  },

  // Create error log
  createLog: (tenantId: string, payload: { service: string; signature: string; severity: string; lastSeen: string; hits: number; stackTrace?: string }) => {
    if (!tenantId || !payload.service || !payload.signature) {
      throw new Error('Missing required fields');
    }

    const log: ErrorLog = {
      id: uuidv4(),
      tenantId,
      service: payload.service,
      signature: payload.signature,
      severity: payload.severity as any,
      lastSeen: payload.lastSeen,
      hits: payload.hits,
      stackTrace: payload.stackTrace,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    errorLogs.push(log);
    return log;
  },

  // Get error log by ID
  getLogById: (tenantId: string, logId: string) => {
    if (!tenantId || !logId) throw new Error('Missing required fields');

    const log = errorLogs.find(l => l.id === logId && l.tenantId === tenantId);
    if (!log) throw new Error('Error log not found');

    return log;
  },

  // Update error log
  updateLog: (tenantId: string, logId: string, payload: { hits?: number; lastSeen?: string; severity?: string }) => {
    if (!tenantId || !logId) throw new Error('Missing required fields');

    const log = errorLogs.find(l => l.id === logId && l.tenantId === tenantId);
    if (!log) throw new Error('Error log not found');

    if (payload.hits !== undefined) log.hits = payload.hits;
    if (payload.lastSeen) log.lastSeen = payload.lastSeen;
    if (payload.severity) log.severity = payload.severity as any;
    log.updatedAt = new Date();

    return log;
  },

  // List environment coverage
  listEnvironments: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    return environments
      .filter(e => e.tenantId === tenantId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  // Create environment coverage
  createEnvironment: (tenantId: string, payload: { name: string; status: string; coverage: number }) => {
    if (!tenantId || !payload.name) {
      throw new Error('Missing required fields');
    }

    const env: EnvironmentCoverage = {
      id: uuidv4(),
      tenantId,
      name: payload.name,
      status: payload.status as any,
      coverage: payload.coverage,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    environments.push(env);
    return env;
  },

  // List error heatmap
  listHeatmap: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    return heatmaps
      .filter(h => h.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  // Create heatmap entry
  createHeatmapEntry: (tenantId: string, payload: { window: string; value: number }) => {
    if (!tenantId || !payload.window) {
      throw new Error('Missing required fields');
    }

    const entry: ErrorHeatmap = {
      id: uuidv4(),
      tenantId,
      window: payload.window,
      value: payload.value,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    heatmaps.push(entry);
    return entry;
  },

  // Get error statistics
  getStatistics: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const tenantLogs = errorLogs.filter(l => l.tenantId === tenantId);
    const highSeverity = tenantLogs.filter(l => l.severity === 'high').length;
    const mediumSeverity = tenantLogs.filter(l => l.severity === 'medium').length;

    return {
      eventsPerMin: '6.8k',
      alertsFiring: highSeverity + mediumSeverity,
      suppressedNoise: '73%',
      totalErrors: tenantLogs.length,
    };
  },

  // Get error trend analysis
  getErrorTrends: (tenantId: string, days: number = 7) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const tenantLogs = errorLogs.filter(
      l => l.tenantId === tenantId && l.createdAt >= cutoffDate
    );

    const trends = {
      high: tenantLogs.filter(l => l.severity === 'high').length,
      medium: tenantLogs.filter(l => l.severity === 'medium').length,
      low: tenantLogs.filter(l => l.severity === 'low').length,
      total: tenantLogs.length,
    };

    return trends;
  },

  // Send error notification
  sendErrorNotification: (tenantId: string, errorLogId: string, message: string) => {
    if (!tenantId || !errorLogId) throw new Error('Missing required fields');

    const notification: ErrorNotification = {
      id: uuidv4(),
      tenantId,
      errorLogId,
      message,
      sent: true,
      createdAt: new Date(),
    };

    notifications.push(notification);
    return notification;
  },

  // Get error notifications
  getNotifications: (tenantId: string, filters?: { limit?: number; offset?: number }) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const { limit = 50, offset = 0 } = filters || {};

    const filtered = notifications.filter(n => n.tenantId === tenantId);
    const data = filtered
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    return { data, total: filtered.length };
  },

  // Export error logs
  exportLogs: (tenantId: string, filters?: { severity?: string; service?: string }) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    let filtered = errorLogs.filter(l => l.tenantId === tenantId);
    if (filters?.severity) filtered = filtered.filter(l => l.severity === filters.severity);
    if (filters?.service) filtered = filtered.filter(l => l.service === filters.service);

    return {
      exportId: uuidv4(),
      totalRecords: filtered.length,
      data: filtered,
      exportedAt: new Date(),
    };
  },
};

export default errorLogsApi;
