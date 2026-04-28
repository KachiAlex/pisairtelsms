/**
 * Exam Questions Service Layer
 * Handles exam-question relationships, question selection, and ordering
 */

import { Pool, QueryResult } from 'pg';

export interface ExamQuestion {
  id: string;
  examId: string;
  questionId: string;
  questionOrder: number;
  marks: number;
  createdAt: Date;
}

export interface QuestionDetail extends ExamQuestion {
  text: string;
  type: string;
  options: string[];
  correctAnswer: string;
  difficulty: string;
  subject: string;
  tags: string[];
}

export interface AddQuestionInput {
  questionId: string;
  questionOrder: number;
  marks: number;
}

/**
 * Add a question to an exam
 */
export async function addQuestionToExam(
  pool: Pool,
  tenantId: string,
  examId: string,
  input: AddQuestionInput
): Promise<ExamQuestion> {
  const { questionId, questionOrder, marks } = input;

  // Validate inputs
  if (!questionId || !examId || !tenantId) {
    throw new Error('Exam ID, question ID, and tenant ID are required');
  }

  if (marks <= 0) {
    throw new Error('Marks must be greater than 0');
  }

  if (questionOrder < 1) {
    throw new Error('Question order must be at least 1');
  }

  try {
    // Verify exam exists and belongs to tenant
    const examCheck = await pool.query(
      'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2',
      [examId, tenantId]
    );

    if (examCheck.rows.length === 0) {
      throw new Error('Exam not found');
    }

    // Verify question exists and belongs to tenant
    const questionCheck = await pool.query(
      'SELECT id FROM questions_bank WHERE id = $1 AND tenant_id = $2',
      [questionId, tenantId]
    );

    if (questionCheck.rows.length === 0) {
      throw new Error('Question not found');
    }

    // Check if question already added to exam
    const existingCheck = await pool.query(
      'SELECT id FROM exam_questions WHERE exam_id = $1 AND question_id = $2',
      [examId, questionId]
    );

    if (existingCheck.rows.length > 0) {
      throw new Error('Question already added to this exam');
    }

    // Insert exam-question relationship
    const result = await pool.query(
      `INSERT INTO exam_questions (exam_id, question_id, question_order, marks)
       VALUES ($1, $2, $3, $4)
       RETURNING id, exam_id, question_id, question_order, marks, created_at`,
      [examId, questionId, questionOrder, marks]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      examId: row.exam_id,
      questionId: row.question_id,
      questionOrder: row.question_order,
      marks: parseFloat(row.marks),
      createdAt: new Date(row.created_at),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to add question to exam: ${errorMessage}`);
  }
}

/**
 * Remove a question from an exam
 */
export async function removeQuestionFromExam(
  pool: Pool,
  tenantId: string,
  examId: string,
  questionId: string
): Promise<boolean> {
  if (!examId || !questionId || !tenantId) {
    throw new Error('Exam ID, question ID, and tenant ID are required');
  }

  try {
    // Verify exam exists and belongs to tenant
    const examCheck = await pool.query(
      'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2',
      [examId, tenantId]
    );

    if (examCheck.rows.length === 0) {
      throw new Error('Exam not found');
    }

    // Delete exam-question relationship
    const result = await pool.query(
      'DELETE FROM exam_questions WHERE exam_id = $1 AND question_id = $2',
      [examId, questionId]
    );

    return result.rowCount > 0;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to remove question from exam: ${errorMessage}`);
  }
}

/**
 * Get all questions for an exam with full details
 */
