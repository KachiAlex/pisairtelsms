/**
 * Exam Management API Endpoints
 * GET /api/tenant/cbt/exams - Get all exams
 * POST /api/tenant/cbt/exams - Create a new exam
 * PUT /api/tenant/cbt/exams/:id - Update an exam
 * DELETE /api/tenant/cbt/exams/:id - Delete an exam
 * POST /api/tenant/cbt/exams/:id/schedule - Schedule an exam
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import {
  getExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
  scheduleExam as scheduleExamService,
  getExamStatistics,
  type Exam,
  type CreateExamInput,
  type UpdateExamInput,
} from './_lib/exams';
import {
  scheduleExam as scheduleExamScheduling,
  type ScheduleExamInput,
} from './_lib/exam-scheduling';
import {
  generateRequestId,
  logError,
  sendErrorResponse,
  createValidationError,
  createNotFoundError,
  createInternalError,
  createDatabaseError,
} from './_lib/error-handler';
import {
  validateExam,
  validateExamHasQuestions,
  formatValidationErrors,
} from './_lib/validation-middleware';

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
  const requestId = generateRequestId();

  // Get tenant ID from query or headers
  const tenantId = (req.query.tenantId as string) || req.headers['x-tenant-id'] as string;
  const userId = (req.headers['x-user-id'] as string) || 'system';

  if (!tenantId) {
    const error = createValidationError({ tenantId: 'Tenant ID is required' });
    logError(requestId, error);
    return sendErrorResponse(res, error, requestId);
  }

  try {
    // Handle schedule endpoint
    if (req.query.action === 'schedule') {
      return handleSchedule(req, res, tenantId, requestId);
    }

    switch (req.method) {
      case 'GET':
        return handleGet(req, res, tenantId, requestId);
      case 'POST':
        return handlePost(req, res, tenantId, userId, requestId);
      case 'PUT':
        return handlePut(req, res, tenantId, requestId);
      case 'DELETE':
        return handleDelete(req, res, tenantId, requestId);
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed',
          requestId,
        });
    }
  } catch (error) {
    const originalError = error instanceof Error ? error : new Error(String(error));
    const errorDetails = createInternalError(originalError, { method: req.method, path: req.url });
    logError(requestId, errorDetails);
    return sendErrorResponse(res, errorDetails, requestId);
  }
}

/**
 * Handle GET requests
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  tenantId: string,
  requestId: string
) {
  try {
    const { id, stats } = req.query;

    // Get statistics
    if (stats === 'true') {
      const statistics = await getExamStatistics(pool, tenantId);
      return res.status(200).json({
        success: true,
        data: statistics,
        requestId,
      });
    }

    // Get single exam
    if (id) {
      const exam = await getExamById(pool, tenantId, id as string);
      if (!exam) {
        const error = createNotFoundError('Exam');
        logError(requestId, error);
        return sendErrorResponse(res, error, requestId);
      }
      return res.status(200).json({
        success: true,
        data: exam,
        requestId,
      });
    }

    // Get all exams with filters
    const filters = {
      subject: req.query.subject as string,
      class: req.query.class as string,
      status: req.query.status as any,
      searchText: req.query.search as string,
    };

    const pagination = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };

    const result = await getExams(pool, tenantId, filters, pagination);
    return res.status(200).json({ ...result, requestId });
  } catch (error) {
    const originalError = error instanceof Error ? error : new Error(String(error));
    const errorDetails = createDatabaseError(originalError, { operation: 'getExams' });
    logError(requestId, errorDetails);
    return sendErrorResponse(res, errorDetails, requestId);
  }
}

/**
 * Handle POST requests
 */
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  tenantId: string,
  userId: string,
  requestId: string
) {
  try {
    const { title, subject, class: examClass, duration, pass_mark, total_marks, scheduled_date, scheduled_time } = req.body;

    // Validate using centralized validation middleware
    const validation = validateExam({
      title,
      subject,
      class: examClass,
      duration,
      pass_mark,
      total_marks,
      scheduled_date,
      scheduled_time,
    });

    if (!validation.isValid) {
      const error = createValidationError(formatValidationErrors(validation.errors));
      logError(requestId, error);
      return sendErrorResponse(res, error, requestId);
    }

    // Create exam
    const input: CreateExamInput = {
      title,
      subject,
      class: examClass,
      duration,
      pass_mark,
      total_marks,
      scheduled_date,
      scheduled_time,
    };

    const exam = await createExam(pool, tenantId, userId, input);

    return res.status(201).json({
      success: true,
      data: exam,
      message: 'Exam created successfully',
      requestId,
    });
  } catch (error) {
    const originalError = error instanceof Error ? error : new Error(String(error));
    const errorDetails = createDatabaseError(originalError, { operation: 'createExam' });
    logError(requestId, errorDetails);
    return sendErrorResponse(res, errorDetails, requestId);
  }
}

