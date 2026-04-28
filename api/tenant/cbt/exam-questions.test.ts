/**
 * Exam Questions API Tests
 * Property 8: Selected Questions Are Retrievable
 * For any exam with selected questions, querying the exam SHALL return all selected questions with their correct metadata.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Pool } from 'pg';
import {
  addQuestionToExam,
  removeQuestionFromExam,
  getExamQuestions,
  reorderExamQuestions,
  updateQuestionMarks,
  getExamTotalMarks,
  getExamQuestionCount,
} from './_lib/exam-questions';

// Create a fresh mock pool for each test
function createMockPool() {
  return {
    query: vi.fn(),
    connect: vi.fn(),
  } as unknown as Pool;
}

describe('Exam Questions API', () => {
  let mockPool: Pool;

  beforeEach(() => {
    mockPool = createMockPool();
  });

  describe('Property 8: Selected Questions Are Retrievable', () => {
    /**
     * Property 8 Test Case 1: Single Question Retrieval
     * When a question is added to an exam, querying the exam SHALL return that question with all metadata
     */
    it('should retrieve a single question added to an exam with all metadata', async () => {
      const tenantId = 'tenant-1';
      const examId = 'exam-1';
      const questionId = 'question-1';

      // Mock exam existence check
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId }],
      });

      // Mock question existence check
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ id: questionId }],
      });

      // Mock duplicate check
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [],
      });

      // Mock insert
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: 'eq-1',
            exam_id: examId,
            question_id: questionId,
            question_order: 1,
            marks: 5,
            created_at: new Date().toISOString(),
          },
        ],
      });

      // Add question to exam
      const addResult = await addQuestionToExam(mockPool, tenantId, examId, {
        questionId,
        questionOrder: 1,
        marks: 5,
      });

      expect(addResult).toMatchObject({
        examId,
        questionId,
        questionOrder: 1,
        marks: 5,
      });

      // Mock exam existence check for retrieval
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId }],
      });

      // Mock retrieval with full question details
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: 'eq-1',
            exam_id: examId,
            question_id: questionId,
            question_order: 1,
            marks: 5,
            created_at: new Date().toISOString(),
            text: 'What is 2+2?',
            type: 'objective',
            options: ['3', '4', '5', '6'],
            correct_answer: '4',
            difficulty: 'Easy',
            subject: 'Math',
            tags: ['arithmetic'],
          },
        ],
      });

      // Retrieve questions
      const questions = await getExamQuestions(mockPool, tenantId, examId);

      expect(questions).toHaveLength(1);
      expect(questions[0]).toMatchObject({
        examId,
        questionId,
        questionOrder: 1,
        marks: 5,
        text: 'What is 2+2?',
        type: 'objective',
        options: ['3', '4', '5', '6'],
        correctAnswer: '4',
        difficulty: 'Easy',
        subject: 'Math',
        tags: ['arithmetic'],
      });
    });

    /**
     * Property 8 Test Case 2: Multiple Questions Retrieval
     * When multiple questions are added to an exam, querying SHALL return all questions in correct order
     */
    it('should retrieve multiple questions in correct order', async () => {
      const tenantId = 'tenant-1';
      const examId = 'exam-1';
      const questions = [
        { id: 'q-1', order: 1, marks: 5 },
        { id: 'q-2', order: 2, marks: 3 },
        { id: 'q-3', order: 3, marks: 4 },
      ];

      // Mock exam existence check
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId }],
      });

      // Mock retrieval with all questions
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: 'eq-1',
            exam_id: examId,
            question_id: 'q-1',
            question_order: 1,
            marks: 5,
            created_at: new Date().toISOString(),
            text: 'Question 1',
            type: 'objective',
            options: ['A', 'B', 'C', 'D'],
            correct_answer: 'A',
            difficulty: 'Easy',
            subject: 'Math',
            tags: [],
          },
          {
            id: 'eq-2',
            exam_id: examId,
            question_id: 'q-2',
            question_order: 2,
            marks: 3,
            created_at: new Date().toISOString(),
            text: 'Question 2',
            type: 'truefalse',
            options: ['True', 'False'],
            correct_answer: 'True',
            difficulty: 'Medium',
            subject: 'Science',
            tags: [],
          },
          {
            id: 'eq-3',
            exam_id: examId,
            question_id: 'q-3',
            question_order: 3,
            marks: 4,
            created_at: new Date().toISOString(),
            text: 'Question 3',
            type: 'objective',
            options: ['X', 'Y', 'Z'],
            correct_answer: 'Y',
            difficulty: 'Hard',
            subject: 'English',
            tags: [],
          },
        ],
      });

      const retrievedQuestions = await getExamQuestions(mockPool, tenantId, examId);

      expect(retrievedQuestions).toHaveLength(3);
      expect(retrievedQuestions[0].questionOrder).toBe(1);
      expect(retrievedQuestions[1].questionOrder).toBe(2);
      expect(retrievedQuestions[2].questionOrder).toBe(3);
      expect(retrievedQuestions[0].text).toBe('Question 1');
      expect(retrievedQuestions[1].text).toBe('Question 2');
      expect(retrievedQuestions[2].text).toBe('Question 3');
    });

    /**
     * Property 8 Test Case 3: Question Metadata Preservation
     * When questions are retrieved, all metadata fields SHALL be preserved exactly as stored
     */
    it('should preserve all question metadata fields', async () => {
      const tenantId = 'tenant-1';
      const examId = 'exam-1';

      // Mock exam existence check
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId }],
      });

      const createdAt = new Date().toISOString();

      // Mock retrieval with complete metadata
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: 'eq-1',
            exam_id: examId,
            question_id: 'q-1',
            question_order: 1,
            marks: 5.5,
            created_at: createdAt,
            text: 'Complex question with special chars: @#$%',
            type: 'objective',
            options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
            correct_answer: 'Option 2',
            difficulty: 'Hard',
            subject: 'Advanced Mathematics',
            tags: ['calculus', 'derivatives', 'integration'],
          },
        ],
      });

      const questions = await getExamQuestions(mockPool, tenantId, examId);

      expect(questions[0]).toMatchObject({
        id: 'eq-1',
        examId,
        questionId: 'q-1',
        questionOrder: 1,
        marks: 5.5,
        text: 'Complex question with special chars: @#$%',
        type: 'objective',
        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
        correctAnswer: 'Option 2',
        difficulty: 'Hard',
        subject: 'Advanced Mathematics',
        tags: ['calculus', 'derivatives', 'integration'],
      });
    });

    /**
     * Property 8 Test Case 4: Empty Exam Question Retrieval
     * When an exam has no questions, querying SHALL return an empty array
     */
    it('should return empty array for exam with no questions', async () => {
      const tenantId = 'tenant-1';
      const examId = 'exam-1';

      // Mock exam existence check
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId }],
      });

      // Mock retrieval with no questions
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [],
      });

      const questions = await getExamQuestions(mockPool, tenantId, examId);

      expect(questions).toHaveLength(0);
      expect(Array.isArray(questions)).toBe(true);
    });

    /**
     * Property 8 Test Case 5: Question Retrieval After Removal
     * When a question is removed from an exam, subsequent retrieval SHALL not include that question
     */
    it('should not retrieve question after removal', async () => {
      const tenantId = 'tenant-1';
      const examId = 'exam-1';
      const questionId = 'q-1';

      // Mock exam existence check for removal
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId }],
      });

      // Mock deletion
      (mockPool.query as any).mockResolvedValueOnce({
        rowCount: 1,
      });

      const deleted = await removeQuestionFromExam(mockPool, tenantId, examId, questionId);
      expect(deleted).toBe(true);

      // Mock exam existence check for retrieval
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId }],
      });

      // Mock retrieval with no questions
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [],
      });

      const questions = await getExamQuestions(mockPool, tenantId, examId);
      expect(questions).toHaveLength(0);
    });

    /**
     * Property 8 Test Case 6: Question Retrieval After Reordering
     * When questions are reordered, retrieval SHALL return them in the new order
     */
    it('should retrieve questions in new order after reordering', async () => {
      const tenantId = 'tenant-1';
      const examId = 'exam-1';

      // Mock exam existence check
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId }],
      });

      // Mock update for first question
      (mockPool.query as any).mockResolvedValueOnce({
        rowCount: 1,
      });

      // Mock update for second question
      (mockPool.query as any).mockResolvedValueOnce({
        rowCount: 1,
      });

      // Mock exam existence check for retrieval
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId }],
      });

      // Mock retrieval after reordering
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: 'eq-1',
            exam_id: examId,
            question_id: 'q-1',
            question_order: 2,
            marks: 5,
            created_at: new Date().toISOString(),
            text: 'Question 1',
            type: 'objective',
            options: ['A', 'B'],
            correct_answer: 'A',
            difficulty: 'Easy',
            subject: 'Math',
            tags: [],
          },
          {
            id: 'eq-2',
            exam_id: examId,
            question_id: 'q-2',
            question_order: 1,
            marks: 3,
            created_at: new Date().toISOString(),
            text: 'Question 2',
            type: 'truefalse',
            options: ['True', 'False'],
            correct_answer: 'True',
            difficulty: 'Medium',
            subject: 'Science',
            tags: [],
          },
        ],
      });

      const reordered = await reorderExamQuestions(mockPool, tenantId, examId, [
        { questionId: 'q-1', order: 2 },
        { questionId: 'q-2', order: 1 },
      ]);

      expect(reordered).toHaveLength(2);
      expect(reordered[0].questionOrder).toBe(2);
      expect(reordered[1].questionOrder).toBe(1);
    });
  });

  describe('Additional Exam Questions Tests', () => {
    /**
     * Test: Update Question Marks
     */
    it('should update question marks in exam', async () => {
      const tenantId = 'tenant-1';
      const examId = 'exam-1';
      const questionId = 'q-1';

      // Mock exam existence check
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId }],
      });

      // Mock update
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: 'eq-1',
            exam_id: examId,
            question_id: questionId,
            question_order: 1,
            marks: 10,
            created_at: new Date().toISOString(),
          },
        ],
      });

      const updated = await updateQuestionMarks(mockPool, tenantId, examId, questionId, 10);

      expect(updated.marks).toBe(10);
    });

    /**
     * Test: Get Exam Total Marks
     */
    it('should calculate total marks for exam', async () => {
      const tenantId = 'tenant-1';
      const examId = 'exam-1';

      // Mock exam existence check
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId }],
      });

      // Mock total marks calculation
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ total_marks: '12' }],
      });

      const totalMarks = await getExamTotalMarks(mockPool, tenantId, examId);

      expect(totalMarks).toBe(12);
    });

    /**
     * Test: Get Exam Question Count
     */
    it('should count questions in exam', async () => {
      const tenantId = 'tenant-1';
      const examId = 'exam-1';

      // Mock exam existence check
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId }],
      });

      // Mock question count
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ count: '3' }],
      });

      const count = await getExamQuestionCount(mockPool, tenantId, examId);

      expect(count).toBe(3);
    });

    /**
     * Test: Validation - Invalid Marks
     */
    it('should reject invalid marks', async () => {
      const tenantId = 'tenant-1';
      const examId = 'exam-1';

      // Mock exam existence check
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId }],
      });

      // Mock question existence check
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ id: 'q-1' }],
      });

      // Mock duplicate check
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [],
      });

      await expect(
        addQuestionToExam(mockPool, tenantId, examId, {
          questionId: 'q-1',
          questionOrder: 1,
          marks: 0,
        })
      ).rejects.toThrow('Marks must be greater than 0');
    });

    /**
     * Test: Validation - Invalid Question Order
     */
    it('should reject invalid question order', async () => {
      const tenantId = 'tenant-1';
      const examId = 'exam-1';

      // Mock exam existence check
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId }],
      });

      // Mock question existence check
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ id: 'q-1' }],
      });

      // Mock duplicate check
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [],
      });

      await expect(
        addQuestionToExam(mockPool, tenantId, examId, {
          questionId: 'q-1',
          questionOrder: 0,
          marks: 5,
        })
      ).rejects.toThrow('Question order must be at least 1');
    });

    /**
     * Test: Duplicate Question Prevention
     */
    it('should prevent adding duplicate question to exam', async () => {
      const tenantId = 'tenant-1';
      const examId = 'exam-1';
      const questionId = 'q-1';

      // Mock exam existence check
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId }],
      });

      // Mock question existence check
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ id: questionId }],
      });

      // Mock duplicate check - question already exists
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ id: 'eq-1' }],
      });

      await expect(
        addQuestionToExam(mockPool, tenantId, examId, {
          questionId,
          questionOrder: 1,
          marks: 5,
        })
      ).rejects.toThrow('Question already added to this exam');
    });

    /**
     * Test: Non-existent Exam
     */
    it('should reject adding question to non-existent exam', async () => {
      const tenantId = 'tenant-1';
      const examId = 'exam-1';

      // Mock exam existence check - exam not found
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [],
      });

      await expect(
        addQuestionToExam(mockPool, tenantId, examId, {
          questionId: 'q-1',
          questionOrder: 1,
          marks: 5,
        })
      ).rejects.toThrow('Exam not found');
    });

    /**
     * Test: Non-existent Question
     */
    it('should reject adding non-existent question to exam', async () => {
      const tenantId = 'tenant-1';
      const examId = 'exam-1';

      // Mock exam existence check
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId }],
      });

      // Mock question existence check - question not found
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [],
      });

      await expect(
        addQuestionToExam(mockPool, tenantId, examId, {
          questionId: 'q-1',
          questionOrder: 1,
          marks: 5,
        })
      ).rejects.toThrow('Question not found');
    });
  });
});
