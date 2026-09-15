import { sql } from '../../_lib/sql.js';

interface ServiceStatus {
  id: string;
  tenantId: string;
  surface: string;
  status: 'operational' | 'watch' | 'degraded';
  latency: string;
  uptime: number;
  owners: string;
  createdAt: Date;
  updatedAt: Date;
}

interface InfrastructureVital {
  id: string;
  tenantId: string;
  label: string;
  value: number;
  threshold: number;
  createdAt: Date;
  updatedAt: Date;
}

interface IncidentRecord {
  id: string;
  tenantId: string;
  title: string;
  start: string;
  duration: string;
  state: 'mitigated' | 'resolved' | 'ongoing';
  createdAt: Date;
  updatedAt: Date;
}

interface DependencyHealth {
  id: string;
  tenantId: string;
  name: string;
  status: 'operational' | 'watch' | 'degraded';
  coverage: string;
  createdAt: Date;
  updatedAt: Date;
}

interface HealthHistory {
  id: string;
  tenantId: string;
  timestamp: Date;
  overallStatus: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  uptime: number;
  createdAt: Date;
}

let tablesEnsured = false;

async function ensureSystemHealthTables() {
  if (tablesEnsured) return;

  await sql`
    CREATE TABLE IF NOT EXISTS system_health_services (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
      surface TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'operational',
      latency TEXT,
      uptime NUMERIC(5,1) DEFAULT 0,
      owners TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS system_health_vitals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
      label TEXT NOT NULL,
      value NUMERIC DEFAULT 0,
      threshold NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS system_health_incidents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
      title TEXT NOT NULL,
      start TEXT,
      duration TEXT,
      state TEXT NOT NULL DEFAULT 'ongoing',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS system_health_dependencies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'operational',
      coverage TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS system_health_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      overall_status TEXT,
      cpu_usage NUMERIC DEFAULT 0,
      memory_usage NUMERIC DEFAULT 0,
      disk_usage NUMERIC DEFAULT 0,
      uptime NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

  await sql`CREATE INDEX IF NOT EXISTS idx_sh_services_tenant ON system_health_services(tenant_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sh_vitals_tenant ON system_health_vitals(tenant_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sh_incidents_tenant ON system_health_incidents(tenant_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sh_dependencies_tenant ON system_health_dependencies(tenant_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sh_history_tenant ON system_health_history(tenant_id)`;

  tablesEnsured = true;
}

const mapService = (r: any): ServiceStatus => ({
  id: r.id, tenantId: r.tenant_id, surface: r.surface, status: r.status,
  latency: r.latency, uptime: Number(r.uptime), owners: r.owners,
  createdAt: r.created_at, updatedAt: r.updated_at,
});

const mapVital = (r: any): InfrastructureVital => ({
  id: r.id, tenantId: r.tenant_id, label: r.label,
  value: Number(r.value), threshold: Number(r.threshold),
  createdAt: r.created_at, updatedAt: r.updated_at,
});

const mapIncident = (r: any): IncidentRecord => ({
  id: r.id, tenantId: r.tenant_id, title: r.title, start: r.start,
  duration: r.duration, state: r.state,
  createdAt: r.created_at, updatedAt: r.updated_at,
});

const mapDependency = (r: any): DependencyHealth => ({
  id: r.id, tenantId: r.tenant_id, name: r.name, status: r.status,
  coverage: r.coverage, createdAt: r.created_at, updatedAt: r.updated_at,
});

const mapHistory = (r: any): HealthHistory => ({
  id: r.id, tenantId: r.tenant_id, timestamp: r.timestamp,
  overallStatus: r.overall_status, cpuUsage: Number(r.cpu_usage),
  memoryUsage: Number(r.memory_usage), diskUsage: Number(r.disk_usage),
  uptime: Number(r.uptime), createdAt: r.created_at,
});

export const systemHealthApi = {
  // List service status
  listServices: async (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');
    await ensureSystemHealthTables();

    const result = await sql`
      SELECT * FROM system_health_services
      WHERE tenant_id = ${tenantId}
      ORDER BY updated_at DESC`;
    return result.rows.map(mapService);
  },

  // Create service status
  createService: async (tenantId: string, payload: { surface: string; status: string; latency: string; uptime: number; owners: string }) => {
    if (!tenantId || !payload.surface) {
      throw new Error('Missing required fields');
    }
    await ensureSystemHealthTables();

    const result = await sql`
      INSERT INTO system_health_services (tenant_id, surface, status, latency, uptime, owners)
      VALUES (${tenantId}, ${payload.surface}, ${payload.status}, ${payload.latency}, ${payload.uptime}, ${payload.owners})
      RETURNING *`;
    return mapService(result.rows[0]);
  },

  // Update service status
  updateService: async (tenantId: string, serviceId: string, payload: { status?: string; latency?: string; uptime?: number }) => {
    if (!tenantId || !serviceId) throw new Error('Missing required fields');
    await ensureSystemHealthTables();

    const existing = await sql`
      SELECT * FROM system_health_services WHERE id = ${serviceId} AND tenant_id = ${tenantId}`;
    if (existing.rows.length === 0) throw new Error('Service not found');
    const cur = existing.rows[0];

    const result = await sql`
      UPDATE system_health_services
      SET status = ${payload.status ?? cur.status},
          latency = ${payload.latency ?? cur.latency},
          uptime = ${payload.uptime ?? cur.uptime},
          updated_at = NOW()
      WHERE id = ${serviceId} AND tenant_id = ${tenantId}
      RETURNING *`;
    return mapService(result.rows[0]);
  },

  // List infrastructure vitals
  listVitals: async (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');
    await ensureSystemHealthTables();

    const result = await sql`
      SELECT * FROM system_health_vitals
      WHERE tenant_id = ${tenantId}
      ORDER BY updated_at DESC`;
    return result.rows.map(mapVital);
  },

  // Create infrastructure vital
  createVital: async (tenantId: string, payload: { label: string; value: number; threshold: number }) => {
    if (!tenantId || !payload.label) {
      throw new Error('Missing required fields');
    }
    await ensureSystemHealthTables();

    const result = await sql`
      INSERT INTO system_health_vitals (tenant_id, label, value, threshold)
      VALUES (${tenantId}, ${payload.label}, ${payload.value}, ${payload.threshold})
      RETURNING *`;
    return mapVital(result.rows[0]);
  },

  // List incidents
  listIncidents: async (tenantId: string, filters?: { limit?: number; offset?: number }) => {
    if (!tenantId) throw new Error('Missing tenant ID');
    await ensureSystemHealthTables();

    const { limit = 50, offset = 0 } = filters || {};

    const countResult = await sql`
      SELECT COUNT(*) as total FROM system_health_incidents WHERE tenant_id = ${tenantId}`;
    const dataResult = await sql`
      SELECT * FROM system_health_incidents
      WHERE tenant_id = ${tenantId}
      ORDER BY updated_at DESC
      LIMIT ${limit} OFFSET ${offset}`;

    return { data: dataResult.rows.map(mapIncident), total: parseInt(countResult.rows[0].total, 10) };
  },

  // Create incident
  createIncident: async (tenantId: string, payload: { title: string; start: string; duration: string; state: string }) => {
    if (!tenantId || !payload.title) {
      throw new Error('Missing required fields');
    }
    await ensureSystemHealthTables();

    const result = await sql`
      INSERT INTO system_health_incidents (tenant_id, title, start, duration, state)
      VALUES (${tenantId}, ${payload.title}, ${payload.start}, ${payload.duration}, ${payload.state})
      RETURNING *`;
    return mapIncident(result.rows[0]);
  },

  // List dependencies
  listDependencies: async (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');
    await ensureSystemHealthTables();

    const result = await sql`
      SELECT * FROM system_health_dependencies
      WHERE tenant_id = ${tenantId}
      ORDER BY updated_at DESC`;
    return result.rows.map(mapDependency);
  },

  // Create dependency
  createDependency: async (tenantId: string, payload: { name: string; status: string; coverage: string }) => {
    if (!tenantId || !payload.name) {
      throw new Error('Missing required fields');
    }
    await ensureSystemHealthTables();

    const result = await sql`
      INSERT INTO system_health_dependencies (tenant_id, name, status, coverage)
      VALUES (${tenantId}, ${payload.name}, ${payload.status}, ${payload.coverage})
      RETURNING *`;
    return mapDependency(result.rows[0]);
  },

  // Get health statistics
  getStatistics: async (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');
    await ensureSystemHealthTables();

    const svcResult = await sql`
      SELECT status, uptime FROM system_health_services WHERE tenant_id = ${tenantId}`;
    const incResult = await sql`
      SELECT COUNT(*) as total FROM system_health_incidents WHERE tenant_id = ${tenantId}`;

    const tenantServices = svcResult.rows;
    const operationalServices = tenantServices.filter(s => s.status === 'operational').length;
    const avgUptime = tenantServices.length > 0
      ? (tenantServices.reduce((sum, s) => sum + Number(s.uptime), 0) / tenantServices.length).toFixed(1)
      : '0';

    return {
      overallStatus: operationalServices === tenantServices.length ? 'Green' : 'Yellow',
      incidents24h: parseInt(incResult.rows[0].total, 10),
      slaConverage: avgUptime,
      upcomingMaintenance: 0,
    };
  },

  // Get health check status
  getHealthCheck: async (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');
    await ensureSystemHealthTables();

    const svcResult = await sql`
      SELECT * FROM system_health_services WHERE tenant_id = ${tenantId}`;
    const vitalResult = await sql`
      SELECT * FROM system_health_vitals WHERE tenant_id = ${tenantId}`;

    const tenantServices = svcResult.rows.map(mapService);
    const tenantVitals = vitalResult.rows.map(mapVital);

    const allOperational = tenantServices.every(s => s.status === 'operational');
    const vitalsHealthy = tenantVitals.every(v => v.value <= v.threshold);

    return {
      status: allOperational && vitalsHealthy ? 'healthy' : 'degraded',
      timestamp: new Date(),
      services: tenantServices,
      vitals: tenantVitals,
    };
  },

  // Record health history
  recordHealthHistory: async (tenantId: string, payload: { cpuUsage: number; memoryUsage: number; diskUsage: number; uptime: number }) => {
    if (!tenantId) throw new Error('Missing tenant ID');
    await ensureSystemHealthTables();

    const svcResult = await sql`
      SELECT status FROM system_health_services WHERE tenant_id = ${tenantId}`;
    const allOperational = svcResult.rows.every(s => s.status === 'operational');

    const result = await sql`
      INSERT INTO system_health_history (tenant_id, overall_status, cpu_usage, memory_usage, disk_usage, uptime)
      VALUES (${tenantId}, ${allOperational ? 'operational' : 'degraded'}, ${payload.cpuUsage}, ${payload.memoryUsage}, ${payload.diskUsage}, ${payload.uptime})
      RETURNING *`;
    return mapHistory(result.rows[0]);
  },

  // Get health history
  getHealthHistory: async (tenantId: string, filters?: { limit?: number; offset?: number }) => {
    if (!tenantId) throw new Error('Missing tenant ID');
    await ensureSystemHealthTables();

    const { limit = 100, offset = 0 } = filters || {};

    const countResult = await sql`
      SELECT COUNT(*) as total FROM system_health_history WHERE tenant_id = ${tenantId}`;
    const dataResult = await sql`
      SELECT * FROM system_health_history
      WHERE tenant_id = ${tenantId}
      ORDER BY timestamp DESC
      LIMIT ${limit} OFFSET ${offset}`;

    return { data: dataResult.rows.map(mapHistory), total: parseInt(countResult.rows[0].total, 10) };
  },

  // Get resource usage metrics
  getResourceMetrics: async (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');
    await ensureSystemHealthTables();

    const result = await sql`
      SELECT
        (SELECT cpu_usage FROM system_health_history WHERE tenant_id = ${tenantId} ORDER BY timestamp DESC LIMIT 1) as cpu_current,
        ROUND(AVG(cpu_usage)::numeric, 1) as cpu_avg,
        MAX(cpu_usage) as cpu_peak,
        (SELECT memory_usage FROM system_health_history WHERE tenant_id = ${tenantId} ORDER BY timestamp DESC LIMIT 1) as mem_current,
        ROUND(AVG(memory_usage)::numeric, 1) as mem_avg,
        MAX(memory_usage) as mem_peak,
        (SELECT disk_usage FROM system_health_history WHERE tenant_id = ${tenantId} ORDER BY timestamp DESC LIMIT 1) as disk_current,
        ROUND(AVG(disk_usage)::numeric, 1) as disk_avg,
        MAX(disk_usage) as disk_peak
      FROM system_health_history
      WHERE tenant_id = ${tenantId}`;

    const r = result.rows[0];
    if (!r || r.cpu_current === null) {
      return {
        cpu: { current: 0, average: 0, peak: 0 },
        memory: { current: 0, average: 0, peak: 0 },
        disk: { current: 0, average: 0, peak: 0 },
      };
    }

    return {
      cpu: { current: Number(r.cpu_current), average: Number(r.cpu_avg), peak: Number(r.cpu_peak) },
      memory: { current: Number(r.mem_current), average: Number(r.mem_avg), peak: Number(r.mem_peak) },
      disk: { current: Number(r.disk_current), average: Number(r.disk_avg), peak: Number(r.disk_peak) },
    };
  },

  // Calculate uptime percentage
  calculateUptime: async (tenantId: string, days: number = 30) => {
    if (!tenantId) throw new Error('Missing tenant ID');
    await ensureSystemHealthTables();

    const result = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE overall_status = 'operational') as operational
      FROM system_health_history
      WHERE tenant_id = ${tenantId}
        AND timestamp >= NOW() - INTERVAL '1 day' * ${days}`;

    const total = parseInt(result.rows[0].total, 10);
    if (total === 0) return 100;

    const operational = parseInt(result.rows[0].operational, 10);
    return ((operational / total) * 100).toFixed(2);
  },
};

export default systemHealthApi;
