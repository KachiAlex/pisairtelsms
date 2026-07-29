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

export interface StudentPayment {
  id: string
  studentId: string
  feeStructureId: string
  amount: number
  paymentMethod: string
  reference: string | null
  receiptUrl: string | null
  paidAt: string
  recordedBy: string | null
  notes: string | null
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

interface StudentPaymentRow {
  id: string
  student_id: string
  fee_structure_id: string
  amount: string
  payment_method: string
  reference: string | null
  receipt_url: string | null
  paid_at: Date
  recorded_by: string | null
  notes: string | null
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

function rowToStudentPayment(row: StudentPaymentRow): StudentPayment {
  return {
    id: row.id,
    studentId: row.student_id,
    feeStructureId: row.fee_structure_id,
    amount: parseFloat(row.amount),
    paymentMethod: row.payment_method,
    reference: row.reference,
    receiptUrl: row.receipt_url,
    paidAt: row.paid_at.toISOString(),
    recordedBy: row.recorded_by,
    notes: row.notes,
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

export async function createPayment(
  studentId: string,
  feeStructureId: string,
  amount: number,
  paymentMethod: string,
  reference: string | null,
  receiptUrl: string | null,
  recordedBy: string | null,
  notes: string | null
): Promise<StudentPayment> {
  await ensureFeeAssignmentTables()
  const id = uuidv4()

  const result = await sql<StudentPaymentRow>`
    INSERT INTO student_payments
      (id, student_id, fee_structure_id, amount, payment_method, reference, receipt_url, recorded_by, notes)
    VALUES
      (${id}, ${studentId}, ${feeStructureId}, ${amount}, ${paymentMethod}, ${reference}, ${receiptUrl}, ${recordedBy}, ${notes})
    RETURNING *
  `

  // Update fee assignment totals
  await sql`
    UPDATE fee_assignments
    SET
      total_paid = total_paid + ${amount},
      total_balance = total_balance - ${amount},
      status = CASE
        WHEN total_balance - ${amount} <= 0 THEN 'paid'
        ELSE 'partial'
      END,
      updated_at = NOW()
    WHERE student_id = ${studentId} AND fee_structure_id = ${feeStructureId}
  `

  return rowToStudentPayment(result.rows[0])
}

export async function getStudentPayments(
  studentId: string,
  feeStructureId?: string
): Promise<StudentPayment[]> {
  await ensureFeeAssignmentTables()

  let query = sql<StudentPaymentRow>`
    SELECT * FROM student_payments WHERE student_id = ${studentId}
  `

  if (feeStructureId) {
    query = sql<StudentPaymentRow>`
      SELECT * FROM student_payments
      WHERE student_id = ${studentId} AND fee_structure_id = ${feeStructureId}
    `
  }

  const result = await query
  return result.rows.map(rowToStudentPayment)
}

export async function getStudentFeeSummary(studentId: string): Promise<{
  totalFees: number
  totalPaid: number
  totalBalance: number
  status: 'pending' | 'partial' | 'paid'
}> {
  await ensureFeeAssignmentTables()

  const result = await sql<{ total_amount: string; total_paid: string; total_balance: string; status: string }>`
    SELECT
      COALESCE(SUM(total_amount), 0) as total_amount,
      COALESCE(SUM(total_paid), 0) as total_paid,
      COALESCE(SUM(total_balance), 0) as total_balance,
      CASE
        WHEN COALESCE(SUM(total_balance), 0) = 0 THEN 'paid'
        WHEN COALESCE(SUM(total_paid), 0) = 0 THEN 'pending'
        ELSE 'partial'
      END as status
    FROM fee_assignments
    WHERE student_id = ${studentId}
  `

  const row = result.rows[0]
  return {
    totalFees: parseFloat(row.total_amount),
    totalPaid: parseFloat(row.total_paid),
    totalBalance: parseFloat(row.total_balance),
    status: row.status as 'pending' | 'partial' | 'paid',
  }
}
