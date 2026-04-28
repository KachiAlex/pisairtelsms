import { Pool, QueryResult } from 'pg';
import { getPool } from './db';

/**
 * Student progress data for live monitoring
 */
export interface StudentProgress {
  studentId: string;
  studentName: string;
  questionsAnswered: number;
  totalQuestions: number;
  completionPercentage: number;
  timeRemaining: number; // in seconds
  status: 'Active' | 'Completed' | 'Paused' | 'Flagged';
  currentQuestionIndex: number;
  flagReason?: string;
  flaggedAt?: string;
}

/**
 * Exam monitoring data with all student progress
 */
export interface ExamMonitoringData {
  examId: string;
  examTitle: string;
  totalStudents: number;
  activeStudents: number;
  completedStudents: number;
  pausedStudents: number;
  flaggedStudents: number;
  students: StudentProgress[];
  lastUpdated: string;
}

/**
 * Student progress update input
 */
export interface ProgressUpdateInput {
  examId: string;
  studentId: string;
  questionsAnswered: number;
  currentQuestionIndex: number;
  timeRemaining: number;
}

/**
 * Exam completion input
 */
export interface CompletionInput {
  examId: string;
  studentId: string;
  timeSpent: number;
}

/**
 * Student flagging input
 */
export interface FlagInput {
  examId: string;
  studentId: string;
  reason: string;
}

/**
 * Monitoring filter options
 */
export interface MonitoringFilter {
  examId?: string;
  class?: string;
  status?: 'Active' | 'Completed' | 'Paused' | 'Flagged';
}

/**
 * Get all student progress for an exam
 */
