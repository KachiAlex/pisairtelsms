/**
 * Audit Logging Service for CBT System
 * Logs all modifications, security setting changes, and result modifications
 * Requirements: 5.1, 6.1
 */

import { Pool } from 'pg';
import { getPool } from './db';

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  resourceType: 'question' | 'exam' | 'security_settings' | 'result' | 'proctoring_log';
  resourceId: string;
  changes: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log a modification event
 */
export async function logModification(
  tenantId: string,
  userId: string,
  action: string,
  resourceType: 'question' | 'exam' | 'security_settings' | 'result' | 'proctoring_log',
  resourceId: string,
  changes: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const pool = getPool();

  try {
    // Create audit_logs table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        user_id UUID NOT NULL,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id UUID NOT NULL,
        changes JSONB NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(created_at);
    `);

    // Insert audit log entry
    await pool.query(
      `INSERT INTO audit_logs (
        tenant_id, user_id, action, resource_type, resource_id, changes, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        tenantId,
        userId,
        action,
        resourceType,
        resourceId,
        JSON.stringify(changes),
        ipAddress || null,
        userAgent || null,
      ]
    );
  } catch (error) {
    console.error('Failed to log modification:', error);
    // Don't throw - audit logging should not block operations
  }
}

/**
 * Log a security setting change
 */
export async function logSecuritySettingChange(
  tenantId: string,
  userId: string,
  examId: string,
  oldSettings: Record<string, any>,
  newSettings: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const changes: Record<string, any> = {};

  // Calculate what changed
  for (const key in newSettings) {
    if (oldSettings[key] !== newSettings[key]) {
      changes[key] = {
        old: oldSettings[key],
        new: newSettings[key],
      };
    }
  }

  await logModification(
    tenantId,
    userId,
    'UPDATE_SECURITY_SETTINGS',
    'security_settings',
    examId,
    changes,
    ipAddress,
    userAgent
  );
}

/**
 * Log a result modification
 */
export async function logResultModification(
  tenantId: string,
  userId: string,
  resultId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  changes: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logModification(
    tenantId,
    userId,
    `${action}_RESULT`,
    'result',
    resultId,
    changes,
    ipAddress,
    userAgent
  );
}

/**
 * Log a question modification
 */
export async function logQuestionModification(
  tenantId: string,
  userId: string,
  questionId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  changes: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logModification(
    tenantId,
    userId,
    `${action}_QUESTION`,
    'question',
    questionId,
    changes,
    ipAddress,
    userAgent
  );
}

/**
 * Log an exam modification
 */
export async function logExamModification(
  tenantId: string,
  userId: string,
  examId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'SCHEDULE' | 'START' | 'END',
  changes: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logModification(
    tenantId,
    userId,
    `${action}_EXAM`,
    'exam',
    examId,
    changes,
    ipAddress,
    userAgent
  );
}

/**
 * Log a proctoring event
 */
export async function logProctoringEvent(
  tenantId: string,
  examId: string,
  studentId: string,
  eventType: string,
  details: Record<string, any>
): Promise<void> {
  const pool = getPool();

  try {
    // Create proctoring_logs table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS proctoring_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        exam_id UUID NOT NULL,
        student_id UUID NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        event_details JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
        CONSTRAINT fk_exam FOREIGN KEY (exam_id) REFERENCES exams(id),
        CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES users(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_proctoring_exam ON proctoring_logs(exam_id);
      CREATE INDEX IF NOT EXISTS idx_proctoring_student ON proctoring_logs(student_id);
      CREATE INDEX IF NOT EXISTS idx_proctoring_timestamp ON proctoring_logs(created_at);
    `);

    // Insert proctoring log entry
    await pool.query(
      `INSERT INTO proctoring_logs (
        tenant_id, exam_id, student_id, event_type, event_details
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        tenantId,
        examId,
        studentId,
        eventType,
        JSON.stringify(details),
      ]
    );
  } catch (error) {
    console.error('Failed to log proctoring event:', error);
    // Don't throw - audit logging should not block operations
  }
}

/**
 * Get audit logs for a resource
 */
