import { Pool } from 'pg';
import { getPool } from './db';

/**
 * Exam result summary
 */
export interface ExamResultSummary {
  examId: string;
  examTitle: string;
  totalStudents: number;
  completedStudents: number;
  averageScore: number;
  passRate: number;
  highestScore: number;
  lowestScore: number;
  completionRate: number;
}

/**
 * Results analytics
 */
export interface ResultsAnalytics {
  averageScore: number;
  passRate: number;
  highestScore: number;
  lowestScore: number;
  completionRate: number;
  totalStudents: number;
  completedStudents: number;
}

/**
 * Student result
 */
export interface StudentResult {
  studentId: string;
  studentName: string;
  score: number;
  totalMarks: number;
  percentage: number;
  status: 'Pass' | 'Fail';
  timeSpent: number;
  submittedAt: string;
  questionsAnswered: number;
  totalQuestions: number;
}

/**
 * Detailed student result with answers
 */
export interface DetailedStudentResult extends StudentResult {
  answers: StudentAnswer[];
}

/**
 * Student answer
 */
export interface StudentAnswer {
  questionId: string;
  questionText: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  marks: number;
}

/**
 * Results filter options
 */
export interface ResultsFilter {
  examId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: 'Pass' | 'Fail';
  minScore?: number;
  maxScore?: number;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * Get all exam results summary
 */
export async function getResultsSummary(
  tenantId: string,
  pagination?: PaginationParams
): Promise<{ results: ExamResultSummary[]; total: number }> {
  const pool = getPool();

  try {
    const offset = pagination ? (pagination.page - 1) * pagination.pageSize : 0;
    const limit = pagination ? pagination.pageSize : 100;

    // Get all exams with results
    const examsResult = await pool.query(
      `SELECT DISTINCT e.id, e.title, e.total_marks
       FROM exams e
       LEFT JOIN exam_results er ON e.id = er.exam_id
       WHERE e.tenant_id = $1 AND e.deleted_at IS NULL
       ORDER BY e.created_at DESC
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    );

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT e.id) as total
       FROM exams e
       WHERE e.tenant_id = $1 AND e.deleted_at IS NULL`,
      [tenantId]
    );

    const total = parseInt(countResult.rows[0].total, 10);

    const summaries: ExamResultSummary[] = [];

    for (const exam of examsResult.rows) {
      const summary = await getExamResultsSummary(exam.id, tenantId);
      summaries.push(summary);
    }

    return { results: summaries, total };
  } catch (error) {
    throw new Error(
      `Failed to get results summary: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get exam-specific results summary
 */
export async function getExamResultsSummary(
  examId: string,
  tenantId: string
): Promise<ExamResultSummary> {
  const pool = getPool();

  try {
    // Get exam details
    const examResult = await pool.query(
      `SELECT id, title, total_marks FROM exams 
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [examId, tenantId]
    );

    if (examResult.rows.length === 0) {
      throw new Error(`Exam ${examId} not found`);
    }

    const exam = examResult.rows[0];

    // Get results statistics
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_students,
        COUNT(CASE WHEN er.score IS NOT NULL THEN 1 END) as completed_students,
        AVG(CAST(er.score AS FLOAT)) as avg_score,
        MAX(er.score) as max_score,
        MIN(er.score) as min_score,
        COUNT(CASE WHEN er.score >= e.pass_mark THEN 1 END) as pass_count
       FROM exam_results er
       JOIN exams e ON er.exam_id = e.id
       WHERE er.exam_id = $1 AND er.tenant_id = $2`,
      [examId, tenantId]
    );

    const stats = statsResult.rows[0];
    const totalStudents = parseInt(stats.total_students, 10);
    const completedStudents = parseInt(stats.completed_students, 10);
    const averageScore = stats.avg_score ? Math.round(stats.avg_score * 100) / 100 : 0;
    const passCount = parseInt(stats.pass_count, 10);
    const passRate = totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0;
    const completionRate = totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0;

    return {
      examId,
      examTitle: exam.title,
      totalStudents,
      completedStudents,
      averageScore,
      passRate,
      highestScore: stats.max_score || 0,
      lowestScore: stats.min_score || 0,
      completionRate,
    };
  } catch (error) {
    throw new Error(
      `Failed to get exam results summary: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get exam results for all students
 */
export async function getExamResults(
  examId: string,
  tenantId: string,
  pagination?: PaginationParams
): Promise<{ results: StudentResult[]; total: number }> {
  const pool = getPool();

  try {
    const offset = pagination ? (pagination.page - 1) * pagination.pageSize : 0;
    const limit = pagination ? pagination.pageSize : 100;

    // Verify exam exists
    const examResult = await pool.query(
      `SELECT id, pass_mark, total_marks FROM exams 
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [examId, tenantId]
    );

    if (examResult.rows.length === 0) {
      throw new Error(`Exam ${examId} not found`);
    }

    const exam = examResult.rows[0];

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM exam_results 
       WHERE exam_id = $1 AND tenant_id = $2`,
      [examId, tenantId]
    );

    const total = parseInt(countResult.rows[0].total, 10);

    // Get student results
    const resultsResult = await pool.query(
      `SELECT 
        er.student_id, er.student_name, er.score, er.time_spent, er.submitted_at,
        sep.questions_answered
       FROM exam_results er
       LEFT JOIN student_exam_progress sep ON er.exam_id = sep.exam_id AND er.student_id = sep.student_id
       WHERE er.exam_id = $1 AND er.tenant_id = $2
       ORDER BY er.submitted_at DESC
       LIMIT $3 OFFSET $4`,
      [examId, tenantId, limit, offset]
    );

    // Get total questions
    const questionsResult = await pool.query(
      `SELECT COUNT(*) as total FROM exam_questions WHERE exam_id = $1`,
      [examId]
    );

    const totalQuestions = parseInt(questionsResult.rows[0].total, 10);

    const results: StudentResult[] = resultsResult.rows.map((row) => {
      const percentage = exam.total_marks > 0 ? Math.round((row.score / exam.total_marks) * 100) : 0;
      const status = row.score >= exam.pass_mark ? 'Pass' : 'Fail';

      return {
        studentId: row.student_id,
        studentName: row.student_name,
        score: row.score,
        totalMarks: exam.total_marks,
        percentage,
        status,
        timeSpent: row.time_spent,
        submittedAt: row.submitted_at,
        questionsAnswered: row.questions_answered || 0,
        totalQuestions,
      };
    });

    return { results, total };
  } catch (error) {
    throw new Error(
      `Failed to get exam results: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get detailed student result with answers
 */
export async function getStudentResult(
  examId: string,
  studentId: string,
  tenantId: string
): Promise<DetailedStudentResult> {
  const pool = getPool();

  try {
    // Get exam details
    const examResult = await pool.query(
      `SELECT id, pass_mark, total_marks FROM exams 
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [examId, tenantId]
    );

    if (examResult.rows.length === 0) {
      throw new Error(`Exam ${examId} not found`);
    }

    const exam = examResult.rows[0];

    // Get student result
    const resultResult = await pool.query(
      `SELECT student_id, student_name, score, time_spent, submitted_at
       FROM exam_results
       WHERE exam_id = $1 AND student_id = $2 AND tenant_id = $3`,
      [examId, studentId, tenantId]
    );

    if (resultResult.rows.length === 0) {
      throw new Error(`Result not found for student ${studentId} in exam ${examId}`);
    }

    const result = resultResult.rows[0];

    // Get student answers
    const answersResult = await pool.query(
      `SELECT 
        sa.question_id, qb.question_text, sa.selected_answer, sa.correct_answer, 
        sa.is_correct, eq.marks
       FROM student_answers sa
       JOIN questions_bank qb ON sa.question_id = qb.id
       JOIN exam_questions eq ON sa.question_id = eq.question_id AND eq.exam_id = $1
       WHERE sa.exam_id = $1 AND sa.student_id = $2 AND sa.tenant_id = $3
       ORDER BY eq.question_order`,
      [examId, studentId, tenantId]
    );

    // Get total questions
    const questionsResult = await pool.query(
      `SELECT COUNT(*) as total FROM exam_questions WHERE exam_id = $1`,
      [examId]
    );

    const totalQuestions = parseInt(questionsResult.rows[0].total, 10);

    // Get questions answered
    const answeredResult = await pool.query(
      `SELECT COUNT(*) as total FROM student_answers 
       WHERE exam_id = $1 AND student_id = $2 AND tenant_id = $3`,
      [examId, studentId, tenantId]
    );

    const questionsAnswered = parseInt(answeredResult.rows[0].total, 10);

    const percentage = exam.total_marks > 0 ? Math.round((result.score / exam.total_marks) * 100) : 0;
    const status = result.score >= exam.pass_mark ? 'Pass' : 'Fail';

    const answers: StudentAnswer[] = answersResult.rows.map((row) => ({
      questionId: row.question_id,
      questionText: row.question_text,
      selectedAnswer: row.selected_answer,
      correctAnswer: row.correct_answer,
      isCorrect: row.is_correct,
      marks: row.marks,
    }));

    return {
      studentId: result.student_id,
      studentName: result.student_name,
      score: result.score,
      totalMarks: exam.total_marks,
      percentage,
      status,
      timeSpent: result.time_spent,
      submittedAt: result.submitted_at,
      questionsAnswered,
      totalQuestions,
      answers,
    };
  } catch (error) {
    throw new Error(
      `Failed to get student result: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get filtered results
 */
export async function getFilteredResults(
  filter: ResultsFilter,
  tenantId: string,
  pagination?: PaginationParams
): Promise<{ results: StudentResult[]; total: number }> {
  const pool = getPool();

  try {
    const offset = pagination ? (pagination.page - 1) * pagination.pageSize : 0;
    const limit = pagination ? pagination.pageSize : 100;

    let query = `
      SELECT 
        er.exam_id, er.student_id, er.student_name, er.score, er.time_spent, 
        er.submitted_at, e.pass_mark, e.total_marks, sep.questions_answered
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      LEFT JOIN student_exam_progress sep ON er.exam_id = sep.exam_id AND er.student_id = sep.student_id
      WHERE er.tenant_id = $1 AND e.deleted_at IS NULL
    `;

    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (filter.examId) {
      query += ` AND er.exam_id = $${paramIndex}`;
      params.push(filter.examId);
      paramIndex++;
    }

    if (filter.dateFrom) {
      query += ` AND er.submitted_at >= $${paramIndex}`;
      params.push(filter.dateFrom);
      paramIndex++;
    }

    if (filter.dateTo) {
      query += ` AND er.submitted_at <= $${paramIndex}`;
      params.push(filter.dateTo);
      paramIndex++;
    }

    if (filter.minScore !== undefined) {
      query += ` AND er.score >= $${paramIndex}`;
      params.push(filter.minScore);
      paramIndex++;
    }

    if (filter.maxScore !== undefined) {
      query += ` AND er.score <= $${paramIndex}`;
      params.push(filter.maxScore);
      paramIndex++;
    }

    // Get total count
    const countQuery = query.replace(
      'SELECT er.exam_id, er.student_id, er.student_name, er.score, er.time_spent, er.submitted_at, e.pass_mark, e.total_marks, sep.questions_answered',
      'SELECT COUNT(*) as total'
    );

    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get results
    query += ` ORDER BY er.submitted_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const resultsResult = await pool.query(query, params);

    // Get total questions per exam
    const examIds = [...new Set(resultsResult.rows.map((r) => r.exam_id))];
    const questionsMap = new Map<string, number>();

    for (const examId of examIds) {
      const qResult = await pool.query(
        `SELECT COUNT(*) as total FROM exam_questions WHERE exam_id = $1`,
        [examId]
      );
      questionsMap.set(examId, parseInt(qResult.rows[0].total, 10));
    }

    const results: StudentResult[] = resultsResult.rows.map((row) => {
      const percentage = row.total_marks > 0 ? Math.round((row.score / row.total_marks) * 100) : 0;
      const status = row.score >= row.pass_mark ? 'Pass' : 'Fail';

      // Apply status filter if specified
      if (filter.status && status !== filter.status) {
        return null;
      }

      return {
        studentId: row.student_id,
        studentName: row.student_name,
        score: row.score,
        totalMarks: row.total_marks,
        percentage,
        status,
        timeSpent: row.time_spent,
        submittedAt: row.submitted_at,
        questionsAnswered: row.questions_answered || 0,
        totalQuestions: questionsMap.get(row.exam_id) || 0,
      };
    }).filter((r) => r !== null) as StudentResult[];

    return { results, total };
  } catch (error) {
    throw new Error(
      `Failed to get filtered results: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}


/**
 * Get results analytics for an exam
 */
export async function getResultsAnalytics(
  examId: string,
  tenantId: string
): Promise<ResultsAnalytics> {
  const pool = getPool();

  try {
    // Get total enrolled students (from student_exam_progress)
    const enrolledResult = await pool.query(
      `SELECT COUNT(DISTINCT student_id) as total_enrolled
       FROM student_exam_progress
       WHERE exam_id = $1`,
      [examId]
    );

    const totalEnrolled = parseInt(enrolledResult.rows[0].total_enrolled, 10);

    // Get completed students and analytics from exam_results
    const analyticsResult = await pool.query(
      `SELECT 
        COUNT(*) as completed_students,
        AVG(CAST(score AS FLOAT)) as avg_score,
        MAX(score) as max_score,
        MIN(score) as min_score,
        COUNT(CASE WHEN status = 'Passed' THEN 1 END) as pass_count
       FROM exam_results
       WHERE exam_id = $1 AND tenant_id = $2`,
      [examId, tenantId]
    );

    const analytics = analyticsResult.rows[0];
    const completedStudents = parseInt(analytics.completed_students, 10);
    const averageScore = analytics.avg_score ? Math.round(analytics.avg_score * 100) / 100 : 0;
    const passCount = parseInt(analytics.pass_count, 10);
    
    // Calculate pass rate based on completed students
    const passRate = completedStudents > 0 ? Math.round((passCount / completedStudents) * 100) : 0;
    
    // Calculate completion rate based on total enrolled
    const completionRate = totalEnrolled > 0 ? Math.round((completedStudents / totalEnrolled) * 100) : 0;

    return {
      averageScore,
      passRate,
      highestScore: analytics.max_score || 0,
      lowestScore: analytics.min_score || 0,
      completionRate,
      totalStudents: totalEnrolled,
      completedStudents,
    };
  } catch (error) {
    throw new Error(
      `Failed to get results analytics: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
