import { sql } from './db.js'
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
        AND tenant_id = ${tenantId}
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
          tenantId,
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

  await recordFeeStructureVersion(id, tenantId, createdBy, 'Fee structure created')

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
    updatedBy?: string
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

  const updated = rowToFeeStructure(result.rows[0])
  const changed = [
    updates.name && updates.name !== current.name ? 'name' : null,
    updates.effectiveFrom && updates.effectiveFrom !== current.effectiveFrom ? 'effective period' : null,
    updates.effectiveTo !== undefined && updates.effectiveTo !== current.effectiveTo ? 'effective end' : null,
    updates.status && updates.status !== current.status ? 'status' : null,
  ].filter(Boolean).join(', ')
  await recordFeeStructureVersion(
    id,
    current.tenantId,
    updates.updatedBy || current.createdBy,
    changed ? `Updated ${changed}` : 'Fee structure updated'
  )

  return updated
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
  await recordFeeStructureVersion(newId, source.tenantId, createdBy, `Copied from "${source.name}"`)
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

// ─── Version history ─────────────────────────────────────────────────────────

export interface FeeStructureVersion {
  id: string
  version: number
  name: string
  effectiveFrom: string
  effectiveTo: string | null
  status: string
  createdAt: string
  createdBy: string
  changes: string | null
}

interface VersionRow {
  id: string
  version: number
  snapshot: { name?: string; effectiveFrom?: string; effectiveTo?: string | null; status?: string } | string
  changes: string | null
  created_by: string
  created_at: Date
}

export async function recordFeeStructureVersion(
  feeStructureId: string,
  tenantId: string,
  createdBy: string,
  changes?: string
): Promise<void> {
  try {
    const structure = await getFeeStructureWithItems(feeStructureId)
    if (!structure) return

    const next = await sql<{ v: number }>`
      SELECT COALESCE(MAX(version), 0) + 1 AS v
      FROM fee_structure_versions WHERE fee_structure_id = ${feeStructureId}
    `
    await sql`
      INSERT INTO fee_structure_versions
        (id, fee_structure_id, tenant_id, version, snapshot, changes, created_by)
      VALUES
        (${uuidv4()}, ${feeStructureId}, ${tenantId}, ${next.rows[0].v},
         ${JSON.stringify(structure)}::jsonb, ${changes || null}, ${createdBy})
    `
  } catch (error: any) {
    // Versions table may not exist yet on older databases — log and continue.
    if (error?.code === '42P01') {
      console.warn('fee_structure_versions table missing — skipping version record')
      return
    }
    throw error
  }
}

export async function getFeeStructureVersions(
  feeStructureId: string,
  tenantId: string
): Promise<FeeStructureVersion[]> {
  await ensureFeeTables()

  const result = await sql<VersionRow>`
    SELECT id, version, snapshot, changes, created_by, created_at
    FROM fee_structure_versions
    WHERE fee_structure_id = ${feeStructureId} AND tenant_id = ${tenantId}
    ORDER BY version DESC
  `

  return result.rows.map(row => {
    const snap = typeof row.snapshot === 'string' ? JSON.parse(row.snapshot) : row.snapshot
    return {
      id: row.id,
      version: row.version,
      name: snap?.name || '',
      effectiveFrom: snap?.effectiveFrom || '',
      effectiveTo: snap?.effectiveTo ?? null,
      status: snap?.status || 'active',
      createdAt: row.created_at.toISOString(),
      createdBy: row.created_by,
      changes: row.changes,
    }
  })
}

export async function rollbackFeeStructure(
  feeStructureId: string,
  tenantId: string,
  targetVersion: number,
  createdBy: string
): Promise<FeeStructure | null> {
  await ensureFeeTables()

  const versionRow = await sql<{ snapshot: any }>`
    SELECT snapshot FROM fee_structure_versions
    WHERE fee_structure_id = ${feeStructureId} AND tenant_id = ${tenantId} AND version = ${targetVersion}
  `
  if (!versionRow.rows[0]) return null

  const snap = typeof versionRow.rows[0].snapshot === 'string'
    ? JSON.parse(versionRow.rows[0].snapshot)
    : versionRow.rows[0].snapshot

  const current = await getFeeStructureById(feeStructureId)
  if (!current) return null

  await sql`
    UPDATE fee_structures
    SET
      name = ${snap.name ?? current.name},
      effective_from = ${snap.effectiveFrom ?? current.effectiveFrom},
      effective_to = ${snap.effectiveTo ?? null},
      status = ${snap.status ?? current.status},
      updated_at = NOW()
    WHERE id = ${feeStructureId} AND tenant_id = ${tenantId}
  `

  if (Array.isArray(snap.feeItems)) {
    await sql`DELETE FROM fee_items WHERE fee_structure_id = ${feeStructureId}`
    for (const item of snap.feeItems) {
      await sql`
        INSERT INTO fee_items
          (id, fee_structure_id, category, description, amount, applicable_classes, is_mandatory, sequence, tenant_id)
        VALUES
          (${uuidv4()}, ${feeStructureId}, ${item.category}, ${item.description}, ${item.amount},
           ${JSON.stringify(item.applicableClasses)}, ${item.isMandatory}, ${item.sequence}, ${tenantId})
      `
    }
  }

  await recordFeeStructureVersion(feeStructureId, tenantId, createdBy, `Rolled back to version ${targetVersion}`)

  return getFeeStructureWithItems(feeStructureId)
}

// ─── Class-level overrides ───────────────────────────────────────────────────

