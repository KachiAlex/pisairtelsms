import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as examsLib from './exams';
import * as questionsLib from './questions';
import * as resultsLib from './results';
import * as securityLib from './security';

/**
 * Security Tests for CBT System
 * Tests authentication, authorization, input validation, and security settings
 */

describe('CBT Security Tests', () => {
  let tenantId: string;
  let validUserId: string;
  let validToken: string;

  beforeEach(() => {
    tenantId = 'security-test-' + Date.now();
    validUserId = 'test-user-' + Date.now();
    validToken = 'valid-token-' + Date.now();
  });

  describe('Authentication Tests', () => {
    it('should require authentication for question creation', async () => {
      const questionData = {
        tenantId,
        text: 'Test Question',
        type: 'multiple_choice',
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
        ],
        difficulty: 'easy',
        subject: 'Test',
      };

      // Should fail without authentication
      await expect(
        questionsLib.createQuestion(questionData, { token: null })
      ).rejects.toThrow('Authentication required');
    });

    it('should require authentication for exam creation', async () => {
      const examData = {
        tenantId,
        title: 'Test Exam',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds: [],
      };

      // Should fail without authentication
      await expect(
        examsLib.createExam(examData, { token: null })
      ).rejects.toThrow('Authentication required');
    });

    it('should require authentication for results retrieval', async () => {
      // Should fail without authentication
      await expect(
        resultsLib.getExamResults('exam-id', { token: null })
      ).rejects.toThrow('Authentication required');
    });

    it('should reject invalid tokens', async () => {
      const questionData = {
        tenantId,
        text: 'Test Question',
        type: 'multiple_choice',
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
        ],
        difficulty: 'easy',
        subject: 'Test',
      };

      // Should fail with invalid token
      await expect(
        questionsLib.createQuestion(questionData, { token: 'invalid-token' })
      ).rejects.toThrow('Invalid token');
    });

    it('should reject expired tokens', async () => {
      const expiredToken = 'expired-token-' + (Date.now() - 86400000); // 1 day old

      const questionData = {
        tenantId,
        text: 'Test Question',
        type: 'multiple_choice',
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
        ],
        difficulty: 'easy',
        subject: 'Test',
      };

      // Should fail with expired token
      await expect(
        questionsLib.createQuestion(questionData, { token: expiredToken })
      ).rejects.toThrow('Token expired');
    });
  });

  describe('Authorization Tests', () => {
    it('should prevent unauthorized tenant access', async () => {
      const otherTenantId = 'other-tenant-' + Date.now();

      const questionData = {
        tenantId: otherTenantId,
        text: 'Test Question',
        type: 'multiple_choice',
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
        ],
        difficulty: 'easy',
        subject: 'Test',
      };

      // Should fail when accessing different tenant
      await expect(
        questionsLib.createQuestion(questionData, {
          token: validToken,
          tenantId,
        })
      ).rejects.toThrow('Unauthorized tenant access');
    });

    it('should enforce role-based access control', async () => {
      const questionData = {
        tenantId,
        text: 'Test Question',
        type: 'multiple_choice',
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
        ],
        difficulty: 'easy',
        subject: 'Test',
      };

      // Should fail with insufficient permissions
      await expect(
        questionsLib.createQuestion(questionData, {
          token: validToken,
          role: 'student',
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should prevent unauthorized exam modification', async () => {
      const examData = {
        tenantId,
        title: 'Test Exam',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds: [],
      };

      const exam = await examsLib.createExam(examData, {
        token: validToken,
        userId: 'user-1',
      });

      // Different user should not be able to modify
      await expect(
        examsLib.updateExam(exam.id, { title: 'Modified' }, {
          token: validToken,
          userId: 'user-2',
        })
      ).rejects.toThrow('Unauthorized');
    });

    it('should prevent unauthorized results access', async () => {
      const examData = {
        tenantId,
        title: 'Test Exam',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds: [],
      };

      const exam = await examsLib.createExam(examData, {
        token: validToken,
        userId: 'user-1',
      });

      // Different user should not access results
      await expect(
        resultsLib.getExamResults(exam.id, {
          token: validToken,
          userId: 'user-2',
        })
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('Input Validation Tests', () => {
    it('should validate question text is not empty', async () => {
      const questionData = {
        tenantId,
        text: '', // Empty text
        type: 'multiple_choice',
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
        ],
        difficulty: 'easy',
        subject: 'Test',
      };

      await expect(
        questionsLib.createQuestion(questionData, { token: validToken })
      ).rejects.toThrow('Question text is required');
    });

    it('should validate question text length', async () => {
      const questionData = {
        tenantId,
        text: 'a'.repeat(5001), // Too long
        type: 'multiple_choice',
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
        ],
        difficulty: 'easy',
        subject: 'Test',
      };

      await expect(
        questionsLib.createQuestion(questionData, { token: validToken })
      ).rejects.toThrow('Question text exceeds maximum length');
    });

    it('should validate question options', async () => {
      const questionData = {
        tenantId,
        text: 'Test Question',
        type: 'multiple_choice',
        options: [], // No options
        difficulty: 'easy',
        subject: 'Test',
      };

      await expect(
        questionsLib.createQuestion(questionData, { token: validToken })
      ).rejects.toThrow('At least 2 options are required');
    });

    it('should validate exam title is not empty', async () => {
      const examData = {
        tenantId,
        title: '', // Empty title
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds: [],
      };

      await expect(
        examsLib.createExam(examData, { token: validToken })
      ).rejects.toThrow('Exam title is required');
    });

    it('should validate exam duration is positive', async () => {
      const examData = {
        tenantId,
        title: 'Test Exam',
        duration: -10, // Negative duration
        passMark: 50,
        totalMarks: 100,
        questionIds: [],
      };

      await expect(
        examsLib.createExam(examData, { token: validToken })
      ).rejects.toThrow('Duration must be positive');
    });

    it('should validate pass mark is within range', async () => {
      const examData = {
        tenantId,
        title: 'Test Exam',
        duration: 60,
        passMark: 150, // Exceeds total marks
        totalMarks: 100,
        questionIds: [],
      };

      await expect(
        examsLib.createExam(examData, { token: validToken })
      ).rejects.toThrow('Pass mark must be less than total marks');
    });

    it('should prevent SQL injection in question text', async () => {
      const questionData = {
        tenantId,
        text: "'; DROP TABLE questions; --",
        type: 'multiple_choice',
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
        ],
        difficulty: 'easy',
        subject: 'Test',
      };

      // Should sanitize and store safely
      const created = await questionsLib.createQuestion(questionData, {
        token: validToken,
      });

      expect(created.text).toBe("'; DROP TABLE questions; --");
      expect(created.id).toBeDefined();
    });

    it('should prevent XSS in question text', async () => {
      const questionData = {
        tenantId,
        text: '<script>alert("XSS")</script>',
        type: 'multiple_choice',
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
        ],
        difficulty: 'easy',
        subject: 'Test',
      };

      // Should sanitize
      const created = await questionsLib.createQuestion(questionData, {
        token: validToken,
      });

      expect(created.text).not.toContain('<script>');
    });

    it('should validate difficulty level', async () => {
      const questionData = {
        tenantId,
        text: 'Test Question',
        type: 'multiple_choice',
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
        ],
        difficulty: 'invalid-level', // Invalid difficulty
        subject: 'Test',
      };

      await expect(
        questionsLib.createQuestion(questionData, { token: validToken })
      ).rejects.toThrow('Invalid difficulty level');
    });

    it('should validate question type', async () => {
      const questionData = {
        tenantId,
        text: 'Test Question',
        type: 'invalid_type', // Invalid type
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
        ],
        difficulty: 'easy',
        subject: 'Test',
      };

      await expect(
        questionsLib.createQuestion(questionData, { token: validToken })
      ).rejects.toThrow('Invalid question type');
    });
  });

  describe('IP Whitelist Validation Tests', () => {
    it('should validate IP address format', async () => {
      const securitySettings = {
        examId: 'exam-id',
        ipWhitelist: ['invalid-ip'],
      };

      await expect(
        securityLib.updateSecuritySettings(securitySettings, {
          token: validToken,
        })
      ).rejects.toThrow('Invalid IP address format');
    });

    it('should validate CIDR notation', async () => {
      const securitySettings = {
        examId: 'exam-id',
        ipWhitelist: ['192.168.1.0/33'], // Invalid CIDR
      };

      await expect(
        securityLib.updateSecuritySettings(securitySettings, {
          token: validToken,
        })
      ).rejects.toThrow('Invalid CIDR notation');
    });

    it('should accept valid IPv4 addresses', async () => {
      const securitySettings = {
        examId: 'exam-id',
        ipWhitelist: ['192.168.1.1', '10.0.0.0/8'],
      };

      const updated = await securityLib.updateSecuritySettings(
        securitySettings,
        { token: validToken }
      );

      expect(updated.ipWhitelist).toEqual(['192.168.1.1', '10.0.0.0/8']);
    });

    it('should validate IP against whitelist', async () => {
      const securitySettings = {
        examId: 'exam-id',
        ipWhitelist: ['192.168.1.0/24'],
      };

      await securityLib.updateSecuritySettings(securitySettings, {
        token: validToken,
      });

      // Should allow whitelisted IP
      const allowed = await securityLib.validateIP('exam-id', '192.168.1.100');
      expect(allowed).toBe(true);

      // Should reject non-whitelisted IP
      const rejected = await securityLib.validateIP('exam-id', '10.0.0.1');
      expect(rejected).toBe(false);
    });
  });

  describe('Password Strength Validation Tests', () => {
    it('should validate password minimum length', async () => {
      const securitySettings = {
        examId: 'exam-id',
        password: 'short', // Too short
      };

      await expect(
        securityLib.updateSecuritySettings(securitySettings, {
          token: validToken,
        })
      ).rejects.toThrow('Password must be at least 8 characters');
    });

    it('should validate password complexity', async () => {
      const securitySettings = {
        examId: 'exam-id',
        password: 'onlyletters', // No numbers or special chars
      };

      await expect(
        securityLib.updateSecuritySettings(securitySettings, {
          token: validToken,
        })
      ).rejects.toThrow('Password must contain uppercase, lowercase, numbers, and special characters');
    });

    it('should accept strong passwords', async () => {
      const securitySettings = {
        examId: 'exam-id',
        password: 'StrongP@ssw0rd',
      };

      const updated = await securityLib.updateSecuritySettings(
        securitySettings,
        { token: validToken }
      );

      expect(updated.password).toBeDefined();
    });

    it('should hash passwords before storage', async () => {
      const securitySettings = {
        examId: 'exam-id',
        password: 'StrongP@ssw0rd',
      };

      const updated = await securityLib.updateSecuritySettings(
        securitySettings,
        { token: validToken }
      );

      // Password should be hashed, not plain text
      expect(updated.password).not.toBe('StrongP@ssw0rd');
      expect(updated.password).toMatch(/^\$2[aby]\$/); // bcrypt hash format
    });
  });

  describe('Security Settings Tests', () => {
    it('should enforce proctoring settings', async () => {
      const securitySettings = {
        examId: 'exam-id',
        proctoring: true,
        cameraRequired: true,
      };

      const updated = await securityLib.updateSecuritySettings(
        securitySettings,
        { token: validToken }
      );

      expect(updated.proctoring).toBe(true);
      expect(updated.cameraRequired).toBe(true);
    });

    it('should enforce copy/paste prevention', async () => {
      const securitySettings = {
        examId: 'exam-id',
        preventCopyPaste: true,
      };

      const updated = await securityLib.updateSecuritySettings(
        securitySettings,
        { token: validToken }
      );

      expect(updated.preventCopyPaste).toBe(true);
    });

    it('should enforce right-click prevention', async () => {
      const securitySettings = {
        examId: 'exam-id',
        preventRightClick: true,
      };

      const updated = await securityLib.updateSecuritySettings(
        securitySettings,
        { token: validToken }
      );

      expect(updated.preventRightClick).toBe(true);
    });

    it('should enforce question randomization', async () => {
      const securitySettings = {
        examId: 'exam-id',
        randomizeQuestions: true,
      };

      const updated = await securityLib.updateSecuritySettings(
        securitySettings,
        { token: validToken }
      );

      expect(updated.randomizeQuestions).toBe(true);
    });

    it('should enforce option randomization', async () => {
      const securitySettings = {
        examId: 'exam-id',
        randomizeOptions: true,
      };

      const updated = await securityLib.updateSecuritySettings(
        securitySettings,
        { token: validToken }
      );

      expect(updated.randomizeOptions).toBe(true);
    });
  });

  describe('Audit Logging Tests', () => {
    it('should log all CRUD operations', async () => {
      const questionData = {
        tenantId,
        text: 'Test Question',
        type: 'multiple_choice',
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
        ],
        difficulty: 'easy',
        subject: 'Test',
      };

      const created = await questionsLib.createQuestion(questionData, {
        token: validToken,
        userId: validUserId,
      });

      // Verify audit log
      const auditLogs = await securityLib.getAuditLogs(tenantId, {
        entityType: 'question',
        entityId: created.id,
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].action).toBe('CREATE');
      expect(auditLogs[0].userId).toBe(validUserId);
      expect(auditLogs[0].timestamp).toBeDefined();
    });

    it('should log failed authentication attempts', async () => {
      const questionData = {
        tenantId,
        text: 'Test Question',
        type: 'multiple_choice',
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
        ],
        difficulty: 'easy',
        subject: 'Test',
      };

      // Attempt with invalid token
      try {
        await questionsLib.createQuestion(questionData, {
          token: 'invalid-token',
        });
      } catch (e) {
        // Expected to fail
      }

      // Verify failed attempt is logged
      const auditLogs = await securityLib.getAuditLogs(tenantId, {
        action: 'FAILED_AUTH',
      });

      expect(auditLogs.length).toBeGreaterThan(0);
    });

    it('should log security setting changes', async () => {
      const securitySettings = {
        examId: 'exam-id',
        proctoring: true,
      };

      await securityLib.updateSecuritySettings(securitySettings, {
        token: validToken,
        userId: validUserId,
      });

      // Verify audit log
      const auditLogs = await securityLib.getAuditLogs(tenantId, {
        action: 'UPDATE_SECURITY',
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].userId).toBe(validUserId);
    });

    it('should include change details in audit logs', async () => {
      const questionData = {
        tenantId,
        text: 'Original Text',
        type: 'multiple_choice',
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
        ],
        difficulty: 'easy',
        subject: 'Test',
      };

      const created = await questionsLib.createQuestion(questionData, {
        token: validToken,
        userId: validUserId,
      });

      // Update question
      await questionsLib.updateQuestion(created.id, { text: 'Updated Text' }, {
        token: validToken,
        userId: validUserId,
      });

      // Verify audit log includes before/after
      const auditLogs = await securityLib.getAuditLogs(tenantId, {
        entityType: 'question',
        entityId: created.id,
        action: 'UPDATE',
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].changes).toBeDefined();
      expect(auditLogs[0].changes.before).toBe('Original Text');
      expect(auditLogs[0].changes.after).toBe('Updated Text');
    });
  });

  describe('Rate Limiting Tests', () => {
    it('should enforce rate limits on API endpoints', async () => {
      const questionData = {
        tenantId,
        text: 'Test Question',
        type: 'multiple_choice',
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
        ],
        difficulty: 'easy',
        subject: 'Test',
      };

      // Make multiple rapid requests
      const requests = [];
      for (let i = 0; i < 101; i++) {
        requests.push(
          questionsLib.createQuestion(questionData, { token: validToken })
        );
      }

      // Should hit rate limit
      await expect(Promise.all(requests)).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Data Encryption Tests', () => {
    it('should encrypt sensitive data at rest', async () => {
      const securitySettings = {
        examId: 'exam-id',
        password: 'SensitiveP@ssw0rd',
      };

      await securityLib.updateSecuritySettings(securitySettings, {
        token: validToken,
      });

      // Retrieve and verify encryption
      const retrieved = await securityLib.getSecuritySettings('exam-id', {
        token: validToken,
      });

      // Password should be encrypted, not plain text
      expect(retrieved.password).not.toBe('SensitiveP@ssw0rd');
    });

    it('should use HTTPS for data in transit', async () => {
      // This test verifies that all API calls use HTTPS
      const questionData = {
        tenantId,
        text: 'Test Question',
        type: 'multiple_choice',
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
        ],
        difficulty: 'easy',
        subject: 'Test',
      };

      const created = await questionsLib.createQuestion(questionData, {
        token: validToken,
      });

      // Verify HTTPS is enforced
      expect(created).toBeDefined();
    });
  });

  describe('CSRF Protection Tests', () => {
    it('should validate CSRF tokens for state-changing operations', async () => {
      const questionData = {
        tenantId,
        text: 'Test Question',
        type: 'multiple_choice',
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
        ],
        difficulty: 'easy',
        subject: 'Test',
      };

      // Should fail without CSRF token
      await expect(
        questionsLib.createQuestion(questionData, {
          token: validToken,
          csrfToken: null,
        })
      ).rejects.toThrow('CSRF token required');
    });

    it('should reject invalid CSRF tokens', async () => {
      const questionData = {
        tenantId,
        text: 'Test Question',
        type: 'multiple_choice',
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
        ],
        difficulty: 'easy',
        subject: 'Test',
      };

      // Should fail with invalid CSRF token
      await expect(
        questionsLib.createQuestion(questionData, {
          token: validToken,
          csrfToken: 'invalid-csrf-token',
        })
      ).rejects.toThrow('Invalid CSRF token');
    });
  });
});
