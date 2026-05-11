/**
 * Subjects Library
 * CRUD operations for subjects with multi-level support
 */

import { query } from './db.js'

function normalizeLevels(value: any): string[] {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return []
}

export interface Subject {
  id: string
  tenantId: string
  code: string
  name: string
  levels: string[]
  type: 'Core' | 'Elective'
  department: string
  description?: string
  version?: string
  resourcesStatus?: string
  owner?: string
  auditDate?: Date
  createdBy: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

export interface CreateSubjectInput {
  code: string
  name: string
  levels: string[]
  type: 'Core' | 'Elective'
  department: string
  description?: string
  version?: string
}

export interface UpdateSubjectInput {
  code?: string
  name?: string
  levels?: string[]
  type?: 'Core' | 'Elective'
  department?: string
  description?: string
  version?: string
  resourcesStatus?: string
  owner?: string
  auditDate?: Date
}

/**
 * Get all subjects for a tenant
 */
export async function getSubjects(tenantId: string): Promise<Subject[]> {
  const result = await query(
    `SELECT 
      id, 
      tenant_id as "tenantId",
      code,
      name,
      levels,
      type,
      department,
      description,
      version,
      resources_status as "resourcesStatus",
      owner,
      audit_date as "auditDate",
      created_by as "createdBy",
      created_at as "createdAt",
      updated_at as "updatedAt",
      deleted_at as "deletedAt"
    FROM subjects 
    WHERE tenant_id = $1 AND deleted_at IS NULL
    ORDER BY name`,
    [tenantId]
  )

  return result.rows.map((row: any) => ({
    ...row,
    levels: normalizeLevels(row.levels)
  }))
}

/**
 * Get unique subject names for dropdown
 */
export async function getSubjectNames(tenantId: string): Promise<string[]> {
  const result = await query(
    `SELECT DISTINCT name 
    FROM subjects 
    WHERE tenant_id = $1 AND deleted_at IS NULL
    ORDER BY name`,
    [tenantId]
  )

  return result.rows.map((row: any) => row.name)
}

/**
 * Get subject by ID
 */
export async function getSubjectById(tenantId: string, subjectId: string): Promise<Subject | null> {
  const result = await query(
    `SELECT 
      id, 
      tenant_id as "tenantId",
      code,
      name,
      levels,
      type,
      department,
      description,
      version,
      resources_status as "resourcesStatus",
      owner,
      audit_date as "auditDate",
      created_by as "createdBy",
      created_at as "createdAt",
      updated_at as "updatedAt",
      deleted_at as "deletedAt"
    FROM subjects 
    WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [tenantId, subjectId]
  )

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]
  return {
    ...row,
    levels: normalizeLevels(row.levels)
  }
}

/**
 * Check if subject code already exists
 */
export async function checkSubjectCodeExists(tenantId: string, code: string, excludeId?: string): Promise<boolean> {
  let queryStr = `SELECT id FROM subjects WHERE tenant_id = $1 AND code = $2 AND deleted_at IS NULL`
  const params: any[] = [tenantId, code]

  if (excludeId) {
    queryStr += ` AND id != $3`
    params.push(excludeId)
  }

  const result = await query(queryStr, params)
  return result.rows.length > 0
}

/**
 * Create a new subject
 */
export async function createSubject(tenantId: string, userId: string, input: CreateSubjectInput): Promise<Subject> {
  // Check if code already exists
  const exists = await checkSubjectCodeExists(tenantId, input.code)
  if (exists) {
    throw new Error('Subject code already exists')
  }

  const result = await query(
    `INSERT INTO subjects (
      tenant_id, code, name, levels, type, department, description, version, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING 
      id, 
      tenant_id as "tenantId",
      code,
      name,
      levels,
      type,
      department,
      description,
      version,
      resources_status as "resourcesStatus",
      owner,
      audit_date as "auditDate",
      created_by as "createdBy",
      created_at as "createdAt",
      updated_at as "updatedAt",
      deleted_at as "deletedAt"`,
    [
      tenantId,
      input.code,
      input.name,
      JSON.stringify(input.levels),
      input.type,
      input.department,
      input.description || null,
      input.version || null,
      userId
    ]
  )

  const row = result.rows[0]
  return {
    ...row,
    levels: normalizeLevels(row.levels)
  }
}

/**
 * Update a subject
 */
export async function updateSubject(tenantId: string, subjectId: string, input: UpdateSubjectInput): Promise<Subject> {
  // Check if code already exists (if changing code)
  if (input.code) {
    const exists = await checkSubjectCodeExists(tenantId, input.code, subjectId)
    if (exists) {
      throw new Error('Subject code already exists')
    }
  }

  const updates: string[] = []
  const values: any[] = []
  let paramCount = 1

  if (input.code) {
    updates.push(`code = $${paramCount++}`)
    values.push(input.code)
  }
  if (input.name) {
    updates.push(`name = $${paramCount++}`)
    values.push(input.name)
  }
  if (input.levels) {
    updates.push(`levels = $${paramCount++}`)
    values.push(JSON.stringify(input.levels))
  }
  if (input.type) {
    updates.push(`type = $${paramCount++}`)
    values.push(input.type)
  }
  if (input.department) {
    updates.push(`department = $${paramCount++}`)
    values.push(input.department)
  }
  if (input.description !== undefined) {
    updates.push(`description = $${paramCount++}`)
    values.push(input.description || null)
  }
  if (input.version !== undefined) {
    updates.push(`version = $${paramCount++}`)
    values.push(input.version || null)
  }
  if (input.resourcesStatus !== undefined) {
    updates.push(`resources_status = $${paramCount++}`)
    values.push(input.resourcesStatus)
  }
  if (input.owner !== undefined) {
    updates.push(`owner = $${paramCount++}`)
    values.push(input.owner || null)
  }
  if (input.auditDate !== undefined) {
    updates.push(`audit_date = $${paramCount++}`)
    values.push(input.auditDate || null)
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`)
  values.push(tenantId, subjectId)

  const result = await query(
    `UPDATE subjects 
    SET ${updates.join(', ')}
    WHERE tenant_id = $${paramCount++} AND id = $${paramCount++} AND deleted_at IS NULL
    RETURNING 
      id, 
      tenant_id as "tenantId",
      code,
      name,
      levels,
      type,
      department,
      description,
      version,
      resources_status as "resourcesStatus",
      owner,
      audit_date as "auditDate",
      created_by as "createdBy",
      created_at as "createdAt",
      updated_at as "updatedAt",
      deleted_at as "deletedAt"`,
    values
  )

  if (result.rows.length === 0) {
    throw new Error('Subject not found')
  }

  const row = result.rows[0]
  return {
    ...row,
    levels: normalizeLevels(row.levels)
  }
}

/**
 * Delete a subject (soft delete)
 */
export async function deleteSubject(tenantId: string, subjectId: string): Promise<void> {
  const result = await query(
    `UPDATE subjects 
    SET deleted_at = CURRENT_TIMESTAMP 
    WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [tenantId, subjectId]
  )

  if (result.rowCount === 0) {
    throw new Error('Subject not found')
  }
}
