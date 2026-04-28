/**
 * Audit Logs API Endpoint
 * GET /api/tenant/cbt/audit-logs - Get audit logs
 * 
 * Requires: Authentication, Admin role
 * Requirements: 5.1, 6.1
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getAuditLogs, generateComplianceReport } from './_lib/audit-logging';
import {
  requireAuthentication,
  requireTenantAccess,
} from './_lib/auth-middleware';

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
  try {
    // Verify authentication (admin only)
    const authContext = await requireAuthentication(req, res, 'admin');
    if (!authContext) {
      return; // requireAuthentication already sent error response
    }

    // Verify tenant access
    if (!requireTenantAccess(req, res, authContext, authContext.tenantId)) {
      return;
    }

    if (req.method === 'GET') {
      return handleGet(req, res, authContext.tenantId);
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Audit logs API error:', errorMessage);

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
  tenantId: string
) {
  try {
    const {
      resourceType,
      resourceId,
      startDate,
      endDate,
      page = '1',
      limit = '50',
      report,
    } = req.query;

    // If report is requested, generate compliance report
    if (report === 'true') {
      return handleComplianceReport(req, res, tenantId, startDate, endDate);
    }

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

    // Get audit logs
    const logs = await getAuditLogs(
      tenantId,
      resourceType as string | undefined,
      resourceId as string | undefined,
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

/**
 * Handle compliance report generation
 */
async function handleComplianceReport(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  tenantId: string,
  startDate: string | string[] | undefined,
  endDate: string | string[] | undefined
) {
  try {
    // Parse dates
    let startDateObj = new Date();
    startDateObj.setDate(startDateObj.getDate() - 30); // Default to last 30 days

    let endDateObj = new Date();

    if (startDate && typeof startDate === 'string') {
      const parsed = new Date(startDate);
      if (!isNaN(parsed.getTime())) {
        startDateObj = parsed;
      }
    }

    if (endDate && typeof endDate === 'string') {
      const parsed = new Date(endDate);
      if (!isNaN(parsed.getTime())) {
        endDateObj = parsed;
      }
    }

    // Generate compliance report
    const report = await generateComplianceReport(tenantId, startDateObj, endDateObj);

    return res.status(200).json({
      success: true,
      data: {
        ...report,
        startDate: startDateObj.toISOString(),
        endDate: endDateObj.toISOString(),
      },
      message: 'Compliance report generated successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}
