import { sql } from '@vercel/postgres'
import { poolQuery, poolQueryOne } from '../../_lib/pg-pool.js'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PayrollSchedule {
  id: string
  tenantId: string
  name: string
  frequency: 'monthly' | 'bi_weekly' | 'weekly' | 'custom'
  dayOfMonth: number
  dayOfWeek: number
  autoGenerate: boolean
  autoDisburse: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PayrollRule {
  id: string
  tenantId: string
  staffId: string
  staffName: string
  ruleType: 'earning' | 'deduction'
  category: string
  label: string
  amount: number
  calculationMethod: 'fixed' | 'percentage'
  percentageOf: 'basic_salary' | 'gross'
  isRecurring: boolean
  isActive: boolean
  effectiveFrom: string | null
  effectiveTo: string | null
  createdAt: string
  updatedAt: string
}

export interface PayrollRun {
  id: string
  tenantId: string
  scheduleId: string | null
  name: string
  month: string
  year: number
  totalStaff: number
  totalGross: number
  totalDeductions: number
  totalNet: number
  status: 'draft' | 'pending_approval' | 'approved' | 'disbursing' | 'paid' | 'failed'
  runDate: string
  approvedBy: string | null
  approvedAt: string | null
  disbursedAt: string | null
  failureReason: string | null
  createdAt: string
  updatedAt: string
}

export interface PayrollRunItem {
  id: string
  runId: string
  tenantId: string
  staffId: string
  staffName: string
  basicSalary: number
  earnings: EarningDeduction[]
  deductions: EarningDeduction[]
  grossPay: number
  totalDeductions: number
  netPay: number
  payeTax: number
  pensionEmployee: number
  pensionEmployer: number
  status: 'pending' | 'paid' | 'failed'
  paymentReference: string | null
  paymentDate: string | null
  failureReason: string | null
  payslipGenerated: boolean
  createdAt: string
}

interface EarningDeduction {
  category: string
  label: string
  amount: number
}

export interface PayrollApproval {
  id: string
  runId: string
  tenantId: string
  approverRole: string
  approverId: string | null
  approverName: string | null
  approvalLevel: number
  status: 'pending' | 'approved' | 'rejected'
  comment: string | null
  approvedAt: string | null
  createdAt: string
}

export interface Payslip {
  id: string
  tenantId: string
  runId: string
  staffId: string
  staffName: string
  month: string
  year: number
  basicSalary: number
  earnings: EarningDeduction[]
  deductions: EarningDeduction[]
  grossPay: number
  totalDeductions: number
  netPay: number
  payeTax: number
  pensionEmployee: number
  pensionEmployer: number
  pdfUrl: string | null
  emailed: boolean
  smsSent: boolean
  createdAt: string
}

export interface SalaryAdvance {
  id: string
  tenantId: string
  staffId: string
  staffName: string
  amount: number
  type: 'advance' | 'loan'
  reason: string | null
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'cleared'
  monthlyDeduction: number
  totalRepaid: number
  installments: number
  installmentsPaid: number
  approvedBy: string | null
  approvedAt: string | null
  requestedAt: string
  createdAt: string
  updatedAt: string
}

export interface TaxConfig {
  id: string
  tenantId: string
  taxYear: number
  cratumAllowance: number
  cratumPercentage: number
  pensionRateEmployee: number
  pensionRateEmployer: number
  nhfRate: number
  nhisRate: number
  brackets: { min: number; max: number | null; rate: number }[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ── Table Initialization ─────────────────────────────────────────────────────

export async function ensurePayrollTables() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS payroll_schedules (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
        name VARCHAR(255) NOT NULL,
        frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
        day_of_month INT DEFAULT 25,
        day_of_week INT DEFAULT 5,
        auto_generate BOOLEAN DEFAULT false,
        auto_disburse BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS payroll_rules (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
        staff_id TEXT NOT NULL,
        staff_name VARCHAR(255),
        rule_type VARCHAR(20) NOT NULL DEFAULT 'earning',
        category VARCHAR(100) NOT NULL,
        label VARCHAR(255) NOT NULL,
        amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        calculation_method VARCHAR(20) DEFAULT 'fixed',
        percentage_of VARCHAR(50) DEFAULT 'basic_salary',
        is_recurring BOOLEAN DEFAULT true,
        is_active BOOLEAN DEFAULT true,
        effective_from DATE,
        effective_to DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS payroll_runs (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
        schedule_id TEXT,
        name VARCHAR(255) NOT NULL,
        month VARCHAR(20) NOT NULL,
        year INT NOT NULL,
        total_staff INT DEFAULT 0,
        total_gross NUMERIC(14,2) DEFAULT 0,
        total_deductions NUMERIC(14,2) DEFAULT 0,
        total_net NUMERIC(14,2) DEFAULT 0,
        status VARCHAR(30) DEFAULT 'draft',
        run_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        approved_by VARCHAR(255),
        approved_at TIMESTAMP WITH TIME ZONE,
        disbursed_at TIMESTAMP WITH TIME ZONE,
        failure_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS payroll_run_items (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
        staff_id TEXT NOT NULL,
        staff_name VARCHAR(255),
        basic_salary NUMERIC(12,2) DEFAULT 0,
        earnings JSONB DEFAULT '[]',
        deductions JSONB DEFAULT '[]',
        gross_pay NUMERIC(12,2) DEFAULT 0,
        total_deductions NUMERIC(12,2) DEFAULT 0,
        net_pay NUMERIC(12,2) DEFAULT 0,
        paye_tax NUMERIC(12,2) DEFAULT 0,
        pension_employee NUMERIC(12,2) DEFAULT 0,
        pension_employer NUMERIC(12,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending',
        payment_reference VARCHAR(255),
        payment_date TIMESTAMP WITH TIME ZONE,
        failure_reason TEXT,
        payslip_generated BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS payroll_approvals (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
        approver_role VARCHAR(50) NOT NULL,
        approver_id VARCHAR(255),
        approver_name VARCHAR(255),
        approval_level INT DEFAULT 1,
        status VARCHAR(20) DEFAULT 'pending',
        comment TEXT,
        approved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS payslips (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
        run_id TEXT NOT NULL,
        staff_id TEXT NOT NULL,
        staff_name VARCHAR(255),
        month VARCHAR(20) NOT NULL,
        year INT NOT NULL,
        basic_salary NUMERIC(12,2) DEFAULT 0,
        earnings JSONB DEFAULT '[]',
        deductions JSONB DEFAULT '[]',
        gross_pay NUMERIC(12,2) DEFAULT 0,
        total_deductions NUMERIC(12,2) DEFAULT 0,
        net_pay NUMERIC(12,2) DEFAULT 0,
        paye_tax NUMERIC(12,2) DEFAULT 0,
        pension_employee NUMERIC(12,2) DEFAULT 0,
        pension_employer NUMERIC(12,2) DEFAULT 0,
        pdf_url TEXT,
        emailed BOOLEAN DEFAULT false,
        sms_sent BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS salary_advances (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
        staff_id TEXT NOT NULL,
        staff_name VARCHAR(255),
        amount NUMERIC(12,2) NOT NULL,
        type VARCHAR(20) DEFAULT 'advance',
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        monthly_deduction NUMERIC(12,2) DEFAULT 0,
        total_repaid NUMERIC(12,2) DEFAULT 0,
        installments INT DEFAULT 1,
        installments_paid INT DEFAULT 0,
        approved_by VARCHAR(255),
        approved_at TIMESTAMP WITH TIME ZONE,
        requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS tax_config (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
        tax_year INT NOT NULL,
        cratum_allowance NUMERIC(12,2) DEFAULT 200000,
        cratum_percentage NUMERIC(5,2) DEFAULT 1.0,
        pension_rate_employee NUMERIC(5,2) DEFAULT 8.0,
        pension_rate_employer NUMERIC(5,2) DEFAULT 10.0,
        nhf_rate NUMERIC(5,2) DEFAULT 2.5,
        nhis_rate NUMERIC(5,2) DEFAULT 1.5,
        brackets JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    // Insert default tax config if none exists
    await sql`
      INSERT INTO tax_config (id, tenant_id, tax_year, brackets)
      SELECT 'tax_default_2025', 'default-tenant', 2025,
        '[{"min":0,"max":300000,"rate":7},{"min":300000,"max":600000,"rate":11},{"min":600000,"max":1100000,"rate":15},{"min":1100000,"max":1600000,"rate":19},{"min":1600000,"max":3200000,"rate":21},{"min":3200000,"max":null,"rate":24}]'::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM tax_config WHERE tenant_id = 'default-tenant' LIMIT 1)
    `
  } catch (error) {
    console.error('Error ensuring payroll tables:', error)
  }
}

// ── Tax Engine ───────────────────────────────────────────────────────────────

export async function getTaxConfig(tenantId: string): Promise<TaxConfig | null> {
  await ensurePayrollTables()
  try {
    const result = await sql`
      SELECT * FROM tax_config WHERE tenant_id = ${tenantId} AND is_active = true ORDER BY tax_year DESC LIMIT 1
    `
    if (result.rows.length === 0) {
      // Return default config
      const def = await sql`
        SELECT * FROM tax_config WHERE tenant_id = 'default-tenant' AND is_active = true ORDER BY tax_year DESC LIMIT 1
      `
      if (def.rows.length === 0) return null
      return rowToTaxConfig(def.rows[0])
    }
    return rowToTaxConfig(result.rows[0])
  } catch (error) {
    console.error('Error fetching tax config:', error)
    return null
  }
}

export function calculatePAYE(annualTaxableIncome: number, brackets: { min: number; max: number | null; rate: number }[]): number {
  let tax = 0
  for (const bracket of brackets) {
    if (annualTaxableIncome <= bracket.min) break
    const upper = bracket.max ? Math.min(annualTaxableIncome, bracket.max) : annualTaxableIncome
    const taxableInBracket = upper - bracket.min
    if (taxableInBracket > 0) {
      tax += taxableInBracket * (bracket.rate / 100)
    }
  }
  return tax
}

export function computePayroll(
  basicSalary: number,
  earnings: EarningDeduction[],
  deductions: EarningDeduction[],
  taxConfig: TaxConfig | null
): {
  grossPay: number
  payeTax: number
  pensionEmployee: number
  pensionEmployer: number
  nhf: number
  nhis: number
  totalDeductions: number
  netPay: number
  allDeductions: EarningDeduction[]
} {
  const totalEarnings = earnings.reduce((s, e) => s + e.amount, 0)
  const grossPay = basicSalary + totalEarnings

  // Pension: 8% of basic salary (employee), 10% (employer)
  const pensionEmployee = taxConfig
    ? (basicSalary * taxConfig.pensionRateEmployee) / 100
    : (basicSalary * 8) / 100
  const pensionEmployer = taxConfig
    ? (basicSalary * taxConfig.pensionRateEmployer) / 100
    : (basicSalary * 10) / 100

  // NHF: 2.5% of gross
  const nhf = taxConfig ? (grossPay * taxConfig.nhfRate) / 100 : (grossPay * 2.5) / 100

  // NHIS: 1.5% of gross
  const nhis = taxConfig ? (grossPay * taxConfig.nhisRate) / 100 : (grossPay * 1.5) / 100

  // Cratum allowance (consolidated relief allowance)
  const cratumFlat = taxConfig?.cratumAllowance || 200000
  const cratumPct = taxConfig?.cratumPercentage || 1.0
  const cratum = Math.max(cratumFlat, (grossPay * 12 * cratumPct) / 100)

  // Annual taxable income
  const annualPension = pensionEmployee * 12
  const annualNHF = nhf * 12
  const annualNHIS = nhis * 12
  const annualCratum = cratum
  const annualGross = grossPay * 12
  const annualTaxable = Math.max(0, annualGross - annualPension - annualNHF - annualNHIS - annualCratum)

  // PAYE (annualized then divided by 12)
  const annualPaye = taxConfig
    ? calculatePAYE(annualTaxable, taxConfig.brackets)
    : calculatePAYE(annualTaxable, [
        { min: 0, max: 300000, rate: 7 },
        { min: 300000, max: 600000, rate: 11 },
        { min: 600000, max: 1100000, rate: 15 },
        { min: 1100000, max: 1600000, rate: 19 },
        { min: 1600000, max: 3200000, rate: 21 },
        { min: 3200000, max: null, rate: 24 },
      ])
  const payeTax = annualPaye / 12

  // Build statutory deductions list
  const statutoryDeductions: EarningDeduction[] = [
    { category: 'pension_employee', label: 'Pension (Employee 8%)', amount: pensionEmployee },
    { category: 'paye_tax', label: 'PAYE Tax', amount: payeTax },
    { category: 'nhf', label: 'National Housing Fund', amount: nhf },
    { category: 'nhis', label: 'Health Insurance (NHIS)', amount: nhis },
  ]

  const allDeductions = [...statutoryDeductions, ...deductions]
  const totalDeductions = allDeductions.reduce((s, d) => s + d.amount, 0)
  const netPay = grossPay - totalDeductions

  return {
    grossPay,
    payeTax,
    pensionEmployee,
    pensionEmployer,
    nhf,
    nhis,
    totalDeductions,
    netPay,
    allDeductions,
  }
}

// ── Schedules ────────────────────────────────────────────────────────────────

export async function fetchSchedules(tenantId: string): Promise<PayrollSchedule[]> {
  await ensurePayrollTables()
  try {
    const result = await sql`
      SELECT * FROM payroll_schedules WHERE tenant_id = ${tenantId} ORDER BY created_at DESC
    `
    return result.rows.map(rowToSchedule)
  } catch (error) {
    console.error('Error fetching schedules:', error)
    return []
  }
}

export async function createSchedule(data: Partial<PayrollSchedule> & { name: string; frequency: string }, tenantId: string): Promise<PayrollSchedule> {
  await ensurePayrollTables()
  const id = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const result = await sql`
    INSERT INTO payroll_schedules (id, tenant_id, name, frequency, day_of_month, day_of_week, auto_generate, auto_disburse, is_active)
    VALUES (${id}, ${tenantId}, ${data.name}, ${data.frequency || 'monthly'}, ${data.dayOfMonth || 25}, ${data.dayOfWeek || 5},
      ${data.autoGenerate || false}, ${data.autoDisburse || false}, ${data.isActive !== false})
    RETURNING *
  `
  return rowToSchedule(result.rows[0])
}

export async function updateSchedule(id: string, data: Partial<PayrollSchedule>, tenantId: string): Promise<PayrollSchedule | null> {
  try {
    const result = await sql`
      UPDATE payroll_schedules SET
        name = COALESCE(${data.name || null}, name),
        frequency = COALESCE(${data.frequency || null}, frequency),
        day_of_month = COALESCE(${data.dayOfMonth ?? null}, day_of_month),
        day_of_week = COALESCE(${data.dayOfWeek ?? null}, day_of_week),
        auto_generate = COALESCE(${data.autoGenerate ?? null}, auto_generate),
        auto_disburse = COALESCE(${data.autoDisburse ?? null}, auto_disburse),
        is_active = COALESCE(${data.isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `
    return result.rows[0] ? rowToSchedule(result.rows[0]) : null
  } catch (error) {
    console.error('Error updating schedule:', error)
    return null
  }
}

export async function deleteSchedule(id: string, tenantId: string): Promise<boolean> {
  try {
    await sql`DELETE FROM payroll_schedules WHERE id = ${id} AND tenant_id = ${tenantId}`
    return true
  } catch (error) {
    console.error('Error deleting schedule:', error)
    return false
  }
}

// ── Rules ────────────────────────────────────────────────────────────────────

export async function fetchRules(tenantId: string, staffId?: string): Promise<PayrollRule[]> {
  await ensurePayrollTables()
  try {
    if (staffId) {
      const result = await sql`
        SELECT * FROM payroll_rules WHERE tenant_id = ${tenantId} AND staff_id = ${staffId} AND is_active = true ORDER BY rule_type, category
      `
      return result.rows.map(rowToRule)
    }
    const result = await sql`
      SELECT * FROM payroll_rules WHERE tenant_id = ${tenantId} AND is_active = true ORDER BY staff_name, rule_type, category
    `
    return result.rows.map(rowToRule)
  } catch (error) {
    console.error('Error fetching rules:', error)
    return []
  }
}

export async function createRule(data: Partial<PayrollRule> & { staffId: string; ruleType: string; category: string; label: string; amount: number }, tenantId: string): Promise<PayrollRule> {
  await ensurePayrollTables()
  const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const result = await sql`
    INSERT INTO payroll_rules (id, tenant_id, staff_id, staff_name, rule_type, category, label, amount, calculation_method, percentage_of, is_recurring, is_active, effective_from, effective_to)
    VALUES (${id}, ${tenantId}, ${data.staffId}, ${data.staffName || null}, ${data.ruleType}, ${data.category}, ${data.label},
      ${data.amount}, ${data.calculationMethod || 'fixed'}, ${data.percentageOf || 'basic_salary'},
      ${data.isRecurring !== false}, ${data.isActive !== false}, ${data.effectiveFrom || null}, ${data.effectiveTo || null})
    RETURNING *
  `
  return rowToRule(result.rows[0])
}

export async function deleteRule(id: string, tenantId: string): Promise<boolean> {
  try {
    await sql`DELETE FROM payroll_rules WHERE id = ${id} AND tenant_id = ${tenantId}`
    return true
  } catch (error) {
    console.error('Error deleting rule:', error)
    return false
  }
}

// ── Payroll Runs ─────────────────────────────────────────────────────────────

export async function fetchRuns(tenantId: string, status?: string): Promise<PayrollRun[]> {
  await ensurePayrollTables()
  try {
    if (status) {
      const result = await sql`
        SELECT * FROM payroll_runs WHERE tenant_id = ${tenantId} AND status = ${status} ORDER BY created_at DESC
      `
      return result.rows.map(rowToRun)
    }
    const result = await sql`
      SELECT * FROM payroll_runs WHERE tenant_id = ${tenantId} ORDER BY created_at DESC
    `
    return result.rows.map(rowToRun)
  } catch (error) {
    console.error('Error fetching runs:', error)
    return []
  }
}

export async function fetchRun(id: string, tenantId: string): Promise<PayrollRun | null> {
  try {
    const result = await sql`SELECT * FROM payroll_runs WHERE id = ${id} AND tenant_id = ${tenantId}`
    return result.rows[0] ? rowToRun(result.rows[0]) : null
  } catch (error) {
    console.error('Error fetching run:', error)
    return null
  }
}

export async function fetchRunItems(runId: string, tenantId: string): Promise<PayrollRunItem[]> {
  try {
    const result = await sql`
      SELECT * FROM payroll_run_items WHERE run_id = ${runId} AND tenant_id = ${tenantId} ORDER BY staff_name
    `
    return result.rows.map(rowToRunItem)
  } catch (error) {
    console.error('Error fetching run items:', error)
    return []
  }
}

export async function createPayrollRun(
  month: string,
  year: number,
  scheduleId: string | null,
  tenantId: string
): Promise<PayrollRun> {
  await ensurePayrollTables()

  // Fetch all active staff with salaries
  const staffResult = await sql`
    SELECT id, name, salary FROM staff WHERE tenant_id = ${tenantId} AND status = 'active' AND salary IS NOT NULL AND salary > 0
  `
  const staffRows = staffResult.rows
  if (staffRows.length === 0) {
    throw new Error('No active staff with salaries found')
  }

  // Fetch tax config
  const taxConfig = await getTaxConfig(tenantId)

  // Fetch all active rules for this tenant
  const rulesResult = await sql`
    SELECT * FROM payroll_rules WHERE tenant_id = ${tenantId} AND is_active = true
  `
  const allRules = rulesResult.rows.map(rowToRule)

  // Fetch active salary advances with remaining installments
  const advancesResult = await sql`
    SELECT * FROM salary_advances WHERE tenant_id = ${tenantId} AND status = 'active' AND installments_paid < installments
  `
  const activeAdvances = advancesResult.rows.map(rowToAdvance)

  // Create the run
  const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const runName = `Payroll — ${month} ${year}`

  let totalGross = 0
  let totalDeductions = 0
  let totalNet = 0

  // Process each staff member
  for (const staff of staffRows) {
    const basicSalary = Number(staff.salary) || 0
    const staffId = staff.id

    // Apply rules for this staff
    const staffRules = allRules.filter(r => r.staffId === staffId)
    const earnings: EarningDeduction[] = []
    const manualDeductions: EarningDeduction[] = []

    for (const rule of staffRules) {
      const amount = rule.calculationMethod === 'percentage'
        ? (rule.percentageOf === 'gross' ? basicSalary * 1.5 : basicSalary) * (rule.amount / 100)
        : rule.amount

      if (rule.ruleType === 'earning') {
        earnings.push({ category: rule.category, label: rule.label, amount })
      } else {
        manualDeductions.push({ category: rule.category, label: rule.label, amount })
      }
    }

    // Apply salary advance deductions
    for (const advance of activeAdvances.filter(a => a.staffId === staffId)) {
      manualDeductions.push({
        category: 'salary_advance',
        label: `Advance Repayment (${advance.installmentsPaid + 1}/${advance.installments})`,
        amount: advance.monthlyDeduction,
      })
    }

    // Compute payroll with tax engine
    const computed = computePayroll(basicSalary, earnings, manualDeductions, taxConfig)

    const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await sql`
      INSERT INTO payroll_run_items (id, run_id, tenant_id, staff_id, staff_name, basic_salary, earnings, deductions, gross_pay, total_deductions, net_pay, paye_tax, pension_employee, pension_employer, status, payslip_generated)
      VALUES (${itemId}, ${runId}, ${tenantId}, ${staffId}, ${staff.name}, ${basicSalary},
        ${JSON.stringify(earnings)}::jsonb, ${JSON.stringify(computed.allDeductions)}::jsonb,
        ${computed.grossPay}, ${computed.totalDeductions}, ${computed.netPay},
        ${computed.payeTax}, ${computed.pensionEmployee}, ${computed.pensionEmployer},
        'pending', false)
    `

    totalGross += computed.grossPay
    totalDeductions += computed.totalDeductions
    totalNet += computed.netPay
  }

  // Create the run record
  const result = await sql`
    INSERT INTO payroll_runs (id, tenant_id, schedule_id, name, month, year, total_staff, total_gross, total_deductions, total_net, status, run_date)
    VALUES (${runId}, ${tenantId}, ${scheduleId}, ${runName}, ${month}, ${year}, ${staffRows.length}, ${totalGross}, ${totalDeductions}, ${totalNet}, 'draft', NOW())
    RETURNING *
  `

  // Create default approval chain
  const approvalRoles = ['hr_admin', 'principal', 'bursar']
  for (let i = 0; i < approvalRoles.length; i++) {
    const apprId = `appr_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`
    await sql`
      INSERT INTO payroll_approvals (id, run_id, tenant_id, approver_role, approval_level, status)
      VALUES (${apprId}, ${runId}, ${tenantId}, ${approvalRoles[i]}, ${i + 1}, 'pending')
    `
  }

  return rowToRun(result.rows[0])
}

export async function submitRunForApproval(runId: string, tenantId: string): Promise<PayrollRun | null> {
  try {
    const result = await sql`
      UPDATE payroll_runs SET status = 'pending_approval', updated_at = NOW() WHERE id = ${runId} AND tenant_id = ${tenantId} AND status = 'draft' RETURNING *
    `
    return result.rows[0] ? rowToRun(result.rows[0]) : null
  } catch (error) {
    console.error('Error submitting run for approval:', error)
    return null
  }
}

export async function approveRun(
  runId: string,
  approverId: string,
  approverName: string,
  approverRole: string,
  comment: string | null,
  tenantId: string
): Promise<{ run: PayrollRun | null; approval: PayrollApproval | null; allApprovals: PayrollApproval[] }> {
  try {
    // Find the pending approval for this role
    const apprResult = await sql`
      SELECT * FROM payroll_approvals WHERE run_id = ${runId} AND tenant_id = ${tenantId} AND approver_role = ${approverRole} AND status = 'pending' ORDER BY approval_level LIMIT 1
    `
    if (apprResult.rows.length === 0) {
      return { run: null, approval: null, allApprovals: [] }
    }

    const apprId = apprResult.rows[0].id
    const updatedAppr = await sql`
      UPDATE payroll_approvals SET status = 'approved', approver_id = ${approverId}, approver_name = ${approverName}, comment = ${comment}, approved_at = NOW()
      WHERE id = ${apprId} RETURNING *
    `

    // Check if all approvals are done
    const allApprResult = await sql`
      SELECT * FROM payroll_approvals WHERE run_id = ${runId} AND tenant_id = ${tenantId} ORDER BY approval_level
    `
    const allApprovals = allApprResult.rows.map(rowToApproval)
    const allApproved = allApprovals.every(a => a.status === 'approved')

    if (allApproved) {
      const runResult = await sql`
        UPDATE payroll_runs SET status = 'approved', approved_by = ${approverName}, approved_at = NOW(), updated_at = NOW()
        WHERE id = ${runId} AND tenant_id = ${tenantId} RETURNING *
      `
      return { run: runResult.rows[0] ? rowToRun(runResult.rows[0]) : null, approval: rowToApproval(updatedAppr.rows[0]), allApprovals }
    }

    const runResult = await sql`SELECT * FROM payroll_runs WHERE id = ${runId} AND tenant_id = ${tenantId}`
    return { run: runResult.rows[0] ? rowToRun(runResult.rows[0]) : null, approval: rowToApproval(updatedAppr.rows[0]), allApprovals }
  } catch (error) {
    console.error('Error approving run:', error)
    return { run: null, approval: null, allApprovals: [] }
  }
}

export async function rejectRun(
  runId: string,
  approverId: string,
  approverName: string,
  approverRole: string,
  comment: string,
  tenantId: string
): Promise<{ run: PayrollRun | null; approval: PayrollApproval | null }> {
  try {
    const apprResult = await sql`
      UPDATE payroll_approvals SET status = 'rejected', approver_id = ${approverId}, approver_name = ${approverName}, comment = ${comment}, approved_at = NOW()
      WHERE run_id = ${runId} AND tenant_id = ${tenantId} AND approver_role = ${approverRole} AND status = 'pending' RETURNING *
    `
    if (apprResult.rows.length === 0) return { run: null, approval: null }

    const runResult = await sql`
      UPDATE payroll_runs SET status = 'draft', failure_reason = ${'Rejected by ' + approverRole + ': ' + comment}, updated_at = NOW()
      WHERE id = ${runId} AND tenant_id = ${tenantId} RETURNING *
    `
    return { run: runResult.rows[0] ? rowToRun(runResult.rows[0]) : null, approval: rowToApproval(apprResult.rows[0]) }
  } catch (error) {
    console.error('Error rejecting run:', error)
    return { run: null, approval: null }
  }
}

export async function fetchApprovals(runId: string, tenantId: string): Promise<PayrollApproval[]> {
  try {
    const result = await sql`
      SELECT * FROM payroll_approvals WHERE run_id = ${runId} AND tenant_id = ${tenantId} ORDER BY approval_level
    `
    return result.rows.map(rowToApproval)
  } catch (error) {
    console.error('Error fetching approvals:', error)
    return []
  }
}

// ── Disbursement ─────────────────────────────────────────────────────────────

export async function disburseRun(runId: string, tenantId: string): Promise<{ success: boolean; run: PayrollRun | null; error?: string }> {
  try {
    // Update run status to disbursing
    await sql`UPDATE payroll_runs SET status = 'disbursing', updated_at = NOW() WHERE id = ${runId} AND tenant_id = ${tenantId}`

    // Fetch run items
    const items = await fetchRunItems(runId, tenantId)
    if (items.length === 0) {
      return { success: false, run: null, error: 'No items in this run' }
    }

    // Check for Paystack/Flutterwave API key
    const paymentSecret = process.env.PAYSTACK_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY
    const usePaymentGateway = !!paymentSecret

    let successCount = 0
    let failCount = 0

    for (const item of items) {
      if (usePaymentGateway) {
        // Attempt actual transfer via payment gateway
        try {
          const transferResult = await initiateTransfer(item, tenantId)
          if (transferResult.success) {
            await sql`
              UPDATE payroll_run_items SET status = 'paid', payment_reference = ${transferResult.reference}, payment_date = NOW()
              WHERE id = ${item.id}
            `
            successCount++
          } else {
            await sql`
              UPDATE payroll_run_items SET status = 'failed', failure_reason = ${transferResult.error || 'Transfer failed'}
              WHERE id = ${item.id}
            `
            failCount++
          }
        } catch (err) {
          await sql`
            UPDATE payroll_run_items SET status = 'failed', failure_reason = ${String(err)}
            WHERE id = ${item.id}
          `
          failCount++
        }
      } else {
        // No payment gateway configured — mark as paid (manual disbursement mode)
        const ref = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        await sql`
          UPDATE payroll_run_items SET status = 'paid', payment_reference = ${ref}, payment_date = NOW()
          WHERE id = ${item.id}
        `
        successCount++
      }
    }

    // Update run status
    if (failCount === 0) {
      const result = await sql`
        UPDATE payroll_runs SET status = 'paid', disbursed_at = NOW(), updated_at = NOW()
        WHERE id = ${runId} AND tenant_id = ${tenantId} RETURNING *
      `
      // Auto-generate payslips
      await generatePayslipsForRun(runId, tenantId)
      return { success: true, run: rowToRun(result.rows[0]) }
    } else if (successCount > 0) {
      const result = await sql`
        UPDATE payroll_runs SET status = 'paid', failure_reason = ${`${failCount} transfers failed`}, disbursed_at = NOW(), updated_at = NOW()
        WHERE id = ${runId} AND tenant_id = ${tenantId} RETURNING *
      `
      await generatePayslipsForRun(runId, tenantId)
      return { success: true, run: rowToRun(result.rows[0]) }
    } else {
      const result = await sql`
        UPDATE payroll_runs SET status = 'failed', failure_reason = 'All transfers failed', updated_at = NOW()
        WHERE id = ${runId} AND tenant_id = ${tenantId} RETURNING *
      `
      return { success: false, run: rowToRun(result.rows[0]), error: 'All transfers failed' }
    }
  } catch (error) {
    console.error('Error disbursing run:', error)
    const result = await sql`
      UPDATE payroll_runs SET status = 'failed', failure_reason = ${String(error)}, updated_at = NOW()
      WHERE id = ${runId} AND tenant_id = ${tenantId} RETURNING *
    `
    return { success: false, run: result.rows[0] ? rowToRun(result.rows[0]) : null, error: String(error) }
  }
}

async function initiateTransfer(item: PayrollRunItem, tenantId: string): Promise<{ success: boolean; reference: string; error?: string }> {
  const reference = `pay_${item.runId}_${item.staffId}_${Date.now()}`

  // Try Paystack first
  if (process.env.PAYSTACK_SECRET_KEY) {
    try {
      // Fetch staff bank details
      const staffResult = await sql`SELECT * FROM staff WHERE id = ${item.staffId} AND tenant_id = ${tenantId}`
      const staff = staffResult.rows[0]
      if (!staff) return { success: false, reference, error: 'Staff not found' }

      // In production, this would call Paystack Transfer API
      // For now, we simulate the call structure
      const response = await fetch('https://api.paystack.co/transfer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'balance',
          amount: Math.round(item.netPay * 100), // Paystack uses kobo
          recipient: staff.bank_code ? { account_number: staff.account_number, bank_code: staff.bank_code } : undefined,
          reason: `Salary ${item.staffName}`,
          reference,
        }),
      })

      if (response.ok) {
        return { success: true, reference }
      }
      const errData = await response.json().catch(() => ({}))
      return { success: false, reference, error: errData.message || 'Paystack transfer failed' }
    } catch (err) {
      return { success: false, reference, error: String(err) }
    }
  }

  // Try Flutterwave
  if (process.env.FLUTTERWAVE_SECRET_KEY) {
    try {
      const staffResult = await sql`SELECT * FROM staff WHERE id = ${item.staffId} AND tenant_id = ${tenantId}`
      const staff = staffResult.rows[0]
      if (!staff) return { success: false, reference, error: 'Staff not found' }

      const response = await fetch('https://api.flutterwave.com/v3/transfers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_bank: staff.bank_code,
          account_number: staff.account_number,
          amount: item.netPay,
          narration: `Salary payment for ${item.staffName}`,
          reference,
          currency: 'NGN',
        }),
      })

      if (response.ok) {
        return { success: true, reference }
      }
      const errData = await response.json().catch(() => ({}))
      return { success: false, reference, error: errData.message || 'Flutterwave transfer failed' }
    } catch (err) {
      return { success: false, reference, error: String(err) }
    }
  }

  return { success: false, reference, error: 'No payment gateway configured' }
}

// ── Payslips ─────────────────────────────────────────────────────────────────

export async function generatePayslipsForRun(runId: string, tenantId: string): Promise<number> {
  const items = await fetchRunItems(runId, tenantId)
  let count = 0

  for (const item of items) {
    if (item.status !== 'paid' || item.payslipGenerated) continue

    const payslipId = `payslip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const run = await fetchRun(runId, tenantId)
    if (!run) continue

    await sql`
      INSERT INTO payslips (id, tenant_id, run_id, staff_id, staff_name, month, year, basic_salary, earnings, deductions, gross_pay, total_deductions, net_pay, paye_tax, pension_employee, pension_employer)
      VALUES (${payslipId}, ${tenantId}, ${runId}, ${item.staffId}, ${item.staffName}, ${run.month}, ${run.year},
        ${item.basicSalary}, ${JSON.stringify(item.earnings)}::jsonb, ${JSON.stringify(item.deductions)}::jsonb,
        ${item.grossPay}, ${item.totalDeductions}, ${item.netPay}, ${item.payeTax}, ${item.pensionEmployee}, ${item.pensionEmployer})
      ON CONFLICT DO NOTHING
    `

    await sql`UPDATE payroll_run_items SET payslip_generated = true WHERE id = ${item.id}`
    count++
  }

  return count
}

export async function fetchPayslips(tenantId: string, staffId?: string): Promise<Payslip[]> {
  try {
    if (staffId) {
      const result = await sql`
        SELECT * FROM payslips WHERE tenant_id = ${tenantId} AND staff_id = ${staffId} ORDER BY year DESC, created_at DESC
      `
      return result.rows.map(rowToPayslip)
    }
    const result = await sql`
      SELECT * FROM payslips WHERE tenant_id = ${tenantId} ORDER BY year DESC, created_at DESC
    `
    return result.rows.map(rowToPayslip)
  } catch (error) {
    console.error('Error fetching payslips:', error)
    return []
  }
}

export async function markPayslipEmailed(payslipId: string): Promise<void> {
  try {
    await sql`UPDATE payslips SET emailed = true WHERE id = ${payslipId}`
  } catch (error) {
    console.error('Error marking payslip emailed:', error)
  }
}

// ── Salary Advances ──────────────────────────────────────────────────────────

export async function fetchAdvances(tenantId: string, staffId?: string, status?: string): Promise<SalaryAdvance[]> {
  try {
    let query = `SELECT * FROM salary_advances WHERE tenant_id = $1`
    const params: any[] = [tenantId]
    let pIdx = 2
    if (staffId) { query += ` AND staff_id = $${pIdx++}`; params.push(staffId) }
    if (status) { query += ` AND status = $${pIdx++}`; params.push(status) }
    query += ` ORDER BY created_at DESC`
    const result = await poolQuery(query, params)
    return result.rows.map(rowToAdvance)
  } catch (error) {
    console.error('Error fetching advances:', error)
    return []
  }
}

export async function createAdvance(data: {
  staffId: string
  staffName: string
  amount: number
  type: string
  reason: string
  installments: number
}, tenantId: string): Promise<SalaryAdvance> {
  const id = `adv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const monthlyDeduction = data.installments > 0 ? data.amount / data.installments : data.amount
  const result = await sql`
    INSERT INTO salary_advances (id, tenant_id, staff_id, staff_name, amount, type, reason, monthly_deduction, installments, status, requested_at)
    VALUES (${id}, ${tenantId}, ${data.staffId}, ${data.staffName}, ${data.amount}, ${data.type || 'advance'},
      ${data.reason || null}, ${monthlyDeduction}, ${data.installments || 1}, 'pending', NOW())
    RETURNING *
  `
  return rowToAdvance(result.rows[0])
}

export async function approveAdvance(id: string, approverId: string, approverName: string, tenantId: string): Promise<SalaryAdvance | null> {
  try {
    const result = await sql`
      UPDATE salary_advances SET status = 'active', approved_by = ${approverName}, approved_at = NOW(), updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'pending' RETURNING *
    `
    return result.rows[0] ? rowToAdvance(result.rows[0]) : null
  } catch (error) {
    console.error('Error approving advance:', error)
    return null
  }
}

export async function rejectAdvance(id: string, tenantId: string): Promise<SalaryAdvance | null> {
  try {
    const result = await sql`
      UPDATE salary_advances SET status = 'rejected', updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'pending' RETURNING *
    `
    return result.rows[0] ? rowToAdvance(result.rows[0]) : null
  } catch (error) {
    console.error('Error rejecting advance:', error)
    return null
  }
}

// ── Tax Config ───────────────────────────────────────────────────────────────

export async function updateTaxConfig(id: string, data: Partial<TaxConfig>, tenantId: string): Promise<TaxConfig | null> {
  try {
    const result = await sql`
      UPDATE tax_config SET
        cratum_allowance = COALESCE(${data.cratumAllowance ?? null}, cratum_allowance),
        cratum_percentage = COALESCE(${data.cratumPercentage ?? null}, cratum_percentage),
        pension_rate_employee = COALESCE(${data.pensionRateEmployee ?? null}, pension_rate_employee),
        pension_rate_employer = COALESCE(${data.pensionRateEmployer ?? null}, pension_rate_employer),
        nhf_rate = COALESCE(${data.nhfRate ?? null}, nhf_rate),
        nhis_rate = COALESCE(${data.nhisRate ?? null}, nhis_rate),
        brackets = COALESCE(${data.brackets ? JSON.stringify(data.brackets) : null}::jsonb, brackets),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId} RETURNING *
    `
    return result.rows[0] ? rowToTaxConfig(result.rows[0]) : null
  } catch (error) {
    console.error('Error updating tax config:', error)
    return null
  }
}

// ── Compliance Reports ───────────────────────────────────────────────────────

export async function generateComplianceReport(tenantId: string, year: number): Promise<{
  totalGross: number
  totalPAYE: number
  totalPensionEmployee: number
  totalPensionEmployer: number
  totalNHF: number
  totalNHIS: number
  staffCount: number
  monthlyBreakdown: { month: string; gross: number; paye: number; pension: number; nhf: number; nhis: number }[]
}> {
  try {
    const result = await sql`
      SELECT
        month,
        SUM(gross_pay) as gross,
        SUM(paye_tax) as paye,
        SUM(pension_employee) as pension_emp,
        SUM(pension_employer) as pension_er,
        COUNT(DISTINCT staff_id) as staff_count
      FROM payroll_run_items
      WHERE tenant_id = ${tenantId}
      GROUP BY month
      ORDER BY month
    `

    const monthlyBreakdown = result.rows.map((r: any) => ({
      month: r.month,
      gross: Number(r.gross) || 0,
      paye: Number(r.paye) || 0,
      pension: (Number(r.pension_emp) || 0) + (Number(r.pension_er) || 0),
      nhf: 0,
      nhis: 0,
    }))

    const totalGross = monthlyBreakdown.reduce((s, m) => s + m.gross, 0)
    const totalPAYE = monthlyBreakdown.reduce((s, m) => s + m.paye, 0)
    const totalPensionEmployee = result.rows.reduce((s: number, r: any) => s + (Number(r.pension_emp) || 0), 0)
    const totalPensionEmployer = result.rows.reduce((s: number, r: any) => s + (Number(r.pension_er) || 0), 0)

    return {
      totalGross,
      totalPAYE,
      totalPensionEmployee,
      totalPensionEmployer,
      totalNHF: 0,
      totalNHIS: 0,
      staffCount: result.rows.reduce((max: number, r: any) => Math.max(max, Number(r.staff_count) || 0), 0),
      monthlyBreakdown,
    }
  } catch (error) {
    console.error('Error generating compliance report:', error)
    return {
      totalGross: 0, totalPAYE: 0, totalPensionEmployee: 0, totalPensionEmployer: 0,
      totalNHF: 0, totalNHIS: 0, staffCount: 0, monthlyBreakdown: [],
    }
  }
}

// ── Row Mappers ──────────────────────────────────────────────────────────────

function rowToSchedule(r: any): PayrollSchedule {
  return {
    id: r.id, tenantId: r.tenant_id, name: r.name, frequency: r.frequency,
    dayOfMonth: r.day_of_month, dayOfWeek: r.day_of_week,
    autoGenerate: r.auto_generate, autoDisburse: r.auto_disburse, isActive: r.is_active,
    createdAt: r.created_at?.toISOString?.() || String(r.created_at),
    updatedAt: r.updated_at?.toISOString?.() || String(r.updated_at),
  }
}

function rowToRule(r: any): PayrollRule {
  return {
    id: r.id, tenantId: r.tenant_id, staffId: r.staff_id, staffName: r.staff_name,
    ruleType: r.rule_type, category: r.category, label: r.label, amount: Number(r.amount),
    calculationMethod: r.calculation_method, percentageOf: r.percentage_of,
    isRecurring: r.is_recurring, isActive: r.is_active,
    effectiveFrom: r.effective_from?.toISOString?.()?.split('T')[0] || null,
    effectiveTo: r.effective_to?.toISOString?.()?.split('T')[0] || null,
    createdAt: r.created_at?.toISOString?.() || String(r.created_at),
    updatedAt: r.updated_at?.toISOString?.() || String(r.updated_at),
  }
}

function rowToRun(r: any): PayrollRun {
  return {
    id: r.id, tenantId: r.tenant_id, scheduleId: r.schedule_id, name: r.name,
    month: r.month, year: r.year, totalStaff: r.total_staff,
    totalGross: Number(r.total_gross), totalDeductions: Number(r.total_deductions),
    totalNet: Number(r.total_net), status: r.status,
    runDate: r.run_date?.toISOString?.() || String(r.run_date),
    approvedBy: r.approved_by, approvedAt: r.approved_at?.toISOString?.() || null,
    disbursedAt: r.disbursed_at?.toISOString?.() || null,
    failureReason: r.failure_reason,
    createdAt: r.created_at?.toISOString?.() || String(r.created_at),
    updatedAt: r.updated_at?.toISOString?.() || String(r.updated_at),
  }
}

function rowToRunItem(r: any): PayrollRunItem {
  return {
    id: r.id, runId: r.run_id, tenantId: r.tenant_id, staffId: r.staff_id,
    staffName: r.staff_name, basicSalary: Number(r.basic_salary),
    earnings: typeof r.earnings === 'string' ? JSON.parse(r.earnings) : (r.earnings || []),
    deductions: typeof r.deductions === 'string' ? JSON.parse(r.deductions) : (r.deductions || []),
    grossPay: Number(r.gross_pay), totalDeductions: Number(r.total_deductions),
    netPay: Number(r.net_pay), payeTax: Number(r.paye_tax),
    pensionEmployee: Number(r.pension_employee), pensionEmployer: Number(r.pension_employer),
    status: r.status, paymentReference: r.payment_reference,
    paymentDate: r.payment_date?.toISOString?.() || null,
    failureReason: r.failure_reason, payslipGenerated: r.payslip_generated,
    createdAt: r.created_at?.toISOString?.() || String(r.created_at),
  }
}

function rowToApproval(r: any): PayrollApproval {
  return {
    id: r.id, runId: r.run_id, tenantId: r.tenant_id, approverRole: r.approver_role,
    approverId: r.approver_id, approverName: r.approver_name, approvalLevel: r.approval_level,
    status: r.status, comment: r.comment,
    approvedAt: r.approved_at?.toISOString?.() || null,
    createdAt: r.created_at?.toISOString?.() || String(r.created_at),
  }
}

function rowToPayslip(r: any): Payslip {
  return {
    id: r.id, tenantId: r.tenant_id, runId: r.run_id, staffId: r.staff_id,
    staffName: r.staff_name, month: r.month, year: r.year,
    basicSalary: Number(r.basic_salary),
    earnings: typeof r.earnings === 'string' ? JSON.parse(r.earnings) : (r.earnings || []),
    deductions: typeof r.deductions === 'string' ? JSON.parse(r.deductions) : (r.deductions || []),
    grossPay: Number(r.gross_pay), totalDeductions: Number(r.total_deductions),
    netPay: Number(r.net_pay), payeTax: Number(r.paye_tax),
    pensionEmployee: Number(r.pension_employee), pensionEmployer: Number(r.pension_employer),
    pdfUrl: r.pdf_url, emailed: r.emailed, smsSent: r.sms_sent,
    createdAt: r.created_at?.toISOString?.() || String(r.created_at),
  }
}

function rowToAdvance(r: any): SalaryAdvance {
  return {
    id: r.id, tenantId: r.tenant_id, staffId: r.staff_id, staffName: r.staff_name,
    amount: Number(r.amount), type: r.type, reason: r.reason, status: r.status,
    monthlyDeduction: Number(r.monthly_deduction), totalRepaid: Number(r.total_repaid),
    installments: r.installments, installmentsPaid: r.installments_paid,
    approvedBy: r.approved_by, approvedAt: r.approved_at?.toISOString?.() || null,
    requestedAt: r.requested_at?.toISOString?.() || String(r.requested_at),
    createdAt: r.created_at?.toISOString?.() || String(r.created_at),
    updatedAt: r.updated_at?.toISOString?.() || String(r.updated_at),
  }
}

function rowToTaxConfig(r: any): TaxConfig {
  return {
    id: r.id, tenantId: r.tenant_id, taxYear: r.tax_year,
    cratumAllowance: Number(r.cratum_allowance), cratumPercentage: Number(r.cratum_percentage),
    pensionRateEmployee: Number(r.pension_rate_employee), pensionRateEmployer: Number(r.pension_rate_employer),
    nhfRate: Number(r.nhf_rate), nhisRate: Number(r.nhis_rate),
    brackets: typeof r.brackets === 'string' ? JSON.parse(r.brackets) : (r.brackets || []),
    isActive: r.is_active,
    createdAt: r.created_at?.toISOString?.() || String(r.created_at),
    updatedAt: r.updated_at?.toISOString?.() || String(r.updated_at),
  }
}
