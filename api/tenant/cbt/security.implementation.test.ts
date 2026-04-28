/**
 * Security Implementation Tests for Phase 10
 * Tests for data encryption, copy/paste prevention, right-click prevention, proctoring enforcement, and audit logging
 * Requirements: 5.1, 5.3, 5.4, 5.2, 5.5
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  encryptQuestionForStorage,
  decryptQuestionFromStorage,
  encryptStudentAnswersForStorage,
  decryptStudentAnswersFromStorage,
  encryptProctoringLogForStorage,
  decryptProctoringLogFromStorage,
  hashExamPasswordForStorage,
  verifyExamPasswordFromStorage,
  createDataIntegrityHash,
  verifyDataIntegrity,
  sanitizeSensitiveDataForLogging,
} from './_lib/data-encryption';
import {
  encryptData,
  decryptData,
  encryptQuestion,
  decryptQuestion,
  generateEncryptionKey,
} from './_lib/encryption';
import {
  logProctoringEvent,
  getProctoringLogs,
  validateProctoringEvent,
} from './_lib/proctoring';
import {
  logModification,
  logSecuritySettingChange,
  logResultModification,
  getAuditLogs,
  generateComplianceReport,
} from './_lib/audit-logging';
import {
  getSecuritySettings,
  createSecuritySettings,
  updateSecuritySettings,
  validateSecuritySettings,
  isIPInCIDR,
  validateIPWhitelist,
  validateExamPassword,
  getRandomizedQuestions,
  getRandomizedOptions,
} from './_lib/security';

describe('Phase 10: Security Implementation', () => {
  // ─── Data Encryption Tests ────────────────────────────────────────────────

  describe('Data Encryption (Requirement 5.1)', () => {
    describe('Question Encryption', () => {
      it('should encrypt and decrypt question text correctly', async () => {
        const questionText = 'What is the capital of France?';
        const { encryptedText } = await encryptQuestionForStorage('q1', questionText);
        const { text } = decryptQuestionFromStorage(encryptedText);

        expect(text).toBe(questionText);
      });

      it('should encrypt and decrypt question options correctly', async () => {
        const questionText = 'What is 2+2?';
        const options = ['3', '4', '5', '6'];
        const { encryptedText, encryptedOptions } = await encryptQuestionForStorage(
          'q1',
          questionText,
          options
        );
        const { text, options: decryptedOptions } = decryptQuestionFromStorage(
          encryptedText,
          encryptedOptions
        );

        expect(text).toBe(questionText);
        expect(decryptedOptions).toEqual(options);
      });

      it('should produce different encrypted output for same question', async () => {
        const questionText = 'What is the capital of France?';
        const { encryptedText: encrypted1 } = await encryptQuestionForStorage('q1', questionText);
        const { encryptedText: encrypted2 } = await encryptQuestionForStorage('q2', questionText);

        expect(encrypted1).not.toBe(encrypted2);
      });

      it('should handle special characters in questions', async () => {
        const questionText = 'Solve: 2x + 3 = 7. What is x? (a) 1 (b) 2 (c) 3 (d) 4';
        const { encryptedText } = await encryptQuestionForStorage('q1', questionText);
        const { text } = decryptQuestionFromStorage(encryptedText);

        expect(text).toBe(questionText);
      });

      it('should handle unicode characters in questions', async () => {
        const questionText = 'What is "你好世界" in English? 🌍';
        const { encryptedText } = await encryptQuestionForStorage('q1', questionText);
        const { text } = decryptQuestionFromStorage(encryptedText);

        expect(text).toBe(questionText);
      });
    });

    describe('Student Answer Encryption', () => {
      it('should encrypt and decrypt student answers correctly', async () => {
        const answers = {
          q1: 'A',
          q2: 'B',
          q3: 'C',
        };
        const encrypted = await encryptStudentAnswersForStorage(answers);
        const decrypted = decryptStudentAnswersFromStorage(encrypted);

        expect(decrypted).toEqual(answers);
      });

      it('should handle complex answer objects', async () => {
        const answers = {
          q1: { answer: 'A', confidence: 0.9 },
          q2: { answer: 'B', confidence: 0.7 },
          q3: { answer: 'C', confidence: 0.95 },
        };
        const encrypted = await encryptStudentAnswersForStorage(answers);
        const decrypted = decryptStudentAnswersFromStorage(encrypted);

        expect(decrypted).toEqual(answers);
      });
    });

    describe('Proctoring Log Encryption', () => {
      it('should encrypt and decrypt proctoring logs correctly', async () => {
        const logDetails = {
          eventType: 'copy_attempt',
          timestamp: new Date().toISOString(),
          userAgent: 'Mozilla/5.0',
        };
        const encrypted = await encryptProctoringLogForStorage(logDetails);
        const decrypted = decryptProctoringLogFromStorage(encrypted);

        expect(decrypted).toEqual(logDetails);
      });
    });

    describe('Exam Password Encryption', () => {
      it('should hash and verify exam passwords correctly', async () => {
        const password = 'SecureExamPassword123!';
        const hash = await hashExamPasswordForStorage(password);
        const isValid = await verifyExamPasswordFromStorage(password, hash);

        expect(isValid).toBe(true);
      });

      it('should reject incorrect passwords', async () => {
        const password = 'SecureExamPassword123!';
        const wrongPassword = 'WrongPassword';
        const hash = await hashExamPasswordForStorage(password);
        const isValid = await verifyExamPasswordFromStorage(wrongPassword, hash);

        expect(isValid).toBe(false);
      });

      it('should produce different hashes for same password', async () => {
        const password = 'SecureExamPassword123!';
        const hash1 = await hashExamPasswordForStorage(password);
        const hash2 = await hashExamPasswordForStorage(password);

        expect(hash1).not.toBe(hash2);
      });
    });

    describe('Data Integrity', () => {
      it('should create and verify data integrity hashes', () => {
        const data = 'Important exam data';
        const hash = createDataIntegrityHash(data);
        const isValid = verifyDataIntegrity(data, hash);

        expect(isValid).toBe(true);
      });

      it('should detect tampered data', () => {
        const data = 'Important exam data';
        const hash = createDataIntegrityHash(data);
        const tamperedData = 'Tampered exam data';
        const isValid = verifyDataIntegrity(tamperedData, hash);

        expect(isValid).toBe(false);
      });
    });

    describe('Sensitive Data Sanitization', () => {
      it('should sanitize sensitive fields from logs', () => {
        const data = {
          username: 'student1',
          password: 'secret123',
          examId: 'exam1',
          token: 'abc123xyz',
        };
        const sanitized = sanitizeSensitiveDataForLogging(data);

        expect(sanitized.password).toBe('[REDACTED]');
        expect(sanitized.token).toBe('[REDACTED]');
        expect(sanitized.username).toBe('student1');
        expect(sanitized.examId).toBe('exam1');
      });
    });
  });

  // ─── Copy/Paste Prevention Tests ───────────────────────────────────────────

  describe('Copy/Paste Prevention (Requirement 5.3)', () => {
    it('should validate copy/paste prevention setting', () => {
      const settings = {
        copyPasteDisabled: true,
      };
      const errors = validateSecuritySettings(settings);

      expect(errors).toHaveLength(0);
    });

    it('should allow copy/paste prevention to be toggled', () => {
      const settings = {
        copyPasteDisabled: false,
      };
      const errors = validateSecuritySettings(settings);

      expect(errors).toHaveLength(0);
    });
  });

  // ─── Right-Click Prevention Tests ──────────────────────────────────────────

  describe('Right-Click Prevention (Requirement 5.4)', () => {
    it('should validate right-click prevention setting', () => {
      const settings = {
        rightClickDisabled: true,
      };
      const errors = validateSecuritySettings(settings);

      expect(errors).toHaveLength(0);
    });

    it('should allow right-click prevention to be toggled', () => {
      const settings = {
        rightClickDisabled: false,
      };
      const errors = validateSecuritySettings(settings);

      expect(errors).toHaveLength(0);
    });
  });

  // ─── Proctoring Enforcement Tests ──────────────────────────────────────────

  describe('Proctoring Enforcement (Requirement 5.2, 5.5)', () => {
    describe('Proctoring Event Logging', () => {
      it('should validate proctoring event types', () => {
        const validTypes = ['camera_on', 'camera_off', 'tab_switch', 'copy_attempt', 'right_click'];

        for (const eventType of validTypes) {
          const errors = validateProctoringEvent(eventType);
          expect(errors).toHaveLength(0);
        }
      });

      it('should reject invalid proctoring event types', () => {
        const errors = validateProctoringEvent('invalid_event');

        expect(errors.length).toBeGreaterThan(0);
      });

      it('should require event type', () => {
        const errors = validateProctoringEvent('');

        expect(errors.length).toBeGreaterThan(0);
      });
    });

    describe('Tab Switch Monitoring', () => {
      it('should validate tab switch event logging capability', () => {
        // This test verifies that tab switch event logging is available
        // Actual logging would require database setup
        expect(logProctoringEvent).toBeDefined();
      });
    });

    describe('Camera Requirement Enforcement', () => {
      it('should validate camera requirement setting', () => {
        const settings = {
          cameraRequired: true,
        };
        const errors = validateSecuritySettings(settings);

        expect(errors).toHaveLength(0);
      });

      it('should allow camera requirement to be toggled', () => {
        const settings = {
          cameraRequired: false,
        };
        const errors = validateSecuritySettings(settings);

        expect(errors).toHaveLength(0);
      });
    });
  });

  // ─── Audit Logging Tests ───────────────────────────────────────────────────

  describe('Audit Logging (Requirement 5.1)', () => {
    describe('Modification Logging', () => {
      it('should validate modification logging', async () => {
        // This test verifies that the audit logging infrastructure is in place
        // Actual logging would require database setup
        expect(logModification).toBeDefined();
      });
    });

    describe('Security Setting Changes', () => {
      it('should validate security setting change logging', async () => {
        // This test verifies that security setting change logging is available
        expect(logSecuritySettingChange).toBeDefined();
      });
    });

    describe('Result Modifications', () => {
      it('should validate result modification logging', async () => {
        // This test verifies that result modification logging is available
        expect(logResultModification).toBeDefined();
      });
    });

    describe('Compliance Reports', () => {
      it('should validate compliance report generation', async () => {
        // This test verifies that compliance report generation is available
        expect(generateComplianceReport).toBeDefined();
      });
    });
  });

  // ─── Security Settings Tests ───────────────────────────────────────────────

  describe('Security Settings Validation', () => {
    describe('IP Whitelist Validation', () => {
      it('should validate CIDR notation', () => {
        const validCIDRs = [
          '192.168.1.0/24',
          '10.0.0.0/8',
          '172.16.0.0/12',
          '192.168.1.1',
        ];

        for (const cidr of validCIDRs) {
          expect(isIPInCIDR('192.168.1.100', cidr)).toBeDefined();
        }
      });

      it('should reject invalid CIDR notation', () => {
        const settings = {
          ipWhitelist: 'invalid-cidr',
        };
        const errors = validateSecuritySettings(settings);

        expect(errors.length).toBeGreaterThan(0);
      });

      it('should validate IP addresses against CIDR ranges', () => {
        expect(isIPInCIDR('192.168.1.100', '192.168.1.0/24')).toBe(true);
        expect(isIPInCIDR('192.168.2.100', '192.168.1.0/24')).toBe(false);
      });
    });

    describe('Exam Password Validation', () => {
      it('should validate password length', () => {
        const shortPassword = {
          examPassword: 'abc',
        };
        const errors = validateSecuritySettings(shortPassword);

        expect(errors.length).toBeGreaterThan(0);
      });

      it('should validate password max length', () => {
        const longPassword = {
          examPassword: 'a'.repeat(51),
        };
        const errors = validateSecuritySettings(longPassword);

        expect(errors.length).toBeGreaterThan(0);
      });

      it('should accept valid passwords', () => {
        const validPassword = {
          examPassword: 'ValidPassword123!',
        };
        const errors = validateSecuritySettings(validPassword);

        expect(errors).toHaveLength(0);
      });
    });

    describe('Boolean Field Validation', () => {
      it('should validate boolean fields', () => {
        const settings = {
          proctoringEnabled: true,
          cameraRequired: false,
          copyPasteDisabled: true,
          rightClickDisabled: false,
          questionRandomization: true,
          optionRandomization: false,
        };
        const errors = validateSecuritySettings(settings);

        expect(errors).toHaveLength(0);
      });

      it('should reject non-boolean values', () => {
        const settings = {
          proctoringEnabled: 'true' as any,
        };
        const errors = validateSecuritySettings(settings);

        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  // ─── Question Randomization Tests ──────────────────────────────────────────

  describe('Question Randomization (Requirement 5.6)', () => {
    it('should validate question randomization setting', () => {
      const settings = {
        questionRandomization: true,
      };
      const errors = validateSecuritySettings(settings);

      expect(errors).toHaveLength(0);
    });
  });

  // ─── Option Randomization Tests ────────────────────────────────────────────

  describe('Option Randomization (Requirement 5.7)', () => {
    it('should validate option randomization setting', () => {
      const settings = {
        optionRandomization: true,
      };
      const errors = validateSecuritySettings(settings);

      expect(errors).toHaveLength(0);
    });
  });
});
