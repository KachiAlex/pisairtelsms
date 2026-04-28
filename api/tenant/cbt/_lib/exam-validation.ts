/**
 * Exam Validation Service
 * Comprehensive validation for exam creation, updates, and scheduling
 * Property 9: Exam Validation Rejects Invalid Data
 */

import { Pool } from 'pg';

export interface ExamValidationInput {
  title?: string;
  subject?: string;
  class?: string;
  duration?: number;
  pass_mark?: number;
  total_marks?: number;
  scheduled_date?: string;
  scheduled_time?: string;
  questionIds?: string[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validate exam creation input
 * Validates all required fields and constraints
 */
export function validateExamCreation(input: ExamValidationInput): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate title
  if (!input.title || input.title.trim().length === 0) {
    errors.push({
      field: 'title',
      message: 'Exam title is required',
    });
  } else if (input.title.length > 255) {
    errors.push({
      field: 'title',
      message: 'Exam title must not exceed 255 characters',
    });
  }

  // Validate subject
  if (!input.subject || input.subject.trim().length === 0) {
    errors.push({
      field: 'subject',
      message: 'Subject is required',
    });
  } else if (input.subject.length > 100) {
    errors.push({
      field: 'subject',
      message: 'Subject must not exceed 100 characters',
    });
  }

  // Validate class
  if (!input.class || input.class.trim().length === 0) {
    errors.push({
      field: 'class',
      message: 'Class is required',
    });
  } else if (input.class.length > 50) {
    errors.push({
      field: 'class',
      message: 'Class must not exceed 50 characters',
    });
  }

  // Validate duration
  if (input.duration === undefined || input.duration === null) {
    errors.push({
      field: 'duration',
      message: 'Duration is required',
    });
  } else if (input.duration < 15) {
    errors.push({
      field: 'duration',
      message: 'Duration must be at least 15 minutes',
    });
  } else if (input.duration > 480) {
    errors.push({
      field: 'duration',
      message: 'Duration must not exceed 480 minutes',
    });
  }

  // Validate pass mark
  if (input.pass_mark === undefined || input.pass_mark === null) {
    errors.push({
      field: 'pass_mark',
      message: 'Pass mark is required',
    });
  } else if (input.pass_mark < 0) {
    errors.push({
      field: 'pass_mark',
      message: 'Pass mark must be at least 0',
    });
  } else if (input.pass_mark > 100) {
    errors.push({
      field: 'pass_mark',
      message: 'Pass mark must not exceed 100',
    });
  }

  // Validate total marks
  if (input.total_marks === undefined || input.total_marks === null) {
    errors.push({
      field: 'total_marks',
      message: 'Total marks is required',
    });
  } else if (input.total_marks <= 0) {
    errors.push({
      field: 'total_marks',
      message: 'Total marks must be greater than 0',
    });
  }

  // Validate total marks > pass mark
  if (
    input.total_marks !== undefined &&
    input.pass_mark !== undefined &&
    input.total_marks <= input.pass_mark
  ) {
    errors.push({
      field: 'total_marks',
      message: 'Total marks must be greater than pass mark',
    });
  }

  // Validate scheduled date if provided
  if (input.scheduled_date) {
    if (!input.scheduled_time) {
      errors.push({
        field: 'scheduled_time',
        message: 'Scheduled time is required when scheduled date is provided',
      });
    } else {
      const examDateTime = new Date(`${input.scheduled_date}T${input.scheduled_time}`);
      if (isNaN(examDateTime.getTime())) {
        errors.push({
          field: 'scheduled_date',
          message: 'Invalid scheduled date or time format',
        });
      } else if (examDateTime <= new Date()) {
        errors.push({
          field: 'scheduled_date',
          message: 'Scheduled date and time must be in the future',
        });
      }
    }
  }

  // Validate at least one question selected
  if (!input.questionIds || input.questionIds.length === 0) {
    errors.push({
      field: 'questionIds',
      message: 'At least one question must be selected',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate exam update input
 * Only validates fields that are provided
 */
export function validateExamUpdate(input: ExamValidationInput): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate title if provided
  if (input.title !== undefined) {
    if (input.title.trim().length === 0) {
      errors.push({
        field: 'title',
        message: 'Exam title cannot be empty',
      });
    } else if (input.title.length > 255) {
      errors.push({
        field: 'title',
        message: 'Exam title must not exceed 255 characters',
      });
    }
  }

  // Validate subject if provided
  if (input.subject !== undefined) {
    if (input.subject.trim().length === 0) {
      errors.push({
        field: 'subject',
        message: 'Subject cannot be empty',
      });
    } else if (input.subject.length > 100) {
      errors.push({
        field: 'subject',
        message: 'Subject must not exceed 100 characters',
      });
    }
  }

  // Validate class if provided
  if (input.class !== undefined) {
    if (input.class.trim().length === 0) {
      errors.push({
        field: 'class',
        message: 'Class cannot be empty',
      });
    } else if (input.class.length > 50) {
      errors.push({
        field: 'class',
        message: 'Class must not exceed 50 characters',
      });
    }
  }

  // Validate duration if provided
  if (input.duration !== undefined) {
    if (input.duration < 15) {
      errors.push({
        field: 'duration',
        message: 'Duration must be at least 15 minutes',
      });
    } else if (input.duration > 480) {
      errors.push({
        field: 'duration',
        message: 'Duration must not exceed 480 minutes',
      });
    }
  }

  // Validate pass mark if provided
  if (input.pass_mark !== undefined) {
    if (input.pass_mark < 0) {
      errors.push({
        field: 'pass_mark',
        message: 'Pass mark must be at least 0',
      });
    } else if (input.pass_mark > 100) {
      errors.push({
        field: 'pass_mark',
        message: 'Pass mark must not exceed 100',
      });
    }
  }

  // Validate total marks if provided
  if (input.total_marks !== undefined) {
    if (input.total_marks <= 0) {
      errors.push({
        field: 'total_marks',
        message: 'Total marks must be greater than 0',
      });
    }
  }

  // Validate total marks > pass mark if both provided
  if (input.total_marks !== undefined && input.pass_mark !== undefined) {
    if (input.total_marks <= input.pass_mark) {
      errors.push({
        field: 'total_marks',
        message: 'Total marks must be greater than pass mark',
      });
    }
  }

  // Validate scheduled date if provided
  if (input.scheduled_date !== undefined) {
    if (!input.scheduled_time) {
      errors.push({
        field: 'scheduled_time',
        message: 'Scheduled time is required when scheduled date is provided',
      });
    } else {
      const examDateTime = new Date(`${input.scheduled_date}T${input.scheduled_time}`);
      if (isNaN(examDateTime.getTime())) {
        errors.push({
          field: 'scheduled_date',
          message: 'Invalid scheduled date or time format',
        });
      } else if (examDateTime <= new Date()) {
        errors.push({
          field: 'scheduled_date',
          message: 'Scheduled date and time must be in the future',
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate exam scheduling
 * Ensures exam has at least one question before scheduling
 */
export async function validateExamScheduling(
  pool: Pool,
  tenantId: string,
  examId: string,
  scheduled_date?: string,
  scheduled_time?: string
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];

  // Validate scheduled date and time
  if (!scheduled_date || !scheduled_time) {
    errors.push({
      field: 'scheduled_date',
      message: 'Scheduled date and time are required',
    });
  } else {
    const examDateTime = new Date(`${scheduled_date}T${scheduled_time}`);
    if (isNaN(examDateTime.getTime())) {
      errors.push({
        field: 'scheduled_date',
        message: 'Invalid scheduled date or time format',
      });
    } else if (examDateTime <= new Date()) {
      errors.push({
        field: 'scheduled_date',
        message: 'Scheduled date and time must be in the future',
      });
    }
  }

  // Verify exam exists and belongs to tenant
  const examCheck = await pool.query(
    'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2',
    [examId, tenantId]
  );

  if (examCheck.rows.length === 0) {
    errors.push({
      field: 'examId',
      message: 'Exam not found',
    });
    return { isValid: false, errors };
  }

  // Verify exam has at least one question
  const questionCheck = await pool.query(
    'SELECT COUNT(*) as count FROM exam_questions WHERE exam_id = $1',
    [examId]
  );

  const questionCount = parseInt(questionCheck.rows[0].count, 10);
  if (questionCount === 0) {
    errors.push({
      field: 'questions',
      message: 'Exam must have at least one question before scheduling',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate exam before completion
 * Ensures all required data is present
 */
export async function validateExamCompletion(
  pool: Pool,
  tenantId: string,
  examId: string
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];

  // Verify exam exists and belongs to tenant
  const examCheck = await pool.query(
    `SELECT id, title, subject, class, duration, pass_mark, total_marks, status
     FROM exams WHERE id = $1 AND tenant_id = $2`,
    [examId, tenantId]
  );

  if (examCheck.rows.length === 0) {
    errors.push({
      field: 'examId',
      message: 'Exam not found',
    });
    return { isValid: false, errors };
  }

  const exam = examCheck.rows[0];

  // Verify exam is in Ongoing status
  if (exam.status !== 'Ongoing') {
    errors.push({
      field: 'status',
      message: `Exam must be in Ongoing status to complete. Current status: ${exam.status}`,
    });
  }

  // Verify exam has questions
  const questionCheck = await pool.query(
    'SELECT COUNT(*) as count FROM exam_questions WHERE exam_id = $1',
    [examId]
  );

  const questionCount = parseInt(questionCheck.rows[0].count, 10);
  if (questionCount === 0) {
    errors.push({
      field: 'questions',
      message: 'Exam has no questions',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Format validation errors for API response
 */
export function formatValidationErrors(errors: ValidationError[]): Record<string, string> {
  const formatted: Record<string, string> = {};
  for (const error of errors) {
    formatted[error.field] = error.message;
  }
  return formatted;
}
