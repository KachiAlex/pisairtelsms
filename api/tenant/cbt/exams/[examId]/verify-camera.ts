/**
 * Camera Verification Endpoint
 * POST /api/tenant/cbt/exams/:examId/verify-camera
 * 
 * Verifies camera availability before exam start
 * Blocks exam access if camera required but unavailable
 */

import { NextApiRequest, NextApiResponse } from 'next';
import {
  getSecuritySettings,
  enforceCameraRequirement,
} from '../../_lib/security';
import {
  logCameraAvailabilityCheck,
  logCameraAccessDenied,
} from '../../_lib/proctoring';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface VerifyCameraResponse {
  success: boolean;
  cameraRequired: boolean;
  cameraAvailable: boolean;
  allowed: boolean;
  message: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Get tenant ID and student ID from headers
  const tenantId = req.headers['x-tenant-id'] as string;
  const studentId = req.headers['x-student-id'] as string;
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

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST',
    });
  }

  try {
    const { cameraAvailable } = req.body;

    // Validate camera availability parameter
    if (typeof cameraAvailable !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'cameraAvailable must be a boolean',
      });
    }

    // Get security settings for the exam
    const settings = await getSecuritySettings(examId, tenantId);

    if (!settings) {
      // No security settings, camera not required
      return res.status(200).json({
        success: true,
        data: {
          success: true,
          cameraRequired: false,
          cameraAvailable,
          allowed: true,
          message: 'Camera not required for this exam',
        },
      });
    }

    // Enforce camera requirement
    const result = await enforceCameraRequirement(
      examId,
      tenantId,
      cameraAvailable
    );

    // Log the camera check event
    if (studentId) {
      await logCameraAvailabilityCheck(
        examId,
        studentId,
        cameraAvailable,
        {
          cameraRequired: settings.cameraRequired,
          allowed: result.allowed,
        }
      );

      // Log access denied if applicable
      if (!result.allowed && result.reason) {
        await logCameraAccessDenied(
          examId,
          studentId,
          result.reason,
          {
            cameraRequired: settings.cameraRequired,
            cameraAvailable,
          }
        );
      }
    }

    // Return response
    if (!result.allowed) {
      return res.status(403).json({
        success: false,
        error: result.reason || 'Camera verification failed',
        data: {
          success: false,
          cameraRequired: settings.cameraRequired,
          cameraAvailable,
          allowed: false,
          message: result.reason || 'Camera verification failed',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        success: true,
        cameraRequired: settings.cameraRequired,
        cameraAvailable,
        allowed: true,
        message: settings.cameraRequired
          ? 'Camera verified successfully'
          : 'Camera not required for this exam',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Camera verification error:', errorMessage);

    if (errorMessage.includes('not found')) {
      return res.status(404).json({
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
