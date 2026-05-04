/**
 * Security Settings Service
 * Business logic for exam security configuration and proctoring
 */

import { queryAll, queryOne, query } from './db';
import {
  SecuritySettings,
  UpdateSecuritySettingsInput,
  ProctoringLog,
  CreateProctoringLogInput,
} from './types';

/**
 * Get security settings for exam
 */
export async function getSecuritySettings(
  tenantId: string,
  examId: string
): Promise<SecuritySettings | null> {
  // Verify exam belongs to tenant
  const exam = await queryOne<{ id: string }>(
    'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2',
    [examId, tenantId]
  );

  if (!exam) {
    throw new Error('Exam not found');
  }

  return queryOne<SecuritySettings>(
    'SELECT * FROM security_settings WHERE exam_id = $1',
    [examId]
  );
}

/**
 * Create or update security settings
 */
export async function upsertSecuritySettings(
  tenantId: string,
  examId: string,
  input: UpdateSecuritySettingsInput
): Promise<SecuritySettings> {
  // Verify exam belongs to tenant
  const exam = await queryOne<{ id: string }>(
    'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2',
    [examId, tenantId]
  );

  if (!exam) {
    throw new Error('Exam not found');
  }

  // Validate input
  validateSecuritySettings(input);

  // Check if settings exist
  const existing = await getSecuritySettings(tenantId, examId);

  if (existing) {
    // Update existing settings
    const updated = await queryOne<SecuritySettings>(
      `UPDATE security_settings SET
        enable_proctoring = COALESCE($1, enable_proctoring),
        disable_copy_paste = COALESCE($2, disable_copy_paste),
        disable_right_click = COALESCE($3, disable_right_click),
        require_camera = COALESCE($4, require_camera),
        randomize_questions = COALESCE($5, randomize_questions),
        randomize_options = COALESCE($6, randomize_options),
        allowed_ips = COALESCE($7, allowed_ips),
        exam_password = COALESCE($8, exam_password),
        updated_at = CURRENT_TIMESTAMP
      WHERE exam_id = $9
      RETURNING *`,
      [
        input.enableProctoring,
        input.disableCopyPaste,
        input.disableRightClick,
        input.requireCamera,
        input.randomizeQuestions,
        input.randomizeOptions,
        input.allowedIps ? JSON.stringify(input.allowedIps) : null,
        input.examPassword,
        examId,
      ]
    );

    if (!updated) {
      throw new Error('Failed to update security settings');
    }

    return updated;
  } else {
    // Create new settings
    const created = await queryOne<SecuritySettings>(
      `INSERT INTO security_settings (
        exam_id, enable_proctoring, disable_copy_paste, disable_right_click,
        require_camera, randomize_questions, randomize_options, allowed_ips, exam_password
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        examId,
        input.enableProctoring || false,
        input.disableCopyPaste || false,
        input.disableRightClick || false,
        input.requireCamera || false,
        input.randomizeQuestions || false,
        input.randomizeOptions || false,
        input.allowedIps ? JSON.stringify(input.allowedIps) : JSON.stringify([]),
        input.examPassword || null,
      ]
    );

    if (!created) {
      throw new Error('Failed to create security settings');
    }

    return created;
  }
}

/**
 * Get proctoring logs for exam
 */
export async function getProctoringLogs(
  tenantId: string,
  examId: string,
  filter?: {
    studentId?: string;
    eventType?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }
): Promise<{
  success: boolean;
  data: ProctoringLog[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  // Verify exam belongs to tenant
  const exam = await queryOne<{ id: string }>(
    'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2',
    [examId, tenantId]
  );

  if (!exam) {
    throw new Error('Exam not found');
  }

  const page = filter?.page || 1;
  const limit = filter?.limit || 20;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE exam_id = $1';
  const params: any[] = [examId];
  let paramIndex = 2;

  if (filter?.studentId) {
    whereClause += ` AND student_id = $${paramIndex}`;
    params.push(filter.studentId);
    paramIndex++;
  }

  if (filter?.eventType) {
    whereClause += ` AND event_type = $${paramIndex}`;
    params.push(filter.eventType);
    paramIndex++;
  }

  if (filter?.startDate) {
    whereClause += ` AND created_at >= $${paramIndex}`;
    params.push(filter.startDate);
    paramIndex++;
  }

  if (filter?.endDate) {
    whereClause += ` AND created_at <= $${paramIndex}`;
    params.push(filter.endDate);
    paramIndex++;
  }

  // Get total count
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM proctoring_logs ${whereClause}`,
    params
  );
  const total = parseInt(countResult?.count || '0');

  // Get paginated results
  const logs = await queryAll<ProctoringLog>(
    `SELECT * FROM proctoring_logs ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  return {
    success: true,
    data: logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Create proctoring log entry
 */
export async function createProctoringLog(
  input: CreateProctoringLogInput
): Promise<ProctoringLog> {
  const log = await queryOne<ProctoringLog>(
    `INSERT INTO proctoring_logs (
      exam_id, student_id, event_type, event_details
    ) VALUES ($1, $2, $3, $4)
    RETURNING *`,
    [
      input.examId,
      input.studentId,
      input.eventType,
      input.eventDetails ? JSON.stringify(input.eventDetails) : null,
    ]
  );

  if (!log) {
    throw new Error('Failed to create proctoring log');
  }

  return log;
}

/**
 * Get proctoring logs for student in exam
 */
export async function getStudentProctoringLogs(
  tenantId: string,
  examId: string,
  studentId: string
): Promise<ProctoringLog[]> {
  // Verify exam belongs to tenant
  const exam = await queryOne<{ id: string }>(
    'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2',
    [examId, tenantId]
  );

  if (!exam) {
    throw new Error('Exam not found');
  }

  return queryAll<ProctoringLog>(
    'SELECT * FROM proctoring_logs WHERE exam_id = $1 AND student_id = $2 ORDER BY created_at DESC',
    [examId, studentId]
  );
}

/**
 * Get suspicious activity summary for exam
 */
export async function getSuspiciousActivitySummary(
  tenantId: string,
  examId: string
): Promise<{
  totalEvents: number;
  byEventType: Record<string, number>;
  affectedStudents: number;
  eventsByStudent: Array<{ studentId: string; eventCount: number }>;
}> {
  // Verify exam belongs to tenant
  const exam = await queryOne<{ id: string }>(
    'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2',
    [examId, tenantId]
  );

  if (!exam) {
    throw new Error('Exam not found');
  }

  const totalResult = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM proctoring_logs WHERE exam_id = $1',
    [examId]
  );
  const totalEvents = parseInt(totalResult?.count || '0');

  const byEventType = await queryAll<{ event_type: string; count: string }>(
    'SELECT event_type, COUNT(*) as count FROM proctoring_logs WHERE exam_id = $1 GROUP BY event_type',
    [examId]
  );

  const affectedStudentsResult = await queryOne<{ count: string }>(
    'SELECT COUNT(DISTINCT student_id) as count FROM proctoring_logs WHERE exam_id = $1',
    [examId]
  );
  const affectedStudents = parseInt(affectedStudentsResult?.count || '0');

  const eventsByStudent = await queryAll<{ student_id: string; count: string }>(
    'SELECT student_id, COUNT(*) as count FROM proctoring_logs WHERE exam_id = $1 GROUP BY student_id ORDER BY count DESC',
    [examId]
  );

  return {
    totalEvents,
    byEventType: Object.fromEntries(byEventType.map(e => [e.event_type, parseInt(e.count)])),
    affectedStudents,
    eventsByStudent: eventsByStudent.map(e => ({
      studentId: e.student_id,
      eventCount: parseInt(e.count),
    })),
  };
}

/**
 * Validate security settings
 */
function validateSecuritySettings(input: UpdateSecuritySettingsInput): void {
  if (input.allowedIps && Array.isArray(input.allowedIps)) {
    for (const ip of input.allowedIps) {
      if (!isValidCIDR(ip)) {
        throw new Error(`Invalid IP address or CIDR notation: ${ip}`);
      }
    }
  }

  if (input.examPassword) {
    if (input.examPassword.length < 4) {
      throw new Error('Exam password must be at least 4 characters');
    }
    if (input.examPassword.length > 50) {
      throw new Error('Exam password must be less than 50 characters');
    }
  }
}

/**
 * Validate CIDR notation
 */
function isValidCIDR(cidr: string): boolean {
  // Simple CIDR validation
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
  if (!cidrRegex.test(cidr)) {
    return false;
  }

  const parts = cidr.split('/');
  const ipParts = parts[0].split('.');

  // Validate IP octets
  for (const part of ipParts) {
    const num = parseInt(part);
    if (num < 0 || num > 255) {
      return false;
    }
  }

  // Validate CIDR prefix if present
  if (parts.length === 2) {
    const prefix = parseInt(parts[1]);
    if (prefix < 0 || prefix > 32) {
      return false;
    }
  }

  return true;
}

/**
 * Check if IP is allowed
 */
export function isIPAllowed(ip: string, allowedIps: string[]): boolean {
  if (allowedIps.length === 0) {
    return true; // No restrictions
  }

  for (const allowed of allowedIps) {
    if (allowed === ip) {
      return true;
    }

    // Check CIDR match
    if (allowed.includes('/')) {
      if (isIPInCIDR(ip, allowed)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if IP is in CIDR range
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  const [cidrIp, cidrPrefix] = cidr.split('/');
  const prefix = parseInt(cidrPrefix || '32');

  const ipNum = ipToNumber(ip);
  const cidrNum = ipToNumber(cidrIp);

  const mask = (0xffffffff << (32 - prefix)) >>> 0;

  return (ipNum & mask) === (cidrNum & mask);
}

/**
 * Convert IP to number
 */
function ipToNumber(ip: string): number {
  const parts = ip.split('.');
  return (
    (parseInt(parts[0]) << 24) +
    (parseInt(parts[1]) << 16) +
    (parseInt(parts[2]) << 8) +
    parseInt(parts[3])
  );
}
