import { sql } from '../finance/_lib/db.js'

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

export async function sendFeeReminders(tenantId: string): Promise<{ sent: number }> {
  const defaulters = await sql<FeeRow>`
    SELECT * FROM fee_records WHERE tenant_id = ${tenantId} AND balance > 0
  `

  if (defaulters.rows.length === 0) {
    return { sent: 0 }
  }

  const now = new Date().toISOString()
  for (const row of defaulters.rows) {
    const id = `fee_reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const balance = parseFloat(row.balance)
    const message = `Reminder: outstanding fee of ₦${balance.toLocaleString()} for ${row.student_name || row.student_id}`
    await sql`
      INSERT INTO admin_notifications (
        id, tenant_id, type, title, message, student_id, student_name, amount, read, created_at
      ) VALUES (
        ${id}, ${tenantId}, 'fee_reminder', 'Fee Payment Reminder', ${message},
        ${row.student_id}, ${row.student_name || null}, ${balance}, false, ${now}
      )
    `
  }

  return { sent: defaulters.rows.length }
}
