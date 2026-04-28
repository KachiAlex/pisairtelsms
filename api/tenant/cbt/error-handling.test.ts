/**
 * Error Handling and Validation Tests - Phase 9
 * Property 33: API Errors Display User-Friendly Messages
 * Property 34: Validation Occurs on Both Client and Server
 * Property 35: Invalid Data Rejected with Error Display
 * Property 36: Database Errors Are Logged and Reported
 * Property 37: Network Errors Allow Retry
 * Property 39: Duplicate Questions Trigger Warning
 * Property 40: Exams Without Questions Cannot Be Scheduled
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { Pool } from 'pg';
import {
  generateRequestId,
  logError,
  getUserFriendlyMessage,
  createValidationError,
  createNotFoundError,
  createDatabaseError,
  createNetworkError,
  isRetryableError,
  calculateRetryDelay,
  DEFAULT_RETRY_CONFIG,
  ErrorType,
} from './_lib/error-handler';
import {
  validateQuestion,
  validateExam,
  validateExamHasQuestions,
  formatValidationErrors,
} from './_lib/validation-middleware';
import {
  checkExactDuplicate,
  checkSimilarQuestions,
  generateDuplicateWarning,
  calculateQuestionHash,
  calculateSimilarity,
} from './_lib/duplicate-detection';

let pool: Pool;

beforeAll(async () => {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
});

afterAll(async () => {
  await pool.end();
});

describe('Error Handling - Property 33: API Errors Display User-Friendly Messages', () => {
  describe('User-Friendly Error Messages', () => {
    it('should return user-friendly message for validation errors', () => {
      const error = createValidationError({ field: 'test error' });
      const message = getUserFriendlyMessage(error);
      expect(message).toContain('invalid');
      expect(message.toLowerCase()).not.toContain('database');
      expect(message.toLowerCase()).not.toContain('internal');
    });

    it('should return user-friendly message for not found errors', () => {
      const error = createNotFoundError('Resource');
      const message = getUserFriendlyMessage(error);
      expect(message).toContain('not found');
    });

    it('should return user-friendly message for database errors', () => {
      const error = createDatabaseError(new Error('Connection timeout'));
      const message = getUserFriendlyMessage(error);
      expect(message).toContain('database');
      expect(message).not.toContain('Connection timeout');
    });

    it('should return user-friendly message for network errors', () => {
      const error = createNetworkError(new Error('Network unreachable'));
      const message = getUserFriendlyMessage(error);
      expect(message).toContain('network');
      expect(message).not.toContain('Network unreachable');
    });

    it('should never expose internal error details to user', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (errorMsg) => {
          const error = createInternalError(new Error(errorMsg));
          const message = getUserFriendlyMessage(error);
          expect(message).not.toContain(errorMsg);
          expect(message).not.toContain('stack');
          expect(message).not.toContain('trace');
        })
      );
    });
  });

  describe('Request ID Generation', () => {
    it('should generate unique request IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateRequestId());
      }
      expect(ids.size).toBe(100);
    });

    it('should generate request IDs with correct format', () => {
      const id = generateRequestId();
      expect(id).toMatch(/^req-[a-f0-9]{8}$/);
    });
  });
});

describe('Validation - Property 34: Validation Occurs on Both Client and Server', () => {
  describe('Question Validation', () => {
    it('should reject questions with empty text', () => {
      const result = validateQuestion({
        text: '',
        type: 'objective',
        options: ['A', 'B'],
        correct_answer: 'A',
        difficulty: 'Easy',
        subject: 'Math',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'text')).toBe(true);
    });

    it('should reject questions with invalid type', () => {
      const result = validateQuestion({
        text: 'What is 2+2?',
        type: 'invalid',
        options: ['A', 'B'],
        correct_answer: 'A',
        difficulty: 'Easy',
        subject: 'Math',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'type')).toBe(true);
    });

    it('should reject objective questions without options', () => {
      const result = validateQuestion({
        text: 'What is 2+2?',
        type: 'objective',
        options: [],
        correct_answer: 'A',
        difficulty: 'Easy',
        subject: 'Math',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'options')).toBe(true);
    });

    it('should reject questions with invalid difficulty', () => {
      const result = validateQuestion({
        text: 'What is 2+2?',
        type: 'objective',
        options: ['A', 'B'],
        correct_answer: 'A',
        difficulty: 'VeryHard',
        subject: 'Math',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'difficulty')).toBe(true);
    });

    it('should accept valid objective questions', () => {
      const result = validateQuestion({
        text: 'What is 2+2?',
        type: 'objective',
        options: ['3', '4', '5'],
        correct_answer: '4',
        difficulty: 'Easy',
        subject: 'Math',
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid essay questions', () => {
      const result = validateQuestion({
        text: 'Explain the theory of relativity',
        type: 'essay',
        correct_answer: 'Any reasonable explanation',
        difficulty: 'Hard',
        subject: 'Physics',
      });
      expect(result.isValid).toBe(true);
    });

    it('should validate question text length', () => {
      const longText = 'a'.repeat(1001);
      const result = validateQuestion({
        text: longText,
        type: 'objective',
        options: ['A', 'B'],
        correct_answer: 'A',
        difficulty: 'Easy',
        subject: 'Math',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'text')).toBe(true);
    });

    it('should validate correct answer is in options', () => {
      const result = validateQuestion({
        text: 'What is 2+2?',
        type: 'objective',
        options: ['3', '5', '6'],
        correct_answer: '4',
        difficulty: 'Easy',
        subject: 'Math',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'correct_answer')).toBe(true);
    });
  });

  describe('Exam Validation', () => {
    it('should reject exams with empty title', () => {
      const result = validateExam({
        title: '',
        subject: 'Math',
        class: 'Class 10',
        duration: 60,
        pass_mark: 40,
        total_marks: 100,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'title')).toBe(true);
    });

    it('should reject exams with invalid duration', () => {
      const result = validateExam({
        title: 'Math Exam',
        subject: 'Math',
        class: 'Class 10',
        duration: 10,
        pass_mark: 40,
        total_marks: 100,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'duration')).toBe(true);
    });

    it('should reject exams with pass mark > total marks', () => {
      const result = validateExam({
        title: 'Math Exam',
        subject: 'Math',
        class: 'Class 10',
        duration: 60,
        pass_mark: 100,
        total_marks: 80,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'total_marks')).toBe(true);
    });

    it('should accept valid exams', () => {
      const result = validateExam({
        title: 'Math Exam',
        subject: 'Math',
        class: 'Class 10',
        duration: 60,
        pass_mark: 40,
        total_marks: 100,
      });
      expect(result.isValid).toBe(true);
    });

    it('should validate duration range', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 1000 }), (duration) => {
          const result = validateExam({
            title: 'Exam',
            subject: 'Math',
            class: 'Class 10',
            duration,
            pass_mark: 40,
            total_marks: 100,
          });
          if (duration >= 15 && duration <= 480) {
            expect(result.errors.some((e) => e.field === 'duration')).toBe(false);
          } else {
            expect(result.errors.some((e) => e.field === 'duration')).toBe(true);
          }
        })
      );
    });
  });
});

describe('Invalid Data Rejection - Property 35: Invalid Data Rejected with Error Display', () => {
  describe('Validation Error Formatting', () => {
    it('should format validation errors correctly', () => {
      const errors = [
        { field: 'title', message: 'Title is required' },
        { field: 'subject', message: 'Subject is required' },
      ];
      const formatted = formatValidationErrors(errors);
      expect(formatted.title).toBe('Title is required');
      expect(formatted.subject).toBe('Subject is required');
    });

    it('should handle empty error list', () => {
      const formatted = formatValidationErrors([]);
      expect(Object.keys(formatted)).toHaveLength(0);
    });

    it('should preserve error messages exactly', () => {
      fc.assert(
        fc.property(fc.string(), (message) => {
          const errors = [{ field: 'test', message }];
          const formatted = formatValidationErrors(errors);
          expect(formatted.test).toBe(message);
        })
      );
    });
  });

  describe('Invalid Data Rejection', () => {
    it('should reject questions with all invalid fields', () => {
      const result = validateQuestion({
        text: '',
        type: 'invalid',
        options: [],
        correct_answer: '',
        difficulty: 'Invalid',
        subject: '',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject exams with all invalid fields', () => {
      const result = validateExam({
        title: '',
        subject: '',
        class: '',
        duration: 0,
        pass_mark: 150,
        total_marks: 50,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('Database Error Handling - Property 36: Database Errors Are Logged and Reported', () => {
  describe('Error Logging', () => {
    it('should create database error with original error', () => {
      const originalError = new Error('Connection failed');
      const error = createDatabaseError(originalError);
      expect(error.type).toBe(ErrorType.DATABASE);
      expect(error.originalError).toBe(originalError);
      expect(error.statusCode).toBe(500);
    });

    it('should identify retryable errors', () => {
      const dbError = createDatabaseError(new Error('Connection timeout'));
      expect(isRetryableError(dbError)).toBe(true);

      const validationError = createValidationError({ field: 'test' });
      expect(isRetryableError(validationError)).toBe(false);
    });

    it('should calculate retry delays with exponential backoff', () => {
      const delay1 = calculateRetryDelay(1);
      const delay2 = calculateRetryDelay(2);
      const delay3 = calculateRetryDelay(3);

      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
      expect(delay2).toBe(delay1 * 2);
      expect(delay3).toBe(delay1 * 4);
    });

    it('should cap retry delays at max', () => {
      const maxDelay = calculateRetryDelay(100);
      expect(maxDelay).toBeLessThanOrEqual(DEFAULT_RETRY_CONFIG.maxDelayMs);
    });
  });
});

describe('Network Error Handling - Property 37: Network Errors Allow Retry', () => {
  describe('Retry Configuration', () => {
    it('should identify network errors as retryable', () => {
      const error = createNetworkError(new Error('Connection refused'));
      expect(isRetryableError(error)).toBe(true);
    });

    it('should calculate exponential backoff correctly', () => {
      const config = {
        maxRetries: 3,
        initialDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2,
      };

      const delay1 = calculateRetryDelay(1, config);
      const delay2 = calculateRetryDelay(2, config);
      const delay3 = calculateRetryDelay(3, config);

      expect(delay1).toBe(100);
      expect(delay2).toBe(200);
      expect(delay3).toBe(400);
    });

    it('should not exceed max delay', () => {
      const config = {
        maxRetries: 10,
        initialDelayMs: 100,
        maxDelayMs: 500,
        backoffMultiplier: 2,
      };

      for (let i = 1; i <= 10; i++) {
        const delay = calculateRetryDelay(i, config);
        expect(delay).toBeLessThanOrEqual(config.maxDelayMs);
      }
    });
  });
});

describe('Duplicate Detection - Property 39: Duplicate Questions Trigger Warning', () => {
  describe('Duplicate Detection', () => {
    it('should calculate question hash consistently', () => {
      const hash1 = calculateQuestionHash('What is 2+2?', '4', 'objective');
      const hash2 = calculateQuestionHash('What is 2+2?', '4', 'objective');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different questions', () => {
      const hash1 = calculateQuestionHash('What is 2+2?', '4', 'objective');
      const hash2 = calculateQuestionHash('What is 3+3?', '6', 'objective');
      expect(hash1).not.toBe(hash2);
    });

    it('should calculate similarity between identical strings', () => {
      const similarity = calculateSimilarity('What is 2+2?', 'What is 2+2?');
      expect(similarity).toBe(1);
    });

    it('should calculate similarity between different strings', () => {
      const similarity = calculateSimilarity('What is 2+2?', 'What is 3+3?');
      expect(similarity).toBeLessThan(1);
      expect(similarity).toBeGreaterThan(0);
    });

    it('should generate duplicate warning for exact duplicates', () => {
      const checkResult = {
        isDuplicate: true,
        existingQuestion: {
          id: '123',
          text: 'What is 2+2?',
          subject: 'Math',
          difficulty: 'Easy',
          createdAt: new Date(),
        },
        similarity: 1,
      };

      const warning = generateDuplicateWarning(checkResult);
      expect(warning).not.toBeNull();
      expect(warning?.type).toBe('exact');
      expect(warning?.message).toContain('identical');
    });

    it('should generate duplicate warning for similar questions', () => {
      const checkResult = {
        isDuplicate: false,
        existingQuestion: {
          id: '123',
          text: 'What is 2+2?',
          subject: 'Math',
          difficulty: 'Easy',
          createdAt: new Date(),
        },
        similarity: 0.9,
      };

      const warning = generateDuplicateWarning(checkResult);
      expect(warning).not.toBeNull();
      expect(warning?.type).toBe('similar');
      expect(warning?.message).toContain('90%');
    });

    it('should not generate warning for non-duplicates', () => {
      const checkResult = {
        isDuplicate: false,
      };

      const warning = generateDuplicateWarning(checkResult);
      expect(warning).toBeNull();
    });
  });
});

describe('Exam Validation - Property 40: Exams Without Questions Cannot Be Scheduled', () => {
  describe('Exam Question Validation', () => {
    it('should validate exam has questions', async () => {
      // Create a test exam without questions
      const examId = 'test-exam-no-questions';

      // This would normally be tested with a real database
      // For now, we test the validation logic
      const result = await validateExamHasQuestions(pool, examId);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'questions')).toBe(true);
    });
  });
});

// Helper function to create internal error (used in tests)
function createInternalError(error: Error) {
  return {
    type: ErrorType.INTERNAL,
    message: 'Internal server error',
    statusCode: 500,
    originalError: error,
  };
}
