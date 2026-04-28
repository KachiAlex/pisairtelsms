/**
 * Exam Edit Service
 * Handles exam editing operations with status-based restrictions
 * Property 11: Exam Edits Update Database
 */

import { Pool } from 'pg';
import { updateExam, getExamById, type UpdateExamInput, type Exam } from './exams';

export interface EditExamInput {
  title?: string;
  subject?: string;
  class?: string;
  duration?: number;
  pass_mark?: number;
  total_marks?: number;
}

export interface EditResult {
  success: boolean;
  examId: string;
  previousValues: Record<string, any>;
  updatedValues: Record<string, any>;
  message: string;
}

/**
 * Edit exam details with status-based restrictions
 * Prevents editing of completed or ongoing exams
 */
export async function editExam(
  pool: Pool,
  tenantId: string,
  examId: string,
  input: EditExamInput
): Promise<EditResult> {
  // Get current exam to check status
  const currentExam = await getExamById(pool, tenantId, examId);

  if (!currentExam) {
    throw new Error('Exam not found');
  }

  // Prevent editing of completed exams
  if (currentExam.status === 'Completed') {
    throw new Error('Cannot edit completed exams');
  }

  // Prevent editing of ongoing exams
  if (currentExam.status === 'Ongoing') {
    throw new Error('Cannot edit ongoing exams');
  }

  // Prevent editing of cancelled exams
  if (currentExam.status === 'Cancelled') {
    throw new Error('Cannot edit cancelled exams');
  }

  // Store previous values for audit trail
  const previousValues: Record<string, any> = {};
  const updatedValues: Record<string, any> = {};

  // Track which fields are being updated
  if (input.title !== undefined && input.title !== currentExam.title) {
    previousValues.title = currentExam.title;
    updatedValues.title = input.title;
  }

  if (input.subject !== undefined && input.subject !== currentExam.subject) {
    previousValues.subject = currentExam.subject;
    updatedValues.subject = input.subject;
  }

  if (input.class !== undefined && input.class !== currentExam.class) {
    previousValues.class = currentExam.class;
    updatedValues.class = input.class;
  }

  if (input.duration !== undefined && input.duration !== currentExam.duration) {
    previousValues.duration = currentExam.duration;
    updatedValues.duration = input.duration;
  }

  if (input.pass_mark !== undefined && input.pass_mark !== currentExam.pass_mark) {
    previousValues.pass_mark = currentExam.pass_mark;
    updatedValues.pass_mark = input.pass_mark;
  }

  if (input.total_marks !== undefined && input.total_marks !== currentExam.total_marks) {
    previousValues.total_marks = currentExam.total_marks;
    updatedValues.total_marks = input.total_marks;
  }

  // If no changes, return early
  if (Object.keys(updatedValues).length === 0) {
    return {
      success: true,
      examId,
      previousValues: {},
      updatedValues: {},
      message: 'No changes made to exam',
    };
  }

  // Update exam with new values
  const updateInput: UpdateExamInput = {
    title: input.title,
    subject: input.subject,
    class: input.class,
    duration: input.duration,
    pass_mark: input.pass_mark,
    total_marks: input.total_marks,
  };

  const updatedExam = await updateExam(pool, tenantId, examId, updateInput);

  if (!updatedExam) {
    throw new Error('Failed to update exam');
  }

  return {
    success: true,
    examId,
    previousValues,
    updatedValues,
    message: `Exam updated successfully. ${Object.keys(updatedValues).length} field(s) changed.`,
  };
}

/**
 * Validate exam edit input
 * Ensures all provided fields are valid
 */
export function validateEditInput(input: EditExamInput): string[] {
  const errors: string[] = [];

  if (input.title !== undefined) {
    if (input.title.trim().length === 0) {
      errors.push('Exam title cannot be empty');
    } else if (input.title.length > 255) {
      errors.push('Exam title must not exceed 255 characters');
    }
  }

  if (input.subject !== undefined) {
    if (input.subject.trim().length === 0) {
      errors.push('Subject cannot be empty');
    } else if (input.subject.length > 100) {
      errors.push('Subject must not exceed 100 characters');
    }
  }

  if (input.class !== undefined) {
    if (input.class.trim().length === 0) {
      errors.push('Class cannot be empty');
    } else if (input.class.length > 50) {
      errors.push('Class must not exceed 50 characters');
    }
  }

  if (input.duration !== undefined) {
    if (input.duration < 15) {
      errors.push('Duration must be at least 15 minutes');
    } else if (input.duration > 480) {
      errors.push('Duration must not exceed 480 minutes');
    }
  }

  if (input.pass_mark !== undefined) {
    if (input.pass_mark < 0) {
      errors.push('Pass mark must be at least 0');
    } else if (input.pass_mark > 100) {
      errors.push('Pass mark must not exceed 100');
    }
  }

  if (input.total_marks !== undefined) {
    if (input.total_marks <= 0) {
      errors.push('Total marks must be greater than 0');
    }
  }

  // Validate total marks > pass mark if both provided
  if (input.total_marks !== undefined && input.pass_mark !== undefined) {
    if (input.total_marks <= input.pass_mark) {
      errors.push('Total marks must be greater than pass mark');
    }
  }

  return errors;
}

/**
 * Get editable fields for an exam based on its status
 */
export function getEditableFields(examStatus: string): string[] {
  // Completed, Ongoing, and Cancelled exams cannot be edited
  if (examStatus === 'Completed' || examStatus === 'Ongoing' || examStatus === 'Cancelled') {
    return [];
  }

  // Draft and Scheduled exams can be edited
  return ['title', 'subject', 'class', 'duration', 'pass_mark', 'total_marks'];
}

/**
 * Check if exam can be edited based on status
 */
export function canEditExam(examStatus: string): boolean {
  return examStatus === 'Draft' || examStatus === 'Scheduled';
}

