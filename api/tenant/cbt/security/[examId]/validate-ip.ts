/**
 * IP Whitelist Validation Endpoint
 * POST /api/tenant/cbt/security/:examId/validate-ip
 * 
 * Validates a student's IP address against the exam's IP whitelist.
 * Returns 200 if allowed, 403 if blocked.
 * 
 * Requirements: 5.8
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateIPWhitelist, isValidIPv4 } from '../../_lib/security';

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

  const { studentIP } = req.body;
  if (!studentIP || typeof studentIP !== 'string') {
    return res.status(400).json({ success: false, error: 'Student IP address is required' });
  }

  // Validate IP format
  if (!isValidIPv4(studentIP)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid IP address format. Must be a valid IPv4 address (e.g., 192.168.1.1)',
    });
  }

  try {
    const result = await validateIPWhitelist(examId, tenantId, studentIP);

    if (!result.allowed) {
      return res.status(403).json({
        success: false,
        error: result.reason || 'Access denied: IP address not whitelisted',
        allowed: false,
      });
    }

    return res.status(200).json({
      success: true,
      allowed: true,
      message: 'IP address is allowed',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
}
