/**
 * Exam Validation Tests
 * Property 9: Exam Validation Rejects Invalid Data
 * For any exam form with missing required fields or invalid values, validation SHALL fail and prevent submission.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Pool } from 'pg';
import {
  validateExamCreation,
  validateExamUpdate,
  validateExamScheduling,
  validateExamCompletion,
  formatValidationErrors,
  type ExamValidationInput,
} from './_lib/exam-validation';

// Create a fresh mock pool for each test
function createMockPool() {
  return {
    query: vi.fn(),
  } as unknown as Pool;
}

describe('Exam Validation', () => {
  let mockPool: Pool;

  beforeEach(() => {
    mockPool = createMockPool();
  });

  describe('Property 9: Exam Validation Rejects Invalid Data', () => {
    /**
     * Property 9 Test Case 1: Missing Required Fields
     * When required fields are missing, validation SHALL fail
     */
    it('should reject exam with missing required fields', () => {
      const input: ExamValidationInput = {
        // All fields missing
      };

      const result = validateExamCreation(input);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.map((e) => e.field)).toContain('title');
      expect(result.errors.map((e) => e.field)).toContain('subject');
      expect(result.errors.map((e) => e.field)).toContain('class');
      expect(result.errors.map((e) => e.field)).toContain('duration');
      expect(result.errors.map((e) => e.field)).toContain('pass_mark');
      expect(result.errors.map((e) => e.field)).toContain('total_marks');
      expect(result.errors.map((e) => e.field)).toContain('questionIds');
    });

    /**
     * Property 9 Test Case 2: Invalid Duration Range
     * When duration is outside 15-480 range, validation SHALL fail
     */
    it('should reject exam with invalid duration', () => {
      const validInput: ExamValidationInput = {
        title: 'Valid Exam',
        subject: 'Math',
        class: 'Class 10',
        pass_mark: 40,
        total_marks: 100,
        questionIds: ['q-1'],
      };

      // Test duration too low
      let result = validateExamCreation({ ...validInput, duration: 10 });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'duration')).toBe(true);

      // Test duration too high
      result = validateExamCreation({ ...validInput, duration: 500 });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'duration')).toBe(true);

      // Test valid duration
      result = validateExamCreation({ ...validInput, duration: 120 });
      expect(result.errors.some((e) => e.field === 'duration')).toBe(false);
    });

    /**
     * Property 9 Test Case 3: Invalid Pass Mark Range
     * When pass mark is outside 0-100 range, validation SHALL fail
     */
    it('should reject exam with invalid pass mark', () => {
      const validInput: ExamValidationInput = {
        title: 'Valid Exam',
        subject: 'Math',
        class: 'Class 10',
        duration: 120,
        total_marks: 100,
        questionIds: ['q-1'],
      };

      // Test pass mark too low
      let result = validateExamCreation({ ...validInput, pass_mark: -5 });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'pass_mark')).toBe(true);

      // Test pass mark too high
      result = validateExamCreation({ ...validInput, pass_mark: 150 });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'pass_mark')).toBe(true);

      // Test valid pass mark
      result = validateExamCreation({ ...validInput, pass_mark: 50 });
      expect(result.errors.some((e) => e.field === 'pass_mark')).toBe(false);
    });

    /**
     * Property 9 Test Case 4: Total Marks Not Greater Than Pass Mark
     * When total marks <= pass mark, validation SHALL fail
     */
    it('should reject exam where total marks not greater than pass mark', () => {
      const validInput: ExamValidationInput = {
        title: 'Valid Exam',
        subject: 'Math',
        class: 'Class 10',
        duration: 120,
        questionIds: ['q-1'],
      };

      // Test total marks equal to pass mark
      let result = validateExamCreation({
        ...validInput,
        pass_mark: 50,
        total_marks: 50,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'total_marks')).toBe(true);

      // Test total marks less than pass mark
      result = validateExamCreation({
        ...validInput,
        pass_mark: 60,
        total_marks: 50,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'total_marks')).toBe(true);

      // Test valid relationship
      result = validateExamCreation({
        ...validInput,
        pass_mark: 40,
        total_marks: 100,
      });
      expect(result.errors.some((e) => e.field === 'total_marks')).toBe(false);
    });

    /**
     * Property 9 Test Case 5: No Questions Selected
     * When no questions are selected, validation SHALL fail
     */
    it('should reject exam with no questions selected', () => {
      const validInput: ExamValidationInput = {
        title: 'Valid Exam',
        subject: 'Math',
        class: 'Class 10',
        duration: 120,
        pass_mark: 40,
        total_marks: 100,
      };

      // Test with no questionIds
      let result = validateExamCreation(validInput);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'questionIds')).toBe(true);

      // Test with empty questionIds array
      result = validateExamCreation({ ...validInput, questionIds: [] });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'questionIds')).toBe(true);

      // Test with questions selected
      result = validateExamCreation({ ...validInput, questionIds: ['q-1', 'q-2'] });
      expect(result.errors.some((e) => e.field === 'questionIds')).toBe(false);
    });

    /**
     * Property 9 Test Case 6: Invalid Scheduled Date
     * When scheduled date is in the past, validation SHALL fail
     */
    it('should reject exam with past scheduled date', () => {
      const validInput: ExamValidationInput = {
        title: 'Valid Exam',
        subject: 'Math',
        class: 'Class 10',
        duration: 120,
        pass_mark: 40,
        total_marks: 100,
        questionIds: ['q-1'],
      };

      // Test with past date
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      let result = validateExamCreation({
        ...validInput,
        scheduled_date: pastDateStr,
        scheduled_time: '10:00',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'scheduled_date')).toBe(true);

      // Test with future date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      result = validateExamCreation({
        ...validInput,
        scheduled_date: futureDateStr,
        scheduled_time: '10:00',
      });
      expect(result.errors.some((e) => e.field === 'scheduled_date')).toBe(false);
    });

    /**
     * Property 9 Test Case 7: Empty String Fields
     * When required fields are empty strings, validation SHALL fail
     */
    it('should reject exam with empty string fields', () => {
      const result = validateExamCreation({
        title: '   ',
        subject: '',
        class: '  ',
        duration: 120,
        pass_mark: 40,
        total_marks: 100,
        questionIds: ['q-1'],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'title')).toBe(true);
      expect(result.errors.some((e) => e.field === 'subject')).toBe(true);
      expect(result.errors.some((e) => e.field === 'class')).toBe(true);
    });

    /**
     * Property 9 Test Case 8: Valid Exam Data
     * When all fields are valid, validation SHALL pass
     */
    it('should accept exam with all valid data', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const result = validateExamCreation({
        title: 'Mathematics Final Exam',
        subject: 'Mathematics',
        class: 'Class 10',
        duration: 180,
        pass_mark: 40,
        total_marks: 100,
        scheduled_date: futureDateStr,
        scheduled_time: '10:00',
        questionIds: ['q-1', 'q-2', 'q-3'],
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Exam Update Validation', () => {
    /**
     * Test: Partial Update Validation
     * When updating only some fields, only those fields are validated
     */
    it('should validate only provided fields in update', () => {
      // Update only duration
      let result = validateExamUpdate({ duration: 10 });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'duration')).toBe(true);

      // Update with valid duration
      result = validateExamUpdate({ duration: 120 });
      expect(result.isValid).toBe(true);

      // Update title and subject
      result = validateExamUpdate({
        title: 'Updated Title',
        subject: 'Updated Subject',
      });
      expect(result.isValid).toBe(true);
    });

    /**
     * Test: Update with Invalid Pass Mark
     */
    it('should reject update with invalid pass mark', () => {
      const result = validateExamUpdate({ pass_mark: 150 });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'pass_mark')).toBe(true);
    });
  });

  describe('Exam Scheduling Validation', () => {
    /**
     * Test: Scheduling Validation with No Questions
     */
    it('should reject scheduling exam with no questions', async () => {
      const tenantId = 'tenant-1';
      const examId = 'exam-1';

      // Mock exam existence check
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId }],
      });

      // Mock question count check - no questions
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ count: '0' }],
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const result = await validateExamScheduling(
        mockPool,
        tenantId,
        examId,
        futureDateStr,
        '10:00'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'questions')).toBe(true);
    });

    /**
     * Test: Scheduling Validation with Questions
     */
    it('should accept scheduling exam with questions', async () => {
      const tenantId = 'tenant-1';
      const examId = 'exam-1';

      // Mock exam existence check
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId }],
      });

      // Mock question count check - has questions
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ count: '5' }],
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const result = await validateExamScheduling(
        mockPool,
        tenantId,
        examId,
        futureDateStr,
        '10:00'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    /**
     * Test: Scheduling Non-existent Exam
     */
    it('should reject scheduling non-existent exam', async () => {
      const tenantId = 'tenant-1';
      const examId = 'exam-1';

      // Mock exam existence check - exam not found
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [],
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const result = await validateExamScheduling(
        mockPool,
        tenantId,
        examId,
        futureDateStr,
        '10:00'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'examId')).toBe(true);
    });
  });

  describe('Exam Completion Validation', () => {
    /**
     * Test: Completion Validation for Ongoing Exam
     */
    it('should accept completion for ongoing exam with questions', async () => {
      const tenantId = 'tenant-1';
      const examId = 'exam-1';

      // Mock exam check
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            title: 'Test Exam',
            subject: 'Math',
            class: 'Class 10',
            duration: 120,
            pass_mark: 40,
            total_marks: 100,
            status: 'Ongoing',
          },
        ],
      });

      // Mock question count check
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ count: '5' }],
      });

      const result = await validateExamCompletion(mockPool, tenantId, examId);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    /**
     * Test: Completion Validation for Non-Ongoing Exam
     */
    it('should reject completion for non-ongoing exam', async () => {
      const tenantId = 'tenant-1';
      const examId = 'exam-1';

      // Mock exam check - exam is Draft
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            title: 'Test Exam',
            subject: 'Math',
            class: 'Class 10',
            duration: 120,
            pass_mark: 40,
            total_marks: 100,
            status: 'Draft',
          },
        ],
      });

      // Mock question count check (won't be used but needed for mock sequence)
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ count: '5' }],
      });

      const result = await validateExamCompletion(mockPool, tenantId, examId);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'status')).toBe(true);
    });
  });

  describe('Validation Error Formatting', () => {
    /**
     * Test: Format Validation Errors
     */
    it('should format validation errors correctly', () => {
      const errors = [
        { field: 'title', message: 'Title is required' },
        { field: 'duration', message: 'Duration must be between 15 and 480' },
        { field: 'pass_mark', message: 'Pass mark must be between 0 and 100' },
      ];

      const formatted = formatValidationErrors(errors);

      expect(formatted).toEqual({
        title: 'Title is required',
        duration: 'Duration must be between 15 and 480',
        pass_mark: 'Pass mark must be between 0 and 100',
      });
    });
  });

  describe('Field Length Validation', () => {
    /**
     * Test: Title Length Validation
     */
    it('should reject title exceeding 255 characters', () => {
      const longTitle = 'a'.repeat(256);
      const result = validateExamCreation({
        title: longTitle,
        subject: 'Math',
        class: 'Class 10',
        duration: 120,
        pass_mark: 40,
        total_marks: 100,
        questionIds: ['q-1'],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'title')).toBe(true);
    });

    /**
     * Test: Subject Length Validation
     */
    it('should reject subject exceeding 100 characters', () => {
      const longSubject = 'a'.repeat(101);
      const result = validateExamCreation({
        title: 'Valid Title',
        subject: longSubject,
        class: 'Class 10',
        duration: 120,
        pass_mark: 40,
        total_marks: 100,
        questionIds: ['q-1'],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'subject')).toBe(true);
    });

    /**
     * Test: Class Length Validation
     */
    it('should reject class exceeding 50 characters', () => {
      const longClass = 'a'.repeat(51);
      const result = validateExamCreation({
        title: 'Valid Title',
        subject: 'Math',
        class: longClass,
        duration: 120,
        pass_mark: 40,
        total_marks: 100,
        questionIds: ['q-1'],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'class')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    /**
     * Test: Zero Total Marks
     */
    it('should reject exam with zero total marks', () => {
      const result = validateExamCreation({
        title: 'Valid Title',
        subject: 'Math',
        class: 'Class 10',
        duration: 120,
        pass_mark: 0,
        total_marks: 0,
        questionIds: ['q-1'],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'total_marks')).toBe(true);
    });

    /**
     * Test: Boundary Duration Values
     */
    it('should accept boundary duration values', () => {
      let result = validateExamCreation({
        title: 'Valid Title',
        subject: 'Math',
        class: 'Class 10',
        duration: 15,
        pass_mark: 40,
        total_marks: 100,
        questionIds: ['q-1'],
      });
      expect(result.errors.some((e) => e.field === 'duration')).toBe(false);

      result = validateExamCreation({
        title: 'Valid Title',
        subject: 'Math',
        class: 'Class 10',
        duration: 480,
        pass_mark: 40,
        total_marks: 100,
        questionIds: ['q-1'],
      });
      expect(result.errors.some((e) => e.field === 'duration')).toBe(false);
    });

    /**
     * Test: Boundary Pass Mark Values
     */
    it('should accept boundary pass mark values', () => {
      let result = validateExamCreation({
        title: 'Valid Title',
        subject: 'Math',
        class: 'Class 10',
        duration: 120,
        pass_mark: 0,
        total_marks: 100,
        questionIds: ['q-1'],
      });
      expect(result.errors.some((e) => e.field === 'pass_mark')).toBe(false);

      result = validateExamCreation({
        title: 'Valid Title',
        subject: 'Math',
        class: 'Class 10',
        duration: 120,
        pass_mark: 100,
        total_marks: 100,
        questionIds: ['q-1'],
      });
      expect(result.errors.some((e) => e.field === 'pass_mark')).toBe(false);
    });
  });
});
