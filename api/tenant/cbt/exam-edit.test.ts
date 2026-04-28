/**
 * Exam Edit Tests
 * Property-Based Tests for Exam Edit Operations
 * Property 11: Exam Edits Update Database
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  editExam,
  validateEditInput,
  getEditableFields,
  canEditExam,
  type EditExamInput,
} from './_lib/exam-edit';

describe('Property 11: Exam Edits Update Database', () => {
  let pool: Pool;
  let tenantId: string;

  beforeEach(() => {
    pool = {
      query: vi.fn(),
    } as any;

    tenantId = uuidv4();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Test Case 1: Edit exam title updates database', () => {
    it('should update exam title and persist changes', async () => {
      const examId = uuidv4();
      const oldTitle = 'Mathematics Final Exam';
      const newTitle = 'Mathematics Final Exam - Updated';

      // Mock get exam query (for editExam)
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            tenant_id: tenantId,
            title: oldTitle,
            subject: 'Mathematics',
            class: 'Class 10',
            duration: 120,
            pass_mark: 40,
            total_marks: 100,
            status: 'Draft',
            created_by: uuidv4(),
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ],
      });

      // Mock get exam query (for updateExam)
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            tenant_id: tenantId,
            title: oldTitle,
            subject: 'Mathematics',
            class: 'Class 10',
            duration: 120,
            pass_mark: 40,
            total_marks: 100,
            status: 'Draft',
            created_by: uuidv4(),
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ],
      });

      // Mock update query
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            tenant_id: tenantId,
            title: newTitle,
            subject: 'Mathematics',
            class: 'Class 10',
            duration: 120,
            pass_mark: 40,
            total_marks: 100,
            status: 'Draft',
            created_by: uuidv4(),
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ],
      });

      const input: EditExamInput = {
        title: newTitle,
      };

      const result = await editExam(pool, tenantId, examId, input);

      expect(result.success).toBe(true);
      expect(result.examId).toBe(examId);
      expect(result.previousValues.title).toBe(oldTitle);
      expect(result.updatedValues.title).toBe(newTitle);
      expect(result.message).toContain('1 field(s) changed');
    });
  });

  describe('Test Case 2: Edit multiple exam fields updates all changes', () => {
    it('should update multiple fields and track all changes', async () => {
      const examId = uuidv4();

      // Mock get exam query (for editExam)
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            tenant_id: tenantId,
            title: 'Old Title',
            subject: 'Mathematics',
            class: 'Class 10',
            duration: 120,
            pass_mark: 40,
            total_marks: 100,
            status: 'Draft',
            created_by: uuidv4(),
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ],
      });

      // Mock get exam query (for updateExam)
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            tenant_id: tenantId,
            title: 'Old Title',
            subject: 'Mathematics',
            class: 'Class 10',
            duration: 120,
            pass_mark: 40,
            total_marks: 100,
            status: 'Draft',
            created_by: uuidv4(),
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ],
      });

      // Mock update query
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            tenant_id: tenantId,
            title: 'New Title',
            subject: 'Science',
            class: 'Class 9',
            duration: 90,
            pass_mark: 35,
            total_marks: 80,
            status: 'Draft',
            created_by: uuidv4(),
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ],
      });

      const input: EditExamInput = {
        title: 'New Title',
        subject: 'Science',
        class: 'Class 9',
        duration: 90,
        pass_mark: 35,
        total_marks: 80,
      };

      const result = await editExam(pool, tenantId, examId, input);

      expect(result.success).toBe(true);
      expect(Object.keys(result.previousValues).length).toBe(6);
      expect(Object.keys(result.updatedValues).length).toBe(6);
      expect(result.message).toContain('6 field(s) changed');
    });
  });

  describe('Test Case 3: Cannot edit completed exam', () => {
    it('should reject editing when exam is Completed', async () => {
      const examId = uuidv4();

      // Mock get exam query - returns Completed status
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            tenant_id: tenantId,
            title: 'Completed Exam',
            subject: 'Mathematics',
            class: 'Class 10',
            duration: 120,
            pass_mark: 40,
            total_marks: 100,
            status: 'Completed',
            created_by: uuidv4(),
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ],
      });

      const input: EditExamInput = {
        title: 'New Title',
      };

      await expect(editExam(pool, tenantId, examId, input)).rejects.toThrow(
        'Cannot edit completed exams'
      );
    });
  });

  describe('Test Case 4: Cannot edit ongoing exam', () => {
    it('should reject editing when exam is Ongoing', async () => {
      const examId = uuidv4();

      // Mock get exam query - returns Ongoing status
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            tenant_id: tenantId,
            title: 'Ongoing Exam',
            subject: 'Mathematics',
            class: 'Class 10',
            duration: 120,
            pass_mark: 40,
            total_marks: 100,
            status: 'Ongoing',
            created_by: uuidv4(),
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ],
      });

      const input: EditExamInput = {
        title: 'New Title',
      };

      await expect(editExam(pool, tenantId, examId, input)).rejects.toThrow(
        'Cannot edit ongoing exams'
      );
    });
  });

  describe('Test Case 5: Cannot edit cancelled exam', () => {
    it('should reject editing when exam is Cancelled', async () => {
      const examId = uuidv4();

      // Mock get exam query - returns Cancelled status
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            tenant_id: tenantId,
            title: 'Cancelled Exam',
            subject: 'Mathematics',
            class: 'Class 10',
            duration: 120,
            pass_mark: 40,
            total_marks: 100,
            status: 'Cancelled',
            created_by: uuidv4(),
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ],
      });

      const input: EditExamInput = {
        title: 'New Title',
      };

      await expect(editExam(pool, tenantId, examId, input)).rejects.toThrow(
        'Cannot edit cancelled exams'
      );
    });
  });

  describe('Test Case 6: Can edit draft exam', () => {
    it('should allow editing when exam is Draft', async () => {
      const examId = uuidv4();

      // Mock get exam query (for editExam)
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            tenant_id: tenantId,
            title: 'Draft Exam',
            subject: 'Mathematics',
            class: 'Class 10',
            duration: 120,
            pass_mark: 40,
            total_marks: 100,
            status: 'Draft',
            created_by: uuidv4(),
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ],
      });

      // Mock get exam query (for updateExam)
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            tenant_id: tenantId,
            title: 'Draft Exam',
            subject: 'Mathematics',
            class: 'Class 10',
            duration: 120,
            pass_mark: 40,
            total_marks: 100,
            status: 'Draft',
            created_by: uuidv4(),
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ],
      });

      // Mock update query
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            tenant_id: tenantId,
            title: 'Updated Draft Exam',
            subject: 'Mathematics',
            class: 'Class 10',
            duration: 120,
            pass_mark: 40,
            total_marks: 100,
            status: 'Draft',
            created_by: uuidv4(),
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ],
      });

      const input: EditExamInput = {
        title: 'Updated Draft Exam',
      };

      const result = await editExam(pool, tenantId, examId, input);

      expect(result.success).toBe(true);
      expect(result.updatedValues.title).toBe('Updated Draft Exam');
    });
  });

  describe('Test Case 7: Can edit scheduled exam', () => {
    it('should allow editing when exam is Scheduled', async () => {
      const examId = uuidv4();

      // Mock get exam query (for editExam)
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            tenant_id: tenantId,
            title: 'Scheduled Exam',
            subject: 'Mathematics',
            class: 'Class 10',
            duration: 120,
            pass_mark: 40,
            total_marks: 100,
            status: 'Scheduled',
            created_by: uuidv4(),
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ],
      });

      // Mock get exam query (for updateExam)
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            tenant_id: tenantId,
            title: 'Scheduled Exam',
            subject: 'Mathematics',
            class: 'Class 10',
            duration: 120,
            pass_mark: 40,
            total_marks: 100,
            status: 'Scheduled',
            created_by: uuidv4(),
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ],
      });

      // Mock update query
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            tenant_id: tenantId,
            title: 'Updated Scheduled Exam',
            subject: 'Mathematics',
            class: 'Class 10',
            duration: 120,
            pass_mark: 40,
            total_marks: 100,
            status: 'Scheduled',
            created_by: uuidv4(),
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ],
      });

      const input: EditExamInput = {
        title: 'Updated Scheduled Exam',
      };

      const result = await editExam(pool, tenantId, examId, input);

      expect(result.success).toBe(true);
      expect(result.updatedValues.title).toBe('Updated Scheduled Exam');
    });
  });

  describe('Test Case 8: No changes returns success with empty updates', () => {
    it('should return success when no fields are changed', async () => {
      const examId = uuidv4();
      const title = 'Exam Title';

      // Mock get exam query
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            tenant_id: tenantId,
            title,
            subject: 'Mathematics',
            class: 'Class 10',
            duration: 120,
            pass_mark: 40,
            total_marks: 100,
            status: 'Draft',
            created_by: uuidv4(),
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ],
      });

      const input: EditExamInput = {
        title, // Same as current
      };

      const result = await editExam(pool, tenantId, examId, input);

      expect(result.success).toBe(true);
      expect(Object.keys(result.updatedValues).length).toBe(0);
      expect(result.message).toContain('No changes made');
    });
  });

  describe('Test Case 9: Edit validation rejects invalid input', () => {
    it('should reject empty title', () => {
      const input: EditExamInput = {
        title: '',
      };

      const errors = validateEditInput(input);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('title cannot be empty');
    });

    it('should reject invalid duration', () => {
      const input: EditExamInput = {
        duration: 10, // Too short
      };

      const errors = validateEditInput(input);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Duration must be at least 15 minutes');
    });

    it('should reject invalid pass mark', () => {
      const input: EditExamInput = {
        pass_mark: 150, // Too high
      };

      const errors = validateEditInput(input);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Pass mark must not exceed 100');
    });

    it('should reject total marks <= pass mark', () => {
      const input: EditExamInput = {
        total_marks: 50,
        pass_mark: 60,
      };

      const errors = validateEditInput(input);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Total marks must be greater than pass mark');
    });
  });

  describe('Test Case 10: Get editable fields by status', () => {
    it('should return all fields for Draft status', () => {
      const fields = getEditableFields('Draft');

      expect(fields).toContain('title');
      expect(fields).toContain('subject');
      expect(fields).toContain('class');
      expect(fields).toContain('duration');
      expect(fields).toContain('pass_mark');
      expect(fields).toContain('total_marks');
      expect(fields.length).toBe(6);
    });

    it('should return all fields for Scheduled status', () => {
      const fields = getEditableFields('Scheduled');

      expect(fields.length).toBe(6);
    });

    it('should return no fields for Completed status', () => {
      const fields = getEditableFields('Completed');

      expect(fields.length).toBe(0);
    });

    it('should return no fields for Ongoing status', () => {
      const fields = getEditableFields('Ongoing');

      expect(fields.length).toBe(0);
    });

    it('should return no fields for Cancelled status', () => {
      const fields = getEditableFields('Cancelled');

      expect(fields.length).toBe(0);
    });
  });

  describe('Test Case 11: Can edit exam by status', () => {
    it('should return true for Draft status', () => {
      expect(canEditExam('Draft')).toBe(true);
    });

    it('should return true for Scheduled status', () => {
      expect(canEditExam('Scheduled')).toBe(true);
    });

    it('should return false for Completed status', () => {
      expect(canEditExam('Completed')).toBe(false);
    });

    it('should return false for Ongoing status', () => {
      expect(canEditExam('Ongoing')).toBe(false);
    });

    it('should return false for Cancelled status', () => {
      expect(canEditExam('Cancelled')).toBe(false);
    });
  });

  describe('Test Case 12: Edit preserves other exam fields', () => {
    it('should not modify fields that are not being edited', async () => {
      const examId = uuidv4();
      const unchangedSubject = 'Mathematics';
      const unchangedClass = 'Class 10';

      // Mock get exam query (for editExam)
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            tenant_id: tenantId,
            title: 'Old Title',
            subject: unchangedSubject,
            class: unchangedClass,
            duration: 120,
            pass_mark: 40,
            total_marks: 100,
            status: 'Draft',
            created_by: uuidv4(),
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ],
      });

      // Mock get exam query (for updateExam)
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            tenant_id: tenantId,
            title: 'Old Title',
            subject: unchangedSubject,
            class: unchangedClass,
            duration: 120,
            pass_mark: 40,
            total_marks: 100,
            status: 'Draft',
            created_by: uuidv4(),
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ],
      });

      // Mock update query
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            tenant_id: tenantId,
            title: 'New Title',
            subject: unchangedSubject,
            class: unchangedClass,
            duration: 120,
            pass_mark: 40,
            total_marks: 100,
            status: 'Draft',
            created_by: uuidv4(),
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ],
      });

      const input: EditExamInput = {
        title: 'New Title',
      };

      const result = await editExam(pool, tenantId, examId, input);

      expect(result.success).toBe(true);
      expect(result.previousValues.subject).toBeUndefined();
      expect(result.previousValues.class).toBeUndefined();
      expect(result.updatedValues.subject).toBeUndefined();
      expect(result.updatedValues.class).toBeUndefined();
    });
  });

  describe('Test Case 13: Edit exam not found returns error', () => {
    it('should return error when exam does not exist', async () => {
      const examId = uuidv4();

      // Mock get exam query - returns empty
      (pool.query as any).mockResolvedValueOnce({
        rows: [],
      });

      const input: EditExamInput = {
        title: 'New Title',
      };

      await expect(editExam(pool, tenantId, examId, input)).rejects.toThrow(
        'Exam not found'
      );
    });
  });

  describe('Test Case 14: Edit tracks audit trail with previous and updated values', () => {
    it('should provide complete audit trail of changes', async () => {
      const examId = uuidv4();

      // Mock get exam query (for editExam)
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            tenant_id: tenantId,
            title: 'Original Title',
            subject: 'Mathematics',
            class: 'Class 10',
            duration: 120,
            pass_mark: 40,
            total_marks: 100,
            status: 'Draft',
            created_by: uuidv4(),
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ],
      });

      // Mock get exam query (for updateExam)
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            tenant_id: tenantId,
            title: 'Original Title',
            subject: 'Mathematics',
            class: 'Class 10',
            duration: 120,
            pass_mark: 40,
            total_marks: 100,
            status: 'Draft',
            created_by: uuidv4(),
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ],
      });

      // Mock update query
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: examId,
            tenant_id: tenantId,
            title: 'Updated Title',
            subject: 'Science',
            class: 'Class 10',
            duration: 120,
            pass_mark: 40,
            total_marks: 100,
            status: 'Draft',
            created_by: uuidv4(),
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ],
      });

      const input: EditExamInput = {
        title: 'Updated Title',
        subject: 'Science',
      };

      const result = await editExam(pool, tenantId, examId, input);

      expect(result.previousValues.title).toBe('Original Title');
      expect(result.previousValues.subject).toBe('Mathematics');
      expect(result.updatedValues.title).toBe('Updated Title');
      expect(result.updatedValues.subject).toBe('Science');
    });
  });
});

