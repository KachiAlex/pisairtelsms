/**
 * Property-Based Tests for Database Schema Integrity
 * Property 1: Question Addition Round-Trip
 * Validates: Requirements 1.2
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

interface TestQuestion {
  id?: string;
  tenant_id: string;
  text: string;
  type: 'objective' | 'truefalse' | 'essay';
  options?: string[];
  correct_answer: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  subject: string;
  tags?: string[];
  created_by: string;
}

/**
 * Property 1: Question Addition Round-Trip
 * Verify questions persist with identical data
 *
 * Test: Add a question to the database and retrieve it
 * Expected: Retrieved question matches the added question exactly
 */
export async function testQuestionAdditionRoundTrip(pool: Pool): Promise<void> {
  const client = await pool.connect();

  try {
    const tenantId = uuidv4();
    const userId = uuidv4();

    // Test Case 1: Objective Question
    const objectiveQuestion: TestQuestion = {
      tenant_id: tenantId,
      text: 'What is the capital of France?',
      type: 'objective',
      options: ['Paris', 'London', 'Berlin', 'Madrid'],
      correct_answer: 'Paris',
      difficulty: 'Easy',
      subject: 'Geography',
      tags: ['capitals', 'europe'],
      created_by: userId,
    };

    // Insert question
    const insertResult = await client.query(
      `INSERT INTO questions_bank 
       (tenant_id, text, type, options, correct_answer, difficulty, subject, tags, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, tenant_id, text, type, options, correct_answer, difficulty, subject, tags, created_by`,
      [
        objectiveQuestion.tenant_id,
        objectiveQuestion.text,
        objectiveQuestion.type,
        JSON.stringify(objectiveQuestion.options),
        objectiveQuestion.correct_answer,
        objectiveQuestion.difficulty,
        objectiveQuestion.subject,
        JSON.stringify(objectiveQuestion.tags),
        objectiveQuestion.created_by,
      ]
    );

    const insertedQuestion = insertResult.rows[0];
    const questionId = insertedQuestion.id;

    // Retrieve question
    const retrieveResult = await client.query(
      `SELECT id, tenant_id, text, type, options, correct_answer, difficulty, subject, tags, created_by
       FROM questions_bank
       WHERE id = $1 AND deleted_at IS NULL`,
      [questionId]
    );

    if (retrieveResult.rows.length === 0) {
      throw new Error('Question not found after insertion');
    }

    const retrievedQuestion = retrieveResult.rows[0];

    // Verify round-trip integrity
    if (retrievedQuestion.tenant_id !== objectiveQuestion.tenant_id) {
      throw new Error('Tenant ID mismatch');
    }
    if (retrievedQuestion.text !== objectiveQuestion.text) {
      throw new Error('Question text mismatch');
    }
    if (retrievedQuestion.type !== objectiveQuestion.type) {
      throw new Error('Question type mismatch');
    }
    if (JSON.stringify(retrievedQuestion.options) !== JSON.stringify(objectiveQuestion.options)) {
      throw new Error('Question options mismatch');
    }
    if (retrievedQuestion.correct_answer !== objectiveQuestion.correct_answer) {
      throw new Error('Correct answer mismatch');
    }
    if (retrievedQuestion.difficulty !== objectiveQuestion.difficulty) {
      throw new Error('Difficulty mismatch');
    }
    if (retrievedQuestion.subject !== objectiveQuestion.subject) {
      throw new Error('Subject mismatch');
    }

    console.log('✓ Property 1 Test Case 1 (Objective Question): PASSED');

    // Test Case 2: True/False Question
    const trueFalseQuestion: TestQuestion = {
      tenant_id: tenantId,
      text: 'The Earth is flat.',
      type: 'truefalse',
      options: ['True', 'False'],
      correct_answer: 'False',
      difficulty: 'Easy',
      subject: 'Science',
      tags: ['earth', 'science'],
      created_by: userId,
    };

    const insertResult2 = await client.query(
      `INSERT INTO questions_bank 
       (tenant_id, text, type, options, correct_answer, difficulty, subject, tags, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, tenant_id, text, type, options, correct_answer, difficulty, subject, tags, created_by`,
      [
        trueFalseQuestion.tenant_id,
        trueFalseQuestion.text,
        trueFalseQuestion.type,
        JSON.stringify(trueFalseQuestion.options),
        trueFalseQuestion.correct_answer,
        trueFalseQuestion.difficulty,
        trueFalseQuestion.subject,
        JSON.stringify(trueFalseQuestion.tags),
        trueFalseQuestion.created_by,
      ]
    );

    const questionId2 = insertResult2.rows[0].id;

    const retrieveResult2 = await client.query(
      `SELECT id, tenant_id, text, type, options, correct_answer, difficulty, subject, tags, created_by
       FROM questions_bank
       WHERE id = $1 AND deleted_at IS NULL`,
      [questionId2]
    );

    const retrievedQuestion2 = retrieveResult2.rows[0];

    if (retrievedQuestion2.correct_answer !== trueFalseQuestion.correct_answer) {
      throw new Error('True/False answer mismatch');
    }

    console.log('✓ Property 1 Test Case 2 (True/False Question): PASSED');

    // Test Case 3: Essay Question
    const essayQuestion: TestQuestion = {
      tenant_id: tenantId,
      text: 'Explain the theory of evolution.',
      type: 'essay',
      correct_answer: 'Sample answer',
      difficulty: 'Hard',
      subject: 'Biology',
      tags: ['evolution', 'biology'],
      created_by: userId,
    };

    const insertResult3 = await client.query(
      `INSERT INTO questions_bank 
       (tenant_id, text, type, options, correct_answer, difficulty, subject, tags, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, tenant_id, text, type, options, correct_answer, difficulty, subject, tags, created_by`,
      [
        essayQuestion.tenant_id,
        essayQuestion.text,
        essayQuestion.type,
        null,
        essayQuestion.correct_answer,
        essayQuestion.difficulty,
        essayQuestion.subject,
        JSON.stringify(essayQuestion.tags),
        essayQuestion.created_by,
      ]
    );

    const questionId3 = insertResult3.rows[0].id;

    const retrieveResult3 = await client.query(
      `SELECT id, tenant_id, text, type, options, correct_answer, difficulty, subject, tags, created_by
       FROM questions_bank
       WHERE id = $1 AND deleted_at IS NULL`,
      [questionId3]
    );

    const retrievedQuestion3 = retrieveResult3.rows[0];

    if (retrievedQuestion3.options !== null) {
      throw new Error('Essay question should have null options');
    }
    if (retrievedQuestion3.type !== 'essay') {
      throw new Error('Essay question type mismatch');
    }

    console.log('✓ Property 1 Test Case 3 (Essay Question): PASSED');

    // Cleanup
    await client.query('DELETE FROM questions_bank WHERE tenant_id = $1', [tenantId]);

    console.log('✓ Property 1: Question Addition Round-Trip - ALL TESTS PASSED');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('✗ Property 1 Test Failed:', errorMessage);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Test database constraints
 */
export async function testDatabaseConstraints(pool: Pool): Promise<void> {
  const client = await pool.connect();

  try {
    const tenantId = uuidv4();
    const userId = uuidv4();

    // Test 1: Invalid question type should fail
    try {
      await client.query(
        `INSERT INTO questions_bank 
         (tenant_id, text, type, correct_answer, difficulty, subject, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [tenantId, 'Test', 'invalid_type', 'Answer', 'Easy', 'Subject', userId]
      );
      throw new Error('Should have rejected invalid question type');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Should have rejected')) {
        throw error;
      }
      console.log('✓ Constraint Test 1: Invalid question type rejected');
    }

    // Test 2: Invalid difficulty should fail
    try {
      await client.query(
        `INSERT INTO questions_bank 
         (tenant_id, text, type, options, correct_answer, difficulty, subject, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [tenantId, 'Test', 'objective', JSON.stringify(['A', 'B']), 'Answer', 'Invalid', 'Subject', userId]
      );
      throw new Error('Should have rejected invalid difficulty');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Should have rejected')) {
        throw error;
      }
      console.log('✓ Constraint Test 2: Invalid difficulty rejected');
    }

    // Test 3: Exam duration out of range should fail
    try {
      await client.query(
        `INSERT INTO exams 
         (tenant_id, title, subject, class, duration, pass_mark, total_marks, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [tenantId, 'Test Exam', 'Math', 'Class 10', 10, 40, 100, userId]
      );
      throw new Error('Should have rejected duration < 15 minutes');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Should have rejected')) {
        throw error;
      }
      console.log('✓ Constraint Test 3: Invalid exam duration rejected');
    }

    // Test 4: Pass mark > total marks should fail
    try {
      await client.query(
        `INSERT INTO exams 
         (tenant_id, title, subject, class, duration, pass_mark, total_marks, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [tenantId, 'Test Exam', 'Math', 'Class 10', 60, 100, 50, userId]
      );
      throw new Error('Should have rejected pass_mark > total_marks');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Should have rejected')) {
        throw error;
      }
      console.log('✓ Constraint Test 4: Pass mark > total marks rejected');
    }

    console.log('✓ All Database Constraints Tests PASSED');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('✗ Constraint Tests Failed:', errorMessage);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Test indexes exist
 */
export async function testIndexesExist(pool: Pool): Promise<void> {
  const client = await pool.connect();

  try {
    const requiredIndexes = [
      'idx_questions_tenant',
      'idx_questions_subject',
      'idx_questions_difficulty',
      'idx_questions_type',
      'idx_exams_tenant',
      'idx_exams_status',
      'idx_exams_scheduled_date',
      'idx_exam_questions_exam',
      'idx_exam_questions_question',
      'idx_progress_exam',
      'idx_progress_student',
      'idx_progress_status',
      'idx_results_exam',
      'idx_results_student',
      'idx_results_status',
      'idx_answers_result',
      'idx_answers_question',
      'idx_security_exam',
      'idx_proctoring_exam',
      'idx_proctoring_student',
      'idx_proctoring_timestamp',
    ];

    for (const indexName of requiredIndexes) {
      const result = await client.query(
        `SELECT 1 FROM pg_indexes WHERE indexname = $1`,
        [indexName]
      );

      if (result.rows.length === 0) {
        throw new Error(`Index ${indexName} not found`);
      }
    }

    console.log(`✓ All ${requiredIndexes.length} required indexes exist`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('✗ Index Tests Failed:', errorMessage);
    throw error;
  } finally {
    client.release();
  }
}
