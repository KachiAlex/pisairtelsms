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

const services: ServiceStatus[] = [];
const vitals: InfrastructureVital[] = [];
const incidents: IncidentRecord[] = [];
const dependencies: DependencyHealth[] = [];

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
};

export default systemHealthApi;
