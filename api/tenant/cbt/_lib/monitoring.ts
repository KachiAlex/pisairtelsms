/**
 * Live Monitoring Service
 * Real-time exam progress tracking
 */

import { queryAll, queryOne, query } from './db.js';
import { StudentExamProgress, UpdateProgressInput, ProgressStatus } from './types.js';

/**
 * Get live monitoring data for exam
 */
export async function getLiveMonitoringData(
  tenantId: string,
  examId: string
): Promise<{
  examId: string;
  totalStudents: number;
  activeStudents: number;
  completedStudents: number;
  flaggedStudents: number;
  students: StudentExamProgress[];
}> {
  const exam = await queryOne<{ id: string }>(
    'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2',
    [examId, tenantId]
  );

  if (!exam) {
    throw new Error('Exam not found');
  }

  const students = await queryAll<StudentExamProgress>(
    'SELECT * FROM student_exam_progress WHERE exam_id = $1 ORDER BY last_activity_time DESC',
    [examId]
  );

  const activeStudents = students.filter(s => s.status === 'Active').length;
  const completedStudents = students.filter(s => s.status === 'Completed').length;
  const flaggedStudents = students.filter(s => s.status === 'Flagged').length;

  return {
    examId,
    totalStudents: students.length,
    activeStudents,
    completedStudents,
    flaggedStudents,
    students,
  };
}

/**
 * Get student progress
 */
export async function getStudentProgress(
  tenantId: string,
  examId: string,
  studentId: string
): Promise<StudentExamProgress | null> {
  const exam = await queryOne<{ id: string }>(
    'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2',
    [examId, tenantId]
  );

  if (!exam) {
    throw new Error('Exam not found');
  }

  return queryOne<StudentExamProgress>(
    'SELECT * FROM student_exam_progress WHERE exam_id = $1 AND student_id = $2',
    [examId, studentId]
  );
}

/**
 * Update student progress
 */
export async function updateStudentProgress(
  tenantId: string,
  examId: string,
  studentId: string,
  input: UpdateProgressInput
): Promise<StudentExamProgress> {
  const exam = await queryOne<{ id: string }>(
    'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2',
    [examId, tenantId]
  );

  if (!exam) {
    throw new Error('Exam not found');
  }

  const updated = await queryOne<StudentExamProgress>(
    `UPDATE student_exam_progress SET
      questions_answered = COALESCE($1, questions_answered),
      current_question = COALESCE($2, current_question),
      status = COALESCE($3, status),
      time_remaining = COALESCE($4, time_remaining),
      last_activity_time = CURRENT_TIMESTAMP
    WHERE exam_id = $5 AND student_id = $6
    RETURNING *`,
    [
      input.questionsAnswered,
      input.currentQuestion,
      input.status,
      input.timeRemaining,
      examId,
      studentId,
    ]
  );

  if (!updated) {
    throw new Error('Failed to update student progress');
  }

  return updated;
}

/**
 * Flag student for suspicious activity
 */
export async function flagStudent(
  tenantId: string,
  examId: string,
  studentId: string,
  reason: string
): Promise<StudentExamProgress> {
  const exam = await queryOne<{ id: string }>(
    'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2',
    [examId, tenantId]
  );

  if (!exam) {
    throw new Error('Exam not found');
  }

  const updated = await queryOne<StudentExamProgress>(
    `UPDATE student_exam_progress SET
      status = 'Flagged',
      flag_reason = $1,
      flagged_at = CURRENT_TIMESTAMP,
      last_activity_time = CURRENT_TIMESTAMP
    WHERE exam_id = $2 AND student_id = $3
    RETURNING *`,
    [reason, examId, studentId]
  );

  if (!updated) {
    throw new Error('Failed to flag student');
  }

  return updated;
}

/**
 * Create student progress record
 */
export async function createStudentProgress(
  examId: string,
  studentId: string
): Promise<StudentExamProgress> {
  const progress = await queryOne<StudentExamProgress>(
    `INSERT INTO student_exam_progress (
      exam_id, student_id, questions_answered, current_question, status
    ) VALUES ($1, $2, 0, 0, 'Active')
    RETURNING *`,
    [examId, studentId]
  );

  if (!progress) {
    throw new Error('Failed to create student progress');
  }

  return progress;
}

/**
 * Complete student exam
 */
export async function completeStudentExam(
  tenantId: string,
  examId: string,
  studentId: string
): Promise<StudentExamProgress> {
  const exam = await queryOne<{ id: string }>(
    'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2',
    [examId, tenantId]
  );

  if (!exam) {
    throw new Error('Exam not found');
  }

  const updated = await queryOne<StudentExamProgress>(
    `UPDATE student_exam_progress SET
      status = 'Completed',
      last_activity_time = CURRENT_TIMESTAMP
    WHERE exam_id = $1 AND student_id = $2
    RETURNING *`,
    [examId, studentId]
  );

  if (!updated) {
    throw new Error('Failed to complete exam');
  }

  return updated;
}

/**
 * Get students by status
 */
export async function getStudentsByStatus(
  tenantId: string,
  examId: string,
  status: ProgressStatus
): Promise<StudentExamProgress[]> {
  const exam = await queryOne<{ id: string }>(
    'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2',
    [examId, tenantId]
  );

  if (!exam) {
    throw new Error('Exam not found');
  }

  return queryAll<StudentExamProgress>(
    'SELECT * FROM student_exam_progress WHERE exam_id = $1 AND status = $2 ORDER BY last_activity_time DESC',
    [examId, status]
  );
}
