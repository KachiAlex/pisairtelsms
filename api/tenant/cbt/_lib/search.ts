/**
 * Advanced Question Search Service
 * Provides full-text search, relevance ranking, and advanced filtering
 */

import { Pool } from 'pg';
import { Question, QuestionFilter, PaginationParams, PaginatedResponse } from './questions';

export interface SearchOptions extends QuestionFilter {
  searchOperator?: 'AND' | 'OR'; // AND = all terms must match, OR = any term matches
  rankBy?: 'relevance' | 'recent' | 'difficulty'; // Sort by relevance score, creation date, or difficulty
  includeStats?: boolean; // Include search statistics
}

export interface SearchResult extends Question {
  relevanceScore?: number;
}

export interface SearchResponse extends PaginatedResponse<SearchResult> {
  searchStats?: {
    executionTimeMs: number;
    totalMatches: number;
    searchTerms: string[];
  };
}

/**
 * Advanced search with full-text search capabilities
 * Supports multiple search operators and relevance ranking
 */
export async function advancedSearch(
  pool: Pool,
  tenantId: string,
  options: SearchOptions,
  pagination?: PaginationParams
): Promise<SearchResponse> {
  const startTime = Date.now();
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 20;
  const offset = (page - 1) * limit;
  const rankBy = options.rankBy || 'relevance';
  const searchOperator = options.searchOperator || 'AND';

  let query = `
    SELECT 
      q.id, q.tenant_id, q.text, q.type, q.options, q.correct_answer, 
      q.difficulty, q.subject, q.tags, q.created_by, q.created_at, q.updated_at, q.deleted_at,
      ts_rank(to_tsvector('english', q.text), plainto_tsquery('english', $2)) as relevance_score
    FROM questions_bank q
    WHERE q.tenant_id = $1 AND q.deleted_at IS NULL
  `;

  const params: any[] = [tenantId];
  let paramIndex = 2;

  // Build full-text search query
  if (options.searchText) {
    const searchTerms = options.searchText.trim().split(/\s+/);
    const searchQuery = searchTerms.join(` ${searchOperator === 'AND' ? '&' : '|'} `);

    query += ` AND to_tsvector('english', q.text) @@ plainto_tsquery('english', $${paramIndex})`;
    params.push(options.searchText);
    paramIndex++;
  }

  // Apply other filters
  if (options.subject) {
    query += ` AND q.subject = $${paramIndex}`;
    params.push(options.subject);
    paramIndex++;
  }

  if (options.difficulty) {
    query += ` AND q.difficulty = $${paramIndex}`;
    params.push(options.difficulty);
    paramIndex++;
  }

  if (options.type) {
    query += ` AND q.type = $${paramIndex}`;
    params.push(options.type);
    paramIndex++;
  }

  if (options.tags && options.tags.length > 0) {
    query += ` AND q.tags @> $${paramIndex}::jsonb`;
    params.push(JSON.stringify(options.tags));
    paramIndex++;
  }

  // Get total count before pagination
  const countQuery = query.replace(
    'SELECT q.id, q.tenant_id, q.text, q.type, q.options, q.correct_answer, q.difficulty, q.subject, q.tags, q.created_by, q.created_at, q.updated_at, q.deleted_at, ts_rank(to_tsvector(\'english\', q.text), plainto_tsquery(\'english\', $2)) as relevance_score',
    'SELECT COUNT(*) as count'
  );

  const countResult = await pool.query(countQuery, params.slice(0, paramIndex - 1));
  const total = parseInt(countResult.rows[0].count, 10);

  // Add ordering
  if (rankBy === 'relevance' && options.searchText) {
    query += ` ORDER BY relevance_score DESC, q.created_at DESC`;
  } else if (rankBy === 'recent') {
    query += ` ORDER BY q.created_at DESC`;
  } else if (rankBy === 'difficulty') {
    query += ` ORDER BY CASE q.difficulty WHEN 'Easy' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Hard' THEN 3 END, q.created_at DESC`;
  } else {
    query += ` ORDER BY q.created_at DESC`;
  }

  // Add pagination
  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  const executionTime = Date.now() - startTime;

  const searchTerms = options.searchText ? options.searchText.trim().split(/\s+/) : [];

  return {
    success: true,
    data: result.rows.map(row => ({
      ...row,
      options: row.options ? JSON.parse(row.options) : undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      relevanceScore: row.relevance_score,
    })),
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
    searchStats: options.includeStats
      ? {
          executionTimeMs: executionTime,
          totalMatches: total,
          searchTerms,
        }
      : undefined,
  };
}

/**
 * Search with autocomplete suggestions
 * Returns matching questions and suggested search terms
 */
