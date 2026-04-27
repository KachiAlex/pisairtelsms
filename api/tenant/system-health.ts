import { v4 as uuidv4 } from 'uuid';

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

const services: ServiceStatus[] = [];
const vitals: InfrastructureVital[] = [];
const incidents: IncidentRecord[] = [];
const dependencies: DependencyHealth[] = [];
const healthHistory: HealthHistory[] = [];

export const systemHealthApi = {
  // List service status
  listServices: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    return services
      .filter(s => s.tenantId === tenantId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  // Create service status
  createService: (tenantId: string, payload: { surface: string; status: string; latency: string; uptime: number; owners: string }) => {
    if (!tenantId || !payload.surface) {
      throw new Error('Missing required fields');
    }

    const service: ServiceStatus = {
      id: uuidv4(),
      tenantId,
      surface: payload.surface,
      status: payload.status as any,
      latency: payload.latency,
      uptime: payload.uptime,
      owners: payload.owners,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    services.push(service);
    return service;
  },

  // Update service status
  updateService: (tenantId: string, serviceId: string, payload: { status?: string; latency?: string; uptime?: number }) => {
    if (!tenantId || !serviceId) throw new Error('Missing required fields');

    const service = services.find(s => s.id === serviceId && s.tenantId === tenantId);
    if (!service) throw new Error('Service not found');

    if (payload.status) service.status = payload.status as any;
    if (payload.latency) service.latency = payload.latency;
    if (payload.uptime !== undefined) service.uptime = payload.uptime;
    service.updatedAt = new Date();

    return service;
  },

  // List infrastructure vitals
  listVitals: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    return vitals
      .filter(v => v.tenantId === tenantId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  // Create infrastructure vital
  createVital: (tenantId: string, payload: { label: string; value: number; threshold: number }) => {
    if (!tenantId || !payload.label) {
      throw new Error('Missing required fields');
    }

    const vital: InfrastructureVital = {
      id: uuidv4(),
      tenantId,
      label: payload.label,
      value: payload.value,
      threshold: payload.threshold,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vitals.push(vital);
    return vital;
  },

  // List incidents
  listIncidents: (tenantId: string, filters?: { limit?: number; offset?: number }) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const { limit = 50, offset = 0 } = filters || {};

    const filtered = incidents.filter(i => i.tenantId === tenantId);
    const data = filtered
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(offset, offset + limit);

    return { data, total: filtered.length };
  },

  // Create incident
  createIncident: (tenantId: string, payload: { title: string; start: string; duration: string; state: string }) => {
    if (!tenantId || !payload.title) {
      throw new Error('Missing required fields');
    }

    const incident: IncidentRecord = {
      id: uuidv4(),
      tenantId,
      title: payload.title,
      start: payload.start,
      duration: payload.duration,
      state: payload.state as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    incidents.push(incident);
    return incident;
  },

  // List dependencies
  listDependencies: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    return dependencies
      .filter(d => d.tenantId === tenantId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  // Create dependency
  createDependency: (tenantId: string, payload: { name: string; status: string; coverage: string }) => {
    if (!tenantId || !payload.name) {
      throw new Error('Missing required fields');
    }

    const dependency: DependencyHealth = {
      id: uuidv4(),
      tenantId,
      name: payload.name,
      status: payload.status as any,
      coverage: payload.coverage,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    dependencies.push(dependency);
    return dependency;
  },

  // Get health statistics
  getStatistics: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const tenantServices = services.filter(s => s.tenantId === tenantId);
    const operationalServices = tenantServices.filter(s => s.status === 'operational').length;
    const tenantIncidents = incidents.filter(i => i.tenantId === tenantId);
    const avgUptime = tenantServices.length > 0 ? (tenantServices.reduce((sum, s) => sum + s.uptime, 0) / tenantServices.length).toFixed(1) : '0';

    return {
      overallStatus: operationalServices === tenantServices.length ? 'Green' : 'Yellow',
      incidents24h: tenantIncidents.length,
      slaConverage: avgUptime,
      upcomingMaintenance: 2,
    };
  },

  // Get health check status
  getHealthCheck: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const tenantServices = services.filter(s => s.tenantId === tenantId);
    const tenantVitals = vitals.filter(v => v.tenantId === tenantId);
    
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
  recordHealthHistory: (tenantId: string, payload: { cpuUsage: number; memoryUsage: number; diskUsage: number; uptime: number }) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const tenantServices = services.filter(s => s.tenantId === tenantId);
    const allOperational = tenantServices.every(s => s.status === 'operational');

    const record: HealthHistory = {
      id: uuidv4(),
      tenantId,
      timestamp: new Date(),
      overallStatus: allOperational ? 'operational' : 'degraded',
      cpuUsage: payload.cpuUsage,
      memoryUsage: payload.memoryUsage,
      diskUsage: payload.diskUsage,
      uptime: payload.uptime,
      createdAt: new Date(),
    };

    healthHistory.push(record);
    return record;
  },

  // Get health history
  getHealthHistory: (tenantId: string, filters?: { limit?: number; offset?: number }) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const { limit = 100, offset = 0 } = filters || {};

    const filtered = healthHistory.filter(h => h.tenantId === tenantId);
    const data = filtered
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit);

    return { data, total: filtered.length };
  },

  // Get resource usage metrics
  getResourceMetrics: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const tenantHistory = healthHistory.filter(h => h.tenantId === tenantId);
    
    if (tenantHistory.length === 0) {
      return {
        cpu: { current: 0, average: 0, peak: 0 },
        memory: { current: 0, average: 0, peak: 0 },
        disk: { current: 0, average: 0, peak: 0 },
      };
    }

    const latest = tenantHistory[0];
    const cpuValues = tenantHistory.map(h => h.cpuUsage);
    const memoryValues = tenantHistory.map(h => h.memoryUsage);
    const diskValues = tenantHistory.map(h => h.diskUsage);

    return {
      cpu: {
        current: latest.cpuUsage,
        average: (cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length).toFixed(1),
        peak: Math.max(...cpuValues),
      },
      memory: {
        current: latest.memoryUsage,
        average: (memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length).toFixed(1),
        peak: Math.max(...memoryValues),
      },
      disk: {
        current: latest.diskUsage,
        average: (diskValues.reduce((a, b) => a + b, 0) / diskValues.length).toFixed(1),
        peak: Math.max(...diskValues),
      },
    };
  },

  // Calculate uptime percentage
  calculateUptime: (tenantId: string, days: number = 30) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const tenantHistory = healthHistory.filter(
      h => h.tenantId === tenantId && h.timestamp >= cutoffDate
    );

    if (tenantHistory.length === 0) return 100;

    const operationalCount = tenantHistory.filter(h => h.overallStatus === 'operational').length;
    return ((operationalCount / tenantHistory.length) * 100).toFixed(2);
  },
};

export default systemHealthApi;
