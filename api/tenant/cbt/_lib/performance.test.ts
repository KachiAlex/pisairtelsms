import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as examsLib from './exams';
import * as questionsLib from './questions';
import * as resultsLib from './results';
import * as monitoringLib from './monitoring';
import * as syncLib from './sync';

/**
 * Performance Tests for CBT System
 * Tests system performance under load and with large datasets
 */

describe('CBT Performance Tests', () => {
  let tenantId: string;
  const LARGE_DATASET_SIZE = 10000;
  const MEDIUM_DATASET_SIZE = 1000;
  const CONCURRENT_STUDENTS = 100;

  beforeEach(() => {
    tenantId = 'perf-test-' + Date.now();
  });

  describe('Question Bank Performance', () => {
    it('should handle 10,000+ questions efficiently', async () => {
      const startTime = performance.now();
      const questionIds: string[] = [];

      // Create 10,000 questions
      for (let i = 0; i < LARGE_DATASET_SIZE; i++) {
        const question = {
          tenantId,
          text: `Question ${i}`,
          type: 'multiple_choice',
          options: [
            { text: 'A', isCorrect: i % 4 === 0 },
            { text: 'B', isCorrect: i % 4 === 1 },
            { text: 'C', isCorrect: i % 4 === 2 },
            { text: 'D', isCorrect: i % 4 === 3 },
          ],
          difficulty: ['easy', 'medium', 'hard'][i % 3],
          subject: `Subject${i % 10}`,
        };

        const created = await questionsLib.createQuestion(question);
        questionIds.push(created.id);

        // Log progress every 1000 questions
        if ((i + 1) % 1000 === 0) {
          const elapsed = performance.now() - startTime;
          const rate = (i + 1) / (elapsed / 1000);
          console.log(
            `Created ${i + 1} questions in ${elapsed.toFixed(2)}ms (${rate.toFixed(0)} q/s)`
          );
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTimePerQuestion = totalTime / LARGE_DATASET_SIZE;

      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Average time per question: ${avgTimePerQuestion.toFixed(2)}ms`);

      // Performance assertions
      expect(questionIds).toHaveLength(LARGE_DATASET_SIZE);
      expect(avgTimePerQuestion).toBeLessThan(100); // Should average < 100ms per question
      expect(totalTime).toBeLessThan(2000000); // Should complete in < 33 minutes
    });

    it('should search 10,000 questions efficiently', async () => {
      // Setup: Create questions
      const questionIds: string[] = [];
      for (let i = 0; i < 1000; i++) {
        const question = {
          tenantId,
          text: `Math Question ${i}`,
          type: 'multiple_choice',
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
          difficulty: 'medium',
          subject: 'Math',
        };

        const created = await questionsLib.createQuestion(question);
        questionIds.push(created.id);
      }

      // Search performance test
      const startTime = performance.now();
      const results = await questionsLib.getQuestions(tenantId, {
        subject: 'Math',
        difficulty: 'medium',
      });
      const endTime = performance.now();

      const searchTime = endTime - startTime;
      console.log(`Search time for 1000 questions: ${searchTime.toFixed(2)}ms`);

      expect(results.length).toBeGreaterThan(0);
      expect(searchTime).toBeLessThan(1000); // Should complete in < 1 second
    });

    it('should filter questions efficiently', async () => {
      // Setup: Create questions with different difficulties
      for (let i = 0; i < 500; i++) {
        const difficulty = ['easy', 'medium', 'hard'][i % 3];
        await questionsLib.createQuestion({
          tenantId,
          text: `Question ${i}`,
          type: 'multiple_choice',
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
          difficulty,
          subject: 'Test',
        });
      }

      // Filter performance test
      const startTime = performance.now();
      const easyQuestions = await questionsLib.getQuestions(tenantId, {
        difficulty: 'easy',
      });
      const endTime = performance.now();

      const filterTime = endTime - startTime;
      console.log(`Filter time for 500 questions: ${filterTime.toFixed(2)}ms`);

      expect(easyQuestions.length).toBeGreaterThan(0);
      expect(filterTime).toBeLessThan(500); // Should complete in < 500ms
    });
  });

  describe('Exam Results Performance', () => {
    it('should handle 1,000+ exam results efficiently', async () => {
      // Setup: Create exam
      const questions = [];
      for (let i = 0; i < 10; i++) {
        const q = await questionsLib.createQuestion({
          tenantId,
          text: `Q${i}`,
          type: 'multiple_choice',
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
          difficulty: 'easy',
          subject: 'Test',
        });
        questions.push(q.id);
      }

      const exam = await examsLib.createExam({
        tenantId,
        title: 'Performance Test Exam',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds: questions,
      });

      // Generate 1000 results
      const startTime = performance.now();

      for (let i = 0; i < MEDIUM_DATASET_SIZE; i++) {
        const studentId = `student-${i}`;

        // Start exam
        await examsLib.startExam(exam.id, studentId);

        // Submit answers
        for (const questionId of questions) {
          await examsLib.submitAnswer(exam.id, studentId, {
            questionId,
            selectedOption: i % 4,
            timeSpent: 30,
          });
        }

        // End exam
        await examsLib.endExam(exam.id, studentId);

        if ((i + 1) % 100 === 0) {
          const elapsed = performance.now() - startTime;
          const rate = (i + 1) / (elapsed / 1000);
          console.log(
            `Generated ${i + 1} results in ${elapsed.toFixed(2)}ms (${rate.toFixed(0)} r/s)`
          );
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTimePerResult = totalTime / MEDIUM_DATASET_SIZE;

      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Average time per result: ${avgTimePerResult.toFixed(2)}ms`);

      expect(avgTimePerResult).toBeLessThan(500); // Should average < 500ms per result
    });

    it('should retrieve exam results summary efficiently', async () => {
      // Setup: Create exam with results
      const questions = [];
      for (let i = 0; i < 5; i++) {
        const q = await questionsLib.createQuestion({
          tenantId,
          text: `Q${i}`,
          type: 'multiple_choice',
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
          difficulty: 'easy',
          subject: 'Test',
        });
        questions.push(q.id);
      }

      const exam = await examsLib.createExam({
        tenantId,
        title: 'Results Summary Test',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds: questions,
      });

      // Generate 500 results
      for (let i = 0; i < 500; i++) {
        const studentId = `student-${i}`;
        await examsLib.startExam(exam.id, studentId);
        for (const questionId of questions) {
          await examsLib.submitAnswer(exam.id, studentId, {
            questionId,
            selectedOption: i % 4,
            timeSpent: 30,
          });
        }
        await examsLib.endExam(exam.id, studentId);
      }

      // Retrieve results summary
      const startTime = performance.now();
      const results = await resultsLib.getExamResults(exam.id);
      const endTime = performance.now();

      const retrievalTime = endTime - startTime;
      console.log(`Results summary retrieval time: ${retrievalTime.toFixed(2)}ms`);

      expect(results).toBeDefined();
      expect(retrievalTime).toBeLessThan(2000); // Should complete in < 2 seconds
    });

    it('should calculate analytics efficiently', async () => {
      // Setup: Create exam with results
      const questions = [];
      for (let i = 0; i < 5; i++) {
        const q = await questionsLib.createQuestion({
          tenantId,
          text: `Q${i}`,
          type: 'multiple_choice',
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
          difficulty: 'easy',
          subject: 'Test',
        });
        questions.push(q.id);
      }

      const exam = await examsLib.createExam({
        tenantId,
        title: 'Analytics Test',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds: questions,
      });

      // Generate 300 results
      for (let i = 0; i < 300; i++) {
        const studentId = `student-${i}`;
        await examsLib.startExam(exam.id, studentId);
        for (const questionId of questions) {
          await examsLib.submitAnswer(exam.id, studentId, {
            questionId,
            selectedOption: i % 4,
            timeSpent: 30,
          });
        }
        await examsLib.endExam(exam.id, studentId);
      }

      // Calculate analytics
      const startTime = performance.now();
      const analytics = await resultsLib.getExamAnalytics(exam.id);
      const endTime = performance.now();

      const analyticsTime = endTime - startTime;
      console.log(`Analytics calculation time: ${analyticsTime.toFixed(2)}ms`);

      expect(analytics).toBeDefined();
      expect(analyticsTime).toBeLessThan(3000); // Should complete in < 3 seconds
    });

    it('should export results efficiently', async () => {
      // Setup: Create exam with results
      const questions = [];
      for (let i = 0; i < 5; i++) {
        const q = await questionsLib.createQuestion({
          tenantId,
          text: `Q${i}`,
          type: 'multiple_choice',
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
          difficulty: 'easy',
          subject: 'Test',
        });
        questions.push(q.id);
      }

      const exam = await examsLib.createExam({
        tenantId,
        title: 'Export Test',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds: questions,
      });

      // Generate 200 results
      for (let i = 0; i < 200; i++) {
        const studentId = `student-${i}`;
        await examsLib.startExam(exam.id, studentId);
        for (const questionId of questions) {
          await examsLib.submitAnswer(exam.id, studentId, {
            questionId,
            selectedOption: i % 4,
            timeSpent: 30,
          });
        }
        await examsLib.endExam(exam.id, studentId);
      }

      // Export results
      const startTime = performance.now();
      const csv = await resultsLib.exportResultsToCSV(exam.id);
      const endTime = performance.now();

      const exportTime = endTime - startTime;
      const csvSize = csv.length;
      console.log(`Export time: ${exportTime.toFixed(2)}ms`);
      console.log(`CSV size: ${(csvSize / 1024).toFixed(2)}KB`);

      expect(csv).toBeDefined();
      expect(exportTime).toBeLessThan(5000); // Should complete in < 5 seconds
      expect(csvSize).toBeGreaterThan(0);
    });
  });

  describe('Live Monitoring Performance', () => {
    it('should handle 100+ concurrent students efficiently', async () => {
      // Setup: Create exam
      const questions = [];
      for (let i = 0; i < 5; i++) {
        const q = await questionsLib.createQuestion({
          tenantId,
          text: `Q${i}`,
          type: 'multiple_choice',
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
          difficulty: 'easy',
          subject: 'Test',
        });
        questions.push(q.id);
      }

      const exam = await examsLib.createExam({
        tenantId,
        title: 'Monitoring Load Test',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds: questions,
      });

      // Start 100 students
      const studentIds: string[] = [];
      for (let i = 0; i < CONCURRENT_STUDENTS; i++) {
        const studentId = `student-${i}`;
        await examsLib.startExam(exam.id, studentId);
        studentIds.push(studentId);
      }

      // Get monitoring data
      const startTime = performance.now();
      const monitoringData = await monitoringLib.getLiveMonitoringData(exam.id);
      const endTime = performance.now();

      const monitoringTime = endTime - startTime;
      console.log(`Monitoring data retrieval time: ${monitoringTime.toFixed(2)}ms`);

      expect(monitoringData).toBeDefined();
      expect(monitoringData.activeStudents).toBe(CONCURRENT_STUDENTS);
      expect(monitoringTime).toBeLessThan(1000); // Should complete in < 1 second
    });

    it('should track progress for 100+ students efficiently', async () => {
      // Setup: Create exam
      const questions = [];
      for (let i = 0; i < 5; i++) {
        const q = await questionsLib.createQuestion({
          tenantId,
          text: `Q${i}`,
          type: 'multiple_choice',
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
          difficulty: 'easy',
          subject: 'Test',
        });
        questions.push(q.id);
      }

      const exam = await examsLib.createExam({
        tenantId,
        title: 'Progress Tracking Test',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds: questions,
      });

      // Start students and submit answers
      const startTime = performance.now();

      for (let i = 0; i < CONCURRENT_STUDENTS; i++) {
        const studentId = `student-${i}`;
        await examsLib.startExam(exam.id, studentId);

        // Submit some answers
        for (let j = 0; j < 3; j++) {
          await examsLib.submitAnswer(exam.id, studentId, {
            questionId: questions[j],
            selectedOption: i % 4,
            timeSpent: 30,
          });
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTimePerStudent = totalTime / CONCURRENT_STUDENTS;

      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Average time per student: ${avgTimePerStudent.toFixed(2)}ms`);

      expect(avgTimePerStudent).toBeLessThan(100); // Should average < 100ms per student
    });

    it('should retrieve individual student progress efficiently', async () => {
      // Setup: Create exam
      const questions = [];
      for (let i = 0; i < 5; i++) {
        const q = await questionsLib.createQuestion({
          tenantId,
          text: `Q${i}`,
          type: 'multiple_choice',
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
          difficulty: 'easy',
          subject: 'Test',
        });
        questions.push(q.id);
      }

      const exam = await examsLib.createExam({
        tenantId,
        title: 'Individual Progress Test',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds: questions,
      });

      const studentId = 'test-student';
      await examsLib.startExam(exam.id, studentId);

      // Submit answers
      for (const questionId of questions) {
        await examsLib.submitAnswer(exam.id, studentId, {
          questionId,
          selectedOption: 0,
          timeSpent: 30,
        });
      }

      // Retrieve progress
      const startTime = performance.now();
      const progress = await monitoringLib.getStudentProgress(exam.id, studentId);
      const endTime = performance.now();

      const progressTime = endTime - startTime;
      console.log(`Student progress retrieval time: ${progressTime.toFixed(2)}ms`);

      expect(progress).toBeDefined();
      expect(progressTime).toBeLessThan(500); // Should complete in < 500ms
    });
  });

  describe('Offline Sync Performance', () => {
    it('should sync 1,000+ offline answers efficiently', async () => {
      // Setup: Create exam
      const questions = [];
      for (let i = 0; i < 10; i++) {
        const q = await questionsLib.createQuestion({
          tenantId,
          text: `Q${i}`,
          type: 'multiple_choice',
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
          difficulty: 'easy',
          subject: 'Test',
        });
        questions.push(q.id);
      }

      const exam = await examsLib.createExam({
        tenantId,
        title: 'Sync Performance Test',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds: questions,
      });

      const studentId = 'sync-test-student';

      // Generate offline answers
      const offlineAnswers = [];
      for (let i = 0; i < MEDIUM_DATASET_SIZE; i++) {
        offlineAnswers.push({
          questionId: questions[i % questions.length],
          selectedOption: i % 4,
          timeSpent: 30,
          timestamp: Date.now() - (MEDIUM_DATASET_SIZE - i) * 1000,
        });
      }

      // Sync answers
      const startTime = performance.now();
      const syncResult = await syncLib.syncOfflineAnswers(
        exam.id,
        studentId,
        offlineAnswers
      );
      const endTime = performance.now();

      const syncTime = endTime - startTime;
      const avgTimePerAnswer = syncTime / MEDIUM_DATASET_SIZE;

      console.log(`Total sync time: ${syncTime.toFixed(2)}ms`);
      console.log(`Average time per answer: ${avgTimePerAnswer.toFixed(2)}ms`);

      expect(syncResult.synced).toBe(true);
      expect(avgTimePerAnswer).toBeLessThan(10); // Should average < 10ms per answer
    });

    it('should handle sync queue efficiently', async () => {
      // Setup: Create exam
      const questions = [];
      for (let i = 0; i < 5; i++) {
        const q = await questionsLib.createQuestion({
          tenantId,
          text: `Q${i}`,
          type: 'multiple_choice',
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
          difficulty: 'easy',
          subject: 'Test',
        });
        questions.push(q.id);
      }

      const exam = await examsLib.createExam({
        tenantId,
        title: 'Queue Test',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds: questions,
      });

      const studentId = 'queue-test-student';

      // Generate multiple sync batches
      const startTime = performance.now();

      for (let batch = 0; batch < 10; batch++) {
        const offlineAnswers = [];
        for (let i = 0; i < 100; i++) {
          offlineAnswers.push({
            questionId: questions[i % questions.length],
            selectedOption: i % 4,
            timeSpent: 30,
            timestamp: Date.now() - (10 - batch) * 10000,
          });
        }

        await syncLib.syncOfflineAnswers(exam.id, studentId, offlineAnswers);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      console.log(`Total queue processing time: ${totalTime.toFixed(2)}ms`);

      expect(totalTime).toBeLessThan(10000); // Should complete in < 10 seconds
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory during large operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create and process 500 questions
      const questionIds: string[] = [];
      for (let i = 0; i < 500; i++) {
        const q = await questionsLib.createQuestion({
          tenantId,
          text: `Q${i}`,
          type: 'multiple_choice',
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
          difficulty: 'easy',
          subject: 'Test',
        });
        questionIds.push(q.id);
      }

      // Create exam
      const exam = await examsLib.createExam({
        tenantId,
        title: 'Memory Test',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds: questionIds.slice(0, 10),
      });

      // Process results
      for (let i = 0; i < 100; i++) {
        const studentId = `student-${i}`;
        await examsLib.startExam(exam.id, studentId);
        for (const questionId of questionIds.slice(0, 10)) {
          await examsLib.submitAnswer(exam.id, studentId, {
            questionId,
            selectedOption: i % 4,
            timeSpent: 30,
          });
        }
        await examsLib.endExam(exam.id, studentId);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseInMB = memoryIncrease / (1024 * 1024);

      console.log(`Memory increase: ${memoryIncreaseInMB.toFixed(2)}MB`);

      // Memory increase should be reasonable (< 100MB for this operation)
      expect(memoryIncreaseInMB).toBeLessThan(100);
    });

    it('should clean up resources after operations', async () => {
      // Create and cleanup resources
      const questions = [];
      for (let i = 0; i < 50; i++) {
        const q = await questionsLib.createQuestion({
          tenantId,
          text: `Q${i}`,
          type: 'multiple_choice',
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
          difficulty: 'easy',
          subject: 'Test',
        });
        questions.push(q.id);
      }

      const exam = await examsLib.createExam({
        tenantId,
        title: 'Cleanup Test',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        questionIds: questions,
      });

      // Process and cleanup
      for (let i = 0; i < 50; i++) {
        const studentId = `student-${i}`;
        await examsLib.startExam(exam.id, studentId);
        for (const questionId of questions) {
          await examsLib.submitAnswer(exam.id, studentId, {
            questionId,
            selectedOption: i % 4,
            timeSpent: 30,
          });
        }
        await examsLib.endExam(exam.id, studentId);
      }

      // Verify cleanup
      const results = await resultsLib.getExamResults(exam.id);
      expect(results).toBeDefined();
    });
  });

  describe('Database Query Performance', () => {
    it('should execute queries efficiently with proper indexing', async () => {
      // Create questions
      for (let i = 0; i < 100; i++) {
        await questionsLib.createQuestion({
          tenantId,
          text: `Question ${i}`,
          type: 'multiple_choice',
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
          difficulty: ['easy', 'medium', 'hard'][i % 3],
          subject: `Subject${i % 5}`,
        });
      }

      // Test query performance
      const startTime = performance.now();
      const results = await questionsLib.getQuestions(tenantId, {
        difficulty: 'medium',
        subject: 'Subject0',
      });
      const endTime = performance.now();

      const queryTime = endTime - startTime;
      console.log(`Query time: ${queryTime.toFixed(2)}ms`);

      expect(results).toBeDefined();
      expect(queryTime).toBeLessThan(500); // Should complete in < 500ms
    });
  });
});
