import { sql } from '../../_lib/sql.js';

// Risk scoring algorithm
const calculateRiskScore = (likelihood: 'high' | 'medium' | 'low'): number => {
  const scores = { high: 0.8, medium: 0.5, low: 0.2 };
  return scores[likelihood];
};

const toAlert = (r: any) => ({
  id: r.id,
  tenantId: r.tenant_id,
  studentId: r.student_id,
  surface: r.surface,
  signal: r.signal,
  likelihood: r.likelihood,
  riskScore: parseFloat(r.risk_score || '0'),
  eta: r.eta,
  owner: r.owner,
  interventions: Array.isArray(r.interventions) ? r.interventions : [],
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toModel = (r: any) => ({
  id: r.id,
  tenantId: r.tenant_id,
  model: r.model,
  precision: parseFloat(r.precision || '0'),
  recall: parseFloat(r.recall || '0'),
  f1Score: parseFloat(r.f1_score || '0'),
  accuracy: parseFloat(r.accuracy || '0'),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toPlaybook = (r: any) => ({
  id: r.id,
  tenantId: r.tenant_id,
  title: r.title,
  steps: r.steps,
  coverage: parseFloat(r.coverage || '0'),
  status: r.status,
  automationLevel: r.automation_level,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toCluster = (r: any) => ({
  id: r.id,
  tenantId: r.tenant_id,
  cluster: r.cluster,
  confidence: parseFloat(r.confidence || '0'),
  incidents: r.incidents,
  trend: r.trend,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toIntervention = (r: any) => ({
  id: r.id,
  tenantId: r.tenant_id,
  riskAlertId: r.risk_alert_id,
  action: r.action,
  priority: r.priority,
  expectedOutcome: r.expected_outcome,
  owner: r.owner,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const riskAlertsApi = {
  // List risk alerts
  listAlerts: async (tenantId: string, filters?: { likelihood?: string; limit?: number; offset?: number }) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const { likelihood, limit = 50, offset = 0 } = filters || {};

    const params: any[] = [tenantId];
    let query = `SELECT * FROM risk_alerts WHERE tenant_id = $1`;
    if (likelihood) {
      query += ` AND likelihood = $2`;
      params.push(likelihood);
    }
    query += ` ORDER BY risk_score DESC, created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await sql.query(query, params);
    const countResult = await sql.query(
      `SELECT COUNT(*) as total FROM risk_alerts WHERE tenant_id = $1${likelihood ? ' AND likelihood = $2' : ''}`,
      likelihood ? [tenantId, likelihood] : [tenantId]
    );

    return { data: result.rows.map(toAlert), total: parseInt(countResult.rows[0]?.total || '0') };
  },

  // Create risk alert with scoring
  createAlert: async (tenantId: string, payload: { studentId?: string; surface: string; signal: string; likelihood: string; eta: string; owner: string; interventions?: string[] }) => {
    if (!tenantId || !payload.surface || !payload.signal) {
      throw new Error('Missing required fields');
    }

    const riskScore = calculateRiskScore(payload.likelihood as any);

    const result = await sql.query(
      `INSERT INTO risk_alerts (id, tenant_id, student_id, surface, signal, likelihood, risk_score, eta, owner, interventions, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [tenantId, payload.studentId || null, payload.surface, payload.signal, payload.likelihood, riskScore, payload.eta || null, payload.owner || null, JSON.stringify(payload.interventions || [])]
    );
    return toAlert(result.rows[0]);
  },

  // List model performance
  listModelPerformance: async (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');
    const result = await sql.query(
      `SELECT * FROM risk_model_performance WHERE tenant_id = $1 ORDER BY f1_score DESC`,
      [tenantId]
    );
    return result.rows.map(toModel);
  },

  // Create model performance
  createModelPerformance: async (tenantId: string, payload: { model: string; precision: number; recall: number; accuracy?: number }) => {
    if (!tenantId || !payload.model) {
      throw new Error('Missing required fields');
    }

    const f1Score = 2 * (payload.precision * payload.recall) / (payload.precision + payload.recall || 1);

    const result = await sql.query(
      `INSERT INTO risk_model_performance (id, tenant_id, model, precision, recall, f1_score, accuracy, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [tenantId, payload.model, payload.precision, payload.recall, f1Score, payload.accuracy || 0]
    );
    return toModel(result.rows[0]);
  },

  // List mitigation playbooks
  listPlaybooks: async (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');
    const result = await sql.query(
      `SELECT * FROM risk_playbooks WHERE tenant_id = $1 ORDER BY updated_at DESC`,
      [tenantId]
    );
    return result.rows.map(toPlaybook);
  },

  // Create playbook
  createPlaybook: async (tenantId: string, payload: { title: string; steps: number; coverage: number; status: string; automationLevel?: string }) => {
    if (!tenantId || !payload.title) {
      throw new Error('Missing required fields');
    }

    const result = await sql.query(
      `INSERT INTO risk_playbooks (id, tenant_id, title, steps, coverage, status, automation_level, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [tenantId, payload.title, payload.steps || 0, payload.coverage || 0, payload.status || null, payload.automationLevel || 'manual']
    );
    return toPlaybook(result.rows[0]);
  },

  // List signal clusters
  listClusters: async (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');
    const result = await sql.query(
      `SELECT * FROM risk_signal_clusters WHERE tenant_id = $1 ORDER BY confidence DESC`,
      [tenantId]
    );
    return result.rows.map(toCluster);
  },

  // Create signal cluster
  createCluster: async (tenantId: string, payload: { cluster: string; confidence: number; incidents: number; trend?: string }) => {
    if (!tenantId || !payload.cluster) {
      throw new Error('Missing required fields');
    }

    const result = await sql.query(
      `INSERT INTO risk_signal_clusters (id, tenant_id, cluster, confidence, incidents, trend, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [tenantId, payload.cluster, payload.confidence || 0, payload.incidents || 0, payload.trend || 'stable']
    );
    return toCluster(result.rows[0]);
  },

  // Create intervention recommendation
  createIntervention: async (tenantId: string, payload: { riskAlertId: string; action: string; priority: string; expectedOutcome: string; owner: string }) => {
    if (!tenantId || !payload.riskAlertId || !payload.action) {
      throw new Error('Missing required fields');
    }

    const result = await sql.query(
      `INSERT INTO risk_interventions (id, tenant_id, risk_alert_id, action, priority, expected_outcome, owner, status, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())
       RETURNING *`,
      [tenantId, payload.riskAlertId, payload.action, payload.priority || 'medium', payload.expectedOutcome || null, payload.owner || null]
    );
    return toIntervention(result.rows[0]);
  },

  // List interventions for alert
  listInterventions: async (tenantId: string, riskAlertId: string) => {
    if (!tenantId || !riskAlertId) throw new Error('Missing required fields');
    const result = await sql.query(
      `SELECT * FROM risk_interventions WHERE tenant_id = $1 AND risk_alert_id = $2 ORDER BY updated_at DESC`,
      [tenantId, riskAlertId]
    );
    return result.rows.map(toIntervention);
  },

  // Get risk statistics
  getStatistics: async (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const alertsResult = await sql.query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE likelihood = 'high') as critical,
              AVG(risk_score) as avg_score
       FROM risk_alerts WHERE tenant_id = $1`,
      [tenantId]
    );
    const playbooksResult = await sql.query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'Ready') as ready,
              AVG(coverage) as avg_coverage
       FROM risk_playbooks WHERE tenant_id = $1`,
      [tenantId]
    );

    const a = alertsResult.rows[0];
    const p = playbooksResult.rows[0];

    return {
      activeAlerts: parseInt(a?.total || '0'),
      criticalAlerts: parseInt(a?.critical || '0'),
      averageRiskScore: a?.avg_score ? parseFloat(a.avg_score).toFixed(2) : '0',
      playbooksReady: parseInt(p?.ready || '0'),
      automationCoverage: p?.avg_coverage ? parseFloat(p.avg_coverage).toFixed(1) : '0',
    };
  },
};

export default riskAlertsApi;
