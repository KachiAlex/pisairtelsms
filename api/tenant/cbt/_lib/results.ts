/**
 * Exam Results Service
 * Business logic for exam results, scoring, and analytics
 */

import { queryAll, queryOne, query } from './db.js';
import {
  ExamResult,
  StudentAnswer,
  ExamResultsSummary,
  ResultsFilter,
} from './types.js';

/**
 * Get exam results with filtering and pagination
 */
export async function getResults(
  tenantId: string,
  filter: ResultsFilter
): Promise<{
  success: boolean;
  data: ExamResult[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const page = filter.page || 1;
  const limit = filter.limit || 20;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE er.exam_id IN (SELECT id FROM exams WHERE tenant_id = $1)';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (filter.examId) {
    whereClause += ` AND er.exam_id = $${paramIndex}`;
    params.push(filter.examId);
    paramIndex++;
  }

  if (filter.studentId) {
    whereClause += ` AND er.student_id = $${paramIndex}`;
    params.push(filter.studentId);
    paramIndex++;
  }

  if (filter.status) {
    whereClause += ` AND er.status = $${paramIndex}`;
    params.push(filter.status);
    paramIndex++;
  }

  if (filter.startDate) {
    whereClause += ` AND er.submitted_at >= $${paramIndex}`;
    params.push(filter.startDate);
    paramIndex++;
  }

  if (filter.endDate) {
    whereClause += ` AND er.submitted_at <= $${paramIndex}`;
    params.push(filter.endDate);
    paramIndex++;
  }

  // Get total count
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM exam_results er ${whereClause}`,
    params
  );
  const total = parseInt(countResult?.count || '0');

  // Get paginated results
  const results = await queryAll<ExamResult>(
    `SELECT * FROM exam_results er ${whereClause} ORDER BY er.submitted_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  return {
    success: true,
    data: results,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get single exam result
 */
export async function getResult(
  tenantId: string,
  resultId: string
): Promise<ExamResult | null> {
  return queryOne<ExamResult>(
    `SELECT er.* FROM exam_results er
     JOIN exams e ON er.exam_id = e.id
     WHERE er.id = $1 AND e.tenant_id = $2`,
    [resultId, tenantId]
  );
}

/**
 * Get exam result with student answers
 */
export async function getResultWithAnswers(
  tenantId: string,
  resultId: string
): Promise<(ExamResult & { answers: StudentAnswer[] }) | null> {
  const result = await getResult(tenantId, resultId);
  if (!result) {
    return null;
  }

  const answers = await queryAll<StudentAnswer>(
    'SELECT * FROM student_answers WHERE result_id = $1 ORDER BY created_at ASC',
    [resultId]
  );

  return {
    ...result,
    answers,
  };
}

/**
 * Get results summary for an exam
 */
export async function getExamResultsSummary(
  tenantId: string,
  examId: string
): Promise<ExamResultsSummary | null> {
  // Verify exam belongs to tenant
  const exam = await queryOne<{ id: string; title: string }>(
    'SELECT id, title FROM exams WHERE id = $1 AND tenant_id = $2',
    [examId, tenantId]
  );

  if (!exam) {
    return null;
  }

  const results = await queryAll<{
    score: string;
    total_marks: string;
    status: string;
  }>(
    'SELECT score, total_marks, status FROM exam_results WHERE exam_id = $1',
    [examId]
  );

  if (results.length === 0) {
    return {
      examId,
      examTitle: exam.title,
      totalStudents: 0,
      completedStudents: 0,
      averageScore: 0,
      passRate: 0,
      highestScore: 0,
      lowestScore: 0,
    };
  }

  const scores = results.map(r => parseFloat(r.score));
  const passedCount = results.filter(r => r.status === 'Passed').length;

  return {
    examId,
    examTitle: exam.title,
    totalStudents: results.length,
    completedStudents: results.length,
    averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    passRate: (passedCount / results.length) * 100,
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
  };
}

/**
 * Create exam result
 */
export async function createResult(
  examId: string,
  studentId: string,
  score: number,
  totalMarks: number,
  timeSpent: number,
  passMark: number
): Promise<ExamResult> {
  const percentage = (score / totalMarks) * 100;
  const status = score >= passMark ? 'Passed' : 'Failed';

  const result = await queryOne<ExamResult>(
    `INSERT INTO exam_results (
      exam_id, student_id, score, total_marks, percentage, status, time_spent
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [examId, studentId, score, totalMarks, percentage, status, timeSpent]
  );

  if (!result) {
    throw new Error('Failed to create exam result');
  }

  return result;
}

/**
 * Record student answer
 */
export async function recordAnswer(
  resultId: string,
  questionId: string,
  studentAnswer: string | null,
  correctAnswer: string | null,
  isCorrect: boolean,
  marksObtained: number,
  totalMarks: number
): Promise<StudentAnswer> {
  const answer = await queryOne<StudentAnswer>(
    `INSERT INTO student_answers (
      result_id, question_id, student_answer, correct_answer, is_correct, marks_obtained, total_marks
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [resultId, questionId, studentAnswer, correctAnswer, isCorrect, marksObtained, totalMarks]
  );

  if (!answer) {
    throw new Error('Failed to record answer');
  }

  return answer;
}

/**
 * Get student answers for a result
 */
export async function getStudentAnswers(
  tenantId: string,
  resultId: string
): Promise<StudentAnswer[]> {
  // Verify result belongs to tenant
  const result = await getResult(tenantId, resultId);
  if (!result) {
    throw new Error('Result not found');
  }

  return queryAll<StudentAnswer>(
    'SELECT * FROM student_answers WHERE result_id = $1 ORDER BY created_at ASC',
    [resultId]
  );
}

/**
 * Calculate score for exam
 */
export function calculateScore(
  answers: Array<{ isCorrect: boolean; marksObtained: number }>
): number {
  return answers.reduce((total, answer) => total + (answer.isCorrect ? answer.marksObtained : 0), 0);
}

/**
 * Determine pass/fail status
 */
export function determineStatus(score: number, passMark: number): 'Passed' | 'Failed' {
  return score >= passMark ? 'Passed' : 'Failed';
}

/**
 * Calculate percentage
 */
export function calculatePercentage(score: number, totalMarks: number): number {
  return (score / totalMarks) * 100;
}

/**
 * Get analytics for exam
 */
export async function getExamAnalytics(
  tenantId: string,
  examId: string
): Promise<{
  totalAttempts: number;
  passedCount: number;
  failedCount: number;
  averageScore: number;
  averagePercentage: number;
  highestScore: number;
  lowestScore: number;
  averageTimeSpent: number;
}> {
  // Verify exam belongs to tenant
  const exam = await queryOne<{ id: string }>(
    'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2',
    [examId, tenantId]
  );

  if (!exam) {
    throw new Error('Exam not found');
  }

  const results = await queryAll<{
    score: string;
    percentage: string;
    status: string;
    time_spent: string;
  }>(
    'SELECT score, percentage, status, time_spent FROM exam_results WHERE exam_id = $1',
    [examId]
  );

  if (results.length === 0) {
    return {
      totalAttempts: 0,
      passedCount: 0,
      failedCount: 0,
      averageScore: 0,
      averagePercentage: 0,
      highestScore: 0,
      lowestScore: 0,
      averageTimeSpent: 0,
    };
  }

  const scores = results.map(r => parseFloat(r.score));
  const percentages = results.map(r => parseFloat(r.percentage));
  const timesSpent = results.map(r => parseInt(r.time_spent));
  const passedCount = results.filter(r => r.status === 'Passed').length;

  return {
    totalAttempts: results.length,
    passedCount,
    failedCount: results.length - passedCount,
    averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    averagePercentage: percentages.reduce((a, b) => a + b, 0) / percentages.length,
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    averageTimeSpent: timesSpent.reduce((a, b) => a + b, 0) / timesSpent.length,
  };
}

/**
 * Get student performance across exams
 */
export async function getStudentPerformance(
  tenantId: string,
  studentId: string
): Promise<{
  totalExams: number;
  passedExams: number;
  failedExams: number;
  averageScore: number;
  averagePercentage: number;
  bestScore: number;
  worstScore: number;
}> {
  const results = await queryAll<{
    score: string;
    percentage: string;
    status: string;
  }>(
    `SELECT er.score, er.percentage, er.status FROM exam_results er
     JOIN exams e ON er.exam_id = e.id
     WHERE er.student_id = $1 AND e.tenant_id = $2`,
    [studentId, tenantId]
  );

  if (results.length === 0) {
    return {
      totalExams: 0,
      passedExams: 0,
      failedExams: 0,
      averageScore: 0,
      averagePercentage: 0,
      bestScore: 0,
      worstScore: 0,
    };
  }

  const scores = results.map(r => parseFloat(r.score));
  const percentages = results.map(r => parseFloat(r.percentage));
  const passedCount = results.filter(r => r.status === 'Passed').length;

  return {
    totalExams: results.length,
    passedExams: passedCount,
    failedExams: results.length - passedCount,
    averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    averagePercentage: percentages.reduce((a, b) => a + b, 0) / percentages.length,
    bestScore: Math.max(...scores),
    worstScore: Math.min(...scores),
  };
}

/**
 * Get class performance
 */
export async function getClassPerformance(
  tenantId: string,
  examId: string
): Promise<{
  totalStudents: number;
  passedStudents: number;
  failedStudents: number;
  averageScore: number;
  averagePercentage: number;
  topPerformer: { studentId: string; score: number; percentage: number } | null;
  bottomPerformer: { studentId: string; score: number; percentage: number } | null;
}> {
  // Verify exam belongs to tenant
  const exam = await queryOne<{ id: string }>(
    'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2',
    [examId, tenantId]
  );

  if (!exam) {
    throw new Error('Exam not found');
  }

  const results = await queryAll<{
    student_id: string;
    score: string;
    percentage: string;
    status: string;
  }>(
    'SELECT student_id, score, percentage, status FROM exam_results WHERE exam_id = $1 ORDER BY score DESC',
    [examId]
  );

  if (results.length === 0) {
    return {
      totalStudents: 0,
      passedStudents: 0,
      failedStudents: 0,
      averageScore: 0,
      averagePercentage: 0,
      topPerformer: null,
      bottomPerformer: null,
    };
  }

  const scores = results.map(r => parseFloat(r.score));
  const percentages = results.map(r => parseFloat(r.percentage));
  const passedCount = results.filter(r => r.status === 'Passed').length;

  return {
    totalStudents: results.length,
    passedStudents: passedCount,
    failedStudents: results.length - passedCount,
    averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    averagePercentage: percentages.reduce((a, b) => a + b, 0) / percentages.length,
    topPerformer: results.length > 0 ? {
      studentId: results[0].student_id,
      score: parseFloat(results[0].score),
      percentage: parseFloat(results[0].percentage),
    } : null,
    bottomPerformer: results.length > 0 ? {
      studentId: results[results.length - 1].student_id,
      score: parseFloat(results[results.length - 1].score),
      percentage: parseFloat(results[results.length - 1].percentage),
    } : null,
  };
}
