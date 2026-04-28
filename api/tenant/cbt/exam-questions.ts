/**
 * Exam Questions API Endpoints
 * GET /api/tenant/cbt/exams/:examId/questions - Get all questions for an exam
 * POST /api/tenant/cbt/exams/:examId/questions - Add a question to an exam
 * DELETE /api/tenant/cbt/exams/:examId/questions/:questionId - Remove a question from an exam
 * PUT /api/tenant/cbt/exams/:examId/questions/:questionId - Update question marks or order
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import {
  addQuestionToExam,
  removeQuestionFromExam,
  getExamQuestions,
  reorderExamQuestions,
  updateQuestionMarks,
  getExamTotalMarks,
  getExamQuestionCount,
  type ExamQuestion,
  type QuestionDetail,
  type AddQuestionInput,
} from './_lib/exam-questions';

// Initialize database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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
  // Get tenant ID from query or headers
  const tenantId = (req.query.tenantId as string) || req.headers['x-tenant-id'] as string;

  if (!tenantId) {
    return res.status(400).json({
      success: false,
      error: 'Tenant ID is required',
    });
  }

  try {
    switch (req.method) {
      case 'GET':
        return handleGet(req, res, tenantId);
      case 'POST':
        return handlePost(req, res, tenantId);
      case 'PUT':
        return handlePut(req, res, tenantId);
      case 'DELETE':
        return handleDelete(req, res, tenantId);
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed',
        });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Exam Questions API error:', errorMessage);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Handle GET requests
 * GET /api/tenant/cbt/exams/:examId/questions
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  tenantId: string
) {
  const { examId } = req.query;

  if (!examId) {
    return res.status(400).json({
      success: false,
      error: 'Exam ID is required',
    });
  }

  try {
    const questions = await getExamQuestions(pool, tenantId, examId as string);
    const totalMarks = await getExamTotalMarks(pool, tenantId, examId as string);
    const questionCount = await getExamQuestionCount(pool, tenantId, examId as string);

    return res.status(200).json({
      success: true,
      data: {
        questions,
        totalMarks,
        questionCount,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(400).json({
      success: false,
      error: errorMessage,
    });
  }
}

/**
 * Handle POST requests
 * POST /api/tenant/cbt/exams/:examId/questions
 */
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  tenantId: string
) {
  const { examId } = req.query;
  const { questionId, questionOrder, marks } = req.body;

  if (!examId) {
    return res.status(400).json({
      success: false,
      error: 'Exam ID is required',
    });
  }

  // Validate required fields
  const validationErrors: Record<string, string> = {};

  if (!questionId || questionId.trim().length === 0) {
    validationErrors.questionId = 'Question ID is required';
  }

  if (!questionOrder || questionOrder < 1) {
    validationErrors.questionOrder = 'Question order must be at least 1';
  }

  if (!marks || marks <= 0) {
    validationErrors.marks = 'Marks must be greater than 0';
  }

  if (Object.keys(validationErrors).length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      validationErrors,
    });
  }

  try {
    const input: AddQuestionInput = {
      questionId,
      questionOrder,
      marks,
    };

    const examQuestion = await addQuestionToExam(pool, tenantId, examId as string, input);

    return res.status(201).json({
      success: true,
      data: examQuestion,
      message: 'Question added to exam successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(400).json({
      success: false,
      error: errorMessage,
    });
  }
}

/**
 * Handle PUT requests
 * PUT /api/tenant/cbt/exams/:examId/questions/:questionId
 */
async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  tenantId: string
) {
  const { examId, questionId } = req.query;
  const { marks, reorder } = req.body;

  if (!examId || !questionId) {
    return res.status(400).json({
      success: false,
      error: 'Exam ID and question ID are required',
    });
  }

  try {
    // Handle reordering
    if (reorder && Array.isArray(reorder)) {
      const reordered = await reorderExamQuestions(
        pool,
        tenantId,
        examId as string,
        reorder
      );

      return res.status(200).json({
        success: true,
        data: reordered,
        message: 'Questions reordered successfully',
      });
    }

    // Handle marks update
    if (marks !== undefined) {
      if (marks <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Marks must be greater than 0',
        });
      }

      const updated = await updateQuestionMarks(
        pool,
        tenantId,
        examId as string,
        questionId as string,
        marks
      );

      return res.status(200).json({
        success: true,
        data: updated,
        message: 'Question marks updated successfully',
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Either marks or reorder data is required',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(400).json({
      success: false,
      error: errorMessage,
    });
  }
}

/**
 * Handle DELETE requests
 * DELETE /api/tenant/cbt/exams/:examId/questions/:questionId
 */
async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  tenantId: string
) {
  const { examId, questionId } = req.query;

  if (!examId || !questionId) {
    return res.status(400).json({
      success: false,
      error: 'Exam ID and question ID are required',
    });
  }

  try {
    const deleted = await removeQuestionFromExam(
      pool,
      tenantId,
      examId as string,
      questionId as string
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Question not found in exam',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Question removed from exam successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(400).json({
      success: false,
      error: errorMessage,
    });
  }
}
