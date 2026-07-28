import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as db from './db';
import * as examsLib from './exams';
import * as questionsLib from './questions';
import * as resultsLib from './results';
import * as syncLib from './sync';
import * as monitoringLib from './monitoring';

/**
 * Integration Tests for CBT Workflows
 * Tests complete end-to-end workflows across the system
 */

describe('CBT Workflow Integration Tests', () => {
  let tenantId: string;
  let examId: string;
  let studentId: string;
  let questionIds: string[] = [];

  beforeEach(async () => {
    tenantId = 'test-tenant-' + Date.now();
    studentId = 'test-student-' + Date.now();
  });

  afterEach(async () => {
    // Cleanup
    vi.clearAllMocks();
  });

  describe('Complete Exam Creation Workflow', () => {
    it('should create exam with questions and security settings', async () => {
      // Step 1: Create questions
      const questions = [
        {
          tenantId,
          text: 'What is 2+2?',
          type: 'multiple_choice',
          options: [
            { text: '3', isCorrect: false },
            { text: '4', isCorrect: true },
            { text: '5', isCorrect: false },
          ],
          difficulty: 'easy',
          subject: 'Math',
        },
        {
          tenantId,
          text: 'What is the capital of France?',
          type: 'multiple_choice',
          options: [
            { text: 'London', isCorrect: false },
            { text: 'Paris', isCorrect: true },
            { text: 'Berlin', isCorrect: false },
          ],
          difficulty: 'easy',
          subject: 'Geography',
        },
      ];

      for (const q of questions) {
        const created = await questionsLib.createQuestion(q);
        questionIds.push(created.id);
      }

      expect(questionIds).toHaveLength(2);

      // Step 2: Create exam with questions
      const examData = {
        tenantId,
        title: 'Math and Geography Quiz',
        description: 'Test exam',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds,
        status: 'draft',
      };

      const exam = await examsLib.createExam(examData);
      examId = exam.id;

      expect(exam.title).toBe('Math and Geography Quiz');
      expect(exam.questionIds).toEqual(questionIds);
      expect(exam.status).toBe('draft');

      // Step 3: Verify questions are retrievable
      const retrievedQuestions = await questionsLib.getQuestions(tenantId, {
        ids: questionIds,
      });

      expect(retrievedQuestions).toHaveLength(2);
      expect(retrievedQuestions[0].text).toBe('What is 2+2?');

      // Step 4: Update exam status to scheduled
      const scheduledExam = await examsLib.updateExamStatus(examId, 'scheduled');
      expect(scheduledExam.status).toBe('scheduled');
    });

    it('should validate exam creation with invalid data', async () => {
      const invalidExamData = {
        tenantId,
        title: '',
        duration: -10,
        passMark: 150,
        totalMarks: 100,
        questionIds: [],
      };

      await expect(examsLib.createExam(invalidExamData)).rejects.toThrow();
    });

    it('should handle exam with no questions', async () => {
      const examData = {
        tenantId,
        title: 'Empty Exam',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds: [],
      };

      await expect(examsLib.createExam(examData)).rejects.toThrow(
        'At least one question is required'
      );
    });
  });

  describe('Complete Exam Taking Workflow', () => {
    beforeEach(async () => {
      // Setup: Create exam with questions
      const questions = [
        {
          tenantId,
          text: 'Question 1',
          type: 'multiple_choice',
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
          difficulty: 'easy',
          subject: 'Test',
        },
        {
          tenantId,
          text: 'Question 2',
          type: 'multiple_choice',
          options: [
            { text: 'X', isCorrect: false },
            { text: 'Y', isCorrect: true },
          ],
          difficulty: 'medium',
          subject: 'Test',
        },
      ];

      for (const q of questions) {
        const created = await questionsLib.createQuestion(q);
        questionIds.push(created.id);
      }

      const exam = await examsLib.createExam({
        tenantId,
        title: 'Test Exam',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds,
      });

      examId = exam.id;
    });

    it('should complete full exam taking workflow', async () => {
      // Step 1: Start exam
      const startedExam = await examsLib.startExam(examId, studentId);
      expect(startedExam.status).toBe('ongoing');

      // Step 2: Get exam questions for student
      const examQuestions = await examsLib.getExamQuestions(examId, studentId);
      expect(examQuestions).toHaveLength(2);

      // Step 3: Submit answers
      const answers = [
        {
          questionId: questionIds[0],
          selectedOption: 0, // Correct answer
          timeSpent: 30,
        },
        {
          questionId: questionIds[1],
          selectedOption: 1, // Correct answer
          timeSpent: 25,
        },
      ];

      for (const answer of answers) {
        await examsLib.submitAnswer(examId, studentId, answer);
      }

      // Step 4: End exam
      const endedExam = await examsLib.endExam(examId, studentId);
      expect(endedExam.status).toBe('completed');

      // Step 5: Verify answers were saved
      const savedAnswers = await examsLib.getStudentAnswers(
        examId,
        studentId
      );
      expect(savedAnswers).toHaveLength(2);
      expect(savedAnswers[0].selectedOption).toBe(0);
    });

    it('should handle exam timeout', async () => {
      await examsLib.startExam(examId, studentId);

      // Simulate timeout
      const timedOutExam = await examsLib.endExam(examId, studentId, true);
      expect(timedOutExam.timedOut).toBe(true);
    });

    it('should prevent answering after exam ends', async () => {
      await examsLib.startExam(examId, studentId);
      await examsLib.endExam(examId, studentId);

      const answer = {
        questionId: questionIds[0],
        selectedOption: 0,
        timeSpent: 10,
      };

      await expect(
        examsLib.submitAnswer(examId, studentId, answer)
      ).rejects.toThrow('Exam has ended');
    });
  });

  describe('Complete Results Viewing Workflow', () => {
    beforeEach(async () => {
      // Setup: Create exam and complete it
      const questions = [
        {
          tenantId,
          text: 'Q1',
          type: 'multiple_choice',
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
          difficulty: 'easy',
          subject: 'Test',
        },
      ];

      for (const q of questions) {
        const created = await questionsLib.createQuestion(q);
        questionIds.push(created.id);
      }

      const exam = await examsLib.createExam({
        tenantId,
        title: 'Results Test Exam',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds,
      });

      examId = exam.id;

      // Complete exam
      await examsLib.startExam(examId, studentId);
      await examsLib.submitAnswer(examId, studentId, {
        questionId: questionIds[0],
        selectedOption: 0,
        timeSpent: 30,
      });
      await examsLib.endExam(examId, studentId);
    });

    it('should retrieve exam results summary', async () => {
      const results = await resultsLib.getExamResults(examId);
      expect(results).toBeDefined();
      expect(results.totalStudents).toBeGreaterThan(0);
      expect(results.averageScore).toBeGreaterThanOrEqual(0);
      expect(results.passRate).toBeGreaterThanOrEqual(0);
    });

    it('should retrieve detailed student result', async () => {
      const result = await resultsLib.getStudentResult(examId, studentId);
      expect(result).toBeDefined();
      expect(result.studentId).toBe(studentId);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.passed).toBeDefined();
      expect(result.answers).toBeDefined();
    });

    it('should calculate analytics correctly', async () => {
      const analytics = await resultsLib.getExamAnalytics(examId);
      expect(analytics).toBeDefined();
      expect(analytics.averageScore).toBeGreaterThanOrEqual(0);
      expect(analytics.medianScore).toBeGreaterThanOrEqual(0);
      expect(analytics.passRate).toBeGreaterThanOrEqual(0);
      expect(analytics.questionAnalysis).toBeDefined();
    });

    it('should export results to CSV', async () => {
      const csv = await resultsLib.exportResultsToCSV(examId);
      expect(csv).toBeDefined();
      expect(typeof csv).toBe('string');
      expect(csv).toContain('Student ID');
      expect(csv).toContain('Score');
    });
  });

  describe('Real-Time Monitoring Workflow', () => {
    beforeEach(async () => {
      // Setup: Create exam
      const questions = [
        {
          tenantId,
          text: 'Q1',
          type: 'multiple_choice',
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
          difficulty: 'easy',
          subject: 'Test',
        },
      ];

      for (const q of questions) {
        const created = await questionsLib.createQuestion(q);
        questionIds.push(created.id);
      }

      const exam = await examsLib.createExam({
        tenantId,
        title: 'Monitoring Test Exam',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds,
      });

      examId = exam.id;
    });

    it('should get live monitoring data', async () => {
      // Start exam
      await examsLib.startExam(examId, studentId);

      // Get monitoring data
      const monitoringData = await monitoringLib.getLiveMonitoringData(examId);
      expect(monitoringData).toBeDefined();
      expect(monitoringData.activeStudents).toBeGreaterThan(0);
      expect(monitoringData.students).toBeDefined();
    });

    it('should track student progress in real-time', async () => {
      await examsLib.startExam(examId, studentId);

      // Get initial progress
      const initialProgress = await monitoringLib.getStudentProgress(
        examId,
        studentId
      );
      expect(initialProgress.questionsAnswered).toBe(0);

      // Submit answer
      await examsLib.submitAnswer(examId, studentId, {
        questionId: questionIds[0],
        selectedOption: 0,
        timeSpent: 30,
      });

      // Get updated progress
      const updatedProgress = await monitoringLib.getStudentProgress(
        examId,
        studentId
      );
      expect(updatedProgress.questionsAnswered).toBe(1);
    });

    it('should flag suspicious student activity', async () => {
      await examsLib.startExam(examId, studentId);

      // Flag student
      const flagged = await monitoringLib.flagStudent(examId, studentId, {
        reason: 'Suspicious activity detected',
        severity: 'high',
      });

      expect(flagged).toBeDefined();
      expect(flagged.flagged).toBe(true);
      expect(flagged.reason).toBe('Suspicious activity detected');

      // Verify flag is recorded
      const progress = await monitoringLib.getStudentProgress(
        examId,
        studentId
      );
      expect(progress.flagged).toBe(true);
    });

    it('should update monitoring data within acceptable time', async () => {
      const startTime = Date.now();

      await examsLib.startExam(examId, studentId);
      const monitoringData = await monitoringLib.getLiveMonitoringData(examId);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
      expect(monitoringData).toBeDefined();
    });
  });

  describe('Offline Sync Workflow', () => {
    beforeEach(async () => {
      // Setup: Create exam
      const questions = [
        {
          tenantId,
          text: 'Q1',
          type: 'multiple_choice',
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
          difficulty: 'easy',
          subject: 'Test',
        },
      ];

      for (const q of questions) {
        const created = await questionsLib.createQuestion(q);
        questionIds.push(created.id);
      }

      const exam = await examsLib.createExam({
        tenantId,
        title: 'Sync Test Exam',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds,
      });

      examId = exam.id;
    });

    it('should sync offline answers to server', async () => {
      // Simulate offline answers
      const offlineAnswers = [
        {
          questionId: questionIds[0],
          selectedOption: 0,
          timeSpent: 30,
          timestamp: Date.now() - 5000,
        },
      ];

      // Sync answers
      const syncResult = await syncLib.syncOfflineAnswers(
        examId,
        studentId,
        offlineAnswers
      );

      expect(syncResult).toBeDefined();
      expect(syncResult.synced).toBe(true);
      expect(syncResult.answersCount).toBe(1);
    });

    it('should resolve conflicts using server-as-authoritative', async () => {
      // Server has answer
      await examsLib.startExam(examId, studentId);
      await examsLib.submitAnswer(examId, studentId, {
        questionId: questionIds[0],
        selectedOption: 0,
        timeSpent: 30,
      });

      // Offline has different answer
      const offlineAnswers = [
        {
          questionId: questionIds[0],
          selectedOption: 1, // Different answer
          timeSpent: 25,
          timestamp: Date.now() - 10000, // Older timestamp
        },
      ];

      // Sync should keep server version
      const syncResult = await syncLib.syncOfflineAnswers(
        examId,
        studentId,
        offlineAnswers
      );

      expect(syncResult.conflicts).toBeGreaterThan(0);
      expect(syncResult.conflictResolution).toBe('server-as-authoritative');

      // Verify server answer is kept
      const answers = await examsLib.getStudentAnswers(examId, studentId);
      expect(answers[0].selectedOption).toBe(0);
    });

    it('should handle sync queue with retry logic', async () => {
      const offlineAnswers = [
        {
          questionId: questionIds[0],
          selectedOption: 0,
          timeSpent: 30,
          timestamp: Date.now(),
        },
      ];

      // First sync attempt
      const syncResult = await syncLib.syncOfflineAnswers(
        examId,
        studentId,
        offlineAnswers
      );

      expect(syncResult.synced).toBe(true);

      // Verify queue is empty
      const queueStatus = await syncLib.getSyncQueueStatus(examId, studentId);
      expect(queueStatus.pending).toBe(0);
    });

    it('should maintain data consistency during sync', async () => {
      // Start exam and submit answer
      await examsLib.startExam(examId, studentId);
      await examsLib.submitAnswer(examId, studentId, {
        questionId: questionIds[0],
        selectedOption: 0,
        timeSpent: 30,
      });

      // Get answer before sync
      const answersBefore = await examsLib.getStudentAnswers(
        examId,
        studentId
      );
      const countBefore = answersBefore.length;

      // Sync same answer
      const offlineAnswers = [
        {
          questionId: questionIds[0],
          selectedOption: 0,
          timeSpent: 30,
          timestamp: Date.now(),
        },
      ];

      await syncLib.syncOfflineAnswers(examId, studentId, offlineAnswers);

      // Verify no duplicates
      const answersAfter = await examsLib.getStudentAnswers(
        examId,
        studentId
      );
      expect(answersAfter.length).toBe(countBefore);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid exam ID', async () => {
      await expect(examsLib.startExam('invalid-id', studentId)).rejects.toThrow(
        'Exam not found'
      );
    });

    it('should handle invalid student ID', async () => {
      const exam = await examsLib.createExam({
        tenantId,
        title: 'Test',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds: [],
      });

      await expect(
        examsLib.startExam(exam.id, '')
      ).rejects.toThrow();
    });

    it('should prevent duplicate exam starts', async () => {
      const questions = [
        {
          tenantId,
          text: 'Q1',
          type: 'multiple_choice',
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
          difficulty: 'easy',
          subject: 'Test',
        },
      ];

      const created = await questionsLib.createQuestion(questions[0]);
      const exam = await examsLib.createExam({
        tenantId,
        title: 'Test',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds: [created.id],
      });

      await examsLib.startExam(exam.id, studentId);

      // Try to start again
      await expect(
        examsLib.startExam(exam.id, studentId)
      ).rejects.toThrow('Exam already started');
    });

    it('should handle concurrent operations safely', async () => {
      const questions = [
        {
          tenantId,
          text: 'Q1',
          type: 'multiple_choice',
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
          difficulty: 'easy',
          subject: 'Test',
        },
      ];

      const created = await questionsLib.createQuestion(questions[0]);
      const exam = await examsLib.createExam({
        tenantId,
        title: 'Test',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds: [created.id],
      });

      await examsLib.startExam(exam.id, studentId);

      // Concurrent answer submissions
      const promises = [
        examsLib.submitAnswer(exam.id, studentId, {
          questionId: created.id,
          selectedOption: 0,
          timeSpent: 30,
        }),
        examsLib.submitAnswer(exam.id, studentId, {
          questionId: created.id,
          selectedOption: 1,
          timeSpent: 25,
        }),
      ];

      const results = await Promise.all(promises);
      expect(results).toHaveLength(2);
    });
  });

  describe('Data Consistency Verification', () => {
    it('should maintain referential integrity', async () => {
      const questions = [
        {
          tenantId,
          text: 'Q1',
          type: 'multiple_choice',
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
          difficulty: 'easy',
          subject: 'Test',
        },
      ];

      const created = await questionsLib.createQuestion(questions[0]);
      const exam = await examsLib.createExam({
        tenantId,
        title: 'Test',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds: [created.id],
      });

      // Verify question exists in exam
      const examQuestions = await examsLib.getExamQuestions(exam.id);
      expect(examQuestions.map((q) => q.id)).toContain(created.id);
    });

    it('should track audit logs for all operations', async () => {
      const questions = [
        {
          tenantId,
          text: 'Q1',
          type: 'multiple_choice',
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
          difficulty: 'easy',
          subject: 'Test',
        },
      ];

      const created = await questionsLib.createQuestion(questions[0]);
      const exam = await examsLib.createExam({
        tenantId,
        title: 'Test',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds: [created.id],
      });

      // Operations should be logged
      const auditLogs = await db.getAuditLogs(tenantId, {
        entityType: 'exam',
        entityId: exam.id,
      });

      expect(auditLogs.length).toBeGreaterThan(0);
    });
  });
});
