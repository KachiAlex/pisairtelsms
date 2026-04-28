/**
 * Exam Management Service
 * Handles all exam-related database operations
 */

import { Pool } from 'pg';

export type ExamStatus = 'Draft' | 'Scheduled' | 'Ongoing' | 'Completed' | 'Cancelled';

export interface Exam {
  id: string;
  tenant_id: string;
  title: string;
  subject: string;
  class: string;
  duration: number; // in minutes
  pass_mark: number;
  total_marks: number;
  status: ExamStatus;
  scheduled_date?: Date;
  scheduled_time?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

export interface CreateExamInput {
  title: string;
  subject: string;
  class: string;
  duration: number;
  pass_mark: number;
  total_marks: number;
  scheduled_date?: string;
  scheduled_time?: string;
}

export interface UpdateExamInput {
  title?: string;
  subject?: string;
  class?: string;
  duration?: number;
  pass_mark?: number;
  total_marks?: number;
  scheduled_date?: string;
  scheduled_time?: string;
  status?: ExamStatus;
}

export interface ExamFilter {
  subject?: string;
  class?: string;
  status?: ExamStatus;
  searchText?: string;
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
 * Get all exams with optional filtering and pagination
 */
export async function getExams(
  pool: Pool,
  tenantId: string,
  filters?: ExamFilter,
  pagination?: PaginationParams
): Promise<PaginatedResponse<Exam>> {
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 20;
  const offset = (page - 1) * limit;

  let query = `
    SELECT id, tenant_id, title, subject, class, duration, pass_mark, total_marks, 
           status, scheduled_date, scheduled_time, created_by, created_at, updated_at, deleted_at
    FROM exams
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

  if (filters?.class) {
    query += ` AND class = $${paramIndex}`;
    params.push(filters.class);
    paramIndex++;
  }

  if (filters?.status) {
    query += ` AND status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters?.searchText) {
    query += ` AND title ILIKE $${paramIndex}`;
    params.push(`%${filters.searchText}%`);
    paramIndex++;
  }

