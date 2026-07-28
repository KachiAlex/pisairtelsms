/**
 * Absence Reasons Database Library
 * Handles all database operations for absence reason management
 */

import { queryAll, queryOne, query } from '../cbt/_lib/db.js'
import { v4 as uuidv4 } from 'uuid'

// ============================================================================
// Type Definitions
// ============================================================================

export interface AbsenceReason {
  id: string
  tenantId: string
  reasonName: string
  description?: string
  isActive: boolean
  createdAt: string
}

export interface CreateAbsenceReasonPayload {
  reasonName: string
  description?: string
}

export interface UpdateAbsenceReasonPayload {
  reasonName?: string
  description?: string
  isActive?: boolean
}

// ============================================================================
// Database Functions
// ============================================================================

/**
 * Get all absence reasons for a tenant
 */
export async function getAbsenceReasons(
  tenantId: string,
  includeInactive: boolean = false
): Promise<AbsenceReason[]> {
  const whereClause = includeInactive ? '' : 'AND is_active = true'
  
  const rows = await queryAll<any>(
    `SELECT id, tenant_id, reason_name, description, is_active, created_at
     FROM absence_reasons
     WHERE tenant_id = $1 ${whereClause}
     ORDER BY reason_name ASC`,
    [tenantId]
  )

  return rows.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    reasonName: row.reason_name,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
  }))
}

/**
 * Get a single absence reason by ID
 */
export async function getAbsenceReasonById(
  tenantId: string,
  reasonId: string
): Promise<AbsenceReason | null> {
  const row = await queryOne<any>(
    `SELECT id, tenant_id, reason_name, description, is_active, created_at
     FROM absence_reasons
     WHERE id = $1 AND tenant_id = $2`,
    [reasonId, tenantId]
  )

  if (!row) return null

  return {
    id: row.id,
    tenantId: row.tenant_id,
    reasonName: row.reason_name,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
  }
}

/**
 * Create a new absence reason
 */
export async function createAbsenceReason(
  tenantId: string,
  payload: CreateAbsenceReasonPayload
): Promise<AbsenceReason> {
  const id = uuidv4()
  const now = new Date().toISOString()

  // Validate reason name is not empty
  if (!payload.reasonName || payload.reasonName.trim().length === 0) {
    throw new Error('Reason name is required')
  }

  // Check for duplicate reason name (case-insensitive)
  const existing = await queryOne<any>(
    `SELECT id FROM absence_reasons
     WHERE tenant_id = $1 AND LOWER(reason_name) = LOWER($2)`,
    [tenantId, payload.reasonName.trim()]
  )

  if (existing) {
    throw new Error(`Absence reason "${payload.reasonName}" already exists`)
  }

  await query(
    `INSERT INTO absence_reasons (id, tenant_id, reason_name, description, is_active, created_at)
     VALUES ($1, $2, $3, $4, true, $5)`,
    [id, tenantId, payload.reasonName.trim(), payload.description || null, now]
  )

  return {
    id,
    tenantId,
    reasonName: payload.reasonName.trim(),
    description: payload.description,
    isActive: true,
    createdAt: now,
  }
}

/**
 * Update an absence reason
 */
export async function updateAbsenceReason(
  tenantId: string,
  reasonId: string,
  payload: UpdateAbsenceReasonPayload
): Promise<AbsenceReason> {
  // Get existing reason
  const existing = await getAbsenceReasonById(tenantId, reasonId)
  if (!existing) {
    throw new Error('Absence reason not found')
  }

  // Check for duplicate reason name if updating
  if (payload.reasonName && payload.reasonName.trim() !== existing.reasonName) {
    const duplicate = await queryOne<any>(
      `SELECT id FROM absence_reasons
       WHERE tenant_id = $1 AND LOWER(reason_name) = LOWER($2) AND id != $3`,
      [tenantId, payload.reasonName.trim(), reasonId]
    )

    if (duplicate) {
      throw new Error(`Absence reason "${payload.reasonName}" already exists`)
    }
  }

  const updates: string[] = []
  const values: any[] = []
  let paramCount = 1

  if (payload.reasonName !== undefined) {
    updates.push(`reason_name = $${paramCount}`)
    values.push(payload.reasonName.trim())
    paramCount++
  }

  if (payload.description !== undefined) {
    updates.push(`description = $${paramCount}`)
    values.push(payload.description || null)
    paramCount++
  }

  if (payload.isActive !== undefined) {
    updates.push(`is_active = $${paramCount}`)
    values.push(payload.isActive)
    paramCount++
  }

  if (updates.length === 0) {
    return existing
  }

  values.push(reasonId)
  values.push(tenantId)

  await query(
    `UPDATE absence_reasons
     SET ${updates.join(', ')}
     WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}`,
    values
  )

  // Fetch and return updated record
  const updated = await getAbsenceReasonById(tenantId, reasonId)
  if (!updated) {
    throw new Error('Failed to retrieve updated absence reason')
  }

  return updated
}

/**
 * Delete an absence reason (soft delete by marking inactive)
 */
export async function deleteAbsenceReason(
  tenantId: string,
  reasonId: string
): Promise<void> {
  const existing = await getAbsenceReasonById(tenantId, reasonId)
  if (!existing) {
    throw new Error('Absence reason not found')
  }

  // Check if this reason is being used in attendance records
  const usageCount = await queryOne<any>(
    `SELECT COUNT(*) as count FROM attendance_records
     WHERE absence_reason_id = $1`,
    [reasonId]
  )

  if (usageCount && usageCount.count > 0) {
    // Soft delete - mark as inactive instead of hard delete
    await query(
      `UPDATE absence_reasons SET is_active = false WHERE id = $1 AND tenant_id = $2`,
      [reasonId, tenantId]
    )
  } else {
    // Hard delete if not in use
    await query(
      `DELETE FROM absence_reasons WHERE id = $1 AND tenant_id = $2`,
      [reasonId, tenantId]
    )
  }
}

/**
 * Check if an absence reason exists and is active
 */
export async function absenceReasonExists(
  tenantId: string,
  reasonId: string
): Promise<boolean> {
  const row = await queryOne<any>(
    `SELECT id FROM absence_reasons
     WHERE id = $1 AND tenant_id = $2 AND is_active = true`,
    [reasonId, tenantId]
  )

  return !!row
}
