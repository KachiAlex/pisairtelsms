/**
 * Real-Time Monitoring API Endpoints
 * 
 * Provides endpoints for real-time exam monitoring with WebSocket and polling support.
 * 
 * Endpoints:
 * - GET /api/tenant/cbt/realtime/monitoring/:examId - Get current monitoring data
 * - POST /api/tenant/cbt/realtime/connect - Register WebSocket connection
 * - POST /api/tenant/cbt/realtime/disconnect - Unregister WebSocket connection
 * - GET /api/tenant/cbt/realtime/stats - Get real-time connection statistics
 */

import { Router, Request, Response } from 'express';
import { wsManager } from './_lib/websocket-manager';
import {
  broadcastProgressUpdate,
  broadcastResultSubmission,
  broadcastExamEnded,
  getQueuedMessages,
} from './_lib/realtime-sync';
import { getExamMonitoring } from './_lib/monitoring';

const router = Router();

/**
 * POST /api/tenant/cbt/realtime/connect
 * Register a WebSocket connection
 * 
 * Request body:
 * {
 *   clientId: string (unique identifier for this connection)
 *   examId: string
 *   userId: string
 *   role: 'invigilator' | 'admin'
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   clientId: string
 *   queuedMessages: WebSocketMessage[]
 *   error?: string
 * }
 */
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { clientId, examId, userId, role } = req.body;

    // Validate required fields
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant ID',
      });
    }

    if (!clientId || !examId || !userId || !role) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: clientId, examId, userId, role',
      });
    }

    // Validate connection
    const validation = wsManager.validateConnection(
      tenantId,
      examId,
      userId,
      role
    );

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    // Register connection
    const client = wsManager.registerConnection(
      clientId,
      examId,
      tenantId,
      userId,
      role as 'invigilator' | 'admin'
    );

    // Get queued messages for this exam
    const queuedMessages = getQueuedMessages(examId);

    res.json({
      success: true,
      clientId: client.id,
      queuedMessages,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/tenant/cbt/realtime/disconnect
 * Unregister a WebSocket connection
 * 
 * Request body:
 * {
 *   clientId: string
 *   examId: string
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   error?: string
 * }
 */
router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const { clientId, examId } = req.body;

    if (!clientId || !examId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: clientId, examId',
      });
    }

    wsManager.unregisterConnection(clientId, examId);

    res.json({
      success: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/tenant/cbt/realtime/monitoring/:examId
 * Get current monitoring data for polling clients
 * 
 * Query parameters:
 * - clientId: string (optional, for tracking)
 * 
 * Response:
 * {
 *   success: boolean
 *   data: LiveMonitoringData
 *   timestamp: number
 *   error?: string
 * }
 */
router.get('/monitoring/:examId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { examId } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant ID',
      });
    }

    if (!examId) {
      return res.status(400).json({
        success: false,
        error: 'Missing exam ID',
      });
    }

    // Get current monitoring data
    const monitoringData = await getExamMonitoring(examId, tenantId);

    res.json({
      success: true,
      data: monitoringData,
      timestamp: Date.now(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/tenant/cbt/realtime/stats
 * Get real-time connection statistics
 * 
 * Response:
 * {
 *   success: boolean
 *   stats: {
 *     totalConnections: number
 *     examCount: number
 *     exams: Record<string, number>
 *   }
 * }
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = wsManager.getStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/tenant/cbt/realtime/broadcast-progress
 * Broadcast a progress update (internal use)
 * 
 * Request body:
 * {
 *   examId: string
 *   studentId: string
 *   questionsAnswered: number
 *   currentQuestion: number
 *   timeRemaining: number
 *   completionPercentage: number
 *   status: 'Active' | 'Completed' | 'Paused' | 'Flagged'
 * }
 */
router.post('/broadcast-progress', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const {
      examId,
      studentId,
      questionsAnswered,
      currentQuestion,
      timeRemaining,
      completionPercentage,
      status,
    } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant ID',
      });
    }

    if (
      !examId ||
      !studentId ||
      typeof questionsAnswered !== 'number' ||
      typeof currentQuestion !== 'number' ||
      typeof timeRemaining !== 'number' ||
      typeof completionPercentage !== 'number' ||
      !status
    ) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid required fields',
      });
    }

    broadcastProgressUpdate({
      examId,
      studentId,
      questionsAnswered,
      currentQuestion,
      timeRemaining,
      completionPercentage,
      status,
    });

    res.json({
      success: true,
      message: 'Progress update broadcasted',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/tenant/cbt/realtime/broadcast-result
 * Broadcast a result submission (internal use)
 * 
 * Request body:
 * {
 *   examId: string
 *   studentId: string
 *   studentName: string
 *   score: number
 *   totalMarks: number
 *   percentage: number
 *   status: 'Passed' | 'Failed'
 * }
 */
router.post('/broadcast-result', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const {
      examId,
      studentId,
      studentName,
      score,
      totalMarks,
      percentage,
      status,
    } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant ID',
      });
    }

    if (
      !examId ||
      !studentId ||
      !studentName ||
      typeof score !== 'number' ||
      typeof totalMarks !== 'number' ||
      typeof percentage !== 'number' ||
      !status
    ) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid required fields',
      });
    }

    broadcastResultSubmission({
      examId,
      studentId,
      studentName,
      score,
      totalMarks,
      percentage,
      status,
      submittedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Result submission broadcasted',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/tenant/cbt/realtime/broadcast-exam-ended
 * Broadcast exam ended event (internal use)
 * 
 * Request body:
 * {
 *   examId: string
 * }
 */
router.post('/broadcast-exam-ended', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { examId } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant ID',
      });
    }

    if (!examId) {
      return res.status(400).json({
        success: false,
        error: 'Missing exam ID',
      });
    }

    broadcastExamEnded(examId);

    res.json({
      success: true,
      message: 'Exam ended event broadcasted',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

export default router;
