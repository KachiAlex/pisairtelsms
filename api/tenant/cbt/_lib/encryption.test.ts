/**
 * Data Encryption Service Tests
 * Requirements: 5.1
 */

import { describe, it, expect } from 'vitest';
import {
  encryptData,
  decryptData,
  hashData,
  verifyHashedData,
  encryptQuestion,
  decryptQuestion,
  encryptStudentAnswer,
  decryptStudentAnswer,
  encryptStudentAnswers,
  decryptStudentAnswers,
  createIntegrityHash,
  verifyIntegrity,
  sanitizeForLogging,
} from './encryption';

describe('Data Encryption Service', () => {
  describe('encryptData and decryptData', () => {
    it('should encrypt and decrypt data correctly', () => {
      const originalData = 'This is sensitive data';
      const encrypted = encryptData(originalData);
      const decrypted = decryptData(encrypted);

      expect(decrypted).toBe(originalData);
    });

    it('should produce different encrypted output for same data', () => {
      const data = 'This is sensitive data';
      const encrypted1 = encryptData(data);
      const encrypted2 = encryptData(data);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty strings', () => {
      const originalData = '';
      const encrypted = encryptData(originalData);
      const decrypted = decryptData(encrypted);

      expect(decrypted).toBe(originalData);
    });

    it('should handle special characters', () => {
      const originalData = 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encryptData(originalData);
      const decrypted = decryptData(encrypted);

      expect(decrypted).toBe(originalData);
    });

    it('should handle unicode characters', () => {
      const originalData = 'Unicode: 你好世界 🌍 مرحبا';
      const encrypted = encryptData(originalData);
      const decrypted = decryptData(encrypted);

      expect(decrypted).toBe(originalData);
    });

    it('should handle long strings', () => {
      const originalData = 'a'.repeat(10000);
      const encrypted = encryptData(originalData);
      const decrypted = decryptData(encrypted);

      expect(decrypted).toBe(originalData);
    });

    it('should throw error on invalid encrypted data', () => {
      const invalidData = 'not-valid-encrypted-data';

      expect(() => decryptData(invalidData)).toThrow();
    });
  });

  describe('hashData and verifyHashedData', () => {
    it('should hash data consistently', () => {
      const data = 'This is data to hash';
      const hash1 = hashData(data);
      const hash2 = hashData(data);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different data', () => {
      const hash1 = hashData('data1');
      const hash2 = hashData('data2');

      expect(hash1).not.toBe(hash2);
    });

    it('should verify hashed data correctly', () => {
      const data = 'This is data to hash';
      const hash = hashData(data);

      expect(verifyHashedData(data, hash)).toBe(true);
    });

    it('should reject incorrect data', () => {
      const data = 'This is data to hash';
      const hash = hashData(data);

      expect(verifyHashedData('different data', hash)).toBe(false);
    });
  });

  describe('encryptQuestion and decryptQuestion', () => {
    it('should encrypt and decrypt question text', () => {
      const questionText = 'What is the capital of France?';
      const encrypted = encryptQuestion(questionText);
      const decrypted = decryptQuestion(encrypted);

      expect(decrypted).toBe(questionText);
    });

    it('should handle complex question text', () => {
      const questionText = 'Solve: 2x + 3 = 7. What is x? (a) 1 (b) 2 (c) 3 (d) 4';
      const encrypted = encryptQuestion(questionText);
      const decrypted = decryptQuestion(encrypted);

      expect(decrypted).toBe(questionText);
    });
  });

  describe('encryptStudentAnswer and decryptStudentAnswer', () => {
    it('should encrypt and decrypt student answer', () => {
      const answer = 'The capital of France is Paris';
      const encrypted = encryptStudentAnswer(answer);
      const decrypted = decryptStudentAnswer(encrypted);

      expect(decrypted).toBe(answer);
    });

    it('should handle multiple choice answers', () => {
      const answer = 'b';
      const encrypted = encryptStudentAnswer(answer);
      const decrypted = decryptStudentAnswer(encrypted);

      expect(decrypted).toBe(answer);
    });
  });

  describe('encryptStudentAnswers and decryptStudentAnswers', () => {
    it('should encrypt and decrypt student answers object', () => {
      const answers = {
        question1: 'answer1',
        question2: 'answer2',
        question3: 'answer3',
      };
      const encrypted = encryptStudentAnswers(answers);
      const decrypted = decryptStudentAnswers(encrypted);

      expect(decrypted).toEqual(answers);
    });

    it('should handle complex answers object', () => {
      const answers = {
        q1: { answer: 'a', timeSpent: 30 },
        q2: { answer: 'b', timeSpent: 45 },
        q3: { answer: 'c', timeSpent: 60 },
      };
      const encrypted = encryptStudentAnswers(answers);
      const decrypted = decryptStudentAnswers(encrypted);

      expect(decrypted).toEqual(answers);
    });

    it('should handle empty answers object', () => {
      const answers = {};
      const encrypted = encryptStudentAnswers(answers);
      const decrypted = decryptStudentAnswers(encrypted);

      expect(decrypted).toEqual(answers);
    });
  });

  describe('createIntegrityHash and verifyIntegrity', () => {
    it('should create and verify integrity hash', () => {
      const data = 'This is data to verify';
      const hash = createIntegrityHash(data);

      expect(verifyIntegrity(data, hash)).toBe(true);
    });

    it('should detect data tampering', () => {
      const data = 'This is data to verify';
      const hash = createIntegrityHash(data);

      expect(verifyIntegrity('This is tampered data', hash)).toBe(false);
    });

    it('should produce consistent hashes', () => {
      const data = 'This is data to verify';
      const hash1 = createIntegrityHash(data);
      const hash2 = createIntegrityHash(data);

      expect(hash1).toBe(hash2);
    });
  });

  describe('sanitizeForLogging', () => {
    it('should redact password field', () => {
      const data = {
        username: 'john',
        password: 'secret123',
        email: 'john@example.com',
      };

      const sanitized = sanitizeForLogging(data);

      expect(sanitized.username).toBe('john');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.email).toBe('john@example.com');
    });

    it('should redact token field', () => {
      const data = {
        userId: 'user123',
        token: 'secret-token-xyz',
      };

      const sanitized = sanitizeForLogging(data);

      expect(sanitized.userId).toBe('user123');
      expect(sanitized.token).toBe('[REDACTED]');
    });

    it('should redact multiple sensitive fields', () => {
      const data = {
        username: 'john',
        password: 'secret123',
        token: 'secret-token',
        secret: 'secret-value',
        key: 'secret-key',
        answer: 'secret-answer',
        studentAnswer: 'secret-student-answer',
      };

      const sanitized = sanitizeForLogging(data);

      expect(sanitized.username).toBe('john');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.secret).toBe('[REDACTED]');
      expect(sanitized.key).toBe('[REDACTED]');
      expect(sanitized.answer).toBe('[REDACTED]');
      expect(sanitized.studentAnswer).toBe('[REDACTED]');
    });

    it('should handle non-object data', () => {
      expect(sanitizeForLogging('string')).toBe('string');
      expect(sanitizeForLogging(123)).toBe(123);
      expect(sanitizeForLogging(null)).toBe(null);
      expect(sanitizeForLogging(undefined)).toBe(undefined);
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          username: 'john',
          password: 'secret123',
        },
      };

      const sanitized = sanitizeForLogging(data);

      // Note: This implementation only sanitizes top-level fields
      // Nested objects are not recursively sanitized
      expect(sanitized.user.username).toBe('john');
      expect(sanitized.user.password).toBe('secret123');
    });
  });
});
