/**
 * Exam Password Verification Endpoint
 * POST /api/tenant/cbt/security/:examId/verify-password
 * 
 * Verifies a student's exam password before allowing exam access.
 * Returns 200 if correct, 403 if wrong, 200 with allowed:true if no password set.
 * 
 * Requirements: 5.9
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateExamPassword } from '../../_lib/security';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    return res.status(400).json({ success: false, error: 'Tenant ID is required' });
  }

  const { examId } = req.query;
  if (!examId || typeof examId !== 'string') {
    return res.status(400).json({ success: false, error: 'Exam ID is required' });
  }

  const { password } = req.body;

  try {
    const result = await validateExamPassword(examId, tenantId, password);

    if (!result.allowed) {
      return res.status(403).json({
        success: false,
        error: result.reason || 'Incorrect exam password',
        allowed: false,
        requiresPassword: true,
      });
    }

    return res.status(200).json({
      success: true,
      allowed: true,
      message: 'Password verified successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
}