export async function getExamMonitoring(
  examId: string,
  tenantId: string
): Promise<ExamMonitoringData> {
  const pool = getPool();

  try {
    // Get exam details
    const examResult = await pool.query(
      `SELECT id, title FROM exams 
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [examId, tenantId]
    );

    if (examResult.rows.length === 0) {
      throw new Error(`Exam ${examId} not found`);
    }

    const exam = examResult.rows[0];

    // Get all student progress for this exam
    const progressResult = await pool.query(
      `SELECT 
        sep.student_id,
        sep.student_name,
        sep.questions_answered,
        sep.current_question_index,
        sep.time_remaining,
        sep.status,
        sep.flag_reason,
        sep.flagged_at,
        eq.question_id
       FROM student_exam_progress sep
       LEFT JOIN exam_questions eq ON sep.exam_id = eq.exam_id
       WHERE sep.exam_id = $1 AND sep.tenant_id = $2
       ORDER BY sep.student_id, eq.question_order`,
      [examId, tenantId]
    );

    // Get total questions for the exam
    const totalQuestionsResult = await pool.query(
      `SELECT COUNT(*) as total FROM exam_questions 
       WHERE exam_id = $1`,
      [examId]
    );

    const totalQuestions = parseInt(totalQuestionsResult.rows[0].total, 10);

    // Group progress by student
    const studentMap = new Map<string, StudentProgress>();

    progressResult.rows.forEach((row) => {
      if (!studentMap.has(row.student_id)) {
        const completionPercentage =
          totalQuestions > 0
            ? Math.round((row.questions_answered / totalQuestions) * 100)
            : 0;

        studentMap.set(row.student_id, {
          studentId: row.student_id,
          studentName: row.student_name,
          questionsAnswered: row.questions_answered,
          totalQuestions,
          completionPercentage,
          timeRemaining: row.time_remaining,
          status: row.status,
          currentQuestionIndex: row.current_question_index,
          flagReason: row.flag_reason,
          flaggedAt: row.flagged_at,
        });
      }
    });

    const students = Array.from(studentMap.values());

    // Calculate statistics
    const activeStudents = students.filter((s) => s.status === 'Active').length;
    const completedStudents = students.filter(
      (s) => s.status === 'Completed'
    ).length;
    const pausedStudents = students.filter((s) => s.status === 'Paused').length;
    const flaggedStudents = students.filter(
      (s) => s.status === 'Flagged'
    ).length;

    return {
      examId,
      examTitle: exam.title,
      totalStudents: students.length,
      activeStudents,
      completedStudents,
      pausedStudents,
      flaggedStudents,
      students,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(
      `Failed to get exam monitoring data: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Update student progress during exam
 */
export async function updateStudentProgress(
  input: ProgressUpdateInput,
  tenantId: string
): Promise<StudentProgress> {
  const pool = getPool();

  try {
    // Verify exam exists
    const examResult = await pool.query(
      `SELECT id FROM exams WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [input.examId, tenantId]
    );

    if (examResult.rows.length === 0) {
      throw new Error(`Exam ${input.examId} not found`);
    }

    // Get total questions for completion percentage
    const totalQuestionsResult = await pool.query(
      `SELECT COUNT(*) as total FROM exam_questions WHERE exam_id = $1`,
      [input.examId]
    );

    const totalQuestions = parseInt(totalQuestionsResult.rows[0].total, 10);
    const completionPercentage =
      totalQuestions > 0
        ? Math.round((input.questionsAnswered / totalQuestions) * 100)
        : 0;

    // Update or insert student progress
    const updateResult = await pool.query(
      `INSERT INTO student_exam_progress 
        (exam_id, tenant_id, student_id, questions_answered, current_question_index, time_remaining, status, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'Active', NOW())
       ON CONFLICT (exam_id, student_id) 
       DO UPDATE SET 
        questions_answered = $4,
        current_question_index = $5,
        time_remaining = $6,
        status = 'Active',
        updated_at = NOW()
       RETURNING student_id, student_name, questions_answered, current_question_index, time_remaining, status`,
      [
        input.examId,
        tenantId,
        input.studentId,
        input.questionsAnswered,
        input.currentQuestionIndex,
        input.timeRemaining,
      ]
    );

    const row = updateResult.rows[0];

    return {
      studentId: row.student_id,
      studentName: row.student_name,
      questionsAnswered: row.questions_answered,
      totalQuestions,
      completionPercentage,
      timeRemaining: row.time_remaining,
      status: row.status,
      currentQuestionIndex: row.current_question_index,
    };
  } catch (error) {
    throw new Error(
      `Failed to update student progress: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Record exam completion
 */
export async function recordExamCompletion(
  input: CompletionInput,
  tenantId: string
): Promise<void> {
  const pool = getPool();

  try {
    // Verify exam exists
    const examResult = await pool.query(
      `SELECT id FROM exams WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [input.examId, tenantId]
    );

    if (examResult.rows.length === 0) {
      throw new Error(`Exam ${input.examId} not found`);
    }

    // Update student progress to Completed
    await pool.query(
      `UPDATE student_exam_progress 
       SET status = 'Completed', 
           time_spent = $1,
           completed_at = NOW(),
           updated_at = NOW()
       WHERE exam_id = $1 AND student_id = $2 AND tenant_id = $3`,
      [input.timeSpent, input.studentId, input.examId, tenantId]
    );

    // Create exam result record
    await pool.query(
      `INSERT INTO exam_results 
        (exam_id, tenant_id, student_id, time_spent, submitted_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (exam_id, student_id) 
       DO UPDATE SET 
        time_spent = $4,
        submitted_at = NOW()`,
      [input.examId, tenantId, input.studentId, input.timeSpent]
    );
  } catch (error) {
    throw new Error(
      `Failed to record exam completion: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Flag a student during exam
 */
export async function flagStudent(
  input: FlagInput,
  tenantId: string
): Promise<StudentProgress> {
  const pool = getPool();

  try {
    // Verify exam exists
    const examResult = await pool.query(
      `SELECT id FROM exams WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [input.examId, tenantId]
    );

    if (examResult.rows.length === 0) {
      throw new Error(`Exam ${input.examId} not found`);
    }

    // Update student progress with flag
    const updateResult = await pool.query(
      `UPDATE student_exam_progress 
       SET status = 'Flagged', 
           flag_reason = $1,
           flagged_at = NOW(),
           updated_at = NOW()
       WHERE exam_id = $2 AND student_id = $3 AND tenant_id = $4
       RETURNING student_id, student_name, questions_answered, current_question_index, time_remaining, status, flag_reason, flagged_at`,
      [input.reason, input.examId, input.studentId, tenantId]
    );

    if (updateResult.rows.length === 0) {
      throw new Error(
        `Student ${input.studentId} not found in exam ${input.examId}`
      );
    }

    const row = updateResult.rows[0];

    // Get total questions
    const totalQuestionsResult = await pool.query(
      `SELECT COUNT(*) as total FROM exam_questions WHERE exam_id = $1`,
      [input.examId]
    );

    const totalQuestions = parseInt(totalQuestionsResult.rows[0].total, 10);
    const completionPercentage =
      totalQuestions > 0
        ? Math.round((row.questions_answered / totalQuestions) * 100)
        : 0;

    return {
      studentId: row.student_id,
      studentName: row.student_name,
      questionsAnswered: row.questions_answered,
      totalQuestions,
      completionPercentage,
      timeRemaining: row.time_remaining,
      status: row.status,
      currentQuestionIndex: row.current_question_index,
      flagReason: row.flag_reason,
      flaggedAt: row.flagged_at,
    };
  } catch (error) {
    throw new Error(
      `Failed to flag student: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get filtered monitoring data
 */
export async function getFilteredMonitoring(
  filter: MonitoringFilter,
  tenantId: string
): Promise<ExamMonitoringData[]> {
  const pool = getPool();

  try {
    let query = `
      SELECT DISTINCT sep.exam_id, e.title
      FROM student_exam_progress sep
      JOIN exams e ON sep.exam_id = e.id
      WHERE sep.tenant_id = $1 AND e.deleted_at IS NULL
    `;

    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (filter.examId) {
      query += ` AND sep.exam_id = $${paramIndex}`;
      params.push(filter.examId);
      paramIndex++;
    }

    if (filter.class) {
      query += ` AND e.class = $${paramIndex}`;
      params.push(filter.class);
      paramIndex++;
    }

    if (filter.status) {
      query += ` AND sep.status = $${paramIndex}`;
      params.push(filter.status);
      paramIndex++;
    }

    const examsResult = await pool.query(query, params);

    const results: ExamMonitoringData[] = [];

    for (const exam of examsResult.rows) {
      const monitoringData = await getExamMonitoring(exam.exam_id, tenantId);
      results.push(monitoringData);
    }

    return results;
  } catch (error) {
    throw new Error(
      `Failed to get filtered monitoring data: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get individual student progress details
 */
export async function getStudentProgress(
  examId: string,
  studentId: string,
  tenantId: string
): Promise<StudentProgress> {
  const pool = getPool();

  try {
    // Get student progress
    const progressResult = await pool.query(
      `SELECT 
        student_id, student_name, questions_answered, current_question_index,
        time_remaining, status, flag_reason, flagged_at
       FROM student_exam_progress
       WHERE exam_id = $1 AND student_id = $2 AND tenant_id = $3`,
      [examId, studentId, tenantId]
    );

    if (progressResult.rows.length === 0) {
      throw new Error(
        `Student ${studentId} not found in exam ${examId}`
      );
    }

    const row = progressResult.rows[0];

    // Get total questions
    const totalQuestionsResult = await pool.query(
      `SELECT COUNT(*) as total FROM exam_questions WHERE exam_id = $1`,
      [examId]
    );

    const totalQuestions = parseInt(totalQuestionsResult.rows[0].total, 10);
    const completionPercentage =
      totalQuestions > 0
        ? Math.round((row.questions_answered / totalQuestions) * 100)
        : 0;

    return {
      studentId: row.student_id,
      studentName: row.student_name,
      questionsAnswered: row.questions_answered,
      totalQuestions,
      completionPercentage,
      timeRemaining: row.time_remaining,
      status: row.status,
      currentQuestionIndex: row.current_question_index,
      flagReason: row.flag_reason,
      flaggedAt: row.flagged_at,
    };
  } catch (error) {
    throw new Error(
      `Failed to get student progress: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Pause student exam
 */
export async function pauseStudentExam(
  examId: string,
  studentId: string,
  tenantId: string
): Promise<StudentProgress> {
  const pool = getPool();

  try {
    // Update student status to Paused
    const updateResult = await pool.query(
      `UPDATE student_exam_progress 
       SET status = 'Paused', updated_at = NOW()
       WHERE exam_id = $1 AND student_id = $2 AND tenant_id = $3
       RETURNING student_id, student_name, questions_answered, current_question_index, 
                 time_remaining, status, flag_reason, flagged_at`,
      [examId, studentId, tenantId]
    );

    if (updateResult.rows.length === 0) {
      throw new Error(
        `Student ${studentId} not found in exam ${examId}`
      );
    }

    const row = updateResult.rows[0];

    // Get total questions
    const totalQuestionsResult = await pool.query(
      `SELECT COUNT(*) as total FROM exam_questions WHERE exam_id = $1`,
      [examId]
    );

    const totalQuestions = parseInt(totalQuestionsResult.rows[0].total, 10);
    const completionPercentage =
      totalQuestions > 0
        ? Math.round((row.questions_answered / totalQuestions) * 100)
        : 0;

    return {
      studentId: row.student_id,
      studentName: row.student_name,
      questionsAnswered: row.questions_answered,
      totalQuestions,
      completionPercentage,
      timeRemaining: row.time_remaining,
      status: row.status,
      currentQuestionIndex: row.current_question_index,
      flagReason: row.flag_reason,
      flaggedAt: row.flagged_at,
    };
  } catch (error) {
    throw new Error(
      `Failed to pause student exam: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Resume student exam
 */
export async function resumeStudentExam(
  examId: string,
  studentId: string,
  tenantId: string
): Promise<StudentProgress> {
  const pool = getPool();

  try {
    // Update student status to Active
    const updateResult = await pool.query(
      `UPDATE student_exam_progress 
       SET status = 'Active', updated_at = NOW()
       WHERE exam_id = $1 AND student_id = $2 AND tenant_id = $3
       RETURNING student_id, student_name, questions_answered, current_question_index, 
                 time_remaining, status, flag_reason, flagged_at`,
      [examId, studentId, tenantId]
    );

    if (updateResult.rows.length === 0) {
      throw new Error(
        `Student ${studentId} not found in exam ${examId}`
      );
    }

    const row = updateResult.rows[0];

    // Get total questions
    const totalQuestionsResult = await pool.query(
      `SELECT COUNT(*) as total FROM exam_questions WHERE exam_id = $1`,
      [examId]
    );

    const totalQuestions = parseInt(totalQuestionsResult.rows[0].total, 10);
    const completionPercentage =
      totalQuestions > 0
        ? Math.round((row.questions_answered / totalQuestions) * 100)
        : 0;

    return {
      studentId: row.student_id,
      studentName: row.student_name,
      questionsAnswered: row.questions_answered,
      totalQuestions,
      completionPercentage,
      timeRemaining: row.time_remaining,
      status: row.status,
      currentQuestionIndex: row.current_question_index,
      flagReason: row.flag_reason,
      flaggedAt: row.flagged_at,
    };
  } catch (error) {
    throw new Error(
      `Failed to resume student exam: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get progress history for a student
 */
export async function getProgressHistory(
  examId: string,
  studentId: string,
  tenantId: string
): Promise<any[]> {
  const pool = getPool();

  try {
    // Get progress history from student_exam_progress
    const historyResult = await pool.query(
      `SELECT 
        questions_answered, current_question_index, time_remaining, status, updated_at
       FROM student_exam_progress
       WHERE exam_id = $1 AND student_id = $2 AND tenant_id = $3
       ORDER BY updated_at DESC
       LIMIT 100`,
      [examId, studentId, tenantId]
    );

    return historyResult.rows.map((row) => ({
      questionsAnswered: row.questions_answered,
      currentQuestionIndex: row.current_question_index,
      timeRemaining: row.time_remaining,
      status: row.status,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    throw new Error(
      `Failed to get progress history: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
