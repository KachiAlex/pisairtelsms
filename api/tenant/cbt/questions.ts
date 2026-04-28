/**
 * Question Bank API Endpoints
 * GET /api/tenant/cbt/questions - Get all questions
 * POST /api/tenant/cbt/questions - Create a new question
 * PUT /api/tenant/cbt/questions/:id - Update a question
 * DELETE /api/tenant/cbt/questions/:id - Delete a question
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionStatistics,
  checkDuplicateQuestion,
  type Question,
  type CreateQuestionInput,
} from './_lib/questions';
import {
  advancedSearch,
  searchWithSuggestions,
  getSearchFiltersMetadata,
  facetedSearch,
  findSimilarQuestions,
  type SearchOptions,
} from './_lib/search';
import {
  getQuestionStatistics as getStatsFromService,
  getDetailedStatistics,
  getTimeBasedStatistics,
  getStatisticsBySubject,
  getExamPreparationStats,
  invalidateStatisticsCache,
  getCacheStats,
} from './_lib/statistics';
import {
  generateRequestId,
  logError,
  sendErrorResponse,
  createValidationError,
  createNotFoundError,
  createConflictError,
  createInternalError,
  createDatabaseError,
} from './_lib/error-handler';
import {
  validateQuestion,
  formatValidationErrors,
} from './_lib/validation-middleware';
import {
  checkExactDuplicate,
  generateDuplicateWarning,
} from './_lib/duplicate-detection';

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
    const { id, stats, search, advanced, suggestions, filters: filtersParam, facets, similar, statsType, subject } = req.query;

    // Get statistics
    if (stats === 'true') {
      const statsTypeStr = (statsType as string) || 'basic';

      try {
        let statistics;

        switch (statsTypeStr) {
          case 'detailed':
            statistics = await getDetailedStatistics(pool, tenantId);
            break;
          case 'timebased':
            statistics = await getTimeBasedStatistics(pool, tenantId);
            break;
          case 'exam-prep':
            statistics = await getExamPreparationStats(pool, tenantId);
            break;
          case 'subject':
            if (!subject) {
              const error = createValidationError({ subject: 'Subject parameter required for subject statistics' });
              logError(requestId, error);
              return sendErrorResponse(res, error, requestId);
            }
            statistics = await getStatisticsBySubject(pool, tenantId, subject as string);
            break;
          case 'cache':
            statistics = getCacheStats();
            break;
          default:
            statistics = await getStatsFromService(pool, tenantId);
        }

        return res.status(200).json({
          success: true,
          data: statistics,
          requestId,
        });
      } catch (error) {
        const originalError = error instanceof Error ? error : new Error(String(error));
        const errorDetails = createDatabaseError(originalError, { operation: 'getStatistics' });
        logError(requestId, errorDetails);
        return sendErrorResponse(res, errorDetails, requestId);
      }
    }

    // Get search filters metadata
    if (filtersParam === 'true') {
      const metadata = await getSearchFiltersMetadata(pool, tenantId);
      return res.status(200).json({
        success: true,
        data: metadata,
        requestId,
      });
    }

    // Get faceted search results
    if (facets === 'true') {
      const facetResults = await facetedSearch(pool, tenantId, search as string);
      return res.status(200).json({
        success: true,
        data: facetResults,
        requestId,
      });
    }

    // Get search suggestions
    if (suggestions === 'true' && search) {
      const suggestionResults = await searchWithSuggestions(pool, tenantId, search as string);
      return res.status(200).json({
        success: true,
        data: suggestionResults,
        requestId,
      });
    }

    // Find similar questions
    if (similar && id) {
      const similarResults = await findSimilarQuestions(pool, tenantId, id as string);
      return res.status(200).json({
        success: true,
        data: similarResults,
        requestId,
      });
    }

    // Get single question
    if (id && !similar) {
      const question = await getQuestionById(pool, tenantId, id as string);
      if (!question) {
        const error = createNotFoundError('Question');
        logError(requestId, error);
        return sendErrorResponse(res, error, requestId);
      }
      return res.status(200).json({
        success: true,
        data: question,
        requestId,
      });
    }

    // Advanced search
    if (advanced === 'true' || search) {
      const searchOptions: SearchOptions = {
        subject: req.query.subject as string,
        difficulty: req.query.difficulty as string,
        type: req.query.type as string,
        searchText: search as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        searchOperator: (req.query.operator as 'AND' | 'OR') || 'AND',
        rankBy: (req.query.rankBy as 'relevance' | 'recent' | 'difficulty') || 'relevance',
        includeStats: req.query.stats === 'true',
      };

      const pagination = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };

      const result = await advancedSearch(pool, tenantId, searchOptions, pagination);
      return res.status(200).json({ ...result, requestId });
    }

    // Get all questions with basic filters
    const filters = {
      subject: req.query.subject as string,
      difficulty: req.query.difficulty as string,
      type: req.query.type as string,
      searchText: req.query.search as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
    };

    const pagination = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };

    const result = await getQuestions(pool, tenantId, filters, pagination);
    return res.status(200).json({ ...result, requestId });
  } catch (error) {
    const originalError = error instanceof Error ? error : new Error(String(error));
    const errorDetails = createDatabaseError(originalError, { operation: 'getQuestions' });
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
    const { text, type, options, correct_answer, difficulty, subject, tags } = req.body;

    // Validate using centralized validation middleware
    const validation = validateQuestion({
      text,
      type,
      options,
      correct_answer,
      difficulty,
      subject,
      tags,
    });

    if (!validation.isValid) {
      const error = createValidationError(formatValidationErrors(validation.errors));
      logError(requestId, error);
      return sendErrorResponse(res, error, requestId);
    }

    // Check for exact duplicates
    const duplicateCheck = await checkExactDuplicate(pool, tenantId, text, correct_answer, type);
    if (duplicateCheck.isDuplicate && duplicateCheck.existingQuestion) {
      const warning = generateDuplicateWarning(duplicateCheck);
      const error = createConflictError(
        warning?.message || 'A question with the same text and answer already exists'
      );
      logError(requestId, error);
      return res.status(409).json({
        success: false,
        error: error.message,
        requestId,
        data: {
          isDuplicate: true,
          existingQuestion: duplicateCheck.existingQuestion,
          warning: warning?.message,
        },
      });
    }

    // Create question
    const input: CreateQuestionInput = {
      text,
      type,
      options,
      correct_answer,
      difficulty,
      subject,
      tags,
    };

    const question = await createQuestion(pool, tenantId, userId, input);

    // Invalidate statistics cache
    invalidateStatisticsCache(tenantId);

    return res.status(201).json({
      success: true,
      data: question,
      message: 'Question created successfully',
      requestId,
    });
  } catch (error) {
    const originalError = error instanceof Error ? error : new Error(String(error));
    const errorDetails = createDatabaseError(originalError, { operation: 'createQuestion' });
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
      const error = createValidationError({ id: 'Question ID is required' });
      logError(requestId, error);
      return sendErrorResponse(res, error, requestId);
    }

    const { text, type, options, correct_answer, difficulty, subject, tags } = req.body;

    // Validate input if provided
    const validation = validateQuestion({
      text: text || '',
      type: type || '',
      options,
      correct_answer: correct_answer || '',
      difficulty: difficulty || '',
      subject: subject || '',
      tags,
    });

    // Only validate fields that are provided
    const providedErrors = validation.errors.filter((err) => {
      const fieldValue = req.body[err.field];
      return fieldValue !== undefined && fieldValue !== null;
    });

    if (providedErrors.length > 0) {
      const error = createValidationError(formatValidationErrors(providedErrors));
      logError(requestId, error);
      return sendErrorResponse(res, error, requestId);
    }

    // Update question
    const input = {
      text,
      type,
      options,
      correct_answer,
      difficulty,
      subject,
      tags,
    };

    const question = await updateQuestion(pool, tenantId, id as string, input);

    if (!question) {
      const error = createNotFoundError('Question');
      logError(requestId, error);
      return sendErrorResponse(res, error, requestId);
    }

    // Invalidate statistics cache
    invalidateStatisticsCache(tenantId);

    return res.status(200).json({
      success: true,
      data: question,
      message: 'Question updated successfully',
      requestId,
    });
  } catch (error) {
    const originalError = error instanceof Error ? error : new Error(String(error));
    const errorDetails = createDatabaseError(originalError, { operation: 'updateQuestion' });
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
      const error = createValidationError({ id: 'Question ID is required' });
      logError(requestId, error);
      return sendErrorResponse(res, error, requestId);
    }

    const deleted = await deleteQuestion(pool, tenantId, id as string);

    if (!deleted) {
      const error = createNotFoundError('Question');
      logError(requestId, error);
      return sendErrorResponse(res, error, requestId);
    }

    // Invalidate statistics cache
    invalidateStatisticsCache(tenantId);

    return res.status(200).json({
      success: true,
      message: 'Question deleted successfully',
      requestId,
    });
  } catch (error) {
    const originalError = error instanceof Error ? error : new Error(String(error));
    const errorDetails = createDatabaseError(originalError, { operation: 'deleteQuestion' });
    logError(requestId, errorDetails);
    return sendErrorResponse(res, errorDetails, requestId);
  }
}
