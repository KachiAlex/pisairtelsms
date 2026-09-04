// API client for the automated payroll system

function getAuthHeaders(): Record<string, string> {
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}')
    return {
      'Content-Type': 'application/json',
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    }
  } catch {
    return { 'Content-Type': 'application/json' }
  }
}

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
}

export interface EarningDeduction {
  category: string
  label: string
  amount: number
}

export interface PayrollRun {
  id: string
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
}

export interface PayrollRunItem {
  id: string
  runId: string
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
}

export interface PayrollApproval {
  id: string
  runId: string
  approverRole: string
  approverId: string | null
  approverName: string | null
  approvalLevel: number
  status: 'pending' | 'approved' | 'rejected'
  comment: string | null
  approvedAt: string | null
}

export interface Payslip {
  id: string
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
}

export interface SalaryAdvance {
  id: string
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
}

export interface TaxConfig {
  id: string
  taxYear: number
  cratumAllowance: number
  cratumPercentage: number
  pensionRateEmployee: number
  pensionRateEmployer: number
  nhfRate: number
  nhisRate: number
  brackets: { min: number; max: number | null; rate: number }[]
  isActive: boolean
}

export interface ComplianceReport {
  totalGross: number
  totalPAYE: number
  totalPensionEmployee: number
  totalPensionEmployer: number
  totalNHF: number
  totalNHIS: number
  staffCount: number
  monthlyBreakdown: { month: string; gross: number; paye: number; pension: number; nhf: number; nhis: number }[]
}

// ── API Calls ────────────────────────────────────────────────────────────────

const BASE = '/api/tenant/payroll'

async function apiGet(resource: string, params?: Record<string, string>): Promise<any> {
  const url = new URL(`${BASE}?resource=${resource}`, window.location.origin)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { headers: getAuthHeaders() })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'API error')
  return res.json()
}

async function apiPost(resource: string, body: any): Promise<any> {
  const res = await fetch(`${BASE}?resource=${resource}`, {
    method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'API error')
  return res.json()
}

async function apiPut(resource: string, id: string, body: any): Promise<any> {
  const res = await fetch(`${BASE}?resource=${resource}&id=${id}`, {
    method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'API error')
  return res.json()
}

async function apiDelete(resource: string, id: string): Promise<any> {
  const res = await fetch(`${BASE}?resource=${resource}&id=${id}`, {
    method: 'DELETE', headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'API error')
  return res.json()
}

// Schedules
export const payrollApi = {
  // Schedules
  getSchedules: () => apiGet('schedules').then(r => r.data as PayrollSchedule[]),
  createSchedule: (data: Partial<PayrollSchedule> & { name: string; frequency: string }) => apiPost('schedules', data).then(r => r.data as PayrollSchedule),
  updateSchedule: (id: string, data: Partial<PayrollSchedule>) => apiPut('schedules', id, data).then(r => r.data as PayrollSchedule),
  deleteSchedule: (id: string) => apiDelete('schedules', id),

  // Rules
  getRules: (staffId?: string) => apiGet('rules', staffId ? { staffId } : undefined).then(r => r.data as PayrollRule[]),
  createRule: (data: Partial<PayrollRule> & { staffId: string; ruleType: string; category: string; label: string; amount: number }) => apiPost('rules', data).then(r => r.data as PayrollRule),
  deleteRule: (id: string) => apiDelete('rules', id),

  // Runs
  getRuns: (status?: string) => apiGet('runs', status ? { status } : undefined).then(r => r.data as PayrollRun[]),
  getRun: (id: string) => apiGet('runs', { id }).then(r => r.data as PayrollRun & { items: PayrollRunItem[]; approvals: PayrollApproval[] }),
  createRun: (month: string, year: number, scheduleId?: string) => apiPost('runs', { month, year, scheduleId }).then(r => r.data as PayrollRun),
  submitRun: (id: string) => apiPut('runs', id, { action: 'submit' }).then(r => r.data as PayrollRun),
  approveRun: (id: string, approverRole: string, comment?: string) => apiPut('runs', id, { action: 'approve', approverRole, comment }).then(r => r.data),
  rejectRun: (id: string, approverRole: string, comment: string) => apiPut('runs', id, { action: 'reject', approverRole, comment }).then(r => r.data),
  disburseRun: (id: string) => apiPut('runs', id, { action: 'disburse' }).then(r => r),

  // Payslips
  getPayslips: (staffId?: string) => apiGet('payslips', staffId ? { staffId } : undefined).then(r => r.data as Payslip[]),
  generatePayslips: (runId: string) => apiPost('payslips', { runId }).then(r => r.data),

  // Advances
  getAdvances: (staffId?: string, status?: string) => apiGet('advances', { ...(staffId ? { staffId } : {}), ...(status ? { status } : {}) }).then(r => r.data as SalaryAdvance[]),
  createAdvance: (data: { staffId: string; staffName: string; amount: number; type: string; reason: string; installments: number }) => apiPost('advances', data).then(r => r.data as SalaryAdvance),
  approveAdvance: (id: string) => apiPut('advances', id, { action: 'approve' }).then(r => r.data as SalaryAdvance),
  rejectAdvance: (id: string) => apiPut('advances', id, { action: 'reject' }).then(r => r.data as SalaryAdvance),

  // Tax
  getTaxConfig: () => apiGet('tax').then(r => r.data as TaxConfig | null),
  updateTaxConfig: (id: string, data: Partial<TaxConfig>) => apiPut('tax', id, data).then(r => r.data as TaxConfig),

  // Compliance
  getComplianceReport: (year: number) => apiGet('compliance', { year: String(year) }).then(r => r.data as ComplianceReport),
}
