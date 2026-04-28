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
    console.error('Question API error:', errorMessage);

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
            return res.status(400).json({
              success: false,
              error: 'Subject parameter required for subject statistics',
            });
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
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        success: false,
        error: `Failed to retrieve statistics: ${errorMessage}`,
      });
    }
  }

  // Get search filters metadata
  if (filtersParam === 'true') {
    const metadata = await getSearchFiltersMetadata(pool, tenantId);
    return res.status(200).json({
      success: true,
      data: metadata,
    });
  }

  // Get faceted search results
  if (facets === 'true') {
    const facetResults = await facetedSearch(pool, tenantId, search as string);
    return res.status(200).json({
      success: true,
      data: facetResults,
    });
  }

  // Get search suggestions
  if (suggestions === 'true' && search) {
    const suggestionResults = await searchWithSuggestions(pool, tenantId, search as string);
    return res.status(200).json({
      success: true,
      data: suggestionResults,
    });
  }

  // Find similar questions
  if (similar && id) {
    const similarResults = await findSimilarQuestions(pool, tenantId, id as string);
    return res.status(200).json({
      success: true,
      data: similarResults,
    });
  }

  // Get single question
  if (id && !similar) {
    const question = await getQuestionById(pool, tenantId, id as string);
    if (!question) {
      return res.status(404).json({
        success: false,
        error: 'Question not found',
      });
    }
    return res.status(200).json({
      success: true,
      data: question,
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
    return res.status(200).json(result);
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
  const { text, type, options, correct_answer, difficulty, subject, tags } = req.body;

  // Validate required fields
  const validationErrors: Record<string, string> = {};

  if (!text || text.trim().length === 0) {
    validationErrors.text = 'Question text is required';
  }

  if (!type || !['objective', 'truefalse', 'essay'].includes(type)) {
    validationErrors.type = 'Invalid question type';
  }

  if (type !== 'essay' && (!options || options.length === 0)) {
    validationErrors.options = 'Options are required for objective and true/false questions';
  }

  if (!correct_answer || correct_answer.trim().length === 0) {
    validationErrors.correct_answer = 'Correct answer is required';
  }

  if (!difficulty || !['Easy', 'Medium', 'Hard'].includes(difficulty)) {
    validationErrors.difficulty = 'Invalid difficulty level';
  }

  if (!subject || subject.trim().length === 0) {
    validationErrors.subject = 'Subject is required';
  }

  if (Object.keys(validationErrors).length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      validationErrors,
    });
  }

  // Check for duplicates
  const duplicate = await checkDuplicateQuestion(pool, tenantId, text, correct_answer);
  if (duplicate) {
    return res.status(409).json({
      success: false,
      error: 'A question with the same text and answer already exists',
      data: duplicate,
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
  });
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
      error: 'Question ID is required',
    });
  }

  const { text, type, options, correct_answer, difficulty, subject, tags } = req.body;

  // Validate input if provided
  const validationErrors: Record<string, string> = {};

  if (type && !['objective', 'truefalse', 'essay'].includes(type)) {
    validationErrors.type = 'Invalid question type';
  }

  if (type !== 'essay' && options && options.length === 0) {
    validationErrors.options = 'Options cannot be empty for objective and true/false questions';
  }

  if (difficulty && !['Easy', 'Medium', 'Hard'].includes(difficulty)) {
    validationErrors.difficulty = 'Invalid difficulty level';
  }

  if (Object.keys(validationErrors).length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      validationErrors,
    });
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
    return res.status(404).json({
      success: false,
      error: 'Question not found',
    });
  }

  // Invalidate statistics cache
  invalidateStatisticsCache(tenantId);

  return res.status(200).json({
    success: true,
    data: question,
    message: 'Question updated successfully',
  });
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
      error: 'Question ID is required',
    });
  }

  const deleted = await deleteQuestion(pool, tenantId, id as string);

  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: 'Question not found',
    });
  }

  // Invalidate statistics cache
  invalidateStatisticsCache(tenantId);

  return res.status(200).json({
    success: true,
    message: 'Question deleted successfully',
  });
}
