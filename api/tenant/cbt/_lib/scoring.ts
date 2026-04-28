import { Pool } from 'pg';
import { getPool } from './db';

/**
 * Score calculation result
 */
export interface ScoreCalculationResult {
  studentId: string;
  examId: string;
  score: number;
  totalMarks: number;
  percentage: number;
  correctAnswers: number;
  totalQuestions: number;
}

/**
 * Pass/Fail determination result
 */
export interface PassFailResult {
  studentId: string;
  examId: string;
  score: number;
  passMarks: number;
  status: 'Pass' | 'Fail';
  percentage: number;
}

/**
 * Calculate score from student answers
 */
export async function calculateScore(
  examId: string,
  studentId: string,
  tenantId: string
): Promise<ScoreCalculationResult> {
  const pool = getPool();

  try {
    // Get exam details
    const examResult = await pool.query(
      `SELECT id, total_marks FROM exams 
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [examId, tenantId]
    );

    if (examResult.rows.length === 0) {
      throw new Error(`Exam ${examId} not found`);
    }

    const exam = examResult.rows[0];

    // Get student answers and calculate score
    const answersResult = await pool.query(
      `SELECT 
        COUNT(*) as total_questions,
        COUNT(CASE WHEN sa.is_correct THEN 1 END) as correct_answers,
        SUM(CASE WHEN sa.is_correct THEN eq.marks ELSE 0 END) as total_score
       FROM student_answers sa
       JOIN exam_questions eq ON sa.question_id = eq.question_id AND eq.exam_id = $1
       WHERE sa.exam_id = $1 AND sa.student_id = $2 AND sa.tenant_id = $3`,
      [examId, studentId, tenantId]
    );

    const answers = answersResult.rows[0];
    const totalQuestions = parseInt(answers.total_questions, 10);
    const correctAnswers = parseInt(answers.correct_answers, 10);
    const score = parseInt(answers.total_score, 10) || 0;

    // Ensure score doesn't exceed total marks
    const finalScore = Math.min(score, exam.total_marks);
    const percentage = exam.total_marks > 0 ? Math.round((finalScore / exam.total_marks) * 100) : 0;

    return {
      studentId,
      examId,
      score: finalScore,
      totalMarks: exam.total_marks,
      percentage,
      correctAnswers,
      totalQuestions,
    };
  } catch (error) {
    throw new Error(
      `Failed to calculate score: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Determine pass/fail status
 */
export async function determinePassFailStatus(
  examId: string,
  studentId: string,
  tenantId: string
): Promise<PassFailResult> {
  const pool = getPool();

  try {
    // Get exam pass mark
    const examResult = await pool.query(
      `SELECT id, pass_mark, total_marks FROM exams 
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [examId, tenantId]
    );

    if (examResult.rows.length === 0) {
      throw new Error(`Exam ${examId} not found`);
    }

    const exam = examResult.rows[0];

    // Calculate score
    const scoreResult = await calculateScore(examId, studentId, tenantId);

    // Determine status
    const status = scoreResult.score >= exam.pass_mark ? 'Pass' : 'Fail';

    return {
      studentId,
      examId,
      score: scoreResult.score,
      passMarks: exam.pass_mark,
      status,
      percentage: scoreResult.percentage,
    };
  } catch (error) {
    throw new Error(
      `Failed to determine pass/fail status: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Store calculated score in database
 */
export async function storeScore(
  examId: string,
  studentId: string,
  tenantId: string
): Promise<ScoreCalculationResult> {
  const pool = getPool();

  try {
    // Calculate score
    const scoreResult = await calculateScore(examId, studentId, tenantId);

    // Update exam_results with score
    await pool.query(
      `UPDATE exam_results 
       SET score = $1, updated_at = NOW()
       WHERE exam_id = $2 AND student_id = $3 AND tenant_id = $4`,
      [scoreResult.score, examId, studentId, tenantId]
    );

    return scoreResult;
  } catch (error) {
    throw new Error(
      `Failed to store score: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Store pass/fail status in database
 */
export async function storePassFailStatus(
  examId: string,
  studentId: string,
  tenantId: string
): Promise<PassFailResult> {
  const pool = getPool();

  try {
    // Determine status
    const statusResult = await determinePassFailStatus(examId, studentId, tenantId);

    // Update exam_results with status
    await pool.query(
      `UPDATE exam_results 
       SET score = $1, status = $2, updated_at = NOW()
       WHERE exam_id = $3 AND student_id = $4 AND tenant_id = $5`,
      [statusResult.score, statusResult.status, examId, studentId, tenantId]
    );

    return statusResult;
  } catch (error) {
    throw new Error(
      `Failed to store pass/fail status: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Batch calculate and store scores for all students in an exam
 */
export async function batchCalculateScores(
  examId: string,
  tenantId: string
): Promise<ScoreCalculationResult[]> {
  const pool = getPool();

  try {
    // Get all students who completed the exam
    const studentsResult = await pool.query(
      `SELECT DISTINCT student_id FROM exam_results 
       WHERE exam_id = $1 AND tenant_id = $2`,
      [examId, tenantId]
    );

    const results: ScoreCalculationResult[] = [];

    for (const row of studentsResult.rows) {
      const scoreResult = await storeScore(examId, row.student_id, tenantId);
      results.push(scoreResult);
    }

    return results;
  } catch (error) {
    throw new Error(
      `Failed to batch calculate scores: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Batch determine and store pass/fail status for all students in an exam
 */
export async function batchDeterminePassFailStatus(
  examId: string,
  tenantId: string
): Promise<PassFailResult[]> {
  const pool = getPool();

  try {
    // Get all students who completed the exam
    const studentsResult = await pool.query(
      `SELECT DISTINCT student_id FROM exam_results 
       WHERE exam_id = $1 AND tenant_id = $2`,
      [examId, tenantId]
    );

    const results: PassFailResult[] = [];

    for (const row of studentsResult.rows) {
      const statusResult = await storePassFailStatus(examId, row.student_id, tenantId);
      results.push(statusResult);
    }

    return results;
  } catch (error) {
    throw new Error(
      `Failed to batch determine pass/fail status: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Validate score doesn't exceed total marks
 */
export function validateScore(score: number, totalMarks: number): boolean {
  return score >= 0 && score <= totalMarks;
}

/**
 * Get score statistics for an exam
 */
export async function getScoreStatistics(
  examId: string,
  tenantId: string
): Promise<{
  averageScore: number;
  medianScore: number;
  standardDeviation: number;
  minScore: number;
  maxScore: number;
  passCount: number;
  failCount: number;
}> {
  const pool = getPool();

  try {
    // Get all scores
    const scoresResult = await pool.query(
      `SELECT score FROM exam_results 
       WHERE exam_id = $1 AND tenant_id = $2 AND score IS NOT NULL
       ORDER BY score`,
      [examId, tenantId]
    );

    if (scoresResult.rows.length === 0) {
      return {
        averageScore: 0,
        medianScore: 0,
        standardDeviation: 0,
        minScore: 0,
        maxScore: 0,
        passCount: 0,
        failCount: 0,
      };
    }

    const scores = scoresResult.rows.map((r) => r.score);

    // Calculate statistics
    const sum = scores.reduce((a, b) => a + b, 0);
    const average = sum / scores.length;

    const median =
      scores.length % 2 === 0
        ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
        : scores[Math.floor(scores.length / 2)];

    const variance =
      scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) /
      scores.length;
    const stdDev = Math.sqrt(variance);

    // Get pass/fail counts
    const statsResult = await pool.query(
      `SELECT 
        COUNT(CASE WHEN status = 'Pass' THEN 1 END) as pass_count,
        COUNT(CASE WHEN status = 'Fail' THEN 1 END) as fail_count
       FROM exam_results
       WHERE exam_id = $1 AND tenant_id = $2`,
      [examId, tenantId]
    );

    const stats = statsResult.rows[0];

    return {
      averageScore: Math.round(average * 100) / 100,
      medianScore: median,
      standardDeviation: Math.round(stdDev * 100) / 100,
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
      passCount: parseInt(stats.pass_count, 10),
      failCount: parseInt(stats.fail_count, 10),
    };
  } catch (error) {
    throw new Error(
      `Failed to get score statistics: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
