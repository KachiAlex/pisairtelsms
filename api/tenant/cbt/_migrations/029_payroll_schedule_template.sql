-- Schedules may reference a payroll run as their template: the generated run
-- clones that run's items (staff, basic salary, pay lines) while advances and
-- statutory deductions are recomputed fresh for the new period.
ALTER TABLE payroll_schedules
  ADD COLUMN IF NOT EXISTS template_run_id TEXT;
