/**
 * Audit Logging Service
 * Comprehensive logging of all CBT system actions
 */

import { queryAll, queryOne, query } from './db.js';
import { AuditLog, CreateAuditLogInput } from './types.js';

/**
 * Create audit log entry
 */
export async function createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
  const log = await queryOne<AuditLog>(
    `INSERT INTO audit_logs (
      tenant_id, user_id, action, entity_type, entity_id, changes
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [
      input.tenantId,
      input.userId,
      input.action,
      input.entityType,
      input.entityId || null,
      input.changes ? JSON.stringify(input.changes) : null,
    ]
  );

  if (!log) {
    throw new Error('Failed to create audit log');
  }

  return log;
}

/**
 * Get audit logs with filtering
 */
export async function getAuditLogs(
  tenantId: string,
  filter?: {
    userId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }
): Promise<{
  success: boolean;
  data: AuditLog[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const page = filter?.page || 1;
  const limit = filter?.limit || 50;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE tenant_id = $1';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (filter?.userId) {
    whereClause += ` AND user_id = $${paramIndex}`;
    params.push(filter.userId);
    paramIndex++;
  }

  if (filter?.action) {
    whereClause += ` AND action = $${paramIndex}`;
    params.push(filter.action);
    paramIndex++;
  }

  if (filter?.entityType) {
    whereClause += ` AND entity_type = $${paramIndex}`;
    params.push(filter.entityType);
    paramIndex++;
  }

  if (filter?.entityId) {
    whereClause += ` AND entity_id = $${paramIndex}`;
    params.push(filter.entityId);
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
    `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`,
    params
  );
  const total = parseInt(countResult?.count || '0');

  // Get paginated results
  const logs = await queryAll<AuditLog>(
    `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
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
 * Get audit logs for specific entity
 */
export async function getEntityAuditLogs(
  tenantId: string,
  entityType: string,
  entityId: string
): Promise<AuditLog[]> {
  return queryAll<AuditLog>(
    `SELECT * FROM audit_logs 
     WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3
     ORDER BY created_at DESC`,
    [tenantId, entityType, entityId]
  );
}

/**
 * Get user activity logs
 */
export async function getUserActivityLogs(
  tenantId: string,
  userId: string,
  filter?: {
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }
): Promise<{
  success: boolean;
  data: AuditLog[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const page = filter?.page || 1;
  const limit = filter?.limit || 50;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE tenant_id = $1 AND user_id = $2';
  const params: any[] = [tenantId, userId];
  let paramIndex = 3;

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
    `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`,
    params
  );
  const total = parseInt(countResult?.count || '0');

  // Get paginated results
  const logs = await queryAll<AuditLog>(
    `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
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
 * Get audit statistics
 */
export async function getAuditStatistics(
  tenantId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalActions: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  byUser: Array<{ userId: string; actionCount: number }>;
  topActions: Array<{ action: string; count: number }>;
}> {
  let whereClause = 'WHERE tenant_id = $1';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (startDate) {
    whereClause += ` AND created_at >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    whereClause += ` AND created_at <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  // Total actions
  const totalResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`,
    params
  );
  const totalActions = parseInt(totalResult?.count || '0');

  // By action
  const byAction = await queryAll<{ action: string; count: string }>(
    `SELECT action, COUNT(*) as count FROM audit_logs ${whereClause} GROUP BY action`,
    params
  );

  // By entity type
  const byEntityType = await queryAll<{ entity_type: string; count: string }>(
    `SELECT entity_type, COUNT(*) as count FROM audit_logs ${whereClause} GROUP BY entity_type`,
    params
  );

  // By user
  const byUser = await queryAll<{ user_id: string; count: string }>(
    `SELECT user_id, COUNT(*) as count FROM audit_logs ${whereClause} GROUP BY user_id ORDER BY count DESC LIMIT 10`,
    params
  );

  // Top actions
  const topActions = await queryAll<{ action: string; count: string }>(
    `SELECT action, COUNT(*) as count FROM audit_logs ${whereClause} GROUP BY action ORDER BY count DESC LIMIT 10`,
    params
  );

  return {
    totalActions,
    byAction: Object.fromEntries(byAction.map(a => [a.action, parseInt(a.count)])),
    byEntityType: Object.fromEntries(byEntityType.map(e => [e.entity_type, parseInt(e.count)])),
    byUser: byUser.map(u => ({
      userId: u.user_id,
      actionCount: parseInt(u.count),
    })),
    topActions: topActions.map(a => ({
      action: a.action,
      count: parseInt(a.count),
    })),
  };
}

/**
 * Log question creation
 */
export async function logQuestionCreated(
  tenantId: string,
  userId: string,
  questionId: string,
  questionData: any
): Promise<AuditLog> {
  return createAuditLog({
    tenantId,
    userId,
    action: 'create',
    entityType: 'question',
    entityId: questionId,
    changes: { created: questionData },
  });
}

/**
 * Log question update
 */
export async function logQuestionUpdated(
  tenantId: string,
  userId: string,
  questionId: string,
  changes: any
): Promise<AuditLog> {
  return createAuditLog({
    tenantId,
    userId,
    action: 'update',
    entityType: 'question',
    entityId: questionId,
    changes,
  });
}

/**
 * Log question deletion
 */
export async function logQuestionDeleted(
  tenantId: string,
  userId: string,
  questionId: string
): Promise<AuditLog> {
  return createAuditLog({
    tenantId,
    userId,
    action: 'delete',
    entityType: 'question',
    entityId: questionId,
  });
}

/**
 * Log exam creation
 */
export async function logExamCreated(
  tenantId: string,
  userId: string,
  examId: string,
  examData: any
): Promise<AuditLog> {
  return createAuditLog({
    tenantId,
    userId,
    action: 'create',
    entityType: 'exam',
    entityId: examId,
    changes: { created: examData },
  });
}

/**
 * Log exam update
 */
export async function logExamUpdated(
  tenantId: string,
  userId: string,
  examId: string,
  changes: any
): Promise<AuditLog> {
  return createAuditLog({
    tenantId,
    userId,
    action: 'update',
    entityType: 'exam',
    entityId: examId,
    changes,
  });
}

/**
 * Log exam deletion
 */
export async function logExamDeleted(
  tenantId: string,
  userId: string,
  examId: string
): Promise<AuditLog> {
  return createAuditLog({
    tenantId,
    userId,
    action: 'delete',
    entityType: 'exam',
    entityId: examId,
  });
}

/**
 * Log exam started
 */
export async function logExamStarted(
  tenantId: string,
  userId: string,
  examId: string
): Promise<AuditLog> {
  return createAuditLog({
    tenantId,
    userId,
    action: 'start_exam',
    entityType: 'exam',
    entityId: examId,
  });
}

/**
 * Log exam completed
 */
export async function logExamCompleted(
  tenantId: string,
  userId: string,
  examId: string
): Promise<AuditLog> {
  return createAuditLog({
    tenantId,
    userId,
    action: 'complete_exam',
    entityType: 'exam',
    entityId: examId,
  });
}

/**
 * Log results exported
 */
export async function logResultsExported(
  tenantId: string,
  userId: string,
  examId: string
): Promise<AuditLog> {
  return createAuditLog({
    tenantId,
    userId,
    action: 'export',
    entityType: 'exam_result',
    entityId: examId,
  });
}

/**
 * Log questions imported
 */
export async function logQuestionsImported(
  tenantId: string,
  userId: string,
  importedCount: number
): Promise<AuditLog> {
  return createAuditLog({
    tenantId,
    userId,
    action: 'import',
    entityType: 'question',
    changes: { importedCount },
  });
}

/**
 * Log student flagged
 */
export async function logStudentFlagged(
  tenantId: string,
  userId: string,
  examId: string,
  studentId: string,
  reason: string
): Promise<AuditLog> {
  return createAuditLog({
    tenantId,
    userId,
    action: 'flag_student',
    entityType: 'exam',
    entityId: examId,
    changes: { studentId, reason },
  });
}

/**
 * Log offline sync
 */
export async function logOfflineSync(
  tenantId: string,
  userId: string,
  studentId: string,
  examId: string,
  syncedCount: number
): Promise<AuditLog> {
  return createAuditLog({
    tenantId,
    userId,
    action: 'sync_offline',
    entityType: 'exam_result',
    entityId: examId,
    changes: { studentId, syncedCount },
  });
}
