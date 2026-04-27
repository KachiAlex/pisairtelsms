import { v4 as uuidv4 } from 'uuid';
import zlib from 'zlib';
import crypto from 'crypto';

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
  compressedSize?: string;
  compressionRatio?: number;
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

interface SyncConflict {
  id: string;
  tenantId: string;
  deviceId: string;
  examId: string;
  conflictType: 'version_mismatch' | 'checksum_mismatch' | 'timestamp_conflict';
  localVersion: string;
  remoteVersion: string;
  resolution: 'local' | 'remote' | 'merge' | 'pending';
  createdAt: Date;
  updatedAt: Date;
}

interface SyncStatus {
  id: string;
  tenantId: string;
  deviceId: string;
  totalPackages: number;
  completedPackages: number;
  failedPackages: number;
  progressPercentage: number;
  estimatedTimeRemaining: number;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const devices: SyncDevice[] = [];
const packages: SyncPackage[] = [];
const fallbacks: NetworkFallback[] = [];
const conflicts: SyncConflict[] = [];
const syncStatuses: SyncStatus[] = [];

// Utility functions for compression and checksums
const calculateChecksum = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

const compressData = (data: string): { compressed: Buffer; ratio: number } => {
  const original = Buffer.from(data);
  const compressed = zlib.gzipSync(original);
  const ratio = (compressed.length / original.length) * 100;
  return { compressed, ratio };
};

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

  // Create package with compression
  createPackage: (tenantId: string, payload: { examId: string; size: string; checksum: string; data?: string }) => {
    if (!tenantId || !payload.examId || !payload.size || !payload.checksum) {
      throw new Error('Missing required fields');
    }

    let compressedSize = payload.size;
    let compressionRatio = 0;

    if (payload.data) {
      const { compressed, ratio } = compressData(payload.data);
      compressedSize = `${(compressed.length / 1024 / 1024).toFixed(2)} MB`;
      compressionRatio = ratio;
    }

    const pkg: SyncPackage = {
      id: uuidv4(),
      tenantId,
      examId: payload.examId,
      size: payload.size,
      checksum: payload.checksum,
      attempts: 1,
      status: 'verified',
      compressedSize,
      compressionRatio,
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

  // Resolve sync conflicts
  resolveConflict: (tenantId: string, conflictId: string, payload: { resolution: 'local' | 'remote' | 'merge' }) => {
    if (!tenantId || !conflictId) throw new Error('Missing required fields');

    const conflict = conflicts.find(c => c.id === conflictId && c.tenantId === tenantId);
    if (!conflict) throw new Error('Conflict not found');

    conflict.resolution = payload.resolution;
    conflict.updatedAt = new Date();

    return conflict;
  },

  // Create sync conflict
  createConflict: (tenantId: string, payload: { deviceId: string; examId: string; conflictType: string; localVersion: string; remoteVersion: string }) => {
    if (!tenantId || !payload.deviceId || !payload.examId) {
      throw new Error('Missing required fields');
    }

    const conflict: SyncConflict = {
      id: uuidv4(),
      tenantId,
      deviceId: payload.deviceId,
      examId: payload.examId,
      conflictType: payload.conflictType as any,
      localVersion: payload.localVersion,
      remoteVersion: payload.remoteVersion,
      resolution: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    conflicts.push(conflict);
    return conflict;
  },

  // List conflicts
  listConflicts: (tenantId: string, filters?: { resolution?: string; limit?: number; offset?: number }) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const { resolution, limit = 50, offset = 0 } = filters || {};

    let filtered = conflicts.filter(c => c.tenantId === tenantId);
    if (resolution) filtered = filtered.filter(c => c.resolution === resolution);

    const data = filtered
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(offset, offset + limit);

    return { data, total: filtered.length };
  },

  // Track sync status
  trackSyncStatus: (tenantId: string, deviceId: string, payload: { totalPackages: number; completedPackages: number; failedPackages: number; estimatedTimeRemaining: number }) => {
    if (!tenantId || !deviceId) throw new Error('Missing required fields');

    const progressPercentage = (payload.completedPackages / payload.totalPackages) * 100;

    const status: SyncStatus = {
      id: uuidv4(),
      tenantId,
      deviceId,
      totalPackages: payload.totalPackages,
      completedPackages: payload.completedPackages,
      failedPackages: payload.failedPackages,
      progressPercentage,
      estimatedTimeRemaining: payload.estimatedTimeRemaining,
      startedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    syncStatuses.push(status);
    return status;
  },

  // Get sync statistics
  getStatistics: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const tenantDevices = devices.filter(d => d.tenantId === tenantId);
    const tenantPackages = packages.filter(p => p.tenantId === tenantId);
    const tenantConflicts = conflicts.filter(c => c.tenantId === tenantId);

    return {
      devicesReady: tenantDevices.filter(d => d.status === 'success').length,
      devicesTotal: tenantDevices.length,
      syncFreshness: tenantDevices.filter(d => d.lastSync && new Date().getTime() - d.lastSync.getTime() < 12 * 60 * 60 * 1000).length,
      packagesPending: tenantPackages.filter(p => p.status === 'retry_needed').length,
      packagesTotal: tenantPackages.length,
      conflictsPending: tenantConflicts.filter(c => c.resolution === 'pending').length,
      averageCompressionRatio: tenantPackages.length > 0 
        ? (tenantPackages.reduce((sum, p) => sum + (p.compressionRatio || 0), 0) / tenantPackages.length).toFixed(2)
        : '0',
    };
  },
};

export default offlineSyncApi;