  // Get total count
  const countQuery = query.replace(
    'SELECT id, tenant_id, title, subject, class, duration, pass_mark, total_marks, status, scheduled_date, scheduled_time, created_by, created_at, updated_at, deleted_at',
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
    data: result.rows,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single exam by ID
 */
export async function getExamById(
  pool: Pool,
  tenantId: string,
  examId: string
): Promise<Exam | null> {
  const result = await pool.query(
    `SELECT id, tenant_id, title, subject, class, duration, pass_mark, total_marks, 
            status, scheduled_date, scheduled_time, created_by, created_at, updated_at, deleted_at
     FROM exams
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [examId, tenantId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Create a new exam
 */
export async function createExam(
  pool: Pool,
  tenantId: string,
  userId: string,
  input: CreateExamInput
): Promise<Exam> {
  // Validate input
  validateExamInput(input);

  const result = await pool.query(
    `INSERT INTO exams (tenant_id, title, subject, class, duration, pass_mark, total_marks, 
                        status, scheduled_date, scheduled_time, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, tenant_id, title, subject, class, duration, pass_mark, total_marks, 
               status, scheduled_date, scheduled_time, created_by, created_at, updated_at, deleted_at`,
    [
      tenantId,
      input.title,
      input.subject,
      input.class,
      input.duration,
      input.pass_mark,
      input.total_marks,
      'Draft',
      input.scheduled_date || null,
      input.scheduled_time || null,
      userId,
    ]
  );

  return result.rows[0];
}

/**
 * Update an exam
 */
export async function updateExam(
  pool: Pool,
  tenantId: string,
  examId: string,
  input: UpdateExamInput
): Promise<Exam | null> {
  // Check if exam exists
  const existing = await getExamById(pool, tenantId, examId);
  if (!existing) {
    return null;
  }

  // Prevent editing completed exams
  if (existing.status === 'Completed' || existing.status === 'Ongoing') {
    throw new Error(`Cannot edit exam with status: ${existing.status}`);
  }

  // Validate input if provided
  if (input.duration || input.pass_mark || input.total_marks) {
    validateExamInput({
      title: input.title || existing.title,
      subject: input.subject || existing.subject,
      class: input.class || existing.class,
      duration: input.duration || existing.duration,
      pass_mark: input.pass_mark || existing.pass_mark,
      total_marks: input.total_marks || existing.total_marks,
      scheduled_date: input.scheduled_date || existing.scheduled_date?.toISOString().split('T')[0],
      scheduled_time: input.scheduled_time || existing.scheduled_time,
    });
  }

  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) {
    updates.push(`title = $${paramIndex}`);
    params.push(input.title);
    paramIndex++;
  }

  if (input.subject !== undefined) {
    updates.push(`subject = $${paramIndex}`);
    params.push(input.subject);
    paramIndex++;
  }

  if (input.class !== undefined) {
    updates.push(`class = $${paramIndex}`);
    params.push(input.class);
    paramIndex++;
  }

  if (input.duration !== undefined) {
    updates.push(`duration = $${paramIndex}`);
    params.push(input.duration);
    paramIndex++;
  }

  if (input.pass_mark !== undefined) {
    updates.push(`pass_mark = $${paramIndex}`);
    params.push(input.pass_mark);
    paramIndex++;
  }

  if (input.total_marks !== undefined) {
    updates.push(`total_marks = $${paramIndex}`);
    params.push(input.total_marks);
    paramIndex++;
  }

  if (input.status !== undefined) {
    updates.push(`status = $${paramIndex}`);
    params.push(input.status);
    paramIndex++;
  }

  if (input.scheduled_date !== undefined) {
    updates.push(`scheduled_date = $${paramIndex}`);
    params.push(input.scheduled_date || null);
    paramIndex++;
  }

  if (input.scheduled_time !== undefined) {
    updates.push(`scheduled_time = $${paramIndex}`);
    params.push(input.scheduled_time || null);
    paramIndex++;
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  params.push(examId, tenantId);

  const result = await pool.query(
    `UPDATE exams
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} AND deleted_at IS NULL
     RETURNING id, tenant_id, title, subject, class, duration, pass_mark, total_marks, 
               status, scheduled_date, scheduled_time, created_by, created_at, updated_at, deleted_at`,
    params
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Delete an exam (soft delete)
 */
export async function deleteExam(
  pool: Pool,
  tenantId: string,
  examId: string
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE exams
     SET deleted_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [examId, tenantId]
  );

  return result.rowCount > 0;
}

/**
 * Schedule an exam (change status to Scheduled)
 */
export async function scheduleExam(
  pool: Pool,
  tenantId: string,
  examId: string,
  scheduledDate: string,
  scheduledTime: string
): Promise<Exam | null> {
  // Validate date and time
  const examDate = new Date(`${scheduledDate}T${scheduledTime}`);
  if (examDate <= new Date()) {
    throw new Error('Scheduled date and time must be in the future');
  }

  // Check if exam has questions
  const questionResult = await pool.query(
    `SELECT COUNT(*) as count FROM exam_questions WHERE exam_id = $1`,
    [examId]
  );

  const questionCount = parseInt(questionResult.rows[0].count, 10);
  if (questionCount === 0) {
    throw new Error('Exam must have at least one question before scheduling');
  }

  return updateExam(pool, tenantId, examId, {
    status: 'Scheduled',
    scheduled_date: scheduledDate,
    scheduled_time: scheduledTime,
  });
}

/**
 * Get exam statistics
 */
export async function getExamStatistics(
  pool: Pool,
  tenantId: string
): Promise<{
  total: number;
  byStatus: Record<string, number>;
  bySubject: Record<string, number>;
  byClass: Record<string, number>;
}> {
  const result = await pool.query(
    `SELECT 
       COUNT(*) as total,
       status,
       subject,
       class
     FROM exams
     WHERE tenant_id = $1 AND deleted_at IS NULL
     GROUP BY status, subject, class`,
    [tenantId]
  );

  const stats = {
    total: 0,
    byStatus: {} as Record<string, number>,
    bySubject: {} as Record<string, number>,
    byClass: {} as Record<string, number>,
  };

  for (const row of result.rows) {
    const count = parseInt(row.total, 10);
    stats.total += count;
    stats.byStatus[row.status] = (stats.byStatus[row.status] || 0) + count;
    stats.bySubject[row.subject] = (stats.bySubject[row.subject] || 0) + count;
    stats.byClass[row.class] = (stats.byClass[row.class] || 0) + count;
  }

  return stats;
}

/**
 * Validate exam input
 */
function validateExamInput(input: CreateExamInput): void {
  const errors: Record<string, string> = {};

  if (!input.title || input.title.trim().length === 0) {
    errors.title = 'Exam title is required';
  }

  if (!input.subject || input.subject.trim().length === 0) {
    errors.subject = 'Subject is required';
  }

  if (!input.class || input.class.trim().length === 0) {
    errors.class = 'Class is required';
  }

  if (!input.duration || input.duration < 15 || input.duration > 480) {
    errors.duration = 'Duration must be between 15 and 480 minutes';
  }

  if (input.pass_mark === undefined || input.pass_mark < 0 || input.pass_mark > 100) {
    errors.pass_mark = 'Pass mark must be between 0 and 100';
  }

  if (!input.total_marks || input.total_marks <= 0) {
    errors.total_marks = 'Total marks must be greater than 0';
  }

  if (input.total_marks <= input.pass_mark) {
    errors.total_marks = 'Total marks must be greater than pass mark';
  }

  if (input.scheduled_date) {
    const examDate = new Date(`${input.scheduled_date}T${input.scheduled_time || '00:00'}`);
    if (examDate <= new Date()) {
      errors.scheduled_date = 'Scheduled date and time must be in the future';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new Error(JSON.stringify(errors));
  }
}