export async function searchWithSuggestions(
  pool: Pool,
  tenantId: string,
  searchText: string,
  limit: number = 10
): Promise<{
  questions: SearchResult[];
  suggestions: string[];
}> {
  // Get matching questions
  const questionQuery = `
    SELECT 
      q.id, q.tenant_id, q.text, q.type, q.options, q.correct_answer, 
      q.difficulty, q.subject, q.tags, q.created_by, q.created_at, q.updated_at, q.deleted_at,
      ts_rank(to_tsvector('english', q.text), plainto_tsquery('english', $2)) as relevance_score
    FROM questions_bank q
    WHERE q.tenant_id = $1 AND q.deleted_at IS NULL
      AND to_tsvector('english', q.text) @@ plainto_tsquery('english', $2)
    ORDER BY relevance_score DESC
    LIMIT $3
  `;

  const questionResult = await pool.query(questionQuery, [tenantId, searchText, limit]);

  // Get subject suggestions
  const suggestionQuery = `
    SELECT DISTINCT subject
    FROM questions_bank
    WHERE tenant_id = $1 AND deleted_at IS NULL
      AND subject ILIKE $2
    LIMIT $3
  `;

  const suggestionResult = await pool.query(suggestionQuery, [tenantId, `%${searchText}%`, limit]);

  return {
    questions: questionResult.rows.map(row => ({
      ...row,
      options: row.options ? JSON.parse(row.options) : undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      relevanceScore: row.relevance_score,
    })),
    suggestions: suggestionResult.rows.map(row => row.subject),
  };
}

/**
 * Get search filters metadata
 * Returns available values for filtering (subjects, difficulties, types, tags)
 */
export async function getSearchFiltersMetadata(
  pool: Pool,
  tenantId: string
): Promise<{
  subjects: string[];
  difficulties: string[];
  types: string[];
  tags: string[];
}> {
  const query = `
    SELECT 
      ARRAY_AGG(DISTINCT subject) as subjects,
      ARRAY_AGG(DISTINCT difficulty) as difficulties,
      ARRAY_AGG(DISTINCT type) as types,
      ARRAY_AGG(DISTINCT jsonb_array_elements(tags)::text) as tags
    FROM questions_bank
    WHERE tenant_id = $1 AND deleted_at IS NULL
  `;

  const result = await pool.query(query, [tenantId]);
  const row = result.rows[0];

  return {
    subjects: row.subjects || [],
    difficulties: row.difficulties || [],
    types: row.types || [],
    tags: row.tags || [],
  };
}

/**
 * Search with faceted results
 * Returns questions grouped by facets (subject, difficulty, type)
 */
export async function facetedSearch(
  pool: Pool,
  tenantId: string,
  searchText?: string
): Promise<{
  bySubject: Record<string, number>;
  byDifficulty: Record<string, number>;
  byType: Record<string, number>;
  total: number;
}> {
  let query = `
    SELECT 
      subject,
      difficulty,
      type,
      COUNT(*) as count
    FROM questions_bank
    WHERE tenant_id = $1 AND deleted_at IS NULL
  `;

  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (searchText) {
    query += ` AND to_tsvector('english', text) @@ plainto_tsquery('english', $${paramIndex})`;
    params.push(searchText);
    paramIndex++;
  }

  query += ` GROUP BY subject, difficulty, type`;

  const result = await pool.query(query, params);

  const facets = {
    bySubject: {} as Record<string, number>,
    byDifficulty: {} as Record<string, number>,
    byType: {} as Record<string, number>,
    total: 0,
  };

  for (const row of result.rows) {
    const count = parseInt(row.count, 10);
    facets.bySubject[row.subject] = (facets.bySubject[row.subject] || 0) + count;
    facets.byDifficulty[row.difficulty] = (facets.byDifficulty[row.difficulty] || 0) + count;
    facets.byType[row.type] = (facets.byType[row.type] || 0) + count;
    facets.total += count;
  }

  return facets;
}

/**
 * Similar questions search
 * Find questions similar to a given question
 */
export async function findSimilarQuestions(
  pool: Pool,
  tenantId: string,
  questionId: string,
  limit: number = 5
): Promise<SearchResult[]> {
  // First get the reference question
  const refQuery = `
    SELECT text, subject, difficulty, type
    FROM questions_bank
    WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
  `;

  const refResult = await pool.query(refQuery, [questionId, tenantId]);
  if (refResult.rows.length === 0) {
    return [];
  }

  const refQuestion = refResult.rows[0];

  // Find similar questions
  const similarQuery = `
    SELECT 
      q.id, q.tenant_id, q.text, q.type, q.options, q.correct_answer, 
      q.difficulty, q.subject, q.tags, q.created_by, q.created_at, q.updated_at, q.deleted_at,
      ts_rank(to_tsvector('english', q.text), to_tsvector('english', $2)) as relevance_score
    FROM questions_bank q
    WHERE q.tenant_id = $1 AND q.deleted_at IS NULL
      AND q.id != $3
      AND q.subject = $4
      AND q.difficulty = $5
      AND q.type = $6
    ORDER BY relevance_score DESC
    LIMIT $7
  `;

  const result = await pool.query(similarQuery, [
    tenantId,
    refQuestion.text,
    questionId,
    refQuestion.subject,
    refQuestion.difficulty,
    refQuestion.type,
    limit,
  ]);

  return result.rows.map(row => ({
    ...row,
    options: row.options ? JSON.parse(row.options) : undefined,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    relevanceScore: row.relevance_score,
  }));
}
