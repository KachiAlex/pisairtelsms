import { v4 as uuidv4 } from 'uuid';

interface BiometricDevice {
  id: string;
  tenantId: string;
  deviceName: string;
  deviceType: 'fingerprint' | 'face' | 'iris' | 'palm';
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string;
  ipAddress?: string;
  status: 'active' | 'inactive' | 'maintenance' | 'error';
  lastSync?: Date;
  syncStatus: 'synced' | 'pending' | 'failed';
  attendanceCount: number;
  errorCount: number;
  createdAt: Date;
  updatedAt: Date;
  registeredBy: string;
}

interface DeviceLog {
  id: string;
  tenantId: string;
  deviceId: string;
  logType: 'sync' | 'error' | 'maintenance' | 'status_change';
  message: string;
  details?: Record<string, any>;
  createdAt: Date;
}

interface AttendanceSync {
  id: string;
  tenantId: string;
  deviceId: string;
  syncStartTime: Date;
  syncEndTime?: Date;
  recordsProcessed: number;
  recordsFailed: number;
  status: 'in_progress' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
}

const devices: BiometricDevice[] = [];
const deviceLogs: DeviceLog[] = [];
const attendanceSyncs: AttendanceSync[] = [];

export const biometricDevicesApi = {
  // Register a new device
  registerDevice: (tenantId: string, userId: string, payload: Omit<BiometricDevice, 'id' | 'createdAt' | 'updatedAt' | 'registeredBy' | 'attendanceCount' | 'errorCount'>) => {
    if (!tenantId || !userId) throw new Error('Missing tenant or user ID');
    if (!payload.deviceName || !payload.deviceType || !payload.serialNumber) {
      throw new Error('Missing required fields');
    }

    const device: BiometricDevice = {
      id: uuidv4(),
      tenantId,
      deviceName: payload.deviceName,
      deviceType: payload.deviceType,
      manufacturer: payload.manufacturer,
      model: payload.model,
      serialNumber: payload.serialNumber,
      location: payload.location,
      ipAddress: payload.ipAddress,
      status: 'active',
      syncStatus: 'pending',
      attendanceCount: 0,
      errorCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      registeredBy: userId,
    };

    devices.push(device);

    // Log device registration
    deviceLogs.push({
      id: uuidv4(),
      tenantId,
      deviceId: device.id,
      logType: 'status_change',
      message: `Device registered: ${device.deviceName}`,
      createdAt: new Date(),
    });

    return device;
  },

  // Get all devices for tenant
  getDevices: (tenantId: string, limit: number = 50, offset: number = 0) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const filtered = devices.filter(d => d.tenantId === tenantId);
    const sorted = filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const data = sorted.slice(offset, offset + limit);

    return {
      data,
      total: filtered.length,
      limit,
      offset,
    };
  },

  // Get device by ID
  getDevice: (tenantId: string, deviceId: string) => {
    if (!tenantId || !deviceId) throw new Error('Missing tenant or device ID');

    return devices.find(d => d.tenantId === tenantId && d.id === deviceId) || null;
  },

  // Update device status
  updateDeviceStatus: (tenantId: string, deviceId: string, status: string, message?: string) => {
    if (!tenantId || !deviceId) throw new Error('Missing tenant or device ID');

    const device = devices.find(d => d.tenantId === tenantId && d.id === deviceId);
    if (!device) throw new Error('Device not found');

    const oldStatus = device.status;
    device.status = status as any;
    device.updatedAt = new Date();

    // Log status change
    deviceLogs.push({
      id: uuidv4(),
      tenantId,
      deviceId,
      logType: 'status_change',
      message: message || `Status changed from ${oldStatus} to ${status}`,
      createdAt: new Date(),
    });

    return device;
  },

  // Start attendance sync
  startAttendanceSync: (tenantId: string, deviceId: string) => {
    if (!tenantId || !deviceId) throw new Error('Missing tenant or device ID');

    const device = devices.find(d => d.tenantId === tenantId && d.id === deviceId);
    if (!device) throw new Error('Device not found');

    const sync: AttendanceSync = {
      id: uuidv4(),
      tenantId,
      deviceId,
      syncStartTime: new Date(),
      recordsProcessed: 0,
      recordsFailed: 0,
      status: 'in_progress',
      createdAt: new Date(),
    };

    attendanceSyncs.push(sync);

    // Log sync start
    deviceLogs.push({
      id: uuidv4(),
      tenantId,
      deviceId,
      logType: 'sync',
      message: 'Attendance sync started',
      details: { syncId: sync.id },
      createdAt: new Date(),
    });

    return sync;
  },

  // Complete attendance sync
  completeAttendanceSync: (tenantId: string, syncId: string, recordsProcessed: number, recordsFailed: number, error?: string) => {
    if (!tenantId || !syncId) throw new Error('Missing tenant or sync ID');

    const sync = attendanceSyncs.find(s => s.tenantId === tenantId && s.id === syncId);
    if (!sync) throw new Error('Sync not found');

    sync.syncEndTime = new Date();
    sync.recordsProcessed = recordsProcessed;
    sync.recordsFailed = recordsFailed;
    sync.status = error ? 'failed' : 'completed';
    sync.error = error;

    // Update device sync status
    const device = devices.find(d => d.tenantId === tenantId && d.id === sync.deviceId);
    if (device) {
      device.syncStatus = error ? 'failed' : 'synced';
      device.lastSync = new Date();
      device.attendanceCount += recordsProcessed;
      if (recordsFailed > 0) {
        device.errorCount += recordsFailed;
      }
      device.updatedAt = new Date();
    }

    // Log sync completion
    deviceLogs.push({
      id: uuidv4(),
      tenantId,
      deviceId: sync.deviceId,
      logType: 'sync',
      message: error ? `Sync failed: ${error}` : `Sync completed: ${recordsProcessed} records processed`,
      details: { recordsProcessed, recordsFailed, error },
      createdAt: new Date(),
    });

    return sync;
  },

  // Get sync history
  getSyncHistory: (tenantId: string, deviceId: string, limit: number = 20) => {
    if (!tenantId || !deviceId) throw new Error('Missing tenant or device ID');

    return attendanceSyncs
      .filter(s => s.tenantId === tenantId && s.deviceId === deviceId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  },

  // Get device logs
  getDeviceLogs: (tenantId: string, deviceId: string, limit: number = 50, offset: number = 0) => {
    if (!tenantId || !deviceId) throw new Error('Missing tenant or device ID');

    const filtered = deviceLogs.filter(l => l.tenantId === tenantId && l.deviceId === deviceId);
    const sorted = filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const data = sorted.slice(offset, offset + limit);

    return {
      data,
      total: filtered.length,
      limit,
      offset,
    };
  },

  // Log device error
  logDeviceError: (tenantId: string, deviceId: string, error: string, details?: Record<string, any>) => {
    if (!tenantId || !deviceId) throw new Error('Missing tenant or device ID');

    const device = devices.find(d => d.tenantId === tenantId && d.id === deviceId);
    if (device) {
      device.errorCount += 1;
      device.updatedAt = new Date();
    }

    deviceLogs.push({
      id: uuidv4(),
      tenantId,
      deviceId,
      logType: 'error',
      message: error,
      details,
      createdAt: new Date(),
    });
  },

  // Get device statistics
  getStatistics: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const tenantDevices = devices.filter(d => d.tenantId === tenantId);

    const activeCount = tenantDevices.filter(d => d.status === 'active').length;
    const inactiveCount = tenantDevices.filter(d => d.status === 'inactive').length;
    const maintenanceCount = tenantDevices.filter(d => d.status === 'maintenance').length;
    const errorCount = tenantDevices.filter(d => d.status === 'error').length;

    const totalAttendanceRecords = tenantDevices.reduce((sum, d) => sum + d.attendanceCount, 0);
    const totalErrors = tenantDevices.reduce((sum, d) => sum + d.errorCount, 0);

    return {
      totalDevices: tenantDevices.length,
      activeCount,
      inactiveCount,
      maintenanceCount,
      errorCount,
      totalAttendanceRecords,
      totalErrors,
    };
  },
};

export default biometricDevicesApi;