export interface FeeClassOverride {
  id: string
  className: string
  feeCategory: string
  originalAmount: number
  overrideAmount: number
  reason: string | null
  effectiveFrom: string
  effectiveTo: string | null
}

interface OverrideRow {
  id: string
  class_name: string
  fee_category: string
  original_amount: string
  override_amount: string
  reason: string | null
  effective_from: Date
  effective_to: Date | null
}

function rowToOverride(row: OverrideRow): FeeClassOverride {
  return {
    id: row.id,
    className: row.class_name,
    feeCategory: row.fee_category,
    originalAmount: parseFloat(row.original_amount),
    overrideAmount: parseFloat(row.override_amount),
    reason: row.reason,
    effectiveFrom: row.effective_from.toISOString().split('T')[0],
    effectiveTo: row.effective_to ? row.effective_to.toISOString().split('T')[0] : null,
  }
}

export async function getClassOverrides(
  feeStructureId: string,
  tenantId: string
): Promise<FeeClassOverride[]> {
  const result = await sql<OverrideRow>`
    SELECT * FROM fee_class_overrides
    WHERE fee_structure_id = ${feeStructureId} AND tenant_id = ${tenantId}
    ORDER BY class_name, fee_category
  `
  return result.rows.map(rowToOverride)
}

export async function createClassOverride(
  feeStructureId: string,
  tenantId: string,
  data: Omit<FeeClassOverride, 'id'>,
  createdBy: string
): Promise<FeeClassOverride> {
  const id = uuidv4()
  const result = await sql<OverrideRow>`
    INSERT INTO fee_class_overrides
      (id, fee_structure_id, tenant_id, class_name, fee_category, original_amount,
       override_amount, reason, effective_from, effective_to, created_by)
    VALUES
      (${id}, ${feeStructureId}, ${tenantId}, ${data.className}, ${data.feeCategory},
       ${data.originalAmount}, ${data.overrideAmount}, ${data.reason || null},
       ${data.effectiveFrom}, ${data.effectiveTo || null}, ${createdBy})
    ON CONFLICT (fee_structure_id, class_name, fee_category)
    DO UPDATE SET
      original_amount = EXCLUDED.original_amount,
      override_amount = EXCLUDED.override_amount,
      reason = EXCLUDED.reason,
      effective_from = EXCLUDED.effective_from,
      effective_to = EXCLUDED.effective_to,
      updated_at = NOW()
    RETURNING *
  `
  return rowToOverride(result.rows[0])
}

export async function updateClassOverride(
  feeStructureId: string,
  overrideId: string,
  tenantId: string,
  data: Partial<Omit<FeeClassOverride, 'id'>>
): Promise<FeeClassOverride | null> {
  const current = await sql<OverrideRow>`
    SELECT * FROM fee_class_overrides
    WHERE id = ${overrideId} AND fee_structure_id = ${feeStructureId} AND tenant_id = ${tenantId}
  `
  if (!current.rows[0]) return null
  const cur = current.rows[0]

  const result = await sql<OverrideRow>`
    UPDATE fee_class_overrides SET
      class_name = ${data.className ?? cur.class_name},
      fee_category = ${data.feeCategory ?? cur.fee_category},
      original_amount = ${data.originalAmount ?? parseFloat(cur.original_amount)},
      override_amount = ${data.overrideAmount ?? parseFloat(cur.override_amount)},
      reason = ${data.reason !== undefined ? data.reason : cur.reason},
      effective_from = ${data.effectiveFrom ?? cur.effective_from.toISOString().split('T')[0]},
      effective_to = ${data.effectiveTo !== undefined ? data.effectiveTo : (cur.effective_to ? cur.effective_to.toISOString().split('T')[0] : null)},
      updated_at = NOW()
    WHERE id = ${overrideId} AND fee_structure_id = ${feeStructureId} AND tenant_id = ${tenantId}
    RETURNING *
  `
  return rowToOverride(result.rows[0])
}

export async function deleteClassOverride(
  feeStructureId: string,
  overrideId: string,
  tenantId: string
): Promise<boolean> {
  const result = await sql`
    DELETE FROM fee_class_overrides
    WHERE id = ${overrideId} AND fee_structure_id = ${feeStructureId} AND tenant_id = ${tenantId}
    RETURNING id
  `
  return result.rows.length > 0
}

export async function previewClassOverrides(
  feeStructureId: string,
  tenantId: string,
  overrides?: FeeClassOverride[]
): Promise<{ totalOriginal: number; totalAfterOverrides: number; byClass: Array<{ class: string; original: number; override: number; difference: number }> }> {
  const structure = await getFeeStructureWithItems(feeStructureId)
  if (!structure) throw new Error('Fee structure not found')

  const effective = overrides ?? await getClassOverrides(feeStructureId, tenantId)
  const classes = new Set<string>()
  for (const item of structure.feeItems || []) {
    for (const cls of item.applicableClasses) classes.add(cls)
  }
  for (const o of effective) classes.add(o.className)

  const byClass = [...classes].sort().map(cls => {
    const original = (structure.feeItems || [])
      .filter(i => i.applicableClasses.includes(cls))
      .reduce((sum, i) => sum + i.amount, 0)
    const delta = effective
      .filter(o => o.className === cls)
      .reduce((sum, o) => sum + (o.overrideAmount - o.originalAmount), 0)
    return { class: cls, original, override: original + delta, difference: delta }
  })

  return {
    totalOriginal: byClass.reduce((s, c) => s + c.original, 0),
    totalAfterOverrides: byClass.reduce((s, c) => s + c.override, 0),
    byClass,
  }
}
