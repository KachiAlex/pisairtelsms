/**
 * Exam Management Service
 * Business logic for exam lifecycle management
 */

import { queryAll, queryOne, query, transaction } from './db.js';
import {
  Exam,
  CreateExamInput,
  UpdateExamInput,
  ExamFilter,
  ExamQuestion,
} from './types.js';

/**
 * Get all exams with filtering and pagination
 */
export async function getExams(
  tenantId: string,
  filter: ExamFilter
): Promise<{
  success: boolean;
  data: Exam[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const page = filter.page || 1;
  const limit = filter.limit || 20;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE tenant_id = $1 AND deleted_at IS NULL';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (filter.status) {
    whereClause += ` AND status = $${paramIndex}`;
    params.push(filter.status);
    paramIndex++;
  }

  if (filter.class) {
    whereClause += ` AND class = $${paramIndex}`;
    params.push(filter.class);
    paramIndex++;
  }

  if (filter.subject) {
    whereClause += ` AND subject = $${paramIndex}`;
    params.push(filter.subject);
    paramIndex++;
  }

  // Get total count
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM exams ${whereClause}`,
    params
  );
  const total = parseInt(countResult?.count || '0');

  // Get paginated results
  const exams = await queryAll<Exam>(
    `SELECT * FROM exams ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  return {
    success: true,
    data: exams,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get single exam by ID
 */
export async function getExam(
  tenantId: string,
  examId: string
): Promise<Exam | null> {
  return queryOne<Exam>(
    'SELECT * FROM exams WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [examId, tenantId]
  );
}

/**
 * Get exam with questions
 */
export async function getExamWithQuestions(
  tenantId: string,
  examId: string
): Promise<(Exam & { questions: ExamQuestion[] }) | null> {
  const exam = await getExam(tenantId, examId);
  if (!exam) {
    return null;
  }

  const questions = await queryAll<ExamQuestion>(
    'SELECT * FROM exam_questions WHERE exam_id = $1 ORDER BY question_order ASC',
    [examId]
  );

  return {
    ...exam,
    questions,
  };
}

/**
 * Create new exam
 */
export async function createExam(
  tenantId: string,
  userId: string,
  input: CreateExamInput
): Promise<Exam> {
  // Validate input
  validateExamInput(input);

  // Validate questions exist
  if (!input.questionIds || input.questionIds.length === 0) {
    throw new Error('At least one question is required');
  }

  const exam = await queryOne<Exam>(
    `INSERT INTO exams (
      tenant_id, title, subject, class, description, duration,
      pass_mark, total_marks, status, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      tenantId,
      input.title,
      input.subject,
      input.class,
      input.description || null,
      input.duration,
      input.passMark,
      input.totalMarks,
      'Draft',
      userId,
    ]
  );

  if (!exam) {
    throw new Error('Failed to create exam');
  }

  // Add questions to exam
  for (let i = 0; i < input.questionIds.length; i++) {
    await query(
      `INSERT INTO exam_questions (exam_id, question_id, question_order, marks)
       VALUES ($1, $2, $3, $4)`,
      [exam.id, input.questionIds[i], i + 1, input.totalMarks / input.questionIds.length]
    );
  }

  return exam;
}

/**
 * Update exam
 */
export async function updateExam(
  tenantId: string,
  examId: string,
  input: UpdateExamInput
): Promise<Exam> {
  // Get existing exam
  const existing = await getExam(tenantId, examId);
  if (!existing) {
    throw new Error('Exam not found');
  }

  // Validate input if provided
  if (input.title || input.subject || input.class || input.duration || input.passMark || input.totalMarks) {
    validateExamInput({
      title: input.title || existing.title,
      subject: input.subject || existing.subject,
      class: input.class || existing.class,
      duration: input.duration || existing.duration,
      passMark: input.passMark || existing.passMark,
      totalMarks: input.totalMarks || existing.totalMarks,
      description: input.description || existing.description,
      questionIds: [],
    });
  }

  const updated = await queryOne<Exam>(
    `UPDATE exams SET
      title = COALESCE($1, title),
      subject = COALESCE($2, subject),
      class = COALESCE($3, class),
      description = COALESCE($4, description),
      duration = COALESCE($5, duration),
      pass_mark = COALESCE($6, pass_mark),
      total_marks = COALESCE($7, total_marks),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $8 AND tenant_id = $9 AND deleted_at IS NULL
    RETURNING *`,
    [
      input.title,
      input.subject,
      input.class,
      input.description,
      input.duration,
      input.passMark,
      input.totalMarks,
      examId,
      tenantId,
    ]
  );

  if (!updated) {
    throw new Error('Failed to update exam');
  }

  return updated;
}

/**
 * Delete exam (soft delete)
 */
export async function deleteExam(
  tenantId: string,
  examId: string
): Promise<void> {
  const result = await query(
    `UPDATE exams SET deleted_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [examId, tenantId]
  );

  if (result.rowCount === 0) {
    throw new Error('Exam not found');
  }
}

/**
 * Schedule exam
 */
export async function scheduleExam(
  tenantId: string,
  examId: string,
  scheduledDate: string,
  scheduledTime: string
): Promise<Exam> {
  const exam = await getExam(tenantId, examId);
  if (!exam) {
    throw new Error('Exam not found');
  }

  // Validate date and time format
  if (!isValidDate(scheduledDate)) {
    throw new Error('Invalid scheduled date format (YYYY-MM-DD)');
  }

  if (!isValidTime(scheduledTime)) {
    throw new Error('Invalid scheduled time format (HH:MM)');
  }

  const updated = await queryOne<Exam>(
    `UPDATE exams SET
      status = 'Scheduled',
      scheduled_date = $1,
      scheduled_time = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $3 AND tenant_id = $4 AND deleted_at IS NULL
    RETURNING *`,
    [scheduledDate, scheduledTime, examId, tenantId]
  );

  if (!updated) {
    throw new Error('Failed to schedule exam');
  }

  return updated;
}

/**
 * Publish exam (set to Scheduled without requiring a future date)
 */
export async function publishExam(
  tenantId: string,
  examId: string
): Promise<Exam> {
  const exam = await getExam(tenantId, examId);
  if (!exam) {
    throw new Error('Exam not found');
  }

  if (exam.status !== 'Draft') {
    throw new Error(`Exam is already ${exam.status}`);
  }

  const updated = await queryOne<Exam>(
    `UPDATE exams SET
      status = 'Scheduled',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
    RETURNING *`,
    [examId, tenantId]
  );

  if (!updated) {
    throw new Error('Failed to publish exam');
  }

  return updated;
}

/**
 * Start exam
 */
export async function startExam(
  tenantId: string,
  examId: string
): Promise<Exam> {
  const exam = await getExam(tenantId, examId);
  if (!exam) {
    throw new Error('Exam not found');
  }

  if (exam.status === 'Completed') {
    throw new Error('Cannot start a completed exam');
  }

  const updated = await queryOne<Exam>(
    `UPDATE exams SET
      status = 'Ongoing',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
    RETURNING *`,
    [examId, tenantId]
  );

  if (!updated) {
    throw new Error('Failed to start exam');
  }

  return updated;
}

/**
 * End exam
 */
export async function endExam(
  tenantId: string,
  examId: string
): Promise<Exam> {
  const exam = await getExam(tenantId, examId);
  if (!exam) {
    throw new Error('Exam not found');
  }

  const updated = await queryOne<Exam>(
    `UPDATE exams SET
      status = 'Completed',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
    RETURNING *`,
    [examId, tenantId]
  );

  if (!updated) {
    throw new Error('Failed to end exam');
  }

  return updated;
}

/**
 * Get exam statistics
 */
export async function getExamStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byClass: Record<string, number>;
  bySubject: Record<string, number>;
}> {
  const total = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM exams WHERE tenant_id = $1 AND deleted_at IS NULL',
    [tenantId]
  );

  const byStatus = await queryAll<{ status: string; count: string }>(
    'SELECT status, COUNT(*) as count FROM exams WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status',
    [tenantId]
  );

  const byClass = await queryAll<{ class: string; count: string }>(
    'SELECT class, COUNT(*) as count FROM exams WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY class',
    [tenantId]
  );

  const bySubject = await queryAll<{ subject: string; count: string }>(
    'SELECT subject, COUNT(*) as count FROM exams WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY subject',
    [tenantId]
  );

  return {
    total: parseInt(total?.count || '0'),
    byStatus: Object.fromEntries(byStatus.map(s => [s.status, parseInt(s.count)])),
    byClass: Object.fromEntries(byClass.map(c => [c.class, parseInt(c.count)])),
    bySubject: Object.fromEntries(bySubject.map(s => [s.subject, parseInt(s.count)])),
  };
}

