import { v4 as uuidv4 } from 'uuid';

interface RiskAlert {
  id: string;
  tenantId: string;
  studentId?: string;
  surface: string;
  signal: string;
  likelihood: 'high' | 'medium' | 'low';
  riskScore: number;
  eta: string;
  owner: string;
  interventions: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface ModelPerformance {
  id: string;
  tenantId: string;
  model: string;
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;
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
  automationLevel: 'manual' | 'semi-automated' | 'fully-automated';
  createdAt: Date;
  updatedAt: Date;
}

interface SignalCluster {
  id: string;
  tenantId: string;
  cluster: string;
  confidence: number;
  incidents: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  createdAt: Date;
  updatedAt: Date;
}

interface InterventionRecommendation {
  id: string;
  tenantId: string;
  riskAlertId: string;
  action: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  expectedOutcome: string;
  owner: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const alerts: RiskAlert[] = [];
const models: ModelPerformance[] = [];
const playbooks: MitigationPlaybook[] = [];
const clusters: SignalCluster[] = [];
const interventions: InterventionRecommendation[] = [];

// Risk scoring algorithm
const calculateRiskScore = (likelihood: 'high' | 'medium' | 'low'): number => {
  const scores = { high: 0.8, medium: 0.5, low: 0.2 };
  return scores[likelihood];
};

export const riskAlertsApi = {
  // List risk alerts
  listAlerts: (tenantId: string, filters?: { likelihood?: string; limit?: number; offset?: number }) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const { likelihood, limit = 50, offset = 0 } = filters || {};

    let filtered = alerts.filter(a => a.tenantId === tenantId);
    if (likelihood) filtered = filtered.filter(a => a.likelihood === likelihood);

    const data = filtered
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(offset, offset + limit);

    return { data, total: filtered.length };
  },

  // Create risk alert with scoring
  createAlert: (tenantId: string, payload: { studentId?: string; surface: string; signal: string; likelihood: string; eta: string; owner: string; interventions?: string[] }) => {
    if (!tenantId || !payload.surface || !payload.signal) {
      throw new Error('Missing required fields');
    }

    const riskScore = calculateRiskScore(payload.likelihood as any);

    const alert: RiskAlert = {
      id: uuidv4(),
      tenantId,
      studentId: payload.studentId,
      surface: payload.surface,
      signal: payload.signal,
      likelihood: payload.likelihood as any,
      riskScore,
      eta: payload.eta,
      owner: payload.owner,
      interventions: payload.interventions || [],
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
      .sort((a, b) => b.f1Score - a.f1Score);
  },

  // Create model performance
  createModelPerformance: (tenantId: string, payload: { model: string; precision: number; recall: number; accuracy?: number }) => {
    if (!tenantId || !payload.model) {
      throw new Error('Missing required fields');
    }

    const f1Score = 2 * (payload.precision * payload.recall) / (payload.precision + payload.recall || 1);

    const model: ModelPerformance = {
      id: uuidv4(),
      tenantId,
      model: payload.model,
      precision: payload.precision,
      recall: payload.recall,
      f1Score,
      accuracy: payload.accuracy || 0,
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
  createPlaybook: (tenantId: string, payload: { title: string; steps: number; coverage: number; status: string; automationLevel?: string }) => {
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
      automationLevel: (payload.automationLevel as any) || 'manual',
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
      .sort((a, b) => b.confidence - a.confidence);
  },

  // Create signal cluster
  createCluster: (tenantId: string, payload: { cluster: string; confidence: number; incidents: number; trend?: string }) => {
    if (!tenantId || !payload.cluster) {
      throw new Error('Missing required fields');
    }

    const cluster: SignalCluster = {
      id: uuidv4(),
      tenantId,
      cluster: payload.cluster,
      confidence: payload.confidence,
      incidents: payload.incidents,
      trend: (payload.trend as any) || 'stable',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    clusters.push(cluster);
    return cluster;
  },

  // Create intervention recommendation
  createIntervention: (tenantId: string, payload: { riskAlertId: string; action: string; priority: string; expectedOutcome: string; owner: string }) => {
    if (!tenantId || !payload.riskAlertId || !payload.action) {
      throw new Error('Missing required fields');
    }

    const intervention: InterventionRecommendation = {
      id: uuidv4(),
      tenantId,
      riskAlertId: payload.riskAlertId,
      action: payload.action,
      priority: (payload.priority as any) || 'medium',
      expectedOutcome: payload.expectedOutcome,
      owner: payload.owner,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    interventions.push(intervention);
    return intervention;
  },

  // List interventions for alert
  listInterventions: (tenantId: string, riskAlertId: string) => {
    if (!tenantId || !riskAlertId) throw new Error('Missing required fields');

    return interventions
      .filter(i => i.tenantId === tenantId && i.riskAlertId === riskAlertId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  // Get risk statistics
  getStatistics: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const tenantAlerts = alerts.filter(a => a.tenantId === tenantId);
    const criticalAlerts = tenantAlerts.filter(a => a.likelihood === 'high');
    const tenantPlaybooks = playbooks.filter(p => p.tenantId === tenantId);

    return {
      activeAlerts: tenantAlerts.length,
      criticalAlerts: criticalAlerts.length,
      averageRiskScore: tenantAlerts.length > 0 
        ? (tenantAlerts.reduce((sum, a) => sum + a.riskScore, 0) / tenantAlerts.length).toFixed(2)
        : '0',
      playbooksReady: tenantPlaybooks.filter(p => p.status === 'Ready').length,
      automationCoverage: tenantPlaybooks.length > 0
        ? (tenantPlaybooks.reduce((sum, p) => sum + p.coverage, 0) / tenantPlaybooks.length).toFixed(1)
        : '0',
    };
  },
};

export default riskAlertsApi;
