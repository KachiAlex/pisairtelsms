import { v4 as uuidv4 } from 'uuid';

interface AlertRecord {
  id: string;
  tenantId: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category?: string;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const alerts: AlertRecord[] = [];

export const alertsApi = {
  // List system alerts
  list: (tenantId: string, filters?: { severity?: string; status?: string; limit?: number; offset?: number }) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const { severity, status = 'active', limit = 50, offset = 0 } = filters || {};

    let filtered = alerts.filter(a => a.tenantId === tenantId && a.status === status);
    if (severity) filtered = filtered.filter(a => a.severity === severity);

    const data = filtered
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    return { data, total: filtered.length };
  },

  // Create system alert
  create: (tenantId: string, payload: { title: string; message: string; severity?: string; category?: string }) => {
    if (!tenantId || !payload.title || !payload.message) {
      throw new Error('Missing required fields');
    }

    const validSeverities = ['info', 'warning', 'error', 'critical'];
    const severity = payload.severity || 'info';
    if (!validSeverities.includes(severity)) {
      throw new Error('Invalid severity level');
    }

    const alert: AlertRecord = {
      id: uuidv4(),
      tenantId,
      title: payload.title,
      message: payload.message,
      severity: severity as any,
      category: payload.category,
      status: 'active',
      acknowledged: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    alerts.push(alert);
    return alert;
  },

  // Get alert by ID
  getById: (tenantId: string, id: string) => {
    const alert = alerts.find(a => a.id === id && a.tenantId === tenantId);
    if (!alert) throw new Error('Alert not found');
    return alert;
  },

  // Acknowledge alert
  acknowledge: (tenantId: string, userId: string, id: string) => {
    if (!tenantId || !userId) throw new Error('Missing tenant or user ID');

    const alert = alerts.find(a => a.id === id && a.tenantId === tenantId);
    if (!alert) throw new Error('Alert not found');

    alert.acknowledged = true;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();
    alert.status = 'acknowledged';
    alert.updatedAt = new Date();

    return alert;
  },

  // Resolve alert
  resolve: (tenantId: string, id: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const alert = alerts.find(a => a.id === id && a.tenantId === tenantId);
    if (!alert) throw new Error('Alert not found');

    alert.status = 'resolved';
    alert.updatedAt = new Date();

    return alert;
  },

  // Get alert statistics
  getStatistics: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const tenantAlerts = alerts.filter(a => a.tenantId === tenantId);
    return {
      total: tenantAlerts.length,
      active: tenantAlerts.filter(a => a.status === 'active').length,
      acknowledged: tenantAlerts.filter(a => a.status === 'acknowledged').length,
      resolved: tenantAlerts.filter(a => a.status === 'resolved').length,
      bySeverity: {
        critical: tenantAlerts.filter(a => a.severity === 'critical').length,
        error: tenantAlerts.filter(a => a.severity === 'error').length,
        warning: tenantAlerts.filter(a => a.severity === 'warning').length,
        info: tenantAlerts.filter(a => a.severity === 'info').length,
      },
    };
  },
};

export default alertsApi;


// Get alert statistics (for compatibility with existing code)
export const getStatistics = (tenantId: string) => {
  return alertsApi.getStatistics(tenantId);
};
