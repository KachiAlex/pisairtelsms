import { v4 as uuidv4 } from 'uuid';

interface RiskAlert {
  id: string;
  tenantId: string;
  surface: string;
  signal: string;
  likelihood: 'high' | 'medium' | 'low';
  eta: string;
  owner: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ModelPerformance {
  id: string;
  tenantId: string;
  model: string;
  precision: number;
  recall: number;
  createdAt: Date;
  updatedAt: Date;
}

interface MitigationPlaybook {
  id: string;
  tenantId: string;
  title: string;
  steps: number;
  coverage: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SignalCluster {
  id: string;
  tenantId: string;
  cluster: string;
  confidence: number;
  incidents: number;
  createdAt: Date;
  updatedAt: Date;
}

const alerts: RiskAlert[] = [];
const models: ModelPerformance[] = [];
const playbooks: MitigationPlaybook[] = [];
const clusters: SignalCluster[] = [];

export const riskAlertsApi = {
  // List risk alerts
  listAlerts: (tenantId: string, filters?: { likelihood?: string; limit?: number; offset?: number }) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const { likelihood, limit = 50, offset = 0 } = filters || {};

    let filtered = alerts.filter(a => a.tenantId === tenantId);
    if (likelihood) filtered = filtered.filter(a => a.likelihood === likelihood);

    const data = filtered
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(offset, offset + limit);

    return { data, total: filtered.length };
  },

  // Create risk alert
  createAlert: (tenantId: string, payload: { surface: string; signal: string; likelihood: string; eta: string; owner: string }) => {
    if (!tenantId || !payload.surface || !payload.signal) {
      throw new Error('Missing required fields');
    }

    const alert: RiskAlert = {
      id: uuidv4(),
      tenantId,
      surface: payload.surface,
      signal: payload.signal,
      likelihood: payload.likelihood as any,
      eta: payload.eta,
      owner: payload.owner,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    alerts.push(alert);
    return alert;
  },

  // List model performance
  listModelPerformance: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    return models
      .filter(m => m.tenantId === tenantId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  // Create model performance
  createModelPerformance: (tenantId: string, payload: { model: string; precision: number; recall: number }) => {
    if (!tenantId || !payload.model) {
      throw new Error('Missing required fields');
    }

    const model: ModelPerformance = {
      id: uuidv4(),
      tenantId,
      model: payload.model,
      precision: payload.precision,
      recall: payload.recall,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    models.push(model);
    return model;
  },

  // List mitigation playbooks
  listPlaybooks: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    return playbooks
      .filter(p => p.tenantId === tenantId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  // Create playbook
  createPlaybook: (tenantId: string, payload: { title: string; steps: number; coverage: number; status: string }) => {
    if (!tenantId || !payload.title) {
      throw new Error('Missing required fields');
    }

    const playbook: MitigationPlaybook = {
      id: uuidv4(),
      tenantId,
      title: payload.title,
      steps: payload.steps,
      coverage: payload.coverage,
      status: payload.status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    playbooks.push(playbook);
    return playbook;
  },

  // List signal clusters
  listClusters: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    return clusters
      .filter(c => c.tenantId === tenantId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  // Create signal cluster
  createCluster: (tenantId: string, payload: { cluster: string; confidence: number; incidents: number }) => {
    if (!tenantId || !payload.cluster) {
      throw new Error('Missing required fields');
    }

    const cluster: SignalCluster = {
      id: uuidv4(),
      tenantId,
      cluster: payload.cluster,
      confidence: payload.confidence,
      incidents: payload.incidents,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    clusters.push(cluster);
    return cluster;
  },

  // Get risk statistics
  getStatistics: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const tenantAlerts = alerts.filter(a => a.tenantId === tenantId);
    const criticalAlerts = tenantAlerts.filter(a => a.likelihood === 'high');

    return {
      activeAlerts: tenantAlerts.length,
      criticalAlerts: criticalAlerts.length,
      playbooksReady: playbooks.filter(p => p.tenantId === tenantId && p.status === 'Ready').length,
      automationCoverage: playbooks.filter(p => p.tenantId === tenantId).reduce((sum, p) => sum + p.coverage, 0) / Math.max(playbooks.filter(p => p.tenantId === tenantId).length, 1),
    };
  },
};

export default riskAlertsApi;
