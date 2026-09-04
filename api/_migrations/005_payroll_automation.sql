-- Payroll Automation: schedules, rules, runs, approvals, payslips, advances, tax config
-- Idempotent (uses IF NOT EXISTS)

-- Payroll schedules (pay cycle configuration per tenant)
CREATE TABLE IF NOT EXISTS payroll_schedules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  name VARCHAR(255) NOT NULL,
  frequency VARCHAR(20) NOT NULL DEFAULT 'monthly', -- monthly, bi_weekly, weekly, custom
  day_of_month INT DEFAULT 25,
  day_of_week INT DEFAULT 5, -- 0=Sun..6=Sat (for bi_weekly/weekly)
  auto_generate BOOLEAN DEFAULT false,
  auto_disburse BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payroll rules (recurring earnings & deductions per staff)
CREATE TABLE IF NOT EXISTS payroll_rules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  staff_id TEXT NOT NULL,
  staff_name VARCHAR(255),
  rule_type VARCHAR(20) NOT NULL DEFAULT 'earning', -- earning, deduction
  category VARCHAR(100) NOT NULL, -- e.g. housing_allowance, transport, paye_tax, pension, loan_repayment
  label VARCHAR(255) NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  calculation_method VARCHAR(20) DEFAULT 'fixed', -- fixed, percentage
  percentage_of VARCHAR(50) DEFAULT 'basic_salary', -- basic_salary, gross
  is_recurring BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payroll runs (batch runs with approval workflow)
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
  status VARCHAR(30) DEFAULT 'draft', -- draft, pending_approval, approved, disbursing, paid, failed
  run_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_by VARCHAR(255),
  approved_at TIMESTAMP WITH TIME ZONE,
  disbursed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payroll run items (individual staff entries within a run)
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
  status VARCHAR(20) DEFAULT 'pending', -- pending, paid, failed
  payment_reference VARCHAR(255),
  payment_date TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  payslip_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payroll approvals (multi-level approval chain)
CREATE TABLE IF NOT EXISTS payroll_approvals (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  approver_role VARCHAR(50) NOT NULL, -- hr_admin, principal, bursar
  approver_id VARCHAR(255),
  approver_name VARCHAR(255),
  approval_level INT DEFAULT 1,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  comment TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payslips (generated per staff per run)
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
);

-- Salary advances / loans
CREATE TABLE IF NOT EXISTS salary_advances (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  staff_id TEXT NOT NULL,
  staff_name VARCHAR(255),
  amount NUMERIC(12,2) NOT NULL,
  type VARCHAR(20) DEFAULT 'advance', -- advance, loan
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, active, cleared
  monthly_deduction NUMERIC(12,2) DEFAULT 0,
  total_repaid NUMERIC(12,2) DEFAULT 0,
  installments INT DEFAULT 1,
  installments_paid INT DEFAULT 0,
  approved_by VARCHAR(255),
  approved_at TIMESTAMP WITH TIME ZONE,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tax configuration (PAYE brackets for Nigeria)
CREATE TABLE IF NOT EXISTS tax_config (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  tax_year INT NOT NULL,
  cratum_allowance NUMERIC(12,2) DEFAULT 200000,
  cratum_percentage NUMERIC(5,2) DEFAULT 1.0, -- 1% of gross
  pension_rate_employee NUMERIC(5,2) DEFAULT 8.0,
  pension_rate_employer NUMERIC(5,2) DEFAULT 10.0,
  nhf_rate NUMERIC(5,2) DEFAULT 2.5,
  nhis_rate NUMERIC(5,2) DEFAULT 1.5, -- 1.5% (updated 2024)
  brackets JSONB DEFAULT '[]', -- [{min, max, rate}]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payroll_schedules_tenant ON payroll_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_rules_staff ON payroll_rules(staff_id);
CREATE INDEX IF NOT EXISTS idx_payroll_rules_tenant ON payroll_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_tenant ON payroll_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(status);
CREATE INDEX IF NOT EXISTS idx_payroll_run_items_run ON payroll_run_items(run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_run_items_staff ON payroll_run_items(staff_id);
CREATE INDEX IF NOT EXISTS idx_payroll_approvals_run ON payroll_approvals(run_id);
CREATE INDEX IF NOT EXISTS idx_payslips_staff ON payslips(staff_id);
CREATE INDEX IF NOT EXISTS idx_payslips_run ON payslips(run_id);
CREATE INDEX IF NOT EXISTS idx_salary_advances_staff ON salary_advances(staff_id);
CREATE INDEX IF NOT EXISTS idx_salary_advances_tenant ON salary_advances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tax_config_tenant ON tax_config(tenant_id);

-- Insert default Nigeria PAYE tax brackets if not exists
INSERT INTO tax_config (id, tenant_id, tax_year, brackets)
SELECT 'tax_default_2025', 'default-tenant', 2025,
  '[{"min":0,"max":300000,"rate":7},{"min":300000,"max":600000,"rate":11},{"min":600000,"max":1100000,"rate":15},{"min":1100000,"max":1600000,"rate":19},{"min":1600000,"max":3200000,"rate":21},{"min":3200000,"max":null,"rate":24}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM tax_config WHERE tenant_id = 'default-tenant' AND tax_year = 2025);
