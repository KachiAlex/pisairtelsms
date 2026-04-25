import { sql } from '@vercel/postgres'
import { v4 as uuidv4 } from 'uuid'

export interface Payment {
  id: string
  feeAssignmentId: string
  amount: number
  paymentMethod: string
  referenceNumber: string
  receiptNumber: string
  paymentDate: string
  paymentTime: string
  recordedBy: string
  notes: string | null
  status: 'pending' | 'verified' | 'reconciled' | 'reversed'
  createdAt: string
}

export interface PaymentReconciliation {
  id: string
  paymentId: string
  bankDepositDate: string
  bankDepositAmount: number
  bankReference: string
  matchedAt: string
  matchedBy: string
  status: 'pending' | 'matched' | 'exception'
  exceptionReason: string | null
  createdAt: string
}

export interface PaymentPlan {
  id: string
  feeAssignmentId: string
  numberOfInstallments: number
  installmentAmount: number
  startDate: string
  status: 'active' | 'completed' | 'cancelled'
  createdBy: string
  createdAt: string
}

export interface PaymentPlanInstallment {
  id: string
  paymentPlanId: string
  installmentNumber: number
  dueDate: string
  amount: number
  paidAmount: number
  status: 'pending' | 'partial' | 'paid'
}

interface PaymentRow {
  id: string
  fee_assignment_id: string
  amount: string
  payment_method: string
  reference_number: string
  receipt_number: string
  payment_date: Date
  payment_time: string
  recorded_by: string
  notes: string | null
  status: string
  created_at: Date
}

interface PaymentReconciliationRow {
  id: string
  payment_id: string
  bank_deposit_date: Date
  bank_deposit_amount: string
  bank_reference: string
  matched_at: Date
  matched_by: string
  status: string
  exception_reason: string | null
  created_at: Date
}

interface PaymentPlanRow {
  id: string
  fee_assignment_id: string
  number_of_installments: number
  installment_amount: string
  start_date: Date
  status: string
  created_by: string
  created_at: Date
}

interface PaymentPlanInstallmentRow {
  id: string
  payment_plan_id: string
  installment_number: number
  due_date: Date
  amount: string
  paid_amount: string
  status: string
}

function rowToPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    feeAssignmentId: row.fee_assignment_id,
    amount: parseFloat(row.amount),
    paymentMethod: row.payment_method,
    referenceNumber: row.reference_number,
    receiptNumber: row.receipt_number,
    paymentDate: row.payment_date.toISOString().split('T')[0],
    paymentTime: row.payment_time,
    recordedBy: row.recorded_by,
    notes: row.notes,
    status: row.status as 'pending' | 'verified' | 'reconciled' | 'reversed',
    createdAt: row.created_at.toISOString(),
  }
}

function rowToPaymentReconciliation(row: PaymentReconciliationRow): PaymentReconciliation {
  return {
    id: row.id,
    paymentId: row.payment_id,
    bankDepositDate: row.bank_deposit_date.toISOString().split('T')[0],
    bankDepositAmount: parseFloat(row.bank_deposit_amount),
    bankReference: row.bank_reference,
    matchedAt: row.matched_at.toISOString(),
    matchedBy: row.matched_by,
    status: row.status as 'pending' | 'matched' | 'exception',
    exceptionReason: row.exception_reason,
    createdAt: row.created_at.toISOString(),
  }
}

function rowToPaymentPlan(row: PaymentPlanRow): PaymentPlan {
  return {
    id: row.id,
    feeAssignmentId: row.fee_assignment_id,
    numberOfInstallments: row.number_of_installments,
    installmentAmount: parseFloat(row.installment_amount),
    startDate: row.start_date.toISOString().split('T')[0],
    status: row.status as 'active' | 'completed' | 'cancelled',
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
  }
}

function rowToPaymentPlanInstallment(row: PaymentPlanInstallmentRow): PaymentPlanInstallment {
  return {
    id: row.id,
    paymentPlanId: row.payment_plan_id,
    installmentNumber: row.installment_number,
    dueDate: row.due_date.toISOString().split('T')[0],
    amount: parseFloat(row.amount),
    paidAmount: parseFloat(row.paid_amount),
    status: row.status as 'pending' | 'partial' | 'paid',
  }
}

