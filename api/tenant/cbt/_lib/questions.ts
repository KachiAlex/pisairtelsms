/**
 * Question Bank Service
 * Business logic for question management
 */

import { queryAll, queryOne, query, transaction } from './db.js';
import {
  Question,
  CreateQuestionInput,
  UpdateQuestionInput,
  QuestionFilter,
  ApiResponse,
  PaginatedResponse,
} from './types.js';
import { syncQuestionTags } from './tags.js';

/**
 * Parse a question row from the database, converting JSON strings to objects
 */
function parseQuestionRow(row: any): Question {
  return {
    ...row,
    options: typeof row.options === 'string' ? JSON.parse(row.options || '[]') : (row.options || []),
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : (row.tags || []),
  };
}

/**
 * Normalize incoming tag arrays by trimming whitespace, removing empties, and deduplicating.
 */
export function normalizeTags(tags?: string[] | null): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  const cleaned = tags
    .map((tag) => (typeof tag === 'string' ? tag.trim().replace(/\s+/g, ' ') : ''))
    .filter((tag) => tag.length > 0 && tag.length <= 60);

  return Array.from(new Set(cleaned));
}

/**
 * Get unique tags per subject (and globally) for a tenant
 */
export async function getQuestionTagsSummary(tenantId: string): Promise<{
  allTags: string[];
  subjects: Array<{ subject: string; tags: string[] }>;
}> {
  const rows = await queryAll<{ subject: string; tag: string }>(
    `SELECT subject, jsonb_array_elements_text(tags::jsonb) AS tag
     FROM questions_bank
     WHERE tenant_id = $1 AND deleted_at IS NULL AND tags IS NOT NULL AND jsonb_array_length(tags::jsonb) > 0`,
    [tenantId]
  );

  const subjectMap = new Map<string, Set<string>>();
  const allTags = new Set<string>();

  for (const row of rows) {
    if (!row.tag) continue;
    allTags.add(row.tag);
    if (!subjectMap.has(row.subject)) {
      subjectMap.set(row.subject, new Set());
    }
    subjectMap.get(row.subject)!.add(row.tag);
  }

  return {
    allTags: Array.from(allTags).sort((a, b) => a.localeCompare(b)),
    subjects: Array.from(subjectMap.entries()).map(([subject, tagSet]) => ({
      subject,
      tags: Array.from(tagSet).sort((a, b) => a.localeCompare(b)),
    })),
  };
}

/**
 * Get all questions with filtering and pagination
 */
