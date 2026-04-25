import { sql } from '@vercel/postgres'
import { v4 as uuidv4 } from 'uuid'

export interface FeeAssignment {
  id: string
  studentId: string
  feeStructureId: string
  academicSession: string
  term: string
  totalAmount: number
  totalPaid: number
  totalBalance: number
  status: 'pending' | 'partial' | 'paid'
  dueDate: string
  createdAt: string
  updatedAt: string
}

export interface Exemption {
  id: string
  studentId: string
  feeAssignmentId: string
  exemptionType: string
  amount: number
  percentage: number | null
  reason: string
  approvedBy: string
  approvalDate: string
  effectiveFrom: string
  effectiveTo: string | null
  createdAt: string
}

interface FeeAssignmentRow {
  id: string
  student_id: string
  fee_structure_id: string
  academic_session: string
  term: string
  total_amount: string
  total_paid: string
  total_balance: string
  status: string
  due_date: Date
  created_at: Date
  updated_at: Date
}

interface ExemptionRow {
  id: string
  student_id: string
  fee_assignment_id: string
  exemption_type: string
  amount: string
  percentage: string | null
  reason: string
  approved_by: string
  approval_date: Date
  effective_from: Date
  effective_to: Date | null
  created_at: Date
}

function rowToFeeAssignment(row: FeeAssignmentRow): FeeAssignment {
  return {
    id: row.id,
    studentId: row.student_id,
    feeStructureId: row.fee_structure_id,
    academicSession: row.academic_session,
    term: row.term,
    totalAmount: parseFloat(row.total_amount),
    totalPaid: parseFloat(row.total_paid),
    totalBalance: parseFloat(row.total_balance),
    status: row.status as 'pending' | 'partial' | 'paid',
    dueDate: row.due_date.toISOString().split('T')[0],
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

function rowToExemption(row: ExemptionRow): Exemption {
  return {
    id: row.id,
    studentId: row.student_id,
    feeAssignmentId: row.fee_assignment_id,
    exemptionType: row.exemption_type,
    amount: parseFloat(row.amount),
    percentage: row.percentage ? parseFloat(row.percentage) : null,
    reason: row.reason,
    approvedBy: row.approved_by,
    approvalDate: row.approval_date.toISOString(),
    effectiveFrom: row.effective_from.toISOString().split('T')[0],
    effectiveTo: row.effective_to ? row.effective_to.toISOString().split('T')[0] : null,
    createdAt: row.created_at.toISOString(),
  }
}

export async function ensureFeeAssignmentTables(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS fee_assignments (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        fee_structure_id TEXT NOT NULL,
        academic_session TEXT NOT NULL,
        term TEXT NOT NULL,
        total_amount NUMERIC(12,2) NOT NULL,
        total_paid NUMERIC(12,2) DEFAULT 0,
        total_balance NUMERIC(12,2) NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        due_date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_fee_assignments_student_id ON fee_assignments(student_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_fee_assignments_fee_structure_id ON fee_assignments(fee_structure_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_fee_assignments_session_term ON fee_assignments(academic_session, term)`

    await sql`
      CREATE TABLE IF NOT EXISTS exemptions (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        fee_assignment_id TEXT NOT NULL REFERENCES fee_assignments(id),
        exemption_type TEXT NOT NULL,
        amount NUMERIC(12,2),
        percentage NUMERIC(5,2),
        reason TEXT NOT NULL,
        approved_by TEXT NOT NULL,
        approval_date TIMESTAMP WITH TIME ZONE NOT NULL,
        effective_from DATE NOT NULL,
        effective_to DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_exemptions_student_id ON exemptions(student_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_exemptions_fee_assignment_id ON exemptions(fee_assignment_id)`
  } catch (error) {
    console.error('Error ensuring fee assignment tables:', error)
  }
}

export async function createFeeAssignment(
  studentId: string,
  feeStructureId: string,
  academicSession: string,
  term: string,
  totalAmount: number,
  dueDate: string
): Promise<FeeAssignment> {
  await ensureFeeAssignmentTables()
  const id = uuidv4()

  const result = await sql<FeeAssignmentRow>`
    INSERT INTO fee_assignments
      (id, student_id, fee_structure_id, academic_session, term, total_amount, total_paid, total_balance, status, due_date)
    VALUES
      (${id}, ${studentId}, ${feeStructureId}, ${academicSession}, ${term}, ${totalAmount}, 0, ${totalAmount}, 'pending', ${dueDate})
    RETURNING *
  `

  return rowToFeeAssignment(result.rows[0])
}

export async function getFeeAssignments(
  studentId?: string,
  academicSession?: string,
  term?: string
): Promise<FeeAssignment[]> {
  await ensureFeeAssignmentTables()

  let query = sql<FeeAssignmentRow>`SELECT * FROM fee_assignments`

  if (studentId && academicSession && term) {
    query = sql<FeeAssignmentRow>`
      SELECT * FROM fee_assignments
      WHERE student_id = ${studentId} AND academic_session = ${academicSession} AND term = ${term}
    `
  } else if (studentId) {
    query = sql<FeeAssignmentRow>`
      SELECT * FROM fee_assignments WHERE student_id = ${studentId}
    `
  } else if (academicSession && term) {
    query = sql<FeeAssignmentRow>`
      SELECT * FROM fee_assignments
      WHERE academic_session = ${academicSession} AND term = ${term}
    `
  }

  const result = await query
  return result.rows.map(rowToFeeAssignment)
}

export async function getFeeAssignmentById(id: string): Promise<FeeAssignment | null> {
  await ensureFeeAssignmentTables()

  const result = await sql<FeeAssignmentRow>`SELECT * FROM fee_assignments WHERE id = ${id}`
  if (result.rows.length === 0) return null

  return rowToFeeAssignment(result.rows[0])
}

export async function updateFeeAssignment(
  id: string,
  updates: {
    totalAmount?: number
    totalPaid?: number
    totalBalance?: number
    status?: 'pending' | 'partial' | 'paid'
    dueDate?: string
  }
): Promise<FeeAssignment | null> {
  await ensureFeeAssignmentTables()

  const current = await getFeeAssignmentById(id)
  if (!current) return null

  const result = await sql<FeeAssignmentRow>`
    UPDATE fee_assignments
    SET
      total_amount = ${updates.totalAmount ?? current.totalAmount},
      total_paid = ${updates.totalPaid ?? current.totalPaid},
      total_balance = ${updates.totalBalance ?? current.totalBalance},
      status = ${updates.status ?? current.status},
      due_date = ${updates.dueDate ?? current.dueDate},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `

  return rowToFeeAssignment(result.rows[0])
}

export async function createExemption(
  studentId: string,
  feeAssignmentId: string,
  exemptionType: string,
  amount: number | null,
  percentage: number | null,
  reason: string,
  approvedBy: string,
  effectiveFrom: string,
  effectiveTo: string | null
): Promise<Exemption> {
  await ensureFeeAssignmentTables()
  const id = uuidv4()

  const result = await sql<ExemptionRow>`
    INSERT INTO exemptions
      (id, student_id, fee_assignment_id, exemption_type, amount, percentage, reason, approved_by, approval_date, effective_from, effective_to)
    VALUES
      (${id}, ${studentId}, ${feeAssignmentId}, ${exemptionType}, ${amount}, ${percentage}, ${reason}, ${approvedBy}, NOW(), ${effectiveFrom}, ${effectiveTo})
    RETURNING *
  `

  return rowToExemption(result.rows[0])
}

export async function getExemptions(feeAssignmentId: string): Promise<Exemption[]> {
  await ensureFeeAssignmentTables()

  const result = await sql<ExemptionRow>`
    SELECT * FROM exemptions WHERE fee_assignment_id = ${feeAssignmentId}
    ORDER BY created_at DESC
  `

  return result.rows.map(rowToExemption)
}

export async function getFeeAssignmentLedger(feeAssignmentId: string): Promise<{
  assignment: FeeAssignment
  exemptions: Exemption[]
}> {
  await ensureFeeAssignmentTables()

  const assignment = await getFeeAssignmentById(feeAssignmentId)
  if (!assignment) throw new Error('Fee assignment not found')

  const exemptions = await getExemptions(feeAssignmentId)

  return {
    assignment,
    exemptions,
  }
}
