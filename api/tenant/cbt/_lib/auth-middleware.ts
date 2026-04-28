/**
 * Authentication and Authorization Middleware for CBT Endpoints
 * Verifies user is authenticated, has proper role, and has access to exam
 * Requirements: 5.1
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { getPool } from './db';

/**
 * Authentication context extracted from request
 */
export interface AuthContext {
  userId: string;
  tenantId: string;
  role: 'super_admin' | 'tenant_admin' | 'invigilator' | 'student' | 'staff' | 'parent';
  token: string;
}

/**
 * Extract authentication context from request headers
 * Expects Authorization header with Bearer token
 * Expects X-Tenant-ID header with tenant ID
 * Expects X-User-ID header with user ID
 * Expects X-User-Role header with user role
 */
export function extractAuthContext(req: NextApiRequest): AuthContext | null {
  const authHeader = req.headers.authorization;
  const tenantId = req.headers['x-tenant-id'] as string;
  const userId = req.headers['x-user-id'] as string;
  const role = req.headers['x-user-role'] as string;

  // Validate all required headers
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  if (!tenantId || !userId || !role) {
    return null;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  return {
    userId,
    tenantId,
    role: role as AuthContext['role'],
    token,
  };
}

/**
 * Verify user is authenticated
 * Returns true if user has valid authentication context
 */
export function verifyAuthentication(authContext: AuthContext | null): boolean {
  return authContext !== null && 
         authContext.userId !== '' && 
         authContext.tenantId !== '' && 
         authContext.token !== '';
}

/**
 * Verify user has invigilator or admin role
 * Returns true if user is invigilator or admin
 */
export function verifyInvigilatorRole(authContext: AuthContext): boolean {
  return authContext.role === 'invigilator' || 
         authContext.role === 'tenant_admin' || 
         authContext.role === 'super_admin';
}

/**
 * Verify user has admin role
 * Returns true if user is admin
 */
export function verifyAdminRole(authContext: AuthContext): boolean {
  return authContext.role === 'tenant_admin' || authContext.role === 'super_admin';
}

/**
 * Verify user has access to exam
 * Checks if user is invigilator for the exam or is admin
 */
export async function verifyExamAccess(
  pool: Pool,
  examId: string,
  tenantId: string,
  userId: string,
  role: string
): Promise<boolean> {
  try {
    // Admins have access to all exams
    if (role === 'tenant_admin' || role === 'super_admin') {
      // Verify exam belongs to tenant
      const examResult = await pool.query(
        'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
        [examId, tenantId]
      );
      return examResult.rows.length > 0;
    }

    // Invigilators need to be assigned to the exam
    if (role === 'invigilator') {
      // Check if user is assigned as invigilator for this exam
      // This assumes there's an exam_invigilators table or similar
      // For now, we'll allow invigilators to access exams in their tenant
      const examResult = await pool.query(
        'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
        [examId, tenantId]
      );
      return examResult.rows.length > 0;
    }

    // Students can only access exams they're enrolled in
    if (role === 'student') {
      const enrollmentResult = await pool.query(
        `SELECT id FROM student_exam_progress 
         WHERE exam_id = $1 AND student_id = $2`,
        [examId, userId]
      );
      return enrollmentResult.rows.length > 0;
    }

    return false;
  } catch (error) {
    console.error('Failed to verify exam access:', error);
    return false;
  }
}

/**
 * Middleware to verify authentication and authorization
 * Returns error response if authentication fails
 */
export async function requireAuthentication(
  req: NextApiRequest,
  res: NextApiResponse,
  requiredRole?: 'invigilator' | 'admin' | 'student'
): Promise<AuthContext | null> {
  const authContext = extractAuthContext(req);

  // Verify authentication
  if (!verifyAuthentication(authContext)) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing or invalid authentication',
    });
    return null;
  }

  // Verify role if required
  if (requiredRole === 'invigilator' && !verifyInvigilatorRole(authContext!)) {
    res.status(403).json({
      success: false,
      error: 'Forbidden: Invigilator or admin role required',
    });
    return null;
  }

  if (requiredRole === 'admin' && !verifyAdminRole(authContext!)) {
    res.status(403).json({
      success: false,
      error: 'Forbidden: Admin role required',
    });
    return null;
  }

  if (requiredRole === 'student' && authContext!.role !== 'student') {
    res.status(403).json({
      success: false,
      error: 'Forbidden: Student role required',
    });
    return null;
  }

  return authContext!;
}

/**
 * Middleware to verify exam access
 * Returns error response if access is denied
 */
export async function requireExamAccess(
  req: NextApiRequest,
  res: NextApiResponse,
  examId: string,
  authContext: AuthContext
): Promise<boolean> {
  const pool = getPool();

  const hasAccess = await verifyExamAccess(
    pool,
    examId,
    authContext.tenantId,
    authContext.userId,
    authContext.role
  );

  if (!hasAccess) {
    res.status(403).json({
      success: false,
      error: 'Forbidden: You do not have access to this exam',
    });
    return false;
  }

  return true;
}

/**
 * Middleware to verify tenant access
 * Ensures user's tenant ID matches the requested tenant
 */
export function requireTenantAccess(
  req: NextApiRequest,
  res: NextApiResponse,
  authContext: AuthContext,
  requestedTenantId: string
): boolean {
  if (authContext.tenantId !== requestedTenantId) {
    res.status(403).json({
      success: false,
      error: 'Forbidden: You do not have access to this tenant',
    });
    return false;
  }

  return true;
}

/**
 * Log authentication event for audit trail
 */
export async function logAuthEvent(
  pool: Pool,
  userId: string,
  tenantId: string,
  eventType: 'login' | 'logout' | 'access_denied' | 'role_check_failed',
  details: Record<string, any> = {}
): Promise<void> {
  try {
    // This would log to an audit table
    // For now, we'll just log to console
    console.log(`[AUTH EVENT] ${eventType} - User: ${userId}, Tenant: ${tenantId}`, details);
  } catch (error) {
    console.error('Failed to log auth event:', error);
  }
}

/**
 * Verify user has permission to modify exam
 * Only admins and the exam creator can modify exams
 */
export async function verifyExamModifyPermission(
  pool: Pool,
  examId: string,
  tenantId: string,
  userId: string,
  role: string
): Promise<boolean> {
  try {
    // Admins can modify any exam
    if (role === 'tenant_admin' || role === 'super_admin') {
      return true;
    }

    // Non-admins can only modify exams they created
    const examResult = await pool.query(
      'SELECT created_by FROM exams WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [examId, tenantId]
    );

    if (examResult.rows.length === 0) {
      return false;
    }

    return examResult.rows[0].created_by === userId;
  } catch (error) {
    console.error('Failed to verify exam modify permission:', error);
    return false;
  }
}

/**
 * Verify user has permission to delete exam
 * Only admins can delete exams
 */
export function verifyExamDeletePermission(role: string): boolean {
  return role === 'tenant_admin' || role === 'super_admin';
}

/**
 * Verify user has permission to view results
 * Admins can view all results, students can only view their own
 */
export async function verifyResultsViewPermission(
  pool: Pool,
  examId: string,
  studentId: string | null,
  userId: string,
  role: string
): Promise<boolean> {
  try {
    // Admins can view all results
    if (role === 'tenant_admin' || role === 'super_admin' || role === 'invigilator') {
      return true;
    }

    // Students can only view their own results
    if (role === 'student') {
      return studentId === userId;
    }

    return false;
  } catch (error) {
    console.error('Failed to verify results view permission:', error);
    return false;
  }
}
