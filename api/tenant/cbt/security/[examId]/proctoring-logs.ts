/**
 * Proctoring Logs API Endpoint
 * GET /api/tenant/cbt/security/:examId/proctoring-logs - Get proctoring logs
 * 
 * Requires: Authentication, Invigilator/Admin role, Exam access
 * Requirements: 5.2
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getProctoringLogs } from '../../_lib/audit-logging';
import {
  requireAuthentication,
  requireExamAccess,
  requireTenantAccess,
} from '../../_lib/auth-middleware';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { examId } = req.query;

  if (!examId || typeof examId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Exam ID is required',
    });
  }

  try {
    // Verify authentication (invigilator/admin only)
    const authContext = await requireAuthentication(req, res, 'invigilator');
    if (!authContext) {
      return; // requireAuthentication already sent error response
    }

    // Verify tenant access
    if (!requireTenantAccess(req, res, authContext, authContext.tenantId)) {
      return;
    }

    // Verify exam access
    if (!(await requireExamAccess(req, res, examId, authContext))) {
      return;
    }

    if (req.method === 'GET') {
      return handleGet(req, res, examId);
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Proctoring logs API error:', errorMessage);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Handle GET requests
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  examId: string
) {
  try {
    const {
      studentId,
      eventType,
      startDate,
      endDate,
      page = '1',
      limit = '50',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    // Parse dates if provided
    let startDateObj: Date | undefined;
    let endDateObj: Date | undefined;

    if (startDate && typeof startDate === 'string') {
      startDateObj = new Date(startDate);
      if (isNaN(startDateObj.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid start date format',
        });
      }
    }

    if (endDate && typeof endDate === 'string') {
      endDateObj = new Date(endDate);
      if (isNaN(endDateObj.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid end date format',
        });
      }
    }

    // Get proctoring logs
    const logs = await getProctoringLogs(
      examId,
      studentId as string | undefined,
      eventType as string | undefined,
      startDateObj,
      endDateObj,
      limitNum,
      offset
    );

    return res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total: logs.length,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(logs.length / limitNum),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: errorMessage,
      });
    }

    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}
