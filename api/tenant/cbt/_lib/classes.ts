/**
 * Classes Library
 * CRUD operations for classes
 */

import { query } from './db.js'
import { normalizeClassName } from '../../_lib/class-names.js'

export interface Class {
  id: string
  tenantId: string
  name: string
  arm: string
  level: string
  formTeacherId?: string | null
  formTeacherName?: string | null
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
      c.id, 
      c.tenant_id as "tenantId",
      c.name,
      c.arm,
      c.level,
      c.form_teacher_id as "formTeacherId",
      s.name as "formTeacherName",
      c.created_at as "createdAt",
      c.updated_at as "updatedAt",
      c.deleted_at as "deletedAt"
    FROM classes c
    LEFT JOIN staff s ON s.id = c.form_teacher_id AND s.tenant_id = c.tenant_id
    WHERE c.tenant_id = $1 AND c.deleted_at IS NULL
    ORDER BY c.name, c.arm`,
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
      c.id, 
      c.tenant_id as "tenantId",
      c.name,
      c.arm,
      c.level,
      c.form_teacher_id as "formTeacherId",
      s.name as "formTeacherName",
      c.created_at as "createdAt",
      c.updated_at as "updatedAt",
      c.deleted_at as "deletedAt"
    FROM classes c
    LEFT JOIN staff s ON s.id = c.form_teacher_id AND s.tenant_id = c.tenant_id
    WHERE c.tenant_id = $1 AND c.id = $2 AND c.deleted_at IS NULL`,
    [tenantId, classId]
  )

  return result.rows[0] as Class || null
}

/**
 * Check if a class with the same name+arm already exists for the tenant
 */
export async function checkClassExists(tenantId: string, name: string, arm: string, excludeId?: string): Promise<boolean> {
  // Compare space-insensitively so 'JSS1' and 'JSS 1' can't coexist as
  // separate classes — historical seed data created exactly that split.
  let queryStr = `SELECT id FROM classes WHERE tenant_id = $1 AND REPLACE(name, ' ', '') = REPLACE($2, ' ', '') AND arm = $3 AND deleted_at IS NULL`
  const params: any[] = [tenantId, name, arm]
  if (excludeId) {
    queryStr += ` AND id != $4`
    params.push(excludeId)
  }
  const result = await query(queryStr, params)
  return result.rows.length > 0
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
  name = normalizeClassName(name)
  const exists = await checkClassExists(tenantId, name, arm)
  if (exists) {
    throw new Error('A class with this name and arm already exists')
  }

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
  updates: { name?: string; arm?: string; level?: string; formTeacherId?: string | null }
): Promise<Class> {
  // Fetch current record once for duplicate check and cascade updates
  const current = await getClassById(tenantId, classId)
  if (updates.name !== undefined) {
    updates.name = normalizeClassName(updates.name)
  }

  // Check for duplicate name+arm if either is being changed
  if (updates.name !== undefined || updates.arm !== undefined) {
    if (current) {
      const newName = updates.name !== undefined ? updates.name : current.name
      const newArm = updates.arm !== undefined ? updates.arm : current.arm
      const exists = await checkClassExists(tenantId, newName, newArm, classId)
      if (exists) {
        throw new Error('A class with this name and arm already exists')
      }
    }
  }

  const setClauses: string[] = []
  const values: any[] = []
  let paramCount = 1

  if (updates.name !== undefined) {
    setClauses.push(`name = $${paramCount++}`)
    values.push(updates.name)
  }
  if (updates.arm !== undefined) {
    setClauses.push(`arm = $${paramCount++}`)
    values.push(updates.arm)
  }
  if (updates.level !== undefined) {
    setClauses.push(`level = $${paramCount++}`)
    values.push(updates.level)
  }
  if (updates.formTeacherId !== undefined) {
    // Validate the assignee is a real staff member of this tenant
    if (updates.formTeacherId) {
      const staffCheck = await query(
        `SELECT id FROM staff WHERE id = $1 AND tenant_id = $2`,
        [updates.formTeacherId, tenantId]
      )
      if (staffCheck.rows.length === 0) {
        throw new Error('Form teacher must be a staff member of this school')
      }
    }
    setClauses.push(`form_teacher_id = $${paramCount++}`)
    values.push(updates.formTeacherId || null)
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
      form_teacher_id as "formTeacherId",
      created_at as "createdAt",
      updated_at as "updatedAt",
      deleted_at as "deletedAt"`,
    values
  )

  if (result.rows.length === 0) {
    throw new Error('Class not found')
  }

  // Cascade name change to dependent tables that store the class name as text.
  // This keeps references intact when a class is renamed.
  if (updates.name !== undefined && current && updates.name !== current.name) {
    const oldName = current.name
    const newName = updates.name
    // Dependents store either the base name ('JSS 1') or the arm-suffixed
    // display form ('JSS 1 A') — swap the base prefix in both.
    await query(
      `UPDATE teacher_allocation_slots SET class = $1 || SUBSTRING(class FROM CHAR_LENGTH($3) + 1) WHERE tenant_id = $2 AND (class = $3 OR class LIKE $3 || ' %')`,
      [newName, tenantId, oldName]
    )
    // Update students (class column stores the class name)
    await query(
      `UPDATE students SET class = $1 || SUBSTRING(class FROM CHAR_LENGTH($3) + 1) WHERE tenant_id = $2 AND (class = $3 OR class LIKE $3 || ' %') AND deleted_at IS NULL`,
      [newName, tenantId, oldName]
    )
    // Update student_scores (class column stores the class name)
    await query(
      `UPDATE student_scores SET class = $1 || SUBSTRING(class FROM CHAR_LENGTH($3) + 1) WHERE tenant_id = $2 AND (class = $3 OR class LIKE $3 || ' %')`,
      [newName, tenantId, oldName]
    )
  }

  return result.rows[0] as Class
}

/**
 * Delete a class (soft delete)
 * Blocks deletion if students or scores reference this class.
 */
export async function deleteClass(tenantId: string, classId: string): Promise<void> {
  const classEntity = await getClassById(tenantId, classId)
  if (!classEntity) {
    throw new Error('Class not found')
  }

  // Check for dependent students (students.class stores the class name)
  const studentCheck = await query(
    `SELECT 1 FROM students WHERE tenant_id = $1 AND (class = $2 OR class LIKE $2 || ' %') AND deleted_at IS NULL LIMIT 1`,
    [tenantId, classEntity.name]
  )
  if (studentCheck.rows.length > 0) {
    throw new Error('Cannot delete class: students are still assigned to this class. Reassign or remove them first.')
  }

  // Check for dependent student scores
  const scoreCheck = await query(
    `SELECT 1 FROM student_scores WHERE tenant_id = $1 AND (class = $2 OR class LIKE $2 || ' %') LIMIT 1`,
    [tenantId, classEntity.name]
  )
  if (scoreCheck.rows.length > 0) {
    throw new Error('Cannot delete class: scores are still recorded for this class. Remove or archive them first.')
  }

  // Check for dependent teacher allocation slots (uses class name)
  const slotCheck = await query(
    `SELECT 1 FROM teacher_allocation_slots WHERE tenant_id = $1 AND (class = $2 OR class LIKE $2 || ' %') LIMIT 1`,
    [tenantId, classEntity.name]
  )
  if (slotCheck.rows.length > 0) {
    throw new Error('Cannot delete class: teacher allocation slots reference this class. Remove them first.')
  }

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
