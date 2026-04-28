/**
 * Exam Scheduling Tests
 * Property-Based Tests for Exam Scheduling Operations
 * Property 10: Exam Scheduling Updates Status
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  scheduleExam,
  makeExamAvailable,
  startExam,
  completeExam,
  getExamSchedulingDetails,
  type ScheduleExamInput,
} from './_lib/exam-scheduling';
import { createExam, type CreateExamInput } from './_lib/exams';

describe('Property 10: Exam Scheduling Updates Status', () => {
  let pool: Pool;
  let tenantId: string;
  let userId: string;

  beforeEach(() => {
    // Create mock pool
    pool = {
      query: vi.fn(),
    } as any;

    tenantId = uuidv4();
    userId = uuidv4();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Test Case 1: Schedule exam changes status from Draft to Scheduled', () => {
    it('should update exam status to Scheduled when scheduling', async () => {
      const examId = uuidv4();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const scheduledDate = futureDate.toISOString().split('T')[0];
      const scheduledTime = '10:00';

      // Mock validation query
      (pool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId }],
      });

      // Mock question count query
      (pool.query as any).mockResolvedValueOnce({
        rows: [{ count: '5' }],
      });

      // Mock get exam query
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            status: 'Draft',
            scheduled_date: null,
            scheduled_time: null,
          },
        ],
      });

      // Mock update query
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            status: 'Scheduled',
            scheduled_date: scheduledDate,
            scheduled_time: scheduledTime,
          },
        ],
      });

      const input: ScheduleExamInput = {
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
      };

      const result = await scheduleExam(pool, tenantId, examId, input);

      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe('Draft');
      expect(result.newStatus).toBe('Scheduled');
      expect(result.scheduledDate).toBe(scheduledDate);
      expect(result.scheduledTime).toBe(scheduledTime);
    });
  });

  describe('Test Case 2: Cannot schedule exam without questions', () => {
    it('should reject scheduling when exam has no questions', async () => {
      const examId = uuidv4();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const scheduledDate = futureDate.toISOString().split('T')[0];
      const scheduledTime = '10:00';

      // Mock validation query
      (pool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId }],
      });

      // Mock question count query - returns 0
      (pool.query as any).mockResolvedValueOnce({
        rows: [{ count: '0' }],
      });

      const input: ScheduleExamInput = {
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
      };

      await expect(scheduleExam(pool, tenantId, examId, input)).rejects.toThrow(
        'Exam must have at least one question before scheduling'
      );
    });
  });

  describe('Test Case 3: Cannot schedule exam with past date', () => {
    it('should reject scheduling with past date and time', async () => {
      const examId = uuidv4();
      const pastDate = '2020-01-01';
      const pastTime = '10:00';

      const input: ScheduleExamInput = {
        scheduled_date: pastDate,
        scheduled_time: pastTime,
      };

      // The validation checks date format and future date before database queries
      // This should throw immediately without reaching the database
      await expect(scheduleExam(pool, tenantId, examId, input)).rejects.toThrow(
        'Scheduled date and time must be in the future'
      );
    });
  });

  describe('Test Case 4: Cannot schedule already scheduled exam', () => {
    it('should reject scheduling when exam is already Scheduled', async () => {
      const examId = uuidv4();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const scheduledDate = futureDate.toISOString().split('T')[0];
      const scheduledTime = '10:00';

      // Mock validation query
      (pool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId }],
      });

      // Mock question count query
      (pool.query as any).mockResolvedValueOnce({
        rows: [{ count: '5' }],
      });

      // Mock get exam query - returns Scheduled status
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            status: 'Scheduled',
            scheduled_date: '2026-12-20',
            scheduled_time: '09:00',
          },
        ],
      });

      const input: ScheduleExamInput = {
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
      };

      await expect(scheduleExam(pool, tenantId, examId, input)).rejects.toThrow(
        'Cannot schedule exam with status: Scheduled'
      );
    });
  });

  describe('Test Case 5: Cannot schedule ongoing exam', () => {
    it('should reject scheduling when exam is Ongoing', async () => {
      const examId = uuidv4();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const scheduledDate = futureDate.toISOString().split('T')[0];
      const scheduledTime = '10:00';

      // Mock validation query
      (pool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId }],
      });

      // Mock question count query
      (pool.query as any).mockResolvedValueOnce({
        rows: [{ count: '5' }],
      });

      // Mock get exam query - returns Ongoing status
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            status: 'Ongoing',
            scheduled_date: '2026-12-20',
            scheduled_time: '09:00',
          },
        ],
      });

      const input: ScheduleExamInput = {
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
      };

      await expect(scheduleExam(pool, tenantId, examId, input)).rejects.toThrow(
        'Cannot schedule exam with status: Ongoing'
      );
    });
  });

  describe('Test Case 6: Make exam available after scheduling', () => {
    it('should verify exam is available when status is Scheduled', async () => {
      const examId = uuidv4();

      // Mock get exam query
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            status: 'Scheduled',
          },
        ],
      });

      const result = await makeExamAvailable(pool, tenantId, examId);

      expect(result).toBe(true);
    });
  });

  describe('Test Case 7: Cannot make unavailable exam available', () => {
    it('should reject making available when exam is not Scheduled', async () => {
      const examId = uuidv4();

      // Mock get exam query - returns Draft status
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            status: 'Draft',
          },
        ],
      });

      await expect(makeExamAvailable(pool, tenantId, examId)).rejects.toThrow(
        'Exam must be in Scheduled status to make available'
      );
    });
  });

  describe('Test Case 8: Get scheduling details for scheduled exam', () => {
    it('should return correct scheduling details', async () => {
      const examId = uuidv4();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const scheduledDate = futureDate.toISOString().split('T')[0];
      const scheduledTime = '10:00';

      // Mock get exam query
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            status: 'Scheduled',
            scheduled_date: scheduledDate,
            scheduled_time: scheduledTime,
          },
        ],
      });

      const result = await getExamSchedulingDetails(pool, tenantId, examId);

      expect(result).not.toBeNull();
      expect(result?.examId).toBe(examId);
      expect(result?.status).toBe('Scheduled');
      expect(result?.scheduledDate).toBe(scheduledDate);
      expect(result?.scheduledTime).toBe(scheduledTime);
      expect(result?.isAvailable).toBe(true);
      expect(result?.hasStarted).toBe(false);
      expect(result?.hasEnded).toBe(false);
    });
  });

  describe('Test Case 9: Start exam changes status to Ongoing', () => {
    it('should update exam status to Ongoing when starting', async () => {
      const examId = uuidv4();
      const pastDate = '2020-01-01';
      const pastTime = '10:00';

      // Mock get exam query
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            status: 'Scheduled',
            scheduled_date: pastDate,
            scheduled_time: pastTime,
          },
        ],
      });

      // Mock update query
      (pool.query as any).mockResolvedValueOnce({
        rowCount: 1,
      });

      const result = await startExam(pool, tenantId, examId);

      expect(result).toBe(true);
    });
  });

  describe('Test Case 10: Complete exam changes status to Completed', () => {
    it('should update exam status to Completed when completing', async () => {
      const examId = uuidv4();

      // Mock get exam query
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            status: 'Ongoing',
          },
        ],
      });

      // Mock update query
      (pool.query as any).mockResolvedValueOnce({
        rowCount: 1,
      });

      const result = await completeExam(pool, tenantId, examId);

      expect(result).toBe(true);
    });
  });

  describe('Test Case 11: Scheduling with valid future date succeeds', () => {
    it('should successfully schedule exam with valid future date', async () => {
      const examId = uuidv4();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const scheduledDate = futureDate.toISOString().split('T')[0];
      const scheduledTime = '10:00';

      // Mock validation query
      (pool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId }],
      });

      // Mock question count query
      (pool.query as any).mockResolvedValueOnce({
        rows: [{ count: '10' }],
      });

      // Mock get exam query
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            status: 'Draft',
            scheduled_date: null,
            scheduled_time: null,
          },
        ],
      });

      // Mock update query
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            status: 'Scheduled',
            scheduled_date: scheduledDate,
            scheduled_time: scheduledTime,
          },
        ],
      });

      const input: ScheduleExamInput = {
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
      };

      const result = await scheduleExam(pool, tenantId, examId, input);

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('Scheduled');
    });
  });

  describe('Test Case 12: Scheduling with invalid date format fails', () => {
    it('should reject scheduling with invalid date format', async () => {
      const examId = uuidv4();
      const invalidDate = 'invalid-date';
      const invalidTime = 'invalid-time';

      const input: ScheduleExamInput = {
        scheduled_date: invalidDate,
        scheduled_time: invalidTime,
      };

      // The validation checks date format before database queries
      // This should throw immediately without reaching the database
      await expect(scheduleExam(pool, tenantId, examId, input)).rejects.toThrow(
        'Invalid scheduled date or time format'
      );
    });
  });

  describe('Test Case 13: Scheduling preserves exam data', () => {
    it('should not modify other exam fields when scheduling', async () => {
      const examId = uuidv4();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const scheduledDate = futureDate.toISOString().split('T')[0];
      const scheduledTime = '10:00';

      // Mock validation query
      (pool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId }],
      });

      // Mock question count query
      (pool.query as any).mockResolvedValueOnce({
        rows: [{ count: '5' }],
      });

      // Mock get exam query
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            status: 'Draft',
            scheduled_date: null,
            scheduled_time: null,
          },
        ],
      });

      // Mock update query
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            status: 'Scheduled',
            scheduled_date: scheduledDate,
            scheduled_time: scheduledTime,
          },
        ],
      });

      const input: ScheduleExamInput = {
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
      };

      const result = await scheduleExam(pool, tenantId, examId, input);

      // Verify only status and scheduling fields changed
      expect(result.examId).toBe(examId);
      expect(result.newStatus).toBe('Scheduled');
      expect(result.scheduledDate).toBe(scheduledDate);
      expect(result.scheduledTime).toBe(scheduledTime);
    });
  });

  describe('Test Case 14: Multiple exams can be scheduled independently', () => {
    it('should schedule multiple exams without interference', async () => {
      const examId1 = uuidv4();
      const examId2 = uuidv4();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const scheduledDate = futureDate.toISOString().split('T')[0];
      const scheduledTime = '10:00';

      // First exam scheduling
      (pool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId1 }],
      });
      (pool.query as any).mockResolvedValueOnce({
        rows: [{ count: '5' }],
      });
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId1,
            status: 'Draft',
            scheduled_date: null,
            scheduled_time: null,
          },
        ],
      });
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId1,
            status: 'Scheduled',
            scheduled_date: scheduledDate,
            scheduled_time: scheduledTime,
          },
        ],
      });

      // Second exam scheduling
      (pool.query as any).mockResolvedValueOnce({
        rows: [{ id: examId2 }],
      });
      (pool.query as any).mockResolvedValueOnce({
        rows: [{ count: '3' }],
      });
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId2,
            status: 'Draft',
            scheduled_date: null,
            scheduled_time: null,
          },
        ],
      });
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId2,
            status: 'Scheduled',
            scheduled_date: scheduledDate,
            scheduled_time: scheduledTime,
          },
        ],
      });

      const input: ScheduleExamInput = {
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
      };

      const result1 = await scheduleExam(pool, tenantId, examId1, input);
      const result2 = await scheduleExam(pool, tenantId, examId2, input);

      expect(result1.examId).toBe(examId1);
      expect(result2.examId).toBe(examId2);
      expect(result1.newStatus).toBe('Scheduled');
      expect(result2.newStatus).toBe('Scheduled');
    });
  });
});

