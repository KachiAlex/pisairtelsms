/**
 * Get Questions for Exam Endpoint
 * GET /api/tenant/cbt/exams/:examId/questions
 * 
 * Returns questions for an exam, randomized if enabled
 * Query parameters:
 *   - studentId (required): UUID of the student
 *   - tenantId (required): UUID of the tenant (from header or query)
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getRandomizedQuestions } from '../../_lib/security';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface QuestionResponse {
  id: string;
  question_id: string;
  question_order: number;
  marks: number;
  text: string;
  type: string;
  options: any;
  difficulty: string;
  subject: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET',
    });
  }

  // Get tenant ID from query or headers
  const tenantId = (req.query.tenantId as string) || (req.headers['x-tenant-id'] as string);
  const studentId = req.query.studentId as string;
  const examId = req.query.examId as string;

  // Validate required parameters
  if (!tenantId) {
    return res.status(400).json({
      success: false,
      error: 'Tenant ID is required',
    });
  }

  if (!studentId) {
    return res.status(400).json({
      success: false,
      error: 'Student ID is required',
    });
  }

  if (!examId) {
    return res.status(400).json({
      success: false,
      error: 'Exam ID is required',
    });
  }

  // Validate UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(examId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid exam ID format',
    });
  }

  if (!uuidRegex.test(studentId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid student ID format',
    });
  }

  if (!uuidRegex.test(tenantId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid tenant ID format',
    });
  }

  try {
    // Get randomized questions for the student
    const questions = await getRandomizedQuestions(examId, studentId, tenantId);

    return res.status(200).json({
      success: true,
      data: questions,
      message: `Retrieved ${questions.length} questions for exam`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Get questions error:', errorMessage);

    // Check if exam not found
    if (errorMessage.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Exam not found',
      });
    }

    // Check if unauthorized
    if (errorMessage.includes('Unauthorized') || errorMessage.includes('unauthorized')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized access',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