export async function getAuditLogs(
  tenantId: string,
  resourceType?: string,
  resourceId?: string,
  startDate?: Date,
  endDate?: Date,
  limit: number = 100,
  offset: number = 0
): Promise<AuditLogEntry[]> {
  const pool = getPool();

  try {
    let query = `
      SELECT id, tenant_id, user_id, action, resource_type, resource_id, changes, ip_address, user_agent, created_at
      FROM audit_logs
      WHERE tenant_id = $1
    `;
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (resourceType) {
      query += ` AND resource_type = $${paramIndex}`;
      params.push(resourceType);
      paramIndex++;
    }

    if (resourceId) {
      query += ` AND resource_id = $${paramIndex}`;
      params.push(resourceId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      changes: JSON.parse(row.changes),
      timestamp: new Date(row.created_at),
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
    }));
  } catch (error) {
    console.error('Failed to get audit logs:', error);
    return [];
  }
}

/**
 * Get proctoring logs for an exam
 */
export async function getProctoringLogs(
  examId: string,
  studentId?: string,
  eventType?: string,
  startDate?: Date,
  endDate?: Date,
  limit: number = 100,
  offset: number = 0
): Promise<any[]> {
  const pool = getPool();

  try {
    let query = `
      SELECT id, exam_id, student_id, event_type, event_details, created_at
      FROM proctoring_logs
      WHERE exam_id = $1
    `;
    const params: any[] = [examId];
    let paramIndex = 2;

    if (studentId) {
      query += ` AND student_id = $${paramIndex}`;
      params.push(studentId);
      paramIndex++;
    }

    if (eventType) {
      query += ` AND event_type = $${paramIndex}`;
      params.push(eventType);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      examId: row.exam_id,
      studentId: row.student_id,
      eventType: row.event_type,
      details: JSON.parse(row.event_details),
      timestamp: new Date(row.created_at),
    }));
  } catch (error) {
    console.error('Failed to get proctoring logs:', error);
    return [];
  }
}

/**
 * Generate compliance report
 */
export async function generateComplianceReport(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalModifications: number;
  modificationsByType: Record<string, number>;
  modificationsByUser: Record<string, number>;
  securitySettingChanges: number;
  resultModifications: number;
  proctoringEvents: number;
}> {
  const pool = getPool();

  try {
    // Get total modifications
    const totalResult = await pool.query(
      `SELECT COUNT(*) as count FROM audit_logs
       WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3`,
      [tenantId, startDate, endDate]
    );
    const totalModifications = parseInt(totalResult.rows[0].count, 10);

    // Get modifications by type
    const typeResult = await pool.query(
      `SELECT resource_type, COUNT(*) as count FROM audit_logs
       WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3
       GROUP BY resource_type`,
      [tenantId, startDate, endDate]
    );
    const modificationsByType: Record<string, number> = {};
    typeResult.rows.forEach((row) => {
      modificationsByType[row.resource_type] = parseInt(row.count, 10);
    });

    // Get modifications by user
    const userResult = await pool.query(
      `SELECT user_id, COUNT(*) as count FROM audit_logs
       WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3
       GROUP BY user_id`,
      [tenantId, startDate, endDate]
    );
    const modificationsByUser: Record<string, number> = {};
    userResult.rows.forEach((row) => {
      modificationsByUser[row.user_id] = parseInt(row.count, 10);
    });

    // Get security setting changes
    const securityResult = await pool.query(
      `SELECT COUNT(*) as count FROM audit_logs
       WHERE tenant_id = $1 AND resource_type = 'security_settings'
       AND created_at >= $2 AND created_at <= $3`,
      [tenantId, startDate, endDate]
    );
    const securitySettingChanges = parseInt(securityResult.rows[0].count, 10);

    // Get result modifications
    const resultResult = await pool.query(
      `SELECT COUNT(*) as count FROM audit_logs
       WHERE tenant_id = $1 AND resource_type = 'result'
       AND created_at >= $2 AND created_at <= $3`,
      [tenantId, startDate, endDate]
    );
    const resultModifications = parseInt(resultResult.rows[0].count, 10);

    // Get proctoring events
    const proctoringResult = await pool.query(
      `SELECT COUNT(*) as count FROM proctoring_logs
       WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3`,
      [tenantId, startDate, endDate]
    );
    const proctoringEvents = parseInt(proctoringResult.rows[0].count, 10);

    return {
      totalModifications,
      modificationsByType,
      modificationsByUser,
      securitySettingChanges,
      resultModifications,
      proctoringEvents,
    };
  } catch (error) {
    console.error('Failed to generate compliance report:', error);
    return {
      totalModifications: 0,
      modificationsByType: {},
      modificationsByUser: {},
      securitySettingChanges: 0,
      resultModifications: 0,
      proctoringEvents: 0,
    };
  }
}
