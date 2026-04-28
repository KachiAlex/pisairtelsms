/**
 * Security Settings API Endpoints
 * GET /api/tenant/cbt/security/:examId - Get security settings
 * POST /api/tenant/cbt/security/:examId - Create/update security settings
 * DELETE /api/tenant/cbt/security/:examId - Delete security settings
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
    switch (req.method) {
      case 'GET':
        return handleGet(req, res, examId, tenantId);
      case 'POST':
        return handlePost(req, res, examId, tenantId);
      case 'DELETE':
        return handleDelete(req, res, examId, tenantId);
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
  tenantId: string
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
      return res.status(200).json({
        success: true,
        data: settings,
        message: 'Security settings updated successfully',
      });
    } else {
      // Create new settings
      settings = await createSecuritySettings(examId, tenantId, input);
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
  tenantId: string
) {
  try {
    const deleted = await deleteSecuritySettings(examId, tenantId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Security settings not found',
      });
    }

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
