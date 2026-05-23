import { sql } from '@vercel/postgres'
import { v4 as uuidv4 } from 'uuid'

export interface Payment {
  id: string
  tenantId: string
  studentId: string
  feeAssignmentId: string
  feeStructureId: string
  amount: number
  paymentMethod: string
  referenceNumber: string
  receiptNumber: string
  paymentDate: string
  paymentTime: string
  recordedBy: string | null
  notes: string | null
  status: 'pending' | 'success' | 'failed' | 'verified' | 'reconciled' | 'reversed'
  gateway: 'paystack' | 'flutterwave' | 'moniepoint' | 'bank_transfer' | 'cash' | 'manual' | null
  gatewayRef: string | null
  gatewayResponse: Record<string, unknown> | null
  paidAt: string | null
  createdAt: string
}

export interface TenantPaymentSetting {
  id: string
  tenantId: string
  gateway: 'paystack' | 'flutterwave' | 'moniepoint'
  publicKey: string
  secretKey: string
  isActive: boolean
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface PaymentProof {
  id: string
  paymentId: string
  fileUrl: string
  fileType: string
  uploadedAt: string
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
  tenant_id: string
  student_id: string
  fee_assignment_id: string
  fee_structure_id: string
  amount: string
  payment_method: string
  reference_number: string
  receipt_number: string
  payment_date: Date
  payment_time: string
  recorded_by: string | null
  notes: string | null
  status: string
  gateway: string | null
  gateway_ref: string | null
  gateway_response: string | null
  paid_at: Date | null
  created_at: Date
}

interface TenantPaymentSettingRow {
  id: string
  tenant_id: string
  gateway: string
  public_key: string
  secret_key: string
  is_active: boolean
  metadata: string | null
  created_at: Date
  updated_at: Date
}

interface PaymentProofRow {
  id: string
  payment_id: string
  file_url: string
  file_type: string
  uploaded_at: Date
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
    tenantId: row.tenant_id,
    studentId: row.student_id,
    feeAssignmentId: row.fee_assignment_id,
    feeStructureId: row.fee_structure_id,
    amount: parseFloat(row.amount),
    paymentMethod: row.payment_method,
    referenceNumber: row.reference_number,
    receiptNumber: row.receipt_number,
    paymentDate: row.payment_date.toISOString().split('T')[0],
    paymentTime: row.payment_time,
    recordedBy: row.recorded_by,
    notes: row.notes,
    status: row.status as Payment['status'],
    gateway: row.gateway as Payment['gateway'],
    gatewayRef: row.gateway_ref,
    gatewayResponse: row.gateway_response ? JSON.parse(row.gateway_response) : null,
    paidAt: row.paid_at ? row.paid_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  }
}

