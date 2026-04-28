/**
 * Exam Scheduling Service
 * Handles exam scheduling operations and status transitions
 * Property 10: Exam Scheduling Updates Status
 */

import { Pool } from 'pg';
import { validateExamScheduling } from './exam-validation';

export interface ScheduleExamInput {
  scheduled_date: string; // YYYY-MM-DD format
  scheduled_time: string; // HH:MM format
}

export interface ScheduleResult {
  success: boolean;
  examId: string;
  previousStatus: string;
  newStatus: string;
  scheduledDate: string;
  scheduledTime: string;
  message: string;
}

/**
 * Schedule an exam - updates status to "Scheduled" and sets scheduled date/time
 * Validates that exam has at least one question before scheduling
 */
export async function scheduleExam(
  pool: Pool,
  tenantId: string,
  examId: string,
  input: ScheduleExamInput
): Promise<ScheduleResult> {
  // First, do quick synchronous validation of date format and future date
  // This prevents unnecessary database queries for invalid input
  if (!input.scheduled_date || !input.scheduled_time) {
    throw new Error('Scheduled date and time are required');
  }

  const examDateTime = new Date(`${input.scheduled_date}T${input.scheduled_time}`);
  if (isNaN(examDateTime.getTime())) {
    throw new Error('Invalid scheduled date or time format');
  }

  if (examDateTime <= new Date()) {
    throw new Error('Scheduled date and time must be in the future');
  }

  // Now validate with database checks
  const validation = await validateExamScheduling(
    pool,
    tenantId,
    examId,
    input.scheduled_date,
    input.scheduled_time
  );

  if (!validation.isValid) {
    const errorMessages = validation.errors.map((e) => e.message).join('; ');
    throw new Error(`Scheduling validation failed: ${errorMessages}`);
  }

  // Get current exam to verify status
  const examResult = await pool.query(
    `SELECT id, status, scheduled_date, scheduled_time FROM exams 
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [examId, tenantId]
  );

  if (examResult.rows.length === 0) {
    throw new Error('Exam not found');
  }

  const exam = examResult.rows[0];
  const previousStatus = exam.status;

  // Prevent scheduling if already scheduled or ongoing
  if (previousStatus === 'Scheduled' || previousStatus === 'Ongoing' || previousStatus === 'Completed') {
    throw new Error(`Cannot schedule exam with status: ${previousStatus}`);
  }

  // Update exam status to Scheduled
  const updateResult = await pool.query(
    `UPDATE exams 
     SET status = $1, scheduled_date = $2, scheduled_time = $3, updated_at = CURRENT_TIMESTAMP
     WHERE id = $4 AND tenant_id = $5 AND deleted_at IS NULL
     RETURNING id, status, scheduled_date, scheduled_time`,
    ['Scheduled', input.scheduled_date, input.scheduled_time, examId, tenantId]
  );

  if (updateResult.rows.length === 0) {
    throw new Error('Failed to update exam status');
  }

  const updatedExam = updateResult.rows[0];

  return {
    success: true,
    examId,
    previousStatus,
    newStatus: updatedExam.status,
    scheduledDate: updatedExam.scheduled_date,
    scheduledTime: updatedExam.scheduled_time,
    message: `Exam scheduled successfully. Status changed from ${previousStatus} to Scheduled.`,
  };
}

/**
 * Make exam available to students
 * Verifies exam is in Scheduled status
 */
export async function makeExamAvailable(
  pool: Pool,
  tenantId: string,
  examId: string
): Promise<boolean> {
  // Verify exam exists and is scheduled
  const examResult = await pool.query(
    `SELECT id, status FROM exams 
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [examId, tenantId]
  );

  if (examResult.rows.length === 0) {
    throw new Error('Exam not found');
  }

  const exam = examResult.rows[0];

  if (exam.status !== 'Scheduled') {
    throw new Error(`Exam must be in Scheduled status to make available. Current status: ${exam.status}`);
  }

  // Exam is already available when status is Scheduled
  // This function serves as a verification point
  return true;
}

/**
 * Update exam status to Ongoing
 * Called when exam start time is reached
 */
export async function startExam(
  pool: Pool,
  tenantId: string,
  examId: string
): Promise<boolean> {
  // Verify exam exists and is scheduled
  const examResult = await pool.query(
    `SELECT id, status, scheduled_date, scheduled_time FROM exams 
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [examId, tenantId]
  );

  if (examResult.rows.length === 0) {
    throw new Error('Exam not found');
  }

  const exam = examResult.rows[0];

  if (exam.status !== 'Scheduled') {
    throw new Error(`Exam must be in Scheduled status to start. Current status: ${exam.status}`);
  }

  // Verify scheduled time has passed
  const scheduledDateTime = new Date(`${exam.scheduled_date}T${exam.scheduled_time}`);
  if (scheduledDateTime > new Date()) {
    throw new Error('Exam start time has not been reached yet');
  }

  // Update status to Ongoing
  const updateResult = await pool.query(
    `UPDATE exams 
     SET status = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL`,
    ['Ongoing', examId, tenantId]
  );

  return updateResult.rowCount > 0;
}

/**
 * Update exam status to Completed
 * Called when exam end time is reached or manually completed
 */
export async function completeExam(
  pool: Pool,
  tenantId: string,
  examId: string
): Promise<boolean> {
  // Verify exam exists and is ongoing
  const examResult = await pool.query(
    `SELECT id, status FROM exams 
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [examId, tenantId]
  );

  if (examResult.rows.length === 0) {
    throw new Error('Exam not found');
  }

  const exam = examResult.rows[0];

  if (exam.status !== 'Ongoing') {
    throw new Error(`Exam must be in Ongoing status to complete. Current status: ${exam.status}`);
  }

  // Update status to Completed
  const updateResult = await pool.query(
    `UPDATE exams 
     SET status = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL`,
    ['Completed', examId, tenantId]
  );

  return updateResult.rowCount > 0;
}

/**
 * Get exam scheduling details
 */
export async function getExamSchedulingDetails(
  pool: Pool,
  tenantId: string,
  examId: string
): Promise<{
  examId: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  isAvailable: boolean;
  hasStarted: boolean;
  hasEnded: boolean;
} | null> {
  const result = await pool.query(
    `SELECT id, status, scheduled_date, scheduled_time FROM exams 
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [examId, tenantId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const exam = result.rows[0];
  const now = new Date();
  const scheduledDateTime = new Date(`${exam.scheduled_date}T${exam.scheduled_time}`);

  return {
    examId: exam.id,
    status: exam.status,
    scheduledDate: exam.scheduled_date,
    scheduledTime: exam.scheduled_time,
    isAvailable: exam.status === 'Scheduled' || exam.status === 'Ongoing',
    hasStarted: scheduledDateTime <= now,
    hasEnded: exam.status === 'Completed',
  };
}

