/**
 * Classes Library
 * CRUD operations for classes
 */

import { query } from './db.js'

export interface Class {
  id: string
  tenantId: string
  name: string
  arm: string
  level: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

/**
 * Get all classes for a tenant
 */
export async function getClasses(tenantId: string): Promise<Class[]> {
  const result = await query(
    `SELECT 
      id, 
      tenant_id as "tenantId",
      name,
      arm,
      level,
      created_at as "createdAt",
      updated_at as "updatedAt",
      deleted_at as "deletedAt"
    FROM classes 
    WHERE tenant_id = $1 AND deleted_at IS NULL
    ORDER BY name, arm`,
    [tenantId]
  )

  return result.rows as Class[]
}

/**
 * Get class by ID
 */
export async function getClassById(tenantId: string, classId: string): Promise<Class | null> {
  const result = await query(
    `SELECT 
      id, 
      tenant_id as "tenantId",
      name,
      arm,
      level,
      created_at as "createdAt",
      updated_at as "updatedAt",
      deleted_at as "deletedAt"
    FROM classes 
    WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [tenantId, classId]
  )

  return result.rows[0] as Class || null
}

/**
 * Create a new class
 */
export async function createClass(
  tenantId: string,
  name: string,
  arm: string,
  level: string
): Promise<Class> {
  const result = await query(
    `INSERT INTO classes (tenant_id, name, arm, level)
    VALUES ($1, $2, $3, $4)
    RETURNING 
      id, 
      tenant_id as "tenantId",
      name,
      arm,
      level,
      created_at as "createdAt",
      updated_at as "updatedAt",
      deleted_at as "deletedAt"`,
    [tenantId, name, arm, level]
  )

  return result.rows[0] as Class
}

/**
 * Update a class
 */
export async function updateClass(
  tenantId: string,
  classId: string,
  updates: { name?: string; arm?: string; level?: string }
): Promise<Class> {
  const setClauses: string[] = []
  const values: any[] = []
  let paramCount = 1

  if (updates.name) {
    setClauses.push(`name = $${paramCount++}`)
    values.push(updates.name)
  }
  if (updates.arm) {
    setClauses.push(`arm = $${paramCount++}`)
    values.push(updates.arm)
  }
  if (updates.level) {
    setClauses.push(`level = $${paramCount++}`)
    values.push(updates.level)
  }

  setClauses.push(`updated_at = CURRENT_TIMESTAMP`)
  values.push(tenantId, classId)

  const result = await query(
    `UPDATE classes 
    SET ${setClauses.join(', ')}
    WHERE tenant_id = $${paramCount++} AND id = $${paramCount++} AND deleted_at IS NULL
    RETURNING 
      id, 
      tenant_id as "tenantId",
      name,
      arm,
      level,
      created_at as "createdAt",
      updated_at as "updatedAt",
      deleted_at as "deletedAt"`,
    values
  )

  if (result.rows.length === 0) {
    throw new Error('Class not found')
  }

  return result.rows[0] as Class
}

/**
 * Delete a class (soft delete)
 */
export async function deleteClass(tenantId: string, classId: string): Promise<void> {
  const result = await query(
    `UPDATE classes 
    SET deleted_at = CURRENT_TIMESTAMP 
    WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [tenantId, classId]
  )

  if (result.rowCount === 0) {
    throw new Error('Class not found')
  }
}
