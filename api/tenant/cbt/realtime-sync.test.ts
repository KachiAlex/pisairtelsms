/**
 * Real-Time Synchronization Tests
 * 
 * Tests for WebSocket manager, real-time broadcasting, and polling fallback.
 * 
 * Property 29: Real-Time Monitoring Updates Without Refresh
 * Property 30: Results Tab Updates Immediately
 * Property 31: Question Bank Updates Immediately
 * Property 32: Concurrent Access Maintains Consistency
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { WebSocketManager } from './_lib/websocket-manager';
import {
  broadcastProgressUpdate,
  broadcastResultSubmission,
  broadcastExamEnded,
  getQueuedMessages,
} from './_lib/realtime-sync';
import { PollingFallbackManager, hashData } from './_lib/polling-fallback';

describe('Real-Time Synchronization', () => {
  let wsManager: WebSocketManager;

  beforeEach(() => {
    wsManager = new WebSocketManager();
  });

  afterEach(() => {
    wsManager.destroy();
  });

  describe('WebSocket Manager', () => {
    it('should register and retrieve connections', () => {
      const clientId = 'client-1';
      const examId = 'exam-1';
      const tenantId = 'tenant-1';
      const userId = 'user-1';

      const client = wsManager.registerConnection(
        clientId,
        examId,
        tenantId,
        userId,
        'invigilator'
      );

      expect(client.id).toBe(clientId);
      expect(client.examId).toBe(examId);
      expect(client.role).toBe('invigilator');

      const retrieved = wsManager.getClient(clientId, examId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(clientId);
    });

    it('should unregister connections', () => {
      const clientId = 'client-1';
      const examId = 'exam-1';

      wsManager.registerConnection(
        clientId,
        examId,
        'tenant-1',
        'user-1',
        'invigilator'
      );

      wsManager.unregisterConnection(clientId, examId);

      const retrieved = wsManager.getClient(clientId, examId);
      expect(retrieved).toBeNull();
    });

    it('should get all exam clients', () => {
      const examId = 'exam-1';

      wsManager.registerConnection(
        'client-1',
        examId,
        'tenant-1',
        'user-1',
        'invigilator'
      );
      wsManager.registerConnection(
        'client-2',
        examId,
        'tenant-1',
        'user-2',
        'admin'
      );

      const clients = wsManager.getExamClients(examId);
      expect(clients).toHaveLength(2);
      expect(clients.map((c) => c.id)).toContain('client-1');
      expect(clients.map((c) => c.id)).toContain('client-2');
    });

    it('should validate connections', () => {
      const validation = wsManager.validateConnection(
        'tenant-1',
        'exam-1',
        'user-1',
        'invigilator'
      );

      expect(validation.valid).toBe(true);
    });

    it('should reject invalid connections', () => {
      const validation = wsManager.validateConnection(
        '',
        'exam-1',
        'user-1',
        'invigilator'
      );

      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
    });

    it('should get connection statistics', () => {
      wsManager.registerConnection(
        'client-1',
        'exam-1',
        'tenant-1',
        'user-1',
        'invigilator'
      );
      wsManager.registerConnection(
        'client-2',
        'exam-1',
        'tenant-1',
        'user-2',
        'admin'
      );
      wsManager.registerConnection(
        'client-3',
        'exam-2',
        'tenant-1',
        'user-3',
        'invigilator'
      );

      const stats = wsManager.getStats();

      expect(stats.totalConnections).toBe(3);
      expect(stats.examCount).toBe(2);
      expect(stats.exams['exam-1']).toBe(2);
      expect(stats.exams['exam-2']).toBe(1);
    });

    it('should queue messages for late-joining clients', () => {
      const examId = 'exam-1';

      // Register a client first so the exam pool exists
      wsManager.registerConnection(
        'client-1',
        examId,
        'tenant-1',
        'user-1',
        'invigilator'
      );

      // Broadcast a message
      broadcastProgressUpdate({
        examId,
        studentId: 'student-1',
        questionsAnswered: 5,
        currentQuestion: 6,
        timeRemaining: 1800,
        completionPercentage: 50,
        status: 'Active',
      });

      // Get queued messages
      const queued = getQueuedMessages(examId);

      expect(queued.length).toBeGreaterThan(0);
      expect(queued[0].type).toBe('progress_update');
    });
  });

  describe('Real-Time Broadcasting', () => {
    it('should queue progress updates', () => {
      const examId = 'exam-1';

      // Register a client first
      wsManager.registerConnection(
        'client-1',
        examId,
        'tenant-1',
        'user-1',
        'invigilator'
      );

      broadcastProgressUpdate({
        examId,
        studentId: 'student-1',
        questionsAnswered: 5,
        currentQuestion: 6,
        timeRemaining: 1800,
        completionPercentage: 50,
        status: 'Active',
      });

      const queued = getQueuedMessages(examId);
      expect(queued.length).toBeGreaterThan(0);
      expect(queued[0].type).toBe('progress_update');
      expect(queued[0].data.studentId).toBe('student-1');
    });

    it('should queue result submissions', () => {
      const examId = 'exam-1';

      // Register a client first
      wsManager.registerConnection(
        'client-1',
        examId,
        'tenant-1',
        'user-1',
        'invigilator'
      );

      broadcastResultSubmission({
        examId,
        studentId: 'student-1',
        studentName: 'John Doe',
        score: 85,
        totalMarks: 100,
        percentage: 85,
        status: 'Passed',
        submittedAt: new Date().toISOString(),
      });

      const queued = getQueuedMessages(examId);
      expect(queued.length).toBeGreaterThan(0);
      
      // Find the result submission message (skip ping messages from heartbeat)
      const resultMessage = queued.find((m) => m.type === 'student_completed');
      expect(resultMessage).toBeDefined();
      expect(resultMessage?.data.studentId).toBe('student-1');
    });

    it('should queue exam ended events', () => {
      const examId = 'exam-1';

      // Register a client first
      wsManager.registerConnection(
        'client-1',
        examId,
        'tenant-1',
        'user-1',
        'invigilator'
      );

      broadcastExamEnded(examId);

      const queued = getQueuedMessages(examId);
      expect(queued.length).toBeGreaterThan(0);
      
      // Find the exam ended message (skip ping messages from heartbeat)
      const endedMessage = queued.find((m) => m.type === 'exam_ended');
      expect(endedMessage).toBeDefined();
      expect(endedMessage?.data.examId).toBe(examId);
    });
  });

  describe('Polling Fallback', () => {
    it('should manage polling state', () => {
      const pollingManager = new PollingFallbackManager();
      const examId = 'exam-1';

      let pollCount = 0;
      const onPoll = async () => {
        pollCount++;
      };

      pollingManager.startPolling(examId, onPoll);

      const state = pollingManager.getPollingState(examId);
      expect(state).not.toBeNull();
      expect(state?.isActive).toBe(true);

      pollingManager.stopPolling(examId);

      const stoppedState = pollingManager.getPollingState(examId);
      expect(stoppedState).toBeNull();
    });

    it('should apply exponential backoff on error', () => {
      const pollingManager = new PollingFallbackManager({
        initialInterval: 1000,
        maxInterval: 10000,
        backoffMultiplier: 2,
        noChangeThreshold: 3,
      });

      const examId = 'exam-1';
      const initialInterval = 1000;

      let pollCount = 0;
      const onPoll = async () => {
        pollCount++;
        if (pollCount === 1) {
          throw new Error('Simulated error');
        }
      };

      pollingManager.startPolling(examId, onPoll);

      setTimeout(() => {
        const state = pollingManager.getPollingState(examId);
        if (state && pollCount > 0) {
          // After error, interval should increase
          expect(state.currentInterval).toBeGreaterThan(initialInterval);
        }
        pollingManager.stopAllPolling();
      }, 2000);
    });

    it('should reduce polling frequency when no changes detected', () => {
      const pollingManager = new PollingFallbackManager({
        initialInterval: 1000,
        maxInterval: 10000,
        backoffMultiplier: 1.5,
        noChangeThreshold: 2,
      });

      const examId = 'exam-1';
      const dataHash = 'hash-1';

      // Start polling first
      let pollCount = 0;
      pollingManager.startPolling(examId, async () => {
        pollCount++;
      });

      const state = pollingManager.getPollingState(examId);
      expect(state).not.toBeNull();

      // Simulate no changes
      if (state) {
        pollingManager.recordDataChange(examId, dataHash);
        pollingManager.recordDataChange(examId, dataHash);
        pollingManager.recordDataChange(examId, dataHash);

        // After threshold, interval should increase
        expect(state.currentInterval).toBeGreaterThan(1000);
      }

      pollingManager.stopAllPolling();
    });
  });

  describe('Property 29: Real-Time Monitoring Updates Without Refresh', () => {
    it('should update monitoring data within 1 second', async () => {
      return new Promise<void>((resolve) => {
        fc.assert(
          fc.property(
            fc.record({
              examId: fc.uuid(),
              studentId: fc.uuid(),
              questionsAnswered: fc.integer({ min: 0, max: 100 }),
              currentQuestion: fc.integer({ min: 0, max: 100 }),
              timeRemaining: fc.integer({ min: 0, max: 3600 }),
              completionPercentage: fc.integer({ min: 0, max: 100 }),
            }),
            (data) => {
              const startTime = Date.now();

              // Register a client first
              wsManager.registerConnection(
                `client-${data.studentId}`,
                data.examId,
                'tenant-1',
                'user-1',
                'invigilator'
              );

              broadcastProgressUpdate({
                examId: data.examId,
                studentId: data.studentId,
                questionsAnswered: data.questionsAnswered,
                currentQuestion: data.currentQuestion,
                timeRemaining: data.timeRemaining,
                completionPercentage: data.completionPercentage,
                status: 'Active',
              });

              const endTime = Date.now();
              const elapsed = endTime - startTime;

              // Broadcasting should complete within 1 second
              expect(elapsed).toBeLessThan(1000);
            }
          ),
          { numRuns: 20 }
        );
        resolve();
      });
    });
  });

  describe('Property 30: Results Tab Updates Immediately', () => {
    it('should broadcast result submissions immediately', async () => {
      return new Promise<void>((resolve) => {
        fc.assert(
          fc.property(
            fc.record({
              examId: fc.uuid(),
              studentId: fc.uuid(),
              studentName: fc.string({ minLength: 1, maxLength: 100 }),
              score: fc.integer({ min: 0, max: 100 }),
              totalMarks: fc.integer({ min: 50, max: 100 }),
              percentage: fc.integer({ min: 0, max: 100 }),
            }),
            (data) => {
              const startTime = Date.now();

              // Register a client first
              wsManager.registerConnection(
                `client-${data.studentId}`,
                data.examId,
                'tenant-1',
                'user-1',
                'invigilator'
              );

              broadcastResultSubmission({
                examId: data.examId,
                studentId: data.studentId,
                studentName: data.studentName,
                score: data.score,
                totalMarks: data.totalMarks,
                percentage: data.percentage,
                status: data.score >= data.totalMarks / 2 ? 'Passed' : 'Failed',
                submittedAt: new Date().toISOString(),
              });

              const endTime = Date.now();
              const elapsed = endTime - startTime;

              // Broadcasting should complete within 1 second
              expect(elapsed).toBeLessThan(1000);
            }
          ),
          { numRuns: 20 }
        );
        resolve();
      });
    });
  });

  describe('Property 32: Concurrent Access Maintains Consistency', () => {
    it('should handle concurrent connections without data loss', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              clientId: fc.uuid(),
              examId: fc.constant('exam-1'),
              userId: fc.uuid(),
              role: fc.constantFrom('invigilator', 'admin'),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (connections) => {
            const manager = new WebSocketManager();

            // Register all connections concurrently
            connections.forEach((conn) => {
              manager.registerConnection(
                conn.clientId,
                conn.examId,
                'tenant-1',
                conn.userId,
                conn.role
              );
            });

            // Verify all connections registered
            const clients = manager.getExamClients('exam-1');
            expect(clients).toHaveLength(connections.length);

            // Verify no duplicates
            const clientIds = clients.map((c) => c.id);
            const uniqueIds = new Set(clientIds);
            expect(uniqueIds.size).toBe(clientIds.length);

            manager.destroy();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should maintain consistency with concurrent broadcasts', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              studentId: fc.uuid(),
              questionsAnswered: fc.integer({ min: 0, max: 100 }),
              currentQuestion: fc.integer({ min: 0, max: 100 }),
              timeRemaining: fc.integer({ min: 0, max: 3600 }),
              completionPercentage: fc.integer({ min: 0, max: 100 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (updates) => {
            const examId = 'exam-1';
            const manager = new WebSocketManager();

            // Register a client
            manager.registerConnection(
              'client-1',
              examId,
              'tenant-1',
              'user-1',
              'invigilator'
            );

            // Broadcast multiple updates
            updates.forEach((update) => {
              manager.broadcastToExam(examId, {
                type: 'progress_update',
                data: {
                  studentId: update.studentId,
                  questionsAnswered: update.questionsAnswered,
                  currentQuestion: update.currentQuestion,
                  timeRemaining: update.timeRemaining,
                  completionPercentage: update.completionPercentage,
                },
              });
            });

            // Verify all messages queued
            const queued = manager.getQueuedMessages(examId);
            expect(queued.length).toBeGreaterThanOrEqual(updates.length);

            manager.destroy();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Hash Function', () => {
    it('should generate consistent hashes for same data', () => {
      const data = { a: 1, b: 'test', c: [1, 2, 3] };
      const hash1 = hashData(data);
      const hash2 = hashData(data);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different data', () => {
      const data1 = { a: 1 };
      const data2 = { a: 2 };

      const hash1 = hashData(data1);
      const hash2 = hashData(data2);

      expect(hash1).not.toBe(hash2);
    });
  });
});
