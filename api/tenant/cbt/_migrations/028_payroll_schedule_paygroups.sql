-- Payroll schedule pay groups: a schedule names WHICH payroll it produces.
-- staff_ids JSONB array of staff.id; empty array = all active salaried staff.
ALTER TABLE payroll_schedules
  ADD COLUMN IF NOT EXISTS staff_ids JSONB DEFAULT '[]';

-- Uniqueness is per schedule, not per tenant — two pay groups may each have a
-- run for the same period. Manual runs (schedule_id NULL → '') stay unique
-- per tenant/month/year.
DROP INDEX IF EXISTS idx_payroll_runs_unique_period;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_runs_unique_period
  ON payroll_runs(tenant_id, month, year, (COALESCE(schedule_id, '')))
  WHERE status != 'failed' AND COALESCE(run_type, 'regular') = 'regular';
