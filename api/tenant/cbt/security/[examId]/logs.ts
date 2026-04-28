/**
 * Proctoring Logs API Endpoint
 * GET /api/tenant/cbt/security/:examId/logs - Get proctoring logs
 */

import { NextApiRequest, NextApiResponse } from 'next';
import {
  getProctoringLogs,
  validateProctoringEvent,
  type ProctoringLogFilter,
  type PaginationParams,
} from '../../_lib/proctoring';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  // Get tenant ID from headers
  const tenantId = req.headers['x-tenant-id'] as string;
  const { examId } = req.query;

  if (!tenantId) {
    return res.status(400).json({
      success: false,
      error: 'Tenant ID is required',
    });
  }

  if (!examId || typeof examId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Exam ID is required',
    });
  }

  try {
    // Parse query parameters
    const studentId = req.query.studentId as string | undefined;
    const eventType = req.query.eventType as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100',
      });
    }

    // Validate event type if provided
    if (eventType) {
      const validationErrors = validateProctoringEvent(eventType);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: validationErrors[0],
        });
      }
    }

    // Build filters
    const filters: ProctoringLogFilter = {};
    if (studentId) filters.studentId = studentId;
    if (eventType) filters.eventType = eventType as any;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    // Get pagination params
    const paginationParams: PaginationParams = { page, limit };

    // Get logs
    const result = await getProctoringLogs(examId, tenantId, filters, paginationParams);

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Proctoring logs API error:', errorMessage);

    if (errorMessage.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: errorMessage,
      });
    }

    if (errorMessage.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        error: errorMessage,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