/**
 * Handle PUT requests
 */
async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  tenantId: string,
  requestId: string
) {
  try {
    const { id } = req.query;

    if (!id) {
      const error = createValidationError({ id: 'Exam ID is required' });
      logError(requestId, error);
      return sendErrorResponse(res, error, requestId);
    }

    const { title, subject, class: examClass, duration, pass_mark, total_marks, scheduled_date, scheduled_time, status } = req.body;

    // Validate input if provided
    const validation = validateExam({
      title: title || '',
      subject: subject || '',
      class: examClass || '',
      duration,
      pass_mark,
      total_marks,
      scheduled_date,
      scheduled_time,
    });

    // Only validate fields that are provided
    const providedErrors = validation.errors.filter((err) => {
      const fieldValue = req.body[err.field] || req.body[err.field === 'class' ? 'examClass' : err.field];
      return fieldValue !== undefined && fieldValue !== null;
    });

    if (providedErrors.length > 0) {
      const error = createValidationError(formatValidationErrors(providedErrors));
      logError(requestId, error);
      return sendErrorResponse(res, error, requestId);
    }

    // Update exam
    const input: UpdateExamInput = {
      title,
      subject,
      class: examClass,
      duration,
      pass_mark,
      total_marks,
      scheduled_date,
      scheduled_time,
      status,
    };

    const exam = await updateExam(pool, tenantId, id as string, input);

    if (!exam) {
      const error = createNotFoundError('Exam');
      logError(requestId, error);
      return sendErrorResponse(res, error, requestId);
    }

    return res.status(200).json({
      success: true,
      data: exam,
      message: 'Exam updated successfully',
      requestId,
    });
  } catch (error) {
    const originalError = error instanceof Error ? error : new Error(String(error));
    const errorDetails = createDatabaseError(originalError, { operation: 'updateExam' });
    logError(requestId, errorDetails);
    return sendErrorResponse(res, errorDetails, requestId);
  }
}

/**
 * Handle DELETE requests
 */
async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  tenantId: string,
  requestId: string
) {
  try {
    const { id } = req.query;

    if (!id) {
      const error = createValidationError({ id: 'Exam ID is required' });
      logError(requestId, error);
      return sendErrorResponse(res, error, requestId);
    }

    const deleted = await deleteExam(pool, tenantId, id as string);

    if (!deleted) {
      const error = createNotFoundError('Exam');
      logError(requestId, error);
      return sendErrorResponse(res, error, requestId);
    }

    return res.status(200).json({
      success: true,
      message: 'Exam deleted successfully',
      requestId,
    });
  } catch (error) {
    const originalError = error instanceof Error ? error : new Error(String(error));
    const errorDetails = createDatabaseError(originalError, { operation: 'deleteExam' });
    logError(requestId, errorDetails);
    return sendErrorResponse(res, errorDetails, requestId);
  }
}

/**
 * Handle schedule endpoint
 */
async function handleSchedule(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  tenantId: string,
  requestId: string
) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed. Use POST',
        requestId,
      });
    }

    const { id } = req.query;
    const { scheduled_date, scheduled_time } = req.body;

    if (!id) {
      const error = createValidationError({ id: 'Exam ID is required' });
      logError(requestId, error);
      return sendErrorResponse(res, error, requestId);
    }

    if (!scheduled_date || !scheduled_time) {
      const error = createValidationError({
        scheduled_date: scheduled_date ? '' : 'Scheduled date is required',
        scheduled_time: scheduled_time ? '' : 'Scheduled time is required',
      });
      logError(requestId, error);
      return sendErrorResponse(res, error, requestId);
    }

    // Validate exam has questions before scheduling
    const questionsValidation = await validateExamHasQuestions(pool, id as string);
    if (!questionsValidation.isValid) {
      const error = createValidationError(formatValidationErrors(questionsValidation.errors));
      logError(requestId, error);
      return sendErrorResponse(res, error, requestId);
    }

    const input: ScheduleExamInput = {
      scheduled_date,
      scheduled_time,
    };

    const result = await scheduleExamScheduling(pool, tenantId, id as string, input);

    return res.status(200).json({
      success: true,
      data: result,
      message: result.message,
      requestId,
    });
  } catch (error) {
    const originalError = error instanceof Error ? error : new Error(String(error));
    const errorDetails = createDatabaseError(originalError, { operation: 'scheduleExam' });
    logError(requestId, errorDetails);
    return sendErrorResponse(res, errorDetails, requestId);
  }
}