function rowToTenantPaymentSetting(row: TenantPaymentSettingRow): TenantPaymentSetting {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    gateway: row.gateway as TenantPaymentSetting['gateway'],
    publicKey: row.public_key,
    secretKey: row.secret_key,
    isActive: row.is_active,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

function rowToPaymentProof(row: PaymentProofRow): PaymentProof {
  return {
    id: row.id,
    paymentId: row.payment_id,
    fileUrl: row.file_url,
    fileType: row.file_type,
    uploadedAt: row.uploaded_at.toISOString(),
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
        tenant_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        fee_assignment_id TEXT NOT NULL,
        fee_structure_id TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        payment_method TEXT NOT NULL,
        reference_number TEXT NOT NULL,
        receipt_number TEXT NOT NULL UNIQUE,
        payment_date DATE NOT NULL,
        payment_time TIME NOT NULL,
        recorded_by TEXT,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        gateway TEXT,
        gateway_ref TEXT,
        gateway_response TEXT,
        paid_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_fee_assignment_id ON payments(fee_assignment_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_gateway_ref ON payments(gateway_ref)`

    await sql`
      CREATE TABLE IF NOT EXISTS tenant_payment_settings (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        gateway TEXT NOT NULL,
        public_key TEXT NOT NULL,
        secret_key TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT false,
        metadata TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_tenant_payment_settings_tenant_id ON tenant_payment_settings(tenant_id)`
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_payment_settings_tenant_gateway ON tenant_payment_settings(tenant_id, gateway)`

    await sql`
      CREATE TABLE IF NOT EXISTS payment_proofs (
        id TEXT PRIMARY KEY,
        payment_id TEXT NOT NULL REFERENCES payments(id),
        file_url TEXT NOT NULL,
        file_type TEXT NOT NULL,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_payment_proofs_payment_id ON payment_proofs(payment_id)`

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
  tenantId: string,
  studentId: string,
  feeAssignmentId: string,
  feeStructureId: string,
  amount: number,
  paymentMethod: string,
  referenceNumber: string,
  receiptNumber: string,
  paymentDate: string,
  paymentTime: string,
  recordedBy: string | null,
  notes?: string,
  gateway?: string | null,
  gatewayRef?: string | null,
  gatewayResponse?: Record<string, unknown> | null
): Promise<Payment> {
  await ensurePaymentTables()
  const id = uuidv4()

  const result = await sql<PaymentRow>`
    INSERT INTO payments
      (id, tenant_id, student_id, fee_assignment_id, fee_structure_id, amount, payment_method, reference_number, receipt_number, payment_date, payment_time, recorded_by, notes, status, gateway, gateway_ref, gateway_response)
    VALUES
      (${id}, ${tenantId}, ${studentId}, ${feeAssignmentId}, ${feeStructureId}, ${amount}, ${paymentMethod}, ${referenceNumber}, ${receiptNumber}, ${paymentDate}, ${paymentTime}, ${recordedBy}, ${notes || null}, 'pending', ${gateway || null}, ${gatewayRef || null}, ${gatewayResponse ? JSON.stringify(gatewayResponse) : null})
    RETURNING *
  `

  return rowToPayment(result.rows[0])
}

// ─── Tenant Payment Settings ───────────────────────────────────────────────

export async function getTenantPaymentSettings(tenantId: string): Promise<TenantPaymentSetting[]> {
  await ensurePaymentTables()
  const result = await sql<TenantPaymentSettingRow>`
    SELECT * FROM tenant_payment_settings WHERE tenant_id = ${tenantId} ORDER BY gateway
  `
  return result.rows.map(rowToTenantPaymentSetting)
}

export async function getActivePaymentGateway(tenantId: string): Promise<TenantPaymentSetting | null> {
  await ensurePaymentTables()
  const result = await sql<TenantPaymentSettingRow>`
    SELECT * FROM tenant_payment_settings WHERE tenant_id = ${tenantId} AND is_active = true LIMIT 1
  `
  if (result.rows.length === 0) return null
  return rowToTenantPaymentSetting(result.rows[0])
}

export async function upsertTenantPaymentSetting(
  tenantId: string,
  gateway: 'paystack' | 'flutterwave' | 'moniepoint',
  publicKey: string,
  secretKey: string,
  isActive: boolean,
  metadata?: Record<string, unknown>
): Promise<TenantPaymentSetting> {
  await ensurePaymentTables()
  const id = uuidv4()

  const result = await sql<TenantPaymentSettingRow>`
    INSERT INTO tenant_payment_settings
      (id, tenant_id, gateway, public_key, secret_key, is_active, metadata, updated_at)
    VALUES
      (${id}, ${tenantId}, ${gateway}, ${publicKey}, ${secretKey}, ${isActive}, ${metadata ? JSON.stringify(metadata) : null}, NOW())
    ON CONFLICT (tenant_id, gateway)
    DO UPDATE SET
      public_key = EXCLUDED.public_key,
      secret_key = EXCLUDED.secret_key,
      is_active = EXCLUDED.is_active,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
    RETURNING *
  `

  return rowToTenantPaymentSetting(result.rows[0])
}

// ─── Payment Initiate (for online gateways) ─────────────────────────────────

export async function initiatePayment(
  tenantId: string,
  studentId: string,
  feeAssignmentId: string,
  feeStructureId: string,
  amount: number,
  gateway: string,
  gatewayRef: string
): Promise<Payment> {
  await ensurePaymentTables()
  const id = uuidv4()
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const timeStr = now.toTimeString().split(' ')[0].substring(0, 5)
  const receiptNumber = `RCP-${Date.now()}`

  const result = await sql<PaymentRow>`
    INSERT INTO payments
      (id, tenant_id, student_id, fee_assignment_id, fee_structure_id, amount, payment_method, reference_number, receipt_number, payment_date, payment_time, status, gateway, gateway_ref)
    VALUES
      (${id}, ${tenantId}, ${studentId}, ${feeAssignmentId}, ${feeStructureId}, ${amount}, 'online', ${gatewayRef}, ${receiptNumber}, ${dateStr}, ${timeStr}, 'pending', ${gateway}, ${gatewayRef})
    RETURNING *
  `

  return rowToPayment(result.rows[0])
}

// ─── Payment Verify (webhook callback) ────────────────────────────────────

export async function verifyPayment(gatewayRef: string, gatewayResponse?: Record<string, unknown>): Promise<Payment | null> {
  await ensurePaymentTables()

  const result = await sql<PaymentRow>`
    UPDATE payments
    SET status = 'success',
        paid_at = NOW(),
        gateway_response = ${gatewayResponse ? JSON.stringify(gatewayResponse) : null}
    WHERE gateway_ref = ${gatewayRef} AND status = 'pending'
    RETURNING *
  `

  if (result.rows.length === 0) return null

  // Update fee assignment balance
  const payment = rowToPayment(result.rows[0])
  await sql`
    UPDATE fee_assignments
    SET
      total_paid = total_paid + ${payment.amount},
      total_balance = total_balance - ${payment.amount},
      status = CASE
        WHEN total_balance - ${payment.amount} <= 0 THEN 'paid'
        ELSE 'partial'
      END,
      updated_at = NOW()
    WHERE id = ${payment.feeAssignmentId}
  `

  return payment
}

// ─── Manual Payment Upload ─────────────────────────────────────────────────

export async function createManualPayment(
  tenantId: string,
  studentId: string,
  feeAssignmentId: string,
  feeStructureId: string,
  amount: number,
  paymentMethod: string,
  notes?: string
): Promise<Payment> {
  await ensurePaymentTables()
  const id = uuidv4()
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const timeStr = now.toTimeString().split(' ')[0].substring(0, 5)
  const receiptNumber = `MAN-${Date.now()}`

  const result = await sql<PaymentRow>`
    INSERT INTO payments
      (id, tenant_id, student_id, fee_assignment_id, fee_structure_id, amount, payment_method, reference_number, receipt_number, payment_date, payment_time, status, gateway, notes)
    VALUES
      (${id}, ${tenantId}, ${studentId}, ${feeAssignmentId}, ${feeStructureId}, ${amount}, ${paymentMethod}, ${receiptNumber}, ${receiptNumber}, ${dateStr}, ${timeStr}, 'pending', 'manual', ${notes || null})
    RETURNING *
  `

  return rowToPayment(result.rows[0])
}

export async function addPaymentProof(paymentId: string, fileUrl: string, fileType: string): Promise<PaymentProof> {
  await ensurePaymentTables()
  const id = uuidv4()

  const result = await sql<PaymentProofRow>`
    INSERT INTO payment_proofs (id, payment_id, file_url, file_type)
    VALUES (${id}, ${paymentId}, ${fileUrl}, ${fileType})
    RETURNING *
  `

  return rowToPaymentProof(result.rows[0])
}

export async function getPaymentProofs(paymentId: string): Promise<PaymentProof[]> {
  await ensurePaymentTables()
  const result = await sql<PaymentProofRow>`
    SELECT * FROM payment_proofs WHERE payment_id = ${paymentId} ORDER BY uploaded_at DESC
  `
  return result.rows.map(rowToPaymentProof)
}

// ─── Admin Confirm/Reject ─────────────────────────────────────────────────

export async function confirmPayment(paymentId: string, confirmedBy: string): Promise<Payment | null> {
  await ensurePaymentTables()

  const result = await sql<PaymentRow>`
    UPDATE payments
    SET status = 'success',
        recorded_by = ${confirmedBy},
        paid_at = NOW()
    WHERE id = ${paymentId} AND status = 'pending'
    RETURNING *
  `

  if (result.rows.length === 0) return null

  const payment = rowToPayment(result.rows[0])

  // Update fee assignment balance
  await sql`
    UPDATE fee_assignments
    SET
      total_paid = total_paid + ${payment.amount},
      total_balance = total_balance - ${payment.amount},
      status = CASE
        WHEN total_balance - ${payment.amount} <= 0 THEN 'paid'
        ELSE 'partial'
      END,
      updated_at = NOW()
    WHERE id = ${payment.feeAssignmentId}
  `

  return payment
}

export async function rejectPayment(paymentId: string, reason?: string): Promise<Payment | null> {
  await ensurePaymentTables()

  const result = await sql<PaymentRow>`
    UPDATE payments
    SET status = 'failed',
        notes = COALESCE(notes, '') || ' | Rejected: ' || ${reason || 'No reason'}
    WHERE id = ${paymentId} AND status = 'pending'
    RETURNING *
  `

  if (result.rows.length === 0) return null
  return rowToPayment(result.rows[0])
}

// ─── Pending Payments Queue ─────────────────────────────────────────────────

export async function getPendingPayments(tenantId?: string): Promise<Payment[]> {
  await ensurePaymentTables()

  let result
  if (tenantId) {
    result = await sql<PaymentRow>`
      SELECT * FROM payments WHERE tenant_id = ${tenantId} AND status = 'pending' ORDER BY created_at DESC
    `
  } else {
    result = await sql<PaymentRow>`
      SELECT * FROM payments WHERE status = 'pending' ORDER BY created_at DESC
    `
  }

  return result.rows.map(rowToPayment)
}

export async function getPayments(
  tenantId: string,
  feeAssignmentId?: string,
  paymentDate?: string,
  status?: string,
  gateway?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<Payment[]> {
  await ensurePaymentTables()

  const conditions: string[] = ['tenant_id = $1']
  const values: (string | number | undefined)[] = [tenantId]
  let idx = 2

  if (feeAssignmentId) { conditions.push(`fee_assignment_id = $${idx++}`); values.push(feeAssignmentId) }
  if (paymentDate) { conditions.push(`payment_date = $${idx++}`); values.push(paymentDate) }
  if (status) { conditions.push(`status = $${idx++}`); values.push(status) }
  if (gateway) { conditions.push(`gateway = $${idx++}`); values.push(gateway) }
  if (dateFrom) { conditions.push(`payment_date >= $${idx++}`); values.push(dateFrom) }
  if (dateTo) { conditions.push(`payment_date <= $${idx++}`); values.push(dateTo) }

  const query = `SELECT * FROM payments WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`
  const result = await sql.unsafe(query, values as any)
  return (result.rows || []).map(rowToPayment)
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
