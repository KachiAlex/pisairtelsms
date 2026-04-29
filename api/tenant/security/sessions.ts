import { v4 as uuidv4 } from 'uuid';

// In-memory storage for sessions
interface SessionRecord {
  id: string;
  tenantId: string;
  userId: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
  logoutReason?: string;
  loggedOutAt?: Date;
}

interface SessionPolicyRecord {
  id: string;
  tenantId: string;
  timeoutMinutes: number;
  maxSessions: number;
  createdAt: Date;
  updatedAt: Date;
}

interface SessionHistoryRecord {
  id: string;
  sessionId: string;
  tenantId: string;
  userId: string;
  action: string;
  ipAddress: string | null;
  deviceInfo: string | null;
  details: any;
  createdAt: Date;
}

const sessions: SessionRecord[] = [];
const sessionPolicies: SessionPolicyRecord[] = [];
const sessionHistory: SessionHistoryRecord[] = [];

/**
 * Helper: Get or create session policy for tenant
 */
function getOrCreateSessionPolicy(tenantId: string): SessionPolicyRecord {
  let policy = sessionPolicies.find(p => p.tenantId === tenantId);

  if (!policy) {
    policy = {
      id: uuidv4(),
      tenantId,
      timeoutMinutes: 30,
      maxSessions: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    sessionPolicies.push(policy);
  }

  return policy;
}

/**
 * Helper: Log session history
 */
function logSessionHistory(
  sessionId: string,
  tenantId: string,
  userId: string,
  action: string,
  ipAddress: string | null,
  deviceInfo: string | null,
  details?: any
): void {
  sessionHistory.push({
    id: uuidv4(),
    sessionId,
    tenantId,
    userId,
    action,
    ipAddress,
    deviceInfo,
    details: details || {},
    createdAt: new Date(),
  });
}

/**
 * Helper: Clean up expired sessions
 */
function cleanupExpiredSessions(tenantId: string): void {
  const now = new Date();
  sessions.forEach(session => {
    if (
      session.tenantId === tenantId &&
      session.isActive &&
      session.expiresAt < now
    ) {
      session.isActive = false;
      session.logoutReason = 'Session expired';
      session.loggedOutAt = now;
    }
  });
}

// ============================================================================
// GET /api/tenant/security/sessions - List active sessions
// ============================================================================
export const listSessions = (
  tenantId: string,
  userId: string,
  limit: number = 50,
  offset: number = 0
) => {
  if (!tenantId || !userId) {
    throw new Error('Missing tenant or user ID');
  }

  cleanupExpiredSessions(tenantId);

  const userSessions = sessions.filter(
    s => s.tenantId === tenantId && s.userId === userId && s.isActive
  );

  const data = userSessions
    .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
    .slice(offset, offset + limit)
    .map(s => ({
      id: s.id,
      deviceInfo: s.deviceInfo,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      lastActivity: s.lastActivity,
      expiresAt: s.expiresAt,
    }));

  return {
    data,
    total: userSessions.length,
    limit,
    offset,
  };
};

// ============================================================================
// POST /api/tenant/security/sessions - Create session
// ============================================================================
export const createSession = (
  tenantId: string,
  userId: string,
  deviceInfo: string | null,
  ipAddress: string | null,
  userAgent: string | null
) => {
  if (!tenantId || !userId) {
    throw new Error('Missing tenant or user ID');
  }

  const policy = getOrCreateSessionPolicy(tenantId);

  // Check max sessions limit
  const activeSessions = sessions.filter(
    s => s.tenantId === tenantId && s.userId === userId && s.isActive
  );

  if (activeSessions.length >= policy.maxSessions) {
    throw new Error(
      `Maximum number of sessions reached (${policy.maxSessions})`
    );
  }

  // Create new session
  const sessionId = uuidv4();
  const expiresAt = new Date(
    Date.now() + policy.timeoutMinutes * 60 * 1000
  );

  const session: SessionRecord = {
    id: sessionId,
    tenantId,
    userId,
    deviceInfo,
    ipAddress,
    userAgent,
    createdAt: new Date(),
    lastActivity: new Date(),
    expiresAt,
    isActive: true,
  };

  sessions.push(session);

  // Log session creation
  logSessionHistory(
    sessionId,
    tenantId,
    userId,
    'created',
    ipAddress,
    deviceInfo,
    { userAgent }
  );

  return {
    id: session.id,
    deviceInfo: session.deviceInfo,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    createdAt: session.createdAt,
    lastActivity: session.lastActivity,
    expiresAt: session.expiresAt,
  };
};

// ============================================================================
// POST /api/tenant/security/sessions/:id/logout - Force logout
// ============================================================================
export const logoutSession = (
  tenantId: string,
  sessionId: string,
  userId: string | null,
  reason?: string
) => {
  if (!tenantId) {
    throw new Error('Missing tenant ID');
  }

  const session = sessions.find(
    s => s.id === sessionId && s.tenantId === tenantId
  );

  if (!session) {
    throw new Error('Session not found');
  }

  session.isActive = false;
  session.logoutReason = reason || 'Force logout';
  session.loggedOutAt = new Date();

  // Log session logout
  logSessionHistory(
    sessionId,
    tenantId,
    session.userId,
    'force_logout',
    session.ipAddress,
    session.deviceInfo,
    { reason: reason || 'Force logout', loggedOutBy: userId }
  );

  return { message: 'Session terminated successfully' };
};

// ============================================================================
// GET /api/tenant/security/sessions/policy - Get session policy
// ============================================================================
export const getSessionPolicy = (tenantId: string) => {
  if (!tenantId) {
    throw new Error('Missing tenant ID');
  }

  const policy = getOrCreateSessionPolicy(tenantId);

  return {
    id: policy.id,
    tenantId: policy.tenantId,
    timeoutMinutes: policy.timeoutMinutes,
    maxSessions: policy.maxSessions,
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt,
  };
};

// ============================================================================
// PUT /api/tenant/security/sessions/policy - Update session policy
// ============================================================================
export const updateSessionPolicy = (
  tenantId: string,
  userId: string,
  timeoutMinutes?: number,
  maxSessions?: number
) => {
  if (!tenantId || !userId) {
    throw new Error('Missing tenant or user ID');
  }

  // Validate input
  if (timeoutMinutes && (timeoutMinutes < 5 || timeoutMinutes > 1440)) {
    throw new Error('Timeout must be between 5 and 1440 minutes');
  }

  if (maxSessions && (maxSessions < 1 || maxSessions > 100)) {
    throw new Error('Max sessions must be between 1 and 100');
  }

  let policy = getOrCreateSessionPolicy(tenantId);

  // Update policy
  if (timeoutMinutes !== undefined) {
    policy.timeoutMinutes = timeoutMinutes;
  }
  if (maxSessions !== undefined) {
    policy.maxSessions = maxSessions;
  }
  policy.updatedAt = new Date();

  // Log policy update
  logSessionHistory(
    'policy-update',
    tenantId,
    userId,
    'policy_update',
    null,
    null,
    { timeoutMinutes, maxSessions }
  );

  return {
    id: policy.id,
    tenantId: policy.tenantId,
    timeoutMinutes: policy.timeoutMinutes,
    maxSessions: policy.maxSessions,
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt,
  };
};

// ============================================================================
// PUT /api/tenant/security/sessions/:id/activity - Update last activity
// ============================================================================
export const updateSessionActivity = (tenantId: string, sessionId: string) => {
  if (!tenantId) {
    throw new Error('Missing tenant ID');
  }

  const session = sessions.find(
    s => s.id === sessionId && s.tenantId === tenantId && s.isActive
  );

  if (!session) {
    throw new Error('Session not found');
  }

  session.lastActivity = new Date();

  return {
    id: session.id,
    deviceInfo: session.deviceInfo,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    createdAt: session.createdAt,
    lastActivity: session.lastActivity,
    expiresAt: session.expiresAt,
  };
};

// ============================================================================
// GET /api/tenant/security/sessions/history - Get session history
// ============================================================================
export const getSessionHistory = (
  tenantId: string,
  limit: number = 100,
  offset: number = 0,
  action?: string
) => {
  if (!tenantId) {
    throw new Error('Missing tenant ID');
  }

  let filtered = sessionHistory.filter(h => h.tenantId === tenantId);

  if (action) {
    filtered = filtered.filter(h => h.action === action);
  }

  const data = filtered
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(offset, offset + limit)
    .map(h => ({
      id: h.id,
      sessionId: h.sessionId,
      userId: h.userId,
      action: h.action,
      ipAddress: h.ipAddress,
      deviceInfo: h.deviceInfo,
      details: h.details,
      createdAt: h.createdAt,
    }));

  return {
    data,
    total: filtered.length,
    limit,
    offset,
  };
};

export default {
  listSessions,
  createSession,
  logoutSession,
  getSessionPolicy,
  updateSessionPolicy,
  updateSessionActivity,
  getSessionHistory,
};