export async function getQuestions(
  tenantId: string,
  filter: QuestionFilter
): Promise<PaginatedResponse<Question>> {
  const page = filter.page || 1;
  const limit = filter.limit || 20;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE tenant_id = $1 AND deleted_at IS NULL';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (filter.subject) {
    whereClause += ` AND subject = $${paramIndex}`;
    params.push(filter.subject);
    paramIndex++;
  }

  if (filter.difficulty) {
    whereClause += ` AND difficulty = $${paramIndex}`;
    params.push(filter.difficulty);
    paramIndex++;
  }

  if (filter.type) {
    whereClause += ` AND type = $${paramIndex}`;
    params.push(filter.type);
    paramIndex++;
  }

  if (filter.searchText) {
    whereClause += ` AND text ILIKE $${paramIndex}`;
    params.push(`%${filter.searchText}%`);
    paramIndex++;
  }

  if (filter.tag) {
    whereClause += ` AND (tags IS NOT NULL AND tags::jsonb @> $${paramIndex}::jsonb)`;
    params.push(JSON.stringify([filter.tag]));
    paramIndex++;
  }

  // Get total count
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM questions_bank ${whereClause}`,
    params
  );
  const total = parseInt(countResult?.count || '0');

  // Get paginated results
  const questions = await queryAll<any>(
    `SELECT * FROM questions_bank ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  // Parse JSON fields
  const parsedQuestions = questions.map(q => parseQuestionRow(q));

  return {
    success: true,
    data: parsedQuestions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get single question by ID
 */
export async function getQuestion(
  tenantId: string,
  questionId: string
): Promise<Question | null> {
  const row = await queryOne<any>(
    'SELECT * FROM questions_bank WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [questionId, tenantId]
  );
  return row ? parseQuestionRow(row) : null;
}

/**
 * Create new question
 */
export async function createQuestion(
  tenantId: string,
  userId: string,
  input: CreateQuestionInput
): Promise<Question> {
  // Validate input
  validateQuestionInput(input);

  const normalizedTags = normalizeTags(input.tags);

  const row = await queryOne<any>(
    `INSERT INTO questions_bank (
      tenant_id, text, type, options, correct_answer, 
      difficulty, subject, tags, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      tenantId,
      input.text,
      input.type,
      JSON.stringify(input.options || []),
      input.correctAnswer,
      input.difficulty,
      input.subject,
      JSON.stringify(normalizedTags),
      userId,
    ]
  );

  if (!row) {
    throw new Error('Failed to create question');
  }

  const question = parseQuestionRow(row);

  // Sync tags to catalog
  if (normalizedTags.length > 0) {
    await syncQuestionTags(tenantId, question.id, normalizedTags, {
      subject: input.subject,
      createdBy: userId,
    });
  }

  return question;
}

/**
 * Update question
 */
export async function updateQuestion(
  tenantId: string,
  questionId: string,
  input: UpdateQuestionInput
): Promise<Question> {
  // Get existing question
  const existing = await getQuestion(tenantId, questionId);
  if (!existing) {
    throw new Error('Question not found');
  }

  // Validate input
  if (input.text || input.type || input.options || input.correctAnswer) {
    validateQuestionInput({
      text: input.text || existing.text,
      type: input.type || existing.type,
      options: input.options || existing.options,
      correctAnswer: input.correctAnswer || existing.correctAnswer,
      difficulty: input.difficulty || existing.difficulty,
      subject: input.subject || existing.subject,
    });
  }

  const normalizedTags = input.tags ? normalizeTags(input.tags) : null;

  const row = await queryOne<any>(
    `UPDATE questions_bank SET
      text = COALESCE($1, text),
      type = COALESCE($2, type),
      options = COALESCE($3, options),
      correct_answer = COALESCE($4, correct_answer),
      difficulty = COALESCE($5, difficulty),
      subject = COALESCE($6, subject),
      tags = COALESCE($7, tags),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $8 AND tenant_id = $9 AND deleted_at IS NULL
    RETURNING *`,
    [
      input.text,
      input.type,
      input.options ? JSON.stringify(input.options) : null,
      input.correctAnswer,
      input.difficulty,
      input.subject,
      normalizedTags ? JSON.stringify(normalizedTags) : null,
      questionId,
      tenantId,
    ]
  );

  if (!row) {
    throw new Error('Failed to update question');
  }

  const question = parseQuestionRow(row);

  // Sync tags to catalog if tags were provided
  if (input.tags !== undefined) {
    const tagsToSync = normalizedTags || [];
    await syncQuestionTags(tenantId, question.id, tagsToSync, {
      subject: input.subject || existing.subject,
    });
  }

  return question;
}

/**
 * Delete question (soft delete)
 */
export async function deleteQuestion(
  tenantId: string,
  questionId: string
): Promise<void> {
  const result = await query(
    `UPDATE questions_bank SET deleted_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [questionId, tenantId]
  );

  if (result.rowCount === 0) {
    throw new Error('Question not found');
  }
}

/**
 * Bulk add tags to multiple questions.
 */
export async function addTagsToQuestions(
  tenantId: string,
  questionIds: string[],
  tags: string[]
): Promise<number> {
  const normalizedTags = normalizeTags(tags);
  if (normalizedTags.length === 0 || !Array.isArray(questionIds) || questionIds.length === 0) {
    return 0;
  }

  const ids = Array.from(new Set(questionIds.filter(Boolean)));
  if (ids.length === 0) {
    return 0;
  }

  const rows = await queryAll<{ id: string; tags: any }>(
    `SELECT id, tags FROM questions_bank
     WHERE tenant_id = $1 AND deleted_at IS NULL AND id = ANY($2::uuid[])`,
    [tenantId, ids]
  );

  let updatedCount = 0;

  for (const row of rows) {
    const existing = Array.isArray(row.tags)
      ? row.tags
      : typeof row.tags === 'string'
        ? JSON.parse(row.tags || '[]')
        : [];
    const merged = normalizeTags([...(existing || []), ...normalizedTags]);
    await query(
      `UPDATE questions_bank SET tags = $1, updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $2 AND id = $3`,
      [JSON.stringify(merged), tenantId, row.id]
    );
    updatedCount++;
  }

  return updatedCount;
}

/**
 * Check for duplicate questions
 */
export async function checkDuplicate(
  tenantId: string,
  text: string,
  excludeId?: string
): Promise<Question | null> {
  let sql = 'SELECT * FROM questions_bank WHERE tenant_id = $1 AND text = $2 AND deleted_at IS NULL';
  const params: any[] = [tenantId, text];

  if (excludeId) {
    sql += ' AND id != $3';
    params.push(excludeId);
  }

  const row = await queryOne<any>(sql, params);
  return row ? parseQuestionRow(row) : null;
}

/**
 * Get question statistics
 */
export async function getQuestionStats(tenantId: string): Promise<{
  total: number;
  byDifficulty: Record<string, number>;
  byType: Record<string, number>;
  bySubject: Record<string, number>;
}> {
  const total = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM questions_bank WHERE tenant_id = $1 AND deleted_at IS NULL',
    [tenantId]
  );

  const byDifficulty = await queryAll<{ difficulty: string; count: string }>(
    'SELECT difficulty, COUNT(*) as count FROM questions_bank WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY difficulty',
    [tenantId]
  );

  const byType = await queryAll<{ type: string; count: string }>(
    'SELECT type, COUNT(*) as count FROM questions_bank WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY type',
    [tenantId]
  );

  const bySubject = await queryAll<{ subject: string; count: string }>(
    'SELECT subject, COUNT(*) as count FROM questions_bank WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY subject',
    [tenantId]
  );

  return {
    total: parseInt(total?.count || '0'),
    byDifficulty: Object.fromEntries(byDifficulty.map(d => [d.difficulty, parseInt(d.count)])),
    byType: Object.fromEntries(byType.map(t => [t.type, parseInt(t.count)])),
    bySubject: Object.fromEntries(bySubject.map(s => [s.subject, parseInt(s.count)])),
  };
}



/**
 * Validate question input
 */
function validateQuestionInput(input: any): void {
  if (!input.text || input.text.trim().length === 0) {
    throw new Error('Question text is required');
  }

  if (input.text.length > 1000) {
    throw new Error('Question text must be less than 1000 characters');
  }

  if (!['objective', 'truefalse', 'essay'].includes(input.type)) {
    throw new Error('Invalid question type');
  }

  if (!['Easy', 'Medium', 'Hard'].includes(input.difficulty)) {
    throw new Error('Invalid difficulty level');
  }

  if (!input.subject || input.subject.trim().length === 0) {
    throw new Error('Subject is required');
  }

  if (input.subject.length > 100) {
    throw new Error('Subject must be less than 100 characters');
  }

  // Validate options for objective and truefalse
  if (['objective', 'truefalse'].includes(input.type)) {
    if (!input.options || !Array.isArray(input.options) || input.options.length < 2) {
      throw new Error('At least 2 options are required');
    }

    if (input.options.length > 4) {
      throw new Error('Maximum 4 options allowed');
    }

    if (!input.correctAnswer) {
      throw new Error('Correct answer is required');
    }
  }
}
