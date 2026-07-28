import { sql } from '@vercel/postgres'
import { v4 as uuidv4 } from 'uuid'
import { createFeeAssignment } from './fee-assignments.js'

export interface FeeItem {
  id: string
  feeStructureId: string
  category: string
  description: string
  amount: number
  applicableClasses: string[]
  isMandatory: boolean
  sequence: number
  createdAt: string
}

export interface FeeStructure {
  id: string
  tenantId: string
  name: string
  academicSession: string
  term: string
  effectiveFrom: string
  effectiveTo: string | null
  status: 'active' | 'archived'
  createdBy: string
  createdAt: string
  updatedAt: string
  feeItems?: FeeItem[]
}

interface FeeStructureRow {
  id: string
  tenant_id: string
  name: string
  academic_session: string
  term: string
  effective_from: Date
  effective_to: Date | null
  status: string
  created_by: string
  created_at: Date
  updated_at: Date
}

interface FeeItemRow {
  id: string
  fee_structure_id: string
  category: string
  description: string
  amount: string
  applicable_classes: string
  is_mandatory: boolean
  sequence: number
  created_at: Date
}

function rowToFeeStructure(row: FeeStructureRow): FeeStructure {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    academicSession: row.academic_session,
    term: row.term,
    effectiveFrom: row.effective_from.toISOString().split('T')[0],
    effectiveTo: row.effective_to ? row.effective_to.toISOString().split('T')[0] : null,
    status: row.status as 'active' | 'archived',
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

function rowToFeeItem(row: FeeItemRow): FeeItem {
  return {
    id: row.id,
    feeStructureId: row.fee_structure_id,
    category: row.category,
    description: row.description,
    amount: parseFloat(row.amount),
    applicableClasses: JSON.parse(row.applicable_classes),
    isMandatory: row.is_mandatory,
    sequence: row.sequence,
    createdAt: row.created_at.toISOString(),
  }
}

export async function ensureFeeTables(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS fee_structures (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        academic_session TEXT NOT NULL,
        term TEXT NOT NULL,
        effective_from DATE NOT NULL,
        effective_to DATE,
        status TEXT NOT NULL DEFAULT 'active',
        created_by TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_fee_structures_tenant_id ON fee_structures(tenant_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_fee_structures_session_term ON fee_structures(academic_session, term)`
    await sql`CREATE INDEX IF NOT EXISTS idx_fee_structures_status ON fee_structures(status)`

    await sql`
      CREATE TABLE IF NOT EXISTS fee_items (
        id TEXT PRIMARY KEY,
        fee_structure_id TEXT NOT NULL REFERENCES fee_structures(id),
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        applicable_classes TEXT NOT NULL,
        is_mandatory BOOLEAN NOT NULL DEFAULT false,
        sequence INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_fee_items_fee_structure_id ON fee_items(fee_structure_id)`
  } catch (error) {
    console.error('Error ensuring fee tables:', error)
  }
}

export async function createFeeStructure(
  tenantId: string,
  name: string,
  academicSession: string,
  term: string,
  effectiveFrom: string,
  effectiveTo: string | null,
  createdBy: string,
  feeItems: Array<{
    category: string
    description: string
    amount: number
    applicableClasses: string[]
    isMandatory: boolean
    sequence: number
  }>
): Promise<FeeStructure> {
  await ensureFeeTables()
  const id = uuidv4()

  const result = await sql<FeeStructureRow>`
    INSERT INTO fee_structures
      (id, tenant_id, name, academic_session, term, effective_from, effective_to, status, created_by)
    VALUES
      (${id}, ${tenantId}, ${name}, ${academicSession}, ${term}, ${effectiveFrom}, ${effectiveTo}, 'active', ${createdBy})
    RETURNING *
  `

  const feeStructure = rowToFeeStructure(result.rows[0])

  // Insert fee items
  for (const item of feeItems) {
    const itemId = uuidv4()
    await sql`
      INSERT INTO fee_items
        (id, fee_structure_id, category, description, amount, applicable_classes, is_mandatory, sequence)
      VALUES
        (${itemId}, ${id}, ${item.category}, ${item.description}, ${item.amount}, ${JSON.stringify(item.applicableClasses)}, ${item.isMandatory}, ${item.sequence})
    `
  }

  // Auto-assign fee structure to students in applicable classes
  const allApplicableClasses = new Set<string>()
  for (const item of feeItems) {
    for (const className of item.applicableClasses) {
      allApplicableClasses.add(className)
    }
  }

  if (allApplicableClasses.size > 0) {
    const totalFees = feeItems.reduce((sum, item) => sum + item.amount, 0)
    const dueDate = effectiveTo || effectiveFrom
    const studentIds = new Set<string>()

    // Query students for each applicable class
    for (const className of allApplicableClasses) {
      const studentsResult = await sql<{ id: string }>`
        SELECT id FROM students
        WHERE class = ${className}
        AND deleted_at IS NULL
      `
      for (const student of studentsResult.rows) {
        studentIds.add(student.id)
      }
    }

    // Assign fee structure to all found students
    for (const studentId of studentIds) {
      try {
        await createFeeAssignment(
          studentId,
          id,
          academicSession,
          term,
          totalFees,
          dueDate
        )
      } catch (error) {
        console.error(`Failed to assign fee structure to student ${studentId}:`, error)
        // Continue with other students even if one fails
      }
    }
  }

  return feeStructure
}

export async function getFeeStructures(
  tenantId: string,
  academicSession?: string,
  term?: string,
  status?: string
): Promise<FeeStructure[]> {
  await ensureFeeTables()

  let query = sql<FeeStructureRow>`SELECT * FROM fee_structures WHERE tenant_id = ${tenantId}`

  if (academicSession) {
    query = sql<FeeStructureRow>`SELECT * FROM fee_structures WHERE tenant_id = ${tenantId} AND academic_session = ${academicSession}`
  }
  if (term) {
    query = sql<FeeStructureRow>`SELECT * FROM fee_structures WHERE tenant_id = ${tenantId} AND term = ${term}`
  }
  if (status) {
    query = sql<FeeStructureRow>`SELECT * FROM fee_structures WHERE tenant_id = ${tenantId} AND status = ${status}`
  }

  if (academicSession && term) {
    query = sql<FeeStructureRow>`SELECT * FROM fee_structures WHERE tenant_id = ${tenantId} AND academic_session = ${academicSession} AND term = ${term}`
  }

  if (academicSession && term && status) {
    query = sql<FeeStructureRow>`SELECT * FROM fee_structures WHERE tenant_id = ${tenantId} AND academic_session = ${academicSession} AND term = ${term} AND status = ${status}`
  }

  const result = await query

  return result.rows.map(rowToFeeStructure)
}

export async function getFeeStructureById(id: string): Promise<FeeStructure | null> {
  await ensureFeeTables()

  const result = await sql<FeeStructureRow>`SELECT * FROM fee_structures WHERE id = ${id}`
  if (result.rows.length === 0) return null

  return rowToFeeStructure(result.rows[0])
}

export async function getFeeStructureWithItems(id: string): Promise<(FeeStructure & { feeItems: FeeItem[] }) | null> {
  await ensureFeeTables()

  const structureResult = await sql<FeeStructureRow>`SELECT * FROM fee_structures WHERE id = ${id}`
  if (structureResult.rows.length === 0) return null

  const structure = rowToFeeStructure(structureResult.rows[0])

  const itemsResult = await sql<FeeItemRow>`SELECT * FROM fee_items WHERE fee_structure_id = ${id} ORDER BY sequence`
  const feeItems = itemsResult.rows.map(rowToFeeItem)

  return {
    ...structure,
    feeItems,
  }
}

export async function updateFeeStructure(
  id: string,
  updates: {
    name?: string
    effectiveFrom?: string
    effectiveTo?: string | null
    status?: 'active' | 'archived'
  }
): Promise<FeeStructure | null> {
  await ensureFeeTables()

  const current = await getFeeStructureById(id)
  if (!current) return null

  const result = await sql<FeeStructureRow>`
    UPDATE fee_structures
    SET
      name = ${updates.name ?? current.name},
      effective_from = ${updates.effectiveFrom ?? current.effectiveFrom},
      effective_to = ${updates.effectiveTo ?? current.effectiveTo},
      status = ${updates.status ?? current.status},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `

  return rowToFeeStructure(result.rows[0])
}

export async function copyFeeStructure(
  sourceId: string,
  newName: string,
  newAcademicSession: string,
  newTerm: string,
  newEffectiveFrom: string,
  createdBy: string
): Promise<FeeStructure> {
  await ensureFeeTables()

  const source = await getFeeStructureWithItems(sourceId)
  if (!source) throw new Error('Source fee structure not found')

  const newId = uuidv4()

  await sql`
    INSERT INTO fee_structures
      (id, tenant_id, name, academic_session, term, effective_from, effective_to, status, created_by)
    VALUES
      (${newId}, ${source.tenantId}, ${newName}, ${newAcademicSession}, ${newTerm}, ${newEffectiveFrom}, null, 'active', ${createdBy})
  `

  // Copy fee items
  for (const item of source.feeItems) {
    const itemId = uuidv4()
    await sql`
      INSERT INTO fee_items
        (id, fee_structure_id, category, description, amount, applicable_classes, is_mandatory, sequence)
      VALUES
        (${itemId}, ${newId}, ${item.category}, ${item.description}, ${item.amount}, ${JSON.stringify(item.applicableClasses)}, ${item.isMandatory}, ${item.sequence})
    `
  }

  const result = await sql<FeeStructureRow>`SELECT * FROM fee_structures WHERE id = ${newId}`
  return rowToFeeStructure(result.rows[0])
}

export async function getFeeStructureHistory(id: string): Promise<FeeStructure[]> {
  await ensureFeeTables()

  const result = await sql<FeeStructureRow>`
    SELECT * FROM fee_structures WHERE id = ${id}
    ORDER BY created_at DESC
  `

  return result.rows.map(rowToFeeStructure)
}
