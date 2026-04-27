import { v4 as uuidv4 } from 'uuid';

interface APIKey {
  id: string;
  tenantId: string;
  name: string;
  key: string;
  secret?: string;
  status: 'active' | 'revoked' | 'expired';
  rateLimit: number; // requests per minute
  allowedEndpoints?: string[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdBy: string;
  revokedBy?: string;
  revokedAt?: Date;
}

interface APIUsage {
  id: string;
  tenantId: string;
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number; // milliseconds
  requestSize: number; // bytes
  responseSize: number; // bytes
  createdAt: Date;
}

interface RateLimitConfig {
  id: string;
  tenantId: string;
  apiKeyId: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  createdAt: Date;
  updatedAt: Date;
}

const apiKeys: APIKey[] = [];
const apiUsage: APIUsage[] = [];
const rateLimitConfigs: RateLimitConfig[] = [];

export const apiManagementApi = {
  // Generate API key
  generateKey: (tenantId: string, userId: string, payload: { name: string; rateLimit?: number; expiresAt?: Date; allowedEndpoints?: string[] }) => {
    if (!tenantId || !userId || !payload.name) {
      throw new Error('Missing required fields');
    }

    const key = `sk_${uuidv4().replace(/-/g, '')}`;
    const secret = `secret_${uuidv4().replace(/-/g, '')}`;

    const apiKey: APIKey = {
      id: uuidv4(),
      tenantId,
      name: payload.name,
      key,
      secret,
      status: 'active',
      rateLimit: payload.rateLimit || 100,
      allowedEndpoints: payload.allowedEndpoints || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: payload.expiresAt,
      createdBy: userId,
    };

    apiKeys.push(apiKey);

    // Create rate limit config
    rateLimitConfigs.push({
      id: uuidv4(),
      tenantId,
      apiKeyId: apiKey.id,
      requestsPerMinute: payload.rateLimit || 100,
      requestsPerHour: (payload.rateLimit || 100) * 60,
      requestsPerDay: (payload.rateLimit || 100) * 1440,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return apiKey;
  },

  // Get all API keys for tenant
  getKeys: (tenantId: string, limit: number = 50, offset: number = 0) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const filtered = apiKeys.filter(k => k.tenantId === tenantId);
    const sorted = filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const data = sorted.slice(offset, offset + limit);

    return {
      data: data.map(k => ({
        ...k,
        secret: undefined, // Don't return secret in list
      })),
      total: filtered.length,
      limit,
      offset,
    };
  },

  // Get API key by ID
  getKey: (tenantId: string, keyId: string) => {
    if (!tenantId || !keyId) throw new Error('Missing tenant or key ID');

    const key = apiKeys.find(k => k.tenantId === tenantId && k.id === keyId);
    if (!key) throw new Error('API key not found');

    return key;
  },

  // Verify API key
  verifyKey: (tenantId: string, key: string) => {
    if (!tenantId || !key) throw new Error('Missing tenant or key');

    const apiKey = apiKeys.find(k => k.tenantId === tenantId && k.key === key && k.status === 'active');
    if (!apiKey) return null;

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      apiKey.status = 'expired';
      return null;
    }

    apiKey.lastUsedAt = new Date();
    return apiKey;
  },

  // Update API key
  updateKey: (tenantId: string, keyId: string, payload: Partial<APIKey>) => {
    if (!tenantId || !keyId) throw new Error('Missing tenant or key ID');

    const key = apiKeys.find(k => k.tenantId === tenantId && k.id === keyId);
    if (!key) throw new Error('API key not found');

    if (payload.name) key.name = payload.name;
    if (payload.rateLimit) {
      key.rateLimit = payload.rateLimit;
      const config = rateLimitConfigs.find(c => c.apiKeyId === keyId);
      if (config) {
        config.requestsPerMinute = payload.rateLimit;
        config.requestsPerHour = payload.rateLimit * 60;
        config.requestsPerDay = payload.rateLimit * 1440;
        config.updatedAt = new Date();
      }
    }
    if (payload.allowedEndpoints) key.allowedEndpoints = payload.allowedEndpoints;
    if (payload.expiresAt) key.expiresAt = payload.expiresAt;

    key.updatedAt = new Date();
    return key;
  },

  // Revoke API key
  revokeKey: (tenantId: string, keyId: string, userId: string) => {
    if (!tenantId || !keyId || !userId) throw new Error('Missing required fields');

    const key = apiKeys.find(k => k.tenantId === tenantId && k.id === keyId);
    if (!key) throw new Error('API key not found');

    key.status = 'revoked';
    key.revokedBy = userId;
    key.revokedAt = new Date();
    key.updatedAt = new Date();

    return key;
  },

  // Record API usage
  recordUsage: (tenantId: string, apiKeyId: string, usage: Omit<APIUsage, 'id' | 'tenantId' | 'apiKeyId' | 'createdAt'>) => {
    if (!tenantId || !apiKeyId) throw new Error('Missing tenant or key ID');

    const record: APIUsage = {
      id: uuidv4(),
      tenantId,
      apiKeyId,
      ...usage,
      createdAt: new Date(),
    };

    apiUsage.push(record);
    return record;
  },

  // Get API usage
  getUsage: (tenantId: string, apiKeyId: string, limit: number = 100, offset: number = 0) => {
    if (!tenantId || !apiKeyId) throw new Error('Missing tenant or key ID');

    const filtered = apiUsage.filter(u => u.tenantId === tenantId && u.apiKeyId === apiKeyId);
    const sorted = filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const data = sorted.slice(offset, offset + limit);

    return {
      data,
      total: filtered.length,
      limit,
      offset,
    };
  },

  // Get usage statistics
  getUsageStatistics: (tenantId: string, apiKeyId: string, timeRange: 'hour' | 'day' | 'week' | 'month' = 'day') => {
    if (!tenantId || !apiKeyId) throw new Error('Missing tenant or key ID');

    const now = new Date();
    let startTime = new Date();

    switch (timeRange) {
      case 'hour':
        startTime.setHours(startTime.getHours() - 1);
        break;
      case 'day':
        startTime.setDate(startTime.getDate() - 1);
        break;
      case 'week':
        startTime.setDate(startTime.getDate() - 7);
        break;
      case 'month':
        startTime.setMonth(startTime.getMonth() - 1);
        break;
    }

    const filtered = apiUsage.filter(
      u => u.tenantId === tenantId && u.apiKeyId === apiKeyId && u.createdAt >= startTime && u.createdAt <= now
    );

    const totalRequests = filtered.length;
    const successfulRequests = filtered.filter(u => u.statusCode >= 200 && u.statusCode < 300).length;
    const failedRequests = filtered.filter(u => u.statusCode >= 400).length;
    const averageResponseTime = filtered.length > 0 ? filtered.reduce((sum, u) => sum + u.responseTime, 0) / filtered.length : 0;
    const totalDataTransferred = filtered.reduce((sum, u) => sum + u.requestSize + u.responseSize, 0);

    const endpointStats: Record<string, { count: number; avgResponseTime: number }> = {};
    filtered.forEach(u => {
      if (!endpointStats[u.endpoint]) {
        endpointStats[u.endpoint] = { count: 0, avgResponseTime: 0 };
      }
      endpointStats[u.endpoint].count += 1;
      endpointStats[u.endpoint].avgResponseTime += u.responseTime;
    });

    Object.keys(endpointStats).forEach(endpoint => {
      endpointStats[endpoint].avgResponseTime /= endpointStats[endpoint].count;
    });

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      totalDataTransferred,
      endpointStats,
      timeRange,
    };
  },

