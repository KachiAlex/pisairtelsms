/**
 * Security Event Logging API Endpoint
 * POST /api/tenant/cbt/security/log-event - Log security events (copy/paste/right-click)
 * 
 * Requires: Authentication, Student role
 * Requirements: 5.3, 5.4
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { logProctoringEvent } from '../_lib/proctoring';
import { requireAuthentication } from '../_lib/auth-middleware';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    // Verify authentication (students can log events)
    const authContext = await requireAuthentication(req, res, 'student');
    if (!authContext) {
      return; // requireAuthentication already sent error response
    }

    const { examId, eventType, details } = req.body;

    // Validate required fields
    if (!examId || !eventType) {
      return res.status(400).json({
        success: false,
        error: 'examId and eventType are required',
      });
    }

    // Validate event type
    const validEventTypes = ['copy_attempt', 'paste_attempt', 'right_click', 'tab_switch', 'window_blur', 'fullscreen_exit'];
    if (!validEventTypes.includes(eventType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid event type. Must be one of: ${validEventTypes.join(', ')}`,
      });
    }

    // Log the security event
    await logProctoringEvent(
      examId,
      authContext.userId,
      eventType as any,
      {
        ...details,
        userAgent: req.headers['user-agent'],
        ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Security event logged successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Security event logging error:', errorMessage);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
