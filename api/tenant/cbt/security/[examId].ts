/**
 * Security Settings API Endpoints
 * GET /api/tenant/cbt/security/:examId - Get security settings
 * POST /api/tenant/cbt/security/:examId - Create/update security settings
 * DELETE /api/tenant/cbt/security/:examId - Delete security settings
 * 
 * Requires: Authentication, Invigilator/Admin role, Exam access
 * Requirements: 5.1
 */

import { NextApiRequest, NextApiResponse } from 'next';
import {
  getSecuritySettings,
  createSecuritySettings,
  updateSecuritySettings,
  deleteSecuritySettings,
  validateSecuritySettings,
  type SecuritySettings,
  type SecuritySettingsInput,
} from '../_lib/security';
import {
  requireAuthentication,
  requireExamAccess,
  requireTenantAccess,
  verifyExamModifyPermission,
  verifyExamDeletePermission,
  logAuthEvent,
} from '../_lib/auth-middleware';
import { getPool } from '../_lib/db';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  validationErrors?: Record<string, string>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { examId } = req.query;
  const pool = getPool();

  if (!examId || typeof examId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Exam ID is required',
    });
  }

  try {
    // Verify authentication (all methods require authentication)
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

    switch (req.method) {
      case 'GET':
        return handleGet(req, res, examId, authContext.tenantId);
      case 'POST':
        // Verify permission to modify exam
        const canModify = await verifyExamModifyPermission(
          pool,
          examId,
          authContext.tenantId,
          authContext.userId,
          authContext.role
        );
        if (!canModify) {
          await logAuthEvent(pool, authContext.userId, authContext.tenantId, 'access_denied', {
            action: 'modify_security_settings',
            examId,
          });
          return res.status(403).json({
            success: false,
            error: 'Forbidden: You do not have permission to modify this exam',
          });
        }
        return handlePost(req, res, examId, authContext.tenantId, authContext.userId);
      case 'DELETE':
        // Verify permission to delete exam
        if (!verifyExamDeletePermission(authContext.role)) {
          await logAuthEvent(pool, authContext.userId, authContext.tenantId, 'access_denied', {
            action: 'delete_security_settings',
            examId,
          });
          return res.status(403).json({
            success: false,
            error: 'Forbidden: Only admins can delete security settings',
          });
        }
        return handleDelete(req, res, examId, authContext.tenantId, authContext.userId);
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed',
        });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Security settings API error:', errorMessage);

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
  examId: string,
  tenantId: string
) {
  try {
    const settings = await getSecuritySettings(examId, tenantId);

    if (!settings) {
      return res.status(404).json({
        success: false,
        error: 'Security settings not found for this exam',
      });
    }

    return res.status(200).json({
      success: true,
      data: settings,
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
 * Handle POST requests
 */
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  examId: string,
  tenantId: string,
  userId: string
) {
  try {
    const {
      proctoringEnabled,
      cameraRequired,
      copyPasteDisabled,
      rightClickDisabled,
      questionRandomization,
      optionRandomization,
      ipWhitelist,
      examPassword,
    } = req.body;

    // Validate input
    const input: SecuritySettingsInput = {
      proctoringEnabled,
      cameraRequired,
      copyPasteDisabled,
      rightClickDisabled,
      questionRandomization,
      optionRandomization,
      ipWhitelist,
      examPassword,
    };

    const validationErrors = validateSecuritySettings(input);

    if (validationErrors.length > 0) {
      const errorMap: Record<string, string> = {};
      validationErrors.forEach((error) => {
        errorMap[error.field] = error.message;
      });

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        validationErrors: errorMap,
      });
    }

    // Check if settings exist
    const existingSettings = await getSecuritySettings(examId, tenantId);

    let settings: SecuritySettings;

    if (existingSettings) {
      // Update existing settings
      settings = await updateSecuritySettings(examId, tenantId, input);
      
      // Log audit event
      const pool = getPool();
      await logAuthEvent(pool, userId, tenantId, 'access_denied', {
        action: 'update_security_settings',
        examId,
        changes: input,
      });
      
      return res.status(200).json({
        success: true,
        data: settings,
        message: 'Security settings updated successfully',
      });
    } else {
      // Create new settings
      settings = await createSecuritySettings(examId, tenantId, input);
      
      // Log audit event
      const pool = getPool();
      await logAuthEvent(pool, userId, tenantId, 'access_denied', {
        action: 'create_security_settings',
        examId,
        settings: input,
      });
      
      return res.status(201).json({
        success: true,
        data: settings,
        message: 'Security settings created successfully',
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: errorMessage,
      });
    }

    if (errorMessage.includes('Validation failed')) {
      return res.status(400).json({
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
 * Handle DELETE requests
 */
async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  examId: string,
  tenantId: string,
  userId: string
) {
  try {
    const deleted = await deleteSecuritySettings(examId, tenantId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Security settings not found',
      });
    }

    // Log audit event
    const pool = getPool();
    await logAuthEvent(pool, userId, tenantId, 'access_denied', {
      action: 'delete_security_settings',
      examId,
    });

    return res.status(200).json({
      success: true,
      message: 'Security settings deleted successfully',
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
