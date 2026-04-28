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
  const userId = (req.headers['x-user-id'] as string) || 'system';

  if (!tenantId) {
    return res.status(400).json({
      success: false,
      error: 'Tenant ID is required',
    });
  }

  try {
    // Handle schedule endpoint
    if (req.query.action === 'schedule') {
      return handleSchedule(req, res, tenantId);
    }

    switch (req.method) {
      case 'GET':
        return handleGet(req, res, tenantId);
      case 'POST':
        return handlePost(req, res, tenantId, userId);
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
    console.error('Exam API error:', errorMessage);

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
  const { id, stats } = req.query;

  // Get statistics
  if (stats === 'true') {
    const statistics = await getExamStatistics(pool, tenantId);
    return res.status(200).json({
      success: true,
      data: statistics,
    });
  }

  // Get single exam
  if (id) {
    const exam = await getExamById(pool, tenantId, id as string);
    if (!exam) {
      return res.status(404).json({
        success: false,
        error: 'Exam not found',
      });
    }
    return res.status(200).json({
      success: true,
      data: exam,
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
  return res.status(200).json(result);
}

/**
 * Handle POST requests
 */
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  tenantId: string,
  userId: string
) {
  const { title, subject, class: examClass, duration, pass_mark, total_marks, scheduled_date, scheduled_time } = req.body;

  // Validate required fields
  const validationErrors: Record<string, string> = {};

  if (!title || title.trim().length === 0) {
    validationErrors.title = 'Exam title is required';
  }

  if (!subject || subject.trim().length === 0) {
    validationErrors.subject = 'Subject is required';
  }

  if (!examClass || examClass.trim().length === 0) {
    validationErrors.class = 'Class is required';
  }

  if (!duration || duration < 15 || duration > 480) {
    validationErrors.duration = 'Duration must be between 15 and 480 minutes';
  }

  if (pass_mark === undefined || pass_mark < 0 || pass_mark > 100) {
    validationErrors.pass_mark = 'Pass mark must be between 0 and 100';
  }

  if (!total_marks || total_marks <= 0) {
    validationErrors.total_marks = 'Total marks must be greater than 0';
  }

  if (total_marks <= pass_mark) {
    validationErrors.total_marks = 'Total marks must be greater than pass mark';
  }

  if (Object.keys(validationErrors).length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      validationErrors,
    });
  }

  try {
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
 */
async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  tenantId: string
) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Exam ID is required',
    });
  }

  const { title, subject, class: examClass, duration, pass_mark, total_marks, scheduled_date, scheduled_time, status } = req.body;

  // Validate input if provided
  const validationErrors: Record<string, string> = {};

  if (duration && (duration < 15 || duration > 480)) {
    validationErrors.duration = 'Duration must be between 15 and 480 minutes';
  }

  if (pass_mark !== undefined && (pass_mark < 0 || pass_mark > 100)) {
    validationErrors.pass_mark = 'Pass mark must be between 0 and 100';
  }

  if (total_marks && total_marks <= 0) {
    validationErrors.total_marks = 'Total marks must be greater than 0';
  }

  if (Object.keys(validationErrors).length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      validationErrors,
    });
  }

  try {
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
      return res.status(404).json({
        success: false,
        error: 'Exam not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: exam,
      message: 'Exam updated successfully',
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
 */
async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  tenantId: string
) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Exam ID is required',
    });
  }

  const deleted = await deleteExam(pool, tenantId, id as string);

  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: 'Exam not found',
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Exam deleted successfully',
  });
}

/**
 * Handle schedule endpoint
 */
async function handleSchedule(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  tenantId: string
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST',
    });
  }

  const { id } = req.query;
  const { scheduled_date, scheduled_time } = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Exam ID is required',
    });
  }

  if (!scheduled_date || !scheduled_time) {
    return res.status(400).json({
      success: false,
      error: 'Scheduled date and time are required',
    });
  }

  try {
    const input: ScheduleExamInput = {
      scheduled_date,
      scheduled_time,
    };

    const result = await scheduleExamScheduling(pool, tenantId, id as string, input);

    return res.status(200).json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(400).json({
      success: false,
      error: errorMessage,
    });
  }
}
