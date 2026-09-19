-- Payroll hardening: statutory fields, audit log, staff bank details, run typing

-- Run items: payroll year + statutory deduction breakdown (NHF/NHIS) for compliance reporting
ALTER TABLE payroll_run_items ADD COLUMN IF NOT EXISTS year INT;
ALTER TABLE payroll_run_items ADD COLUMN IF NOT EXISTS nhf NUMERIC(12,2) DEFAULT 0;
ALTER TABLE payroll_run_items ADD COLUMN IF NOT EXISTS nhis NUMERIC(12,2) DEFAULT 0;

-- Backfill year from the parent run for existing items
UPDATE payroll_run_items ri
SET year = r.year
FROM payroll_runs r
WHERE r.id = ri.run_id AND ri.year IS NULL;

-- Runs: distinguish regular vs supplementary runs
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS run_type VARCHAR(20) DEFAULT 'regular';

-- Staff: bank details required for gateway disbursement (Paystack/Flutterwave)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS account_number VARCHAR(20);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bank_code VARCHAR(20);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);

-- Payroll audit trail: who created/submitted/approved/rejected/disbursed each run
CREATE TABLE IF NOT EXISTS payroll_audit_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  run_id TEXT,
  action VARCHAR(50) NOT NULL,
  actor VARCHAR(255) NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_audit_tenant ON payroll_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_run ON payroll_audit_log(run_id);

-- Prevent two regular (non-failed) payroll runs for the same tenant/month/year.
-- Supplementary runs are excluded so corrections remain possible.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_runs_unique_period
  ON payroll_runs(tenant_id, month, year)
  WHERE status != 'failed' AND COALESCE(run_type, 'regular') = 'regular';