  // Get rate limit config
  getRateLimitConfig: (tenantId: string, apiKeyId: string) => {
    if (!tenantId || !apiKeyId) throw new Error('Missing tenant or key ID');

    return rateLimitConfigs.find(c => c.tenantId === tenantId && c.apiKeyId === apiKeyId) || null;
  },

  // Update rate limit config
  updateRateLimitConfig: (tenantId: string, apiKeyId: string, payload: Partial<RateLimitConfig>) => {
    if (!tenantId || !apiKeyId) throw new Error('Missing tenant or key ID');

    let config = rateLimitConfigs.find(c => c.tenantId === tenantId && c.apiKeyId === apiKeyId);

    if (!config) {
      config = {
        id: uuidv4(),
        tenantId,
        apiKeyId,
        requestsPerMinute: payload.requestsPerMinute || 100,
        requestsPerHour: payload.requestsPerHour || 6000,
        requestsPerDay: payload.requestsPerDay || 144000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      rateLimitConfigs.push(config);
    } else {
      if (payload.requestsPerMinute) config.requestsPerMinute = payload.requestsPerMinute;
      if (payload.requestsPerHour) config.requestsPerHour = payload.requestsPerHour;
      if (payload.requestsPerDay) config.requestsPerDay = payload.requestsPerDay;
      config.updatedAt = new Date();
    }

    return config;
  },

  // Get all API keys statistics
  getStatistics: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const tenantKeys = apiKeys.filter(k => k.tenantId === tenantId);
    const activeCount = tenantKeys.filter(k => k.status === 'active').length;
    const revokedCount = tenantKeys.filter(k => k.status === 'revoked').length;
    const expiredCount = tenantKeys.filter(k => k.status === 'expired').length;

    const tenantUsage = apiUsage.filter(u => u.tenantId === tenantId);
    const totalRequests = tenantUsage.length;
    const successfulRequests = tenantUsage.filter(u => u.statusCode >= 200 && u.statusCode < 300).length;
    const failedRequests = tenantUsage.filter(u => u.statusCode >= 400).length;

    return {
      totalKeys: tenantKeys.length,
      activeCount,
      revokedCount,
      expiredCount,
      totalRequests,
      successfulRequests,
      failedRequests,
    };
  },
};

export default apiManagementApi;
