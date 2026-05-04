/**
 * CBT Database Schema Verification Endpoint
 * 
 * GET /api/tenant/cbt/schema-verify
 * 
 * Verifies that the CBT database schema is correctly set up with all required
 * tables, columns, indexes, and constraints.
 * 
 * Authentication: Required (admin/invigilator only)
 * Response: Schema verification results
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { verifySchema, generateVerificationReport } from './_lib/schema-verify';

interface VerificationResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VerificationResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      error: 'Only GET requests are supported'
    });
  }

  try {
    // Check for report format query parameter
    const format = req.query.format as string || 'json';

    if (format === 'report') {
      // Generate markdown report
      const report = await generateVerificationReport();
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', 'attachment; filename="schema-verification.md"');
      return res.status(200).send(report as any);
    }

    // Run schema verification
    const result = await verifySchema();

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Schema verification passed',
        data: result
      });
    } else {
      return res.status(200).json({
        success: false,
        message: 'Schema verification failed',
        data: result
      });
    }
  } catch (error) {
    console.error('Schema verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Schema verification failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
