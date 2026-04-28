/**
 * Question Bank Service
 * Handles all question-related database operations
 */

import { Pool } from 'pg';

export interface Question {
  id: string;
  tenant_id: string;
  text: string;
  type: 'objective' | 'truefalse' | 'essay';
  options?: string[];
  correct_answer: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  subject: string;
  tags?: string[];
  created_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

export interface CreateQuestionInput {
  text: string;
  type: 'objective' | 'truefalse' | 'essay';
  options?: string[];
  correct_answer: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  subject: string;
  tags?: string[];
}

export interface QuestionFilter {
  subject?: string;
  difficulty?: string;
  type?: string;
  searchText?: string;
  tags?: string[];
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

/**
 * Get all questions with optional filtering and pagination
 */
export async function getQuestions(
  pool: Pool,
  tenantId: string,
  filters?: QuestionFilter,
  pagination?: PaginationParams
): Promise<PaginatedResponse<Question>> {
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 20;
  const offset = (page - 1) * limit;

  let query = `
    SELECT id, tenant_id, text, type, options, correct_answer, difficulty, subject, tags, created_by, created_at, updated_at, deleted_at
    FROM questions_bank
    WHERE tenant_id = $1 AND deleted_at IS NULL
  `;
  const params: any[] = [tenantId];
  let paramIndex = 2;

  // Apply filters
  if (filters?.subject) {
    query += ` AND subject = $${paramIndex}`;
    params.push(filters.subject);
    paramIndex++;
  }

  if (filters?.difficulty) {
    query += ` AND difficulty = $${paramIndex}`;
    params.push(filters.difficulty);
    paramIndex++;
  }

  if (filters?.type) {
    query += ` AND type = $${paramIndex}`;
    params.push(filters.type);
    paramIndex++;
  }

  if (filters?.searchText) {
    query += ` AND text ILIKE $${paramIndex}`;
    params.push(`%${filters.searchText}%`);
    paramIndex++;
  }

  if (filters?.tags && filters.tags.length > 0) {
    query += ` AND tags @> $${paramIndex}::jsonb`;
    params.push(JSON.stringify(filters.tags));
    paramIndex++;
  }

  // Get total count
  const countQuery = query.replace(
    'SELECT id, tenant_id, text, type, options, correct_answer, difficulty, subject, tags, created_by, created_at, updated_at, deleted_at',
    'SELECT COUNT(*) as count'
  );
  const countResult = await pool.query(countQuery, params.slice(0, paramIndex - 1));
  const total = parseInt(countResult.rows[0].count, 10);

  // Add pagination
  query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  return {
    success: true,
    data: result.rows.map(row => ({
      ...row,
      options: row.options ? JSON.parse(row.options) : undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
    })),
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single question by ID
 */
export async function getQuestionById(
  pool: Pool,
  tenantId: string,
  questionId: string
): Promise<Question | null> {
  const result = await pool.query(
    `SELECT id, tenant_id, text, type, options, correct_answer, difficulty, subject, tags, created_by, created_at, updated_at, deleted_at
     FROM questions_bank
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [questionId, tenantId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    ...row,
    options: row.options ? JSON.parse(row.options) : undefined,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
  };
}

/**
 * Create a new question
 */
export async function createQuestion(
  pool: Pool,
  tenantId: string,
  userId: string,
  input: CreateQuestionInput
): Promise<Question> {
  // Validate input
  validateQuestionInput(input);

  const result = await pool.query(
    `INSERT INTO questions_bank (tenant_id, text, type, options, correct_answer, difficulty, subject, tags, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, tenant_id, text, type, options, correct_answer, difficulty, subject, tags, created_by, created_at, updated_at, deleted_at`,
    [
      tenantId,
      input.text,
      input.type,
      input.options ? JSON.stringify(input.options) : null,
      input.correct_answer,
      input.difficulty,
      input.subject,
      input.tags ? JSON.stringify(input.tags) : JSON.stringify([]),
      userId,
    ]
  );

  const row = result.rows[0];
  return {
    ...row,
    options: row.options ? JSON.parse(row.options) : undefined,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
  };
}

/**
 * Update a question
 */
export async function updateQuestion(
  pool: Pool,
  tenantId: string,
  questionId: string,
  input: Partial<CreateQuestionInput>
): Promise<Question | null> {
  // Check if question exists
  const existing = await getQuestionById(pool, tenantId, questionId);
  if (!existing) {
    return null;
  }

  // Validate input if provided
  if (input.type || input.options || input.correct_answer || input.difficulty) {
    validateQuestionInput({
      text: input.text || existing.text,
      type: input.type || existing.type,
      options: input.options || existing.options,
      correct_answer: input.correct_answer || existing.correct_answer,
      difficulty: input.difficulty || existing.difficulty,
      subject: input.subject || existing.subject,
      tags: input.tags || existing.tags,
    });
  }

  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (input.text !== undefined) {
    updates.push(`text = $${paramIndex}`);
    params.push(input.text);
    paramIndex++;
  }

  if (input.type !== undefined) {
    updates.push(`type = $${paramIndex}`);
    params.push(input.type);
    paramIndex++;
  }

  if (input.options !== undefined) {
    updates.push(`options = $${paramIndex}`);
    params.push(input.options ? JSON.stringify(input.options) : null);
    paramIndex++;
  }

  if (input.correct_answer !== undefined) {
    updates.push(`correct_answer = $${paramIndex}`);
    params.push(input.correct_answer);
    paramIndex++;
  }

  if (input.difficulty !== undefined) {
    updates.push(`difficulty = $${paramIndex}`);
    params.push(input.difficulty);
    paramIndex++;
  }

  if (input.subject !== undefined) {
    updates.push(`subject = $${paramIndex}`);
    params.push(input.subject);
    paramIndex++;
  }

  if (input.tags !== undefined) {
    updates.push(`tags = $${paramIndex}`);
    params.push(JSON.stringify(input.tags || []));
    paramIndex++;
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  params.push(questionId, tenantId);

  const result = await pool.query(
    `UPDATE questions_bank
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} AND deleted_at IS NULL
     RETURNING id, tenant_id, text, type, options, correct_answer, difficulty, subject, tags, created_by, created_at, updated_at, deleted_at`,
    params
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    ...row,
    options: row.options ? JSON.parse(row.options) : undefined,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
  };
}

/**
 * Delete a question (soft delete)
 */
export async function deleteQuestion(
  pool: Pool,
  tenantId: string,
  questionId: string
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE questions_bank
     SET deleted_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [questionId, tenantId]
  );

  return result.rowCount > 0;
}

/**
 * Get question statistics
 */
export async function getQuestionStatistics(
  pool: Pool,
  tenantId: string
): Promise<{
  total: number;
  byDifficulty: Record<string, number>;
  byType: Record<string, number>;
  bySubject: Record<string, number>;
}> {
  const result = await pool.query(
    `SELECT 
       COUNT(*) as total,
       difficulty,
       type,
       subject
     FROM questions_bank
     WHERE tenant_id = $1 AND deleted_at IS NULL
     GROUP BY difficulty, type, subject`,
    [tenantId]
  );

  const stats = {
    total: 0,
    byDifficulty: {} as Record<string, number>,
    byType: {} as Record<string, number>,
    bySubject: {} as Record<string, number>,
  };

  for (const row of result.rows) {
    stats.total += parseInt(row.total, 10);
    stats.byDifficulty[row.difficulty] = (stats.byDifficulty[row.difficulty] || 0) + parseInt(row.total, 10);
    stats.byType[row.type] = (stats.byType[row.type] || 0) + parseInt(row.total, 10);
    stats.bySubject[row.subject] = (stats.bySubject[row.subject] || 0) + parseInt(row.total, 10);
  }

  return stats;
}

/**
 * Check for duplicate questions
 */
export async function checkDuplicateQuestion(
  pool: Pool,
  tenantId: string,
  text: string,
  correctAnswer: string
): Promise<Question | null> {
  const result = await pool.query(
    `SELECT id, tenant_id, text, type, options, correct_answer, difficulty, subject, tags, created_by, created_at, updated_at, deleted_at
     FROM questions_bank
     WHERE tenant_id = $1 AND text = $2 AND correct_answer = $3 AND deleted_at IS NULL
     LIMIT 1`,
    [tenantId, text, correctAnswer]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    ...row,
    options: row.options ? JSON.parse(row.options) : undefined,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
  };
}

/**
 * Validate question input
 */
function validateQuestionInput(input: CreateQuestionInput): void {
  const errors: Record<string, string> = {};

  if (!input.text || input.text.trim().length === 0) {
    errors.text = 'Question text is required';
  }

  if (!input.type || !['objective', 'truefalse', 'essay'].includes(input.type)) {
    errors.type = 'Invalid question type';
  }

  if (input.type !== 'essay' && (!input.options || input.options.length === 0)) {
    errors.options = 'Options are required for objective and true/false questions';
  }

  if (!input.correct_answer || input.correct_answer.trim().length === 0) {
    errors.correct_answer = 'Correct answer is required';
  }

  if (!input.difficulty || !['Easy', 'Medium', 'Hard'].includes(input.difficulty)) {
    errors.difficulty = 'Invalid difficulty level';
  }

  if (!input.subject || input.subject.trim().length === 0) {
    errors.subject = 'Subject is required';
  }

  if (Object.keys(errors).length > 0) {
    throw new Error(JSON.stringify(errors));
  }
}
