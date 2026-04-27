import { v4 as uuidv4 } from 'uuid';

interface SyncDevice {
  id: string;
  tenantId: string;
  deviceId: string;
  lab: string;
  status: 'syncing' | 'waiting' | 'success' | 'failed';
  papers: number;
  bandwidth?: string;
  eta?: string;
  lastSync?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface SyncPackage {
  id: string;
  tenantId: string;
  examId: string;
  size: string;
  checksum: string;
  attempts: number;
  status: 'verified' | 'retry_needed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

interface NetworkFallback {
  id: string;
  tenantId: string;
  region: string;
  medium: string;
  status: 'stable' | 'degraded' | 'offline';
  coverage: number;
  createdAt: Date;
  updatedAt: Date;
}

const devices: SyncDevice[] = [];
const packages: SyncPackage[] = [];
const fallbacks: NetworkFallback[] = [];

export const offlineSyncApi = {
  // List sync devices
  listDevices: (tenantId: string, filters?: { status?: string; limit?: number; offset?: number }) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const { status, limit = 50, offset = 0 } = filters || {};

    let filtered = devices.filter(d => d.tenantId === tenantId);
    if (status) filtered = filtered.filter(d => d.status === status);

    const data = filtered
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(offset, offset + limit);

    return { data, total: filtered.length };
  },

  // Register device
  registerDevice: (tenantId: string, payload: { deviceId: string; lab: string; papers: number }) => {
    if (!tenantId || !payload.deviceId || !payload.lab) {
      throw new Error('Missing required fields');
    }

    const device: SyncDevice = {
      id: uuidv4(),
      tenantId,
      deviceId: payload.deviceId,
      lab: payload.lab,
      status: 'waiting',
      papers: payload.papers,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    devices.push(device);
    return device;
  },

  // Update device sync status
  updateDeviceStatus: (tenantId: string, deviceId: string, payload: { status: string; bandwidth?: string; eta?: string }) => {
    if (!tenantId || !deviceId) throw new Error('Missing required fields');

    const device = devices.find(d => d.id === deviceId && d.tenantId === tenantId);
    if (!device) throw new Error('Device not found');

    device.status = payload.status as any;
    device.bandwidth = payload.bandwidth;
    device.eta = payload.eta;
    device.lastSync = new Date();
    device.updatedAt = new Date();

    return device;
  },

  // List packages
  listPackages: (tenantId: string, filters?: { status?: string; limit?: number; offset?: number }) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const { status, limit = 50, offset = 0 } = filters || {};

    let filtered = packages.filter(p => p.tenantId === tenantId);
    if (status) filtered = filtered.filter(p => p.status === status);

    const data = filtered
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(offset, offset + limit);

    return { data, total: filtered.length };
  },

  // Create package
  createPackage: (tenantId: string, payload: { examId: string; size: string; checksum: string }) => {
    if (!tenantId || !payload.examId || !payload.size || !payload.checksum) {
      throw new Error('Missing required fields');
    }

    const pkg: SyncPackage = {
      id: uuidv4(),
      tenantId,
      examId: payload.examId,
      size: payload.size,
      checksum: payload.checksum,
      attempts: 1,
      status: 'verified',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    packages.push(pkg);
    return pkg;
  },

  // Update package status
  updatePackageStatus: (tenantId: string, packageId: string, payload: { status: string; attempts?: number }) => {
    if (!tenantId || !packageId) throw new Error('Missing required fields');

    const pkg = packages.find(p => p.id === packageId && p.tenantId === tenantId);
    if (!pkg) throw new Error('Package not found');

    pkg.status = payload.status as any;
    if (payload.attempts !== undefined) pkg.attempts = payload.attempts;
    pkg.updatedAt = new Date();

    return pkg;
  },

  // List network fallbacks
  listFallbacks: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    return fallbacks
      .filter(f => f.tenantId === tenantId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  // Create fallback
  createFallback: (tenantId: string, payload: { region: string; medium: string; status: string; coverage: number }) => {
    if (!tenantId || !payload.region || !payload.medium) {
      throw new Error('Missing required fields');
    }

    const fallback: NetworkFallback = {
      id: uuidv4(),
      tenantId,
      region: payload.region,
      medium: payload.medium,
      status: payload.status as any,
      coverage: payload.coverage,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    fallbacks.push(fallback);
    return fallback;
  },

  // Get sync statistics
  getStatistics: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const tenantDevices = devices.filter(d => d.tenantId === tenantId);
    const tenantPackages = packages.filter(p => p.tenantId === tenantId);

    return {
      devicesReady: tenantDevices.filter(d => d.status === 'success').length,
      devicesTotal: tenantDevices.length,
      syncFreshness: tenantDevices.filter(d => d.lastSync && new Date().getTime() - d.lastSync.getTime() < 12 * 60 * 60 * 1000).length,
      packagesPending: tenantPackages.filter(p => p.status === 'retry_needed').length,
      packagesTotal: tenantPackages.length,
    };
  },
};

export default offlineSyncApi;
