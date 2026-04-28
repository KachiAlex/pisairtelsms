/**
 * Centralized Validation Middleware
 * Provides consistent validation across all API endpoints
 * Requirements: 7.7, 8.1
 */

import { Pool } from 'pg';
import { ValidationError } from './types';

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validate question data
 */
export function validateQuestion(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate text
  if (!data.text || typeof data.text !== 'string' || data.text.trim().length === 0) {
    errors.push({
      field: 'text',
      message: 'Question text is required and must be a non-empty string',
    });
  } else if (data.text.length > 1000) {
    errors.push({
      field: 'text',
      message: 'Question text must not exceed 1000 characters',
    });
  }

  // Validate type
  if (!data.type || !['objective', 'truefalse', 'essay'].includes(data.type)) {
    errors.push({
      field: 'type',
      message: 'Question type must be one of: objective, truefalse, essay',
    });
  }

  // Validate options
  if (data.type !== 'essay') {
    if (!data.options || !Array.isArray(data.options) || data.options.length === 0) {
      errors.push({
        field: 'options',
        message: 'Options are required for objective and true/false questions',
      });
    } else if (data.options.length < 2 || data.options.length > 4) {
      errors.push({
        field: 'options',
        message: 'Options must contain between 2 and 4 items',
      });
    } else if (!data.options.every((opt: any) => typeof opt === 'string' && opt.trim().length > 0)) {
      errors.push({
        field: 'options',
        message: 'All options must be non-empty strings',
      });
    }
  }

  // Validate correct answer
  if (!data.correct_answer || typeof data.correct_answer !== 'string' || data.correct_answer.trim().length === 0) {
    errors.push({
      field: 'correct_answer',
      message: 'Correct answer is required',
    });
  } else if (data.type !== 'essay' && data.options) {
    if (!data.options.includes(data.correct_answer)) {
      errors.push({
        field: 'correct_answer',
        message: 'Correct answer must be one of the provided options',
      });
    }
  }

  // Validate difficulty
  if (!data.difficulty || !['Easy', 'Medium', 'Hard'].includes(data.difficulty)) {
    errors.push({
      field: 'difficulty',
      message: 'Difficulty must be one of: Easy, Medium, Hard',
    });
  }

  // Validate subject
  if (!data.subject || typeof data.subject !== 'string' || data.subject.trim().length === 0) {
    errors.push({
      field: 'subject',
      message: 'Subject is required and must be a non-empty string',
    });
  } else if (data.subject.length > 100) {
    errors.push({
      field: 'subject',
      message: 'Subject must not exceed 100 characters',
    });
  }

  // Validate tags (optional)
  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags)) {
      errors.push({
        field: 'tags',
        message: 'Tags must be an array',
      });
    } else if (!data.tags.every((tag: any) => typeof tag === 'string')) {
      errors.push({
        field: 'tags',
        message: 'All tags must be strings',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate exam data
 */
export function validateExam(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate title
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push({
      field: 'title',
      message: 'Exam title is required and must be a non-empty string',
    });
  } else if (data.title.length > 255) {
    errors.push({
      field: 'title',
      message: 'Exam title must not exceed 255 characters',
    });
  }

  // Validate subject
  if (!data.subject || typeof data.subject !== 'string' || data.subject.trim().length === 0) {
    errors.push({
      field: 'subject',
      message: 'Subject is required',
    });
  }

  // Validate class
  if (!data.class && !data.examClass) {
    errors.push({
      field: 'class',
      message: 'Class is required',
    });
  }

  // Validate duration
  if (data.duration === undefined || data.duration === null) {
    errors.push({
      field: 'duration',
      message: 'Duration is required',
    });
  } else if (typeof data.duration !== 'number' || data.duration < 15 || data.duration > 480) {
    errors.push({
      field: 'duration',
      message: 'Duration must be a number between 15 and 480 minutes',
    });
  }

  // Validate pass mark
  if (data.pass_mark === undefined || data.pass_mark === null) {
    errors.push({
      field: 'pass_mark',
      message: 'Pass mark is required',
    });
  } else if (typeof data.pass_mark !== 'number' || data.pass_mark < 0 || data.pass_mark > 100) {
    errors.push({
      field: 'pass_mark',
      message: 'Pass mark must be a number between 0 and 100',
    });
  }

  // Validate total marks
  if (!data.total_marks || typeof data.total_marks !== 'number' || data.total_marks <= 0) {
    errors.push({
      field: 'total_marks',
      message: 'Total marks must be a positive number',
    });
  }

  // Validate total marks > pass mark
  if (data.total_marks && data.pass_mark !== undefined && data.total_marks <= data.pass_mark) {
    errors.push({
      field: 'total_marks',
      message: 'Total marks must be greater than pass mark',
    });
  }

  // Validate scheduled date if provided
  if (data.scheduled_date) {
    const scheduledDate = new Date(data.scheduled_date);
    if (isNaN(scheduledDate.getTime())) {
      errors.push({
        field: 'scheduled_date',
        message: 'Scheduled date must be a valid date',
      });
    } else if (scheduledDate < new Date()) {
      errors.push({
        field: 'scheduled_date',
        message: 'Scheduled date must be in the future',
      });
    }
  }

  // Validate scheduled time if provided
  if (data.scheduled_time) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(data.scheduled_time)) {
      errors.push({
        field: 'scheduled_time',
        message: 'Scheduled time must be in HH:mm format',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate exam has questions
 */
export async function validateExamHasQuestions(
  pool: Pool,
  examId: string
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];

  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM exam_questions WHERE exam_id = $1',
      [examId]
    );

    const questionCount = parseInt(result.rows[0].count, 10);
    if (questionCount === 0) {
      errors.push({
        field: 'questions',
        message: 'Exam must have at least one question before scheduling',
      });
    }
  } catch (error) {
    errors.push({
      field: 'questions',
      message: 'Failed to validate exam questions',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate security settings
 */
export function validateSecuritySettings(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate IP addresses if provided
  if (data.allowed_ips && Array.isArray(data.allowed_ips)) {
    for (const ip of data.allowed_ips) {
      if (!isValidCIDR(ip)) {
        errors.push({
          field: 'allowed_ips',
          message: `Invalid CIDR notation: ${ip}. Use format xxx.xxx.xxx.xxx or xxx.xxx.xxx.xxx/xx`,
        });
        break;
      }
    }
  }

  // Validate exam password if provided
  if (data.exam_password) {
    if (typeof data.exam_password !== 'string' || data.exam_password.length === 0) {
      errors.push({
        field: 'exam_password',
        message: 'Exam password must be a non-empty string',
      });
    } else if (data.exam_password.length > 50) {
      errors.push({
        field: 'exam_password',
        message: 'Exam password must not exceed 50 characters',
      });
    }
  }

  // Validate boolean fields
  const booleanFields = [
    'enable_proctoring',
    'disable_copy_paste',
    'disable_right_click',
    'require_camera',
    'randomize_questions',
    'randomize_options',
  ];

  for (const field of booleanFields) {
    if (data[field] !== undefined && typeof data[field] !== 'boolean') {
      errors.push({
        field,
        message: `${field} must be a boolean value`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if CIDR notation is valid
 */
function isValidCIDR(cidr: string): boolean {
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
  if (!cidrRegex.test(cidr)) {
    return false;
  }

  // Validate IP octets
  const parts = cidr.split('/')[0].split('.');
  for (const part of parts) {
    const num = parseInt(part, 10);
    if (num < 0 || num > 255) {
      return false;
    }
  }

  // Validate CIDR prefix if present
  if (cidr.includes('/')) {
    const prefix = parseInt(cidr.split('/')[1], 10);
    if (prefix < 0 || prefix > 32) {
      return false;
    }
  }

  return true;
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