/**
 * Validate exam input
 */
function validateExamInput(input: any): void {
  if (!input.title || input.title.trim().length === 0) {
    throw new Error('Exam title is required');
  }

  if (input.title.length > 255) {
    throw new Error('Exam title must be less than 255 characters');
  }

  if (!input.subject || input.subject.trim().length === 0) {
    throw new Error('Subject is required');
  }

  if (input.subject.length > 100) {
    throw new Error('Subject must be less than 100 characters');
  }

  if (!input.class || input.class.trim().length === 0) {
    throw new Error('Class is required');
  }

  if (input.class.length > 50) {
    throw new Error('Class must be less than 50 characters');
  }

  if (!input.duration || input.duration < 15 || input.duration > 480) {
    throw new Error('Duration must be between 15 and 480 minutes');
  }

  if (input.passMark === undefined || input.passMark === null) {
    throw new Error('Pass mark is required');
  }

  if (input.passMark < 0 || input.passMark > 100) {
    throw new Error('Pass mark must be between 0 and 100');
  }

  if (!input.totalMarks || input.totalMarks <= 0) {
    throw new Error('Total marks must be greater than 0');
  }

  if (input.totalMarks < input.passMark) {
    throw new Error('Total marks must be greater than or equal to pass mark');
  }

  if (input.description && input.description.length > 1000) {
    throw new Error('Description must be less than 1000 characters');
  }
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validate time format (HH:MM)
 */
function isValidTime(timeString: string): boolean {
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(timeString);
}
