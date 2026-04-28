/**
 * Proctoring Service for CBT Exams
 * Handles logging and retrieval of proctoring events
 */

import { Pool } from 'pg';
import { getPool } from './db';

/**
 * Valid event types for proctoring
 */
export const VALID_EVENT_TYPES = [
  'camera_on',
  'camera_off',
  'tab_switch',
  'copy_attempt',
  'right_click',
] as const;

export type ProctoringEventType = typeof VALID_EVENT_TYPES[number];

/**
 * Proctoring event interface
 */
export interface ProctoringEvent {
  id: string;
  examId: string;
  studentId: string;
  eventType: ProctoringEventType;
  eventDetails: Record<string, any>;
  createdAt: string;
}

/**
 * Proctoring log filter options
 */
export interface ProctoringLogFilter {
  studentId?: string;
  eventType?: ProctoringEventType;
  startDate?: string;
  endDate?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Pagination result
 */
export interface PaginationResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

/**
 * Log a proctoring event
 */
export async function logProctoringEvent(
  examId: string,
  studentId: string,
  eventType: ProctoringEventType,
  details: Record<string, any> = {}
): Promise<ProctoringEvent> {
  const pool = getPool();

  try {
    // Validate event type
    if (!VALID_EVENT_TYPES.includes(eventType)) {
      throw new Error(`Invalid event type: ${eventType}`);
    }

    // Validate required fields
    if (!examId || !studentId) {
      throw new Error('examId and studentId are required');
    }

    // Insert event
    const result = await pool.query(
      `INSERT INTO proctoring_logs (exam_id, student_id, event_type, event_details, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING id, exam_id, student_id, event_type, event_details, created_at`,
      [examId, studentId, eventType, JSON.stringify(details)]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to log proctoring event');
    }

    return mapRowToProctoringEvent(result.rows[0]);
  } catch (error) {
    throw new Error(
      `Failed to log proctoring event: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get proctoring logs for an exam with optional filtering
 */
export async function getProctoringLogs(
  examId: string,
  tenantId: string,
  filters?: ProctoringLogFilter,
  pagination?: PaginationParams
): Promise<PaginationResult<ProctoringEvent>> {
  const pool = getPool();

  try {
    // Verify exam exists and belongs to tenant
    const examResult = await pool.query(
      `SELECT id FROM exams WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [examId, tenantId]
    );

    if (examResult.rows.length === 0) {
      throw new Error(`Exam ${examId} not found`);
    }

    // Build query
    let query = `SELECT id, exam_id, student_id, event_type, event_details, created_at
                 FROM proctoring_logs
                 WHERE exam_id = $1`;
    const params: any[] = [examId];
    let paramIndex = 2;

    // Add filters
    if (filters?.studentId) {
      query += ` AND student_id = $${paramIndex}`;
      params.push(filters.studentId);
      paramIndex++;
    }

    if (filters?.eventType) {
      // Validate event type
      if (!VALID_EVENT_TYPES.includes(filters.eventType)) {
        throw new Error(`Invalid event type: ${filters.eventType}`);
      }
      query += ` AND event_type = $${paramIndex}`;
      params.push(filters.eventType);
      paramIndex++;
    }

    if (filters?.startDate) {
      query += ` AND created_at >= $${paramIndex}::timestamp`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters?.endDate) {
      query += ` AND created_at <= $${paramIndex}::timestamp`;
      params.push(filters.endDate);
      paramIndex++;
    }

    // Get total count
    const countQuery = query.replace(
      'SELECT id, exam_id, student_id, event_type, event_details, created_at',
      'SELECT COUNT(*) as count'
    );
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Add ordering
    query += ` ORDER BY created_at DESC`;

    // Add pagination
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      throw new Error('Invalid pagination parameters');
    }

    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    // Execute query
    const result = await pool.query(query, params);

    const events = result.rows.map(mapRowToProctoringEvent);
    const pages = Math.ceil(total / limit);

    return {
      data: events,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to get proctoring logs: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Validate proctoring event data
 */
export function validateProctoringEvent(
  eventType: string,
  details?: Record<string, any>
): string[] {
  const errors: string[] = [];

  // Validate event type
  if (!eventType) {
    errors.push('Event type is required');
  } else if (!VALID_EVENT_TYPES.includes(eventType as ProctoringEventType)) {
    errors.push(
      `Invalid event type. Must be one of: ${VALID_EVENT_TYPES.join(', ')}`
    );
  }

  // Validate details is an object if provided
  if (details !== undefined && typeof details !== 'object') {
    errors.push('Event details must be an object');
  }

  return errors;
}

/**
 * Log a camera availability check event
 */
export async function logCameraAvailabilityCheck(
  examId: string,
  studentId: string,
  cameraAvailable: boolean,
  details: Record<string, any> = {}
): Promise<ProctoringEvent> {
  return logProctoringEvent(
    examId,
    studentId,
    cameraAvailable ? 'camera_on' : 'camera_off',
    {
      ...details,
      checkType: 'availability_check',
      timestamp: new Date().toISOString(),
    }
  );
}

/**
 * Log a camera access denied event
 */
export async function logCameraAccessDenied(
  examId: string,
  studentId: string,
  reason: string,
  details: Record<string, any> = {}
): Promise<ProctoringEvent> {
  return logProctoringEvent(
    examId,
    studentId,
    'camera_off',
    {
      ...details,
      eventType: 'access_denied',
      reason,
      timestamp: new Date().toISOString(),
    }
  );
}

/**
 * Map database row to ProctoringEvent interface
 */
function mapRowToProctoringEvent(row: any): ProctoringEvent {
  return {
    id: row.id,
    examId: row.exam_id,
    studentId: row.student_id,
    eventType: row.event_type as ProctoringEventType,
    eventDetails: row.event_details ? JSON.parse(row.event_details) : {},
    createdAt: row.created_at,
  };
}