export async function ensurePaymentTables(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        fee_assignment_id TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        payment_method TEXT NOT NULL,
        reference_number TEXT NOT NULL,
        receipt_number TEXT NOT NULL UNIQUE,
        payment_date DATE NOT NULL,
        payment_time TIME NOT NULL,
        recorded_by TEXT NOT NULL,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_fee_assignment_id ON payments(fee_assignment_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`

    await sql`
      CREATE TABLE IF NOT EXISTS payment_reconciliation (
        id TEXT PRIMARY KEY,
        payment_id TEXT NOT NULL REFERENCES payments(id),
        bank_deposit_date DATE NOT NULL,
        bank_deposit_amount NUMERIC(12,2) NOT NULL,
        bank_reference TEXT NOT NULL,
        matched_at TIMESTAMP WITH TIME ZONE NOT NULL,
        matched_by TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        exception_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_payment_id ON payment_reconciliation(payment_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_status ON payment_reconciliation(status)`

    await sql`
      CREATE TABLE IF NOT EXISTS payment_plans (
        id TEXT PRIMARY KEY,
        fee_assignment_id TEXT NOT NULL,
        number_of_installments INTEGER NOT NULL,
        installment_amount NUMERIC(12,2) NOT NULL,
        start_date DATE NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_by TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_payment_plans_fee_assignment_id ON payment_plans(fee_assignment_id)`

    await sql`
      CREATE TABLE IF NOT EXISTS payment_plan_installments (
        id TEXT PRIMARY KEY,
        payment_plan_id TEXT NOT NULL REFERENCES payment_plans(id),
        installment_number INTEGER NOT NULL,
        due_date DATE NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        paid_amount NUMERIC(12,2) DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending'
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_payment_plan_installments_payment_plan_id ON payment_plan_installments(payment_plan_id)`
  } catch (error) {
    console.error('Error ensuring payment tables:', error)
  }
}

export async function createPayment(
  feeAssignmentId: string,
  amount: number,
  paymentMethod: string,
  referenceNumber: string,
  receiptNumber: string,
  paymentDate: string,
  paymentTime: string,
  recordedBy: string,
  notes?: string
): Promise<Payment> {
  await ensurePaymentTables()
  const id = uuidv4()

  const result = await sql<PaymentRow>`
    INSERT INTO payments
      (id, fee_assignment_id, amount, payment_method, reference_number, receipt_number, payment_date, payment_time, recorded_by, notes, status)
    VALUES
      (${id}, ${feeAssignmentId}, ${amount}, ${paymentMethod}, ${referenceNumber}, ${receiptNumber}, ${paymentDate}, ${paymentTime}, ${recordedBy}, ${notes || null}, 'pending')
    RETURNING *
  `

  return rowToPayment(result.rows[0])
}

export async function getPayments(
  feeAssignmentId?: string,
  paymentDate?: string,
  status?: string
): Promise<Payment[]> {
  await ensurePaymentTables()

  let query = sql<PaymentRow>`SELECT * FROM payments`

  if (feeAssignmentId && paymentDate && status) {
    query = sql<PaymentRow>`
      SELECT * FROM payments
      WHERE fee_assignment_id = ${feeAssignmentId} AND payment_date = ${paymentDate} AND status = ${status}
      ORDER BY created_at DESC
    `
  } else if (feeAssignmentId) {
    query = sql<PaymentRow>`
      SELECT * FROM payments WHERE fee_assignment_id = ${feeAssignmentId}
      ORDER BY created_at DESC
    `
  } else if (paymentDate) {
    query = sql<PaymentRow>`
      SELECT * FROM payments WHERE payment_date = ${paymentDate}
      ORDER BY created_at DESC
    `
  } else if (status) {
    query = sql<PaymentRow>`
      SELECT * FROM payments WHERE status = ${status}
      ORDER BY created_at DESC
    `
  } else {
    query = sql<PaymentRow>`SELECT * FROM payments ORDER BY created_at DESC`
  }

  const result = await query
  return result.rows.map(rowToPayment)
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  await ensurePaymentTables()

  const result = await sql<PaymentRow>`SELECT * FROM payments WHERE id = ${id}`
  if (result.rows.length === 0) return null

  return rowToPayment(result.rows[0])
}

export async function updatePaymentStatus(id: string, status: 'pending' | 'verified' | 'reconciled' | 'reversed'): Promise<Payment | null> {
  await ensurePaymentTables()

  const result = await sql<PaymentRow>`
    UPDATE payments SET status = ${status} WHERE id = ${id} RETURNING *
  `

  if (result.rows.length === 0) return null
  return rowToPayment(result.rows[0])
}

export async function createPaymentReconciliation(
  paymentId: string,
  bankDepositDate: string,
  bankDepositAmount: number,
  bankReference: string,
  matchedBy: string
): Promise<PaymentReconciliation> {
  await ensurePaymentTables()
  const id = uuidv4()

  const result = await sql<PaymentReconciliationRow>`
    INSERT INTO payment_reconciliation
      (id, payment_id, bank_deposit_date, bank_deposit_amount, bank_reference, matched_at, matched_by, status)
    VALUES
      (${id}, ${paymentId}, ${bankDepositDate}, ${bankDepositAmount}, ${bankReference}, NOW(), ${matchedBy}, 'matched')
    RETURNING *
  `

  return rowToPaymentReconciliation(result.rows[0])
}

export async function getPaymentReconciliations(status?: string): Promise<PaymentReconciliation[]> {
  await ensurePaymentTables()

  let query = sql<PaymentReconciliationRow>`SELECT * FROM payment_reconciliation`

  if (status) {
    query = sql<PaymentReconciliationRow>`
      SELECT * FROM payment_reconciliation WHERE status = ${status}
      ORDER BY created_at DESC
    `
  } else {
    query = sql<PaymentReconciliationRow>`SELECT * FROM payment_reconciliation ORDER BY created_at DESC`
  }

  const result = await query
  return result.rows.map(rowToPaymentReconciliation)
}

export async function createPaymentPlan(
  feeAssignmentId: string,
  numberOfInstallments: number,
  installmentAmount: number,
  startDate: string,
  createdBy: string
): Promise<PaymentPlan> {
  await ensurePaymentTables()
  const id = uuidv4()

  const result = await sql<PaymentPlanRow>`
    INSERT INTO payment_plans
      (id, fee_assignment_id, number_of_installments, installment_amount, start_date, status, created_by)
    VALUES
      (${id}, ${feeAssignmentId}, ${numberOfInstallments}, ${installmentAmount}, ${startDate}, 'active', ${createdBy})
    RETURNING *
  `

  const plan = rowToPaymentPlan(result.rows[0])

  // Create installments
  const startDateObj = new Date(startDate)
  for (let i = 1; i <= numberOfInstallments; i++) {
    const dueDate = new Date(startDateObj)
    dueDate.setMonth(dueDate.getMonth() + i)
    const installmentId = uuidv4()

    await sql`
      INSERT INTO payment_plan_installments
        (id, payment_plan_id, installment_number, due_date, amount, paid_amount, status)
      VALUES
        (${installmentId}, ${id}, ${i}, ${dueDate.toISOString().split('T')[0]}, ${installmentAmount}, 0, 'pending')
    `
  }

  return plan
}

export async function getPaymentPlanInstallments(paymentPlanId: string): Promise<PaymentPlanInstallment[]> {
  await ensurePaymentTables()

  const result = await sql<PaymentPlanInstallmentRow>`
    SELECT * FROM payment_plan_installments WHERE payment_plan_id = ${paymentPlanId}
    ORDER BY installment_number
  `

  return result.rows.map(rowToPaymentPlanInstallment)
}

export async function getPaymentPlanById(id: string): Promise<PaymentPlan | null> {
  await ensurePaymentTables()

  const result = await sql<PaymentPlanRow>`SELECT * FROM payment_plans WHERE id = ${id}`
  if (result.rows.length === 0) return null

  return rowToPaymentPlan(result.rows[0])
}

export async function updatePaymentPlan(
  id: string,
  updates: {
    status?: 'active' | 'completed' | 'cancelled'
  }
): Promise<PaymentPlan | null> {
  await ensurePaymentTables()

  const current = await getPaymentPlanById(id)
  if (!current) return null

  const result = await sql<PaymentPlanRow>`
    UPDATE payment_plans SET status = ${updates.status ?? current.status} WHERE id = ${id} RETURNING *
  `

  return rowToPaymentPlan(result.rows[0])
}
