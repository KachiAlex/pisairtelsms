import { sql } from '@vercel/postgres'

export interface FeeRecord {
  id: string
  studentId: string
  studentName: string
  admissionNo: string
  class: string
  feeType: string
  amount: number
  paid: number
  balance: number
  status: 'pending' | 'partial' | 'paid'
  lastPaymentDate: string | null
  academicSession: string
  term: string
  createdAt: string
  updatedAt: string
}

export interface FeeRecordPayload {
  studentId: string
  studentName: string
  admissionNo: string
  class: string
  feeType: string
  amount: number
  academicSession: string
  term: string
}

export interface PaymentPayload {
  feeRecordId: string
  amountPaid: number
  paymentMethod: string
  transactionRef: string
}

interface FeeRow {
  id: string
  student_id: string
  student_name: string
  admission_no: string
  class: string
  fee_type: string
  amount: string
  paid: string
  balance: string
  status: string
  last_payment_date: Date | null
  academic_session: string
  term: string
  created_at: Date
  updated_at: Date
}

function rowToFeeRecord(row: FeeRow): FeeRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    admissionNo: row.admission_no,
    class: row.class,
    feeType: row.fee_type,
    amount: parseFloat(row.amount),
    paid: parseFloat(row.paid),
    balance: parseFloat(row.balance),
    status: row.status as FeeRecord['status'],
    lastPaymentDate: row.last_payment_date ? row.last_payment_date.toISOString() : null,
    academicSession: row.academic_session,
    term: row.term,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function ensureFinanceTable(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS fee_records (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        admission_no TEXT NOT NULL,
        class TEXT NOT NULL,
        fee_type TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        paid NUMERIC(12,2) DEFAULT 0,
        balance NUMERIC(12,2) DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        last_payment_date TIMESTAMP WITH TIME ZONE,
        academic_session TEXT NOT NULL,
        term TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_fee_records_tenant ON fee_records(tenant_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_fee_records_student_id ON fee_records(student_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_fee_records_session_term ON fee_records(academic_session, term)`
    await sql`CREATE INDEX IF NOT EXISTS idx_fee_records_class ON fee_records(class)`
  } catch (error) {
    console.error('Error ensuring fee_records table:', error)
  }
}

export async function fetchFeeRecords(
  tenantId: string,
  academicSession?: string,
  term?: string,
  className?: string
): Promise<FeeRecord[]> {
  await ensureFinanceTable()
  try {
    if (academicSession && term && className) {
      const result = await sql<FeeRow>`
        SELECT * FROM fee_records
        WHERE tenant_id = ${tenantId} AND academic_session = ${academicSession} AND term = ${term} AND class = ${className}
        ORDER BY created_at DESC
      `
      return result.rows.map(rowToFeeRecord)
    } else if (academicSession && term) {
      const result = await sql<FeeRow>`
        SELECT * FROM fee_records
        WHERE tenant_id = ${tenantId} AND academic_session = ${academicSession} AND term = ${term}
        ORDER BY created_at DESC
      `
      return result.rows.map(rowToFeeRecord)
    } else {
      const result = await sql<FeeRow>`
        SELECT * FROM fee_records WHERE tenant_id = ${tenantId} ORDER BY created_at DESC
      `
      return result.rows.map(rowToFeeRecord)
    }
  } catch (error) {
    console.error('Error fetching fee records:', error)
    return []
  }
}

export async function createFeeRecord(tenantId: string, payload: FeeRecordPayload): Promise<FeeRecord> {
  await ensureFinanceTable()
  const id = `fee_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const result = await sql<FeeRow>`
    INSERT INTO fee_records
      (id, tenant_id, student_id, student_name, admission_no, class, fee_type, amount, paid, balance, status, academic_session, term)
    VALUES
      (${id}, ${tenantId}, ${payload.studentId}, ${payload.studentName}, ${payload.admissionNo},
       ${payload.class}, ${payload.feeType}, ${payload.amount}, 0, ${payload.amount}, 'pending',
       ${payload.academicSession}, ${payload.term})
    RETURNING *
  `
  return rowToFeeRecord(result.rows[0])
}

export async function recordPayment(tenantId: string, payload: PaymentPayload): Promise<FeeRecord> {
  await ensureFinanceTable()

  // Fetch current record scoped to tenant
  const current = await sql<FeeRow>`
    SELECT * FROM fee_records WHERE id = ${payload.feeRecordId} AND tenant_id = ${tenantId}
  `
  if (current.rows.length === 0) throw new Error('Fee record not found')

  const record = current.rows[0]
  const newPaid = parseFloat(record.paid) + payload.amountPaid
  const newBalance = parseFloat(record.amount) - newPaid
  const newStatus = newBalance <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'pending'

  const result = await sql<FeeRow>`
    UPDATE fee_records
    SET paid = ${newPaid},
        balance = ${Math.max(0, newBalance)},
        status = ${newStatus},
        last_payment_date = NOW(),
        updated_at = NOW()
    WHERE id = ${payload.feeRecordId} AND tenant_id = ${tenantId}
    RETURNING *
  `
  return rowToFeeRecord(result.rows[0])
}