export async function getExamQuestions(
  pool: Pool,
  tenantId: string,
  examId: string
): Promise<QuestionDetail[]> {
  if (!examId || !tenantId) {
    throw new Error('Exam ID and tenant ID are required');
  }

  try {
    // Verify exam exists and belongs to tenant
    const examCheck = await pool.query(
      'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2',
      [examId, tenantId]
    );

    if (examCheck.rows.length === 0) {
      throw new Error('Exam not found');
    }

    // Get all questions for exam with full details
    const result = await pool.query(
      `SELECT 
        eq.id,
        eq.exam_id,
        eq.question_id,
        eq.question_order,
        eq.marks,
        eq.created_at,
        q.text,
        q.type,
        q.options,
        q.correct_answer,
        q.difficulty,
        q.subject,
        q.tags
       FROM exam_questions eq
       JOIN questions_bank q ON eq.question_id = q.id
       WHERE eq.exam_id = $1
       ORDER BY eq.question_order ASC`,
      [examId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      examId: row.exam_id,
      questionId: row.question_id,
      questionOrder: row.question_order,
      marks: parseFloat(row.marks),
      createdAt: new Date(row.created_at),
      text: row.text,
      type: row.type,
      options: row.options,
      correctAnswer: row.correct_answer,
      difficulty: row.difficulty,
      subject: row.subject,
      tags: row.tags || [],
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get exam questions: ${errorMessage}`);
  }
}

/**
 * Reorder questions in an exam
 */
export async function reorderExamQuestions(
  pool: Pool,
  tenantId: string,
  examId: string,
  questionOrders: Array<{ questionId: string; order: number }>
): Promise<ExamQuestion[]> {
  if (!examId || !tenantId) {
    throw new Error('Exam ID and tenant ID are required');
  }

  if (!Array.isArray(questionOrders) || questionOrders.length === 0) {
    throw new Error('Question orders array is required and must not be empty');
  }

  try {
    // Verify exam exists and belongs to tenant
    const examCheck = await pool.query(
      'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2',
      [examId, tenantId]
    );

    if (examCheck.rows.length === 0) {
      throw new Error('Exam not found');
    }

    // Update all question orders
    for (const { questionId, order } of questionOrders) {
      if (order < 1) {
        throw new Error('Question order must be at least 1');
      }

      const updateResult = await pool.query(
        `UPDATE exam_questions 
         SET question_order = $1 
         WHERE exam_id = $2 AND question_id = $3`,
        [order, examId, questionId]
      );

      if (updateResult.rowCount === 0) {
        throw new Error(`Question ${questionId} not found in exam`);
      }
    }

    // Fetch updated questions
    return await getExamQuestions(pool, tenantId, examId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to reorder exam questions: ${errorMessage}`);
  }
}

/**
 * Update marks for a question in an exam
 */
export async function updateQuestionMarks(
  pool: Pool,
  tenantId: string,
  examId: string,
  questionId: string,
  marks: number
): Promise<ExamQuestion> {
  if (!examId || !questionId || !tenantId) {
    throw new Error('Exam ID, question ID, and tenant ID are required');
  }

  if (marks <= 0) {
    throw new Error('Marks must be greater than 0');
  }

  try {
    // Verify exam exists and belongs to tenant
    const examCheck = await pool.query(
      'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2',
      [examId, tenantId]
    );

    if (examCheck.rows.length === 0) {
      throw new Error('Exam not found');
    }

    // Update marks
    const result = await pool.query(
      `UPDATE exam_questions 
       SET marks = $1 
       WHERE exam_id = $2 AND question_id = $3
       RETURNING id, exam_id, question_id, question_order, marks, created_at`,
      [marks, examId, questionId]
    );

    if (result.rows.length === 0) {
      throw new Error('Question not found in exam');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      examId: row.exam_id,
      questionId: row.question_id,
      questionOrder: row.question_order,
      marks: parseFloat(row.marks),
      createdAt: new Date(row.created_at),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update question marks: ${errorMessage}`);
  }
}

/**
 * Get total marks for an exam
 */
export async function getExamTotalMarks(
  pool: Pool,
  tenantId: string,
  examId: string
): Promise<number> {
  if (!examId || !tenantId) {
    throw new Error('Exam ID and tenant ID are required');
  }

  try {
    // Verify exam exists and belongs to tenant
    const examCheck = await pool.query(
      'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2',
      [examId, tenantId]
    );

    if (examCheck.rows.length === 0) {
      throw new Error('Exam not found');
    }

    // Calculate total marks
    const result = await pool.query(
      `SELECT COALESCE(SUM(marks), 0) as total_marks
       FROM exam_questions
       WHERE exam_id = $1`,
      [examId]
    );

    return parseFloat(result.rows[0].total_marks);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get exam total marks: ${errorMessage}`);
  }
}

/**
 * Get question count for an exam
 */
export async function getExamQuestionCount(
  pool: Pool,
  tenantId: string,
  examId: string
): Promise<number> {
  if (!examId || !tenantId) {
    throw new Error('Exam ID and tenant ID are required');
  }

  try {
    // Verify exam exists and belongs to tenant
    const examCheck = await pool.query(
      'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2',
      [examId, tenantId]
    );

    if (examCheck.rows.length === 0) {
      throw new Error('Exam not found');
    }

    // Count questions
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM exam_questions
       WHERE exam_id = $1`,
      [examId]
    );

    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get exam question count: ${errorMessage}`);
  }
}
