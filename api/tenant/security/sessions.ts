import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Mock database for sessions
const sessions: any[] = [];
const sessionPolicies: any = {
  timeoutMinutes: 30,
  maxSessions: 5,
};

// GET /api/tenant/security/sessions - List active sessions
router.get('/', (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (!tenantId || !userId) {
      return res.status(400).json({ error: 'Missing tenant or user ID' });
    }

    const activeSessions = sessions.filter(
      s => s.tenantId === tenantId && s.expiresAt > new Date()
    );

    res.json({
      data: activeSessions.map(s => ({
        id: s.id,
        deviceInfo: s.deviceInfo,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        lastActivity: s.lastActivity,
        expiresAt: s.expiresAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// POST /api/tenant/security/sessions - Create session
router.post('/', (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { deviceInfo, ipAddress, userAgent } = req.body;

    if (!tenantId || !userId) {
      return res.status(400).json({ error: 'Missing tenant or user ID' });
    }

    const session = {
      id: uuidv4(),
      tenantId,
      userId,
      deviceInfo,
      ipAddress,
      userAgent,
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + sessionPolicies.timeoutMinutes * 60 * 1000),
    };

    sessions.push(session);

    res.status(201).json({ data: session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// POST /api/tenant/security/sessions/:id/logout - Force logout
router.post('/:id/logout', (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant ID' });
    }

    const sessionIndex = sessions.findIndex(
      s => s.id === id && s.tenantId === tenantId
    );

    if (sessionIndex === -1) {
      return res.status(404).json({ error: 'Session not found' });
    }

    sessions.splice(sessionIndex, 1);

    res.json({ message: 'Session terminated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to logout session' });
  }
});

// GET /api/tenant/security/session-policy - Get session policy
router.get('/policy', (req: Request, res: Response) => {
  try {
    res.json({ data: sessionPolicies });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session policy' });
  }
});

// PUT /api/tenant/security/session-policy - Update session policy
router.put('/policy', (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { timeoutMinutes, maxSessions } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant ID' });
    }

    if (timeoutMinutes) sessionPolicies.timeoutMinutes = timeoutMinutes;
    if (maxSessions) sessionPolicies.maxSessions = maxSessions;

    res.json({ data: sessionPolicies });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update session policy' });
  }
});

// PUT /api/tenant/security/sessions/:id/activity - Update last activity
router.put('/:id/activity', (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant ID' });
    }

    const session = sessions.find(s => s.id === id && s.tenantId === tenantId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.lastActivity = new Date();

    res.json({ data: session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update session activity' });
  }
});

export default router;
