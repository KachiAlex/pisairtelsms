-- Teacher Allocation: add columns to staff table
-- Created: 2026-09-13
-- The teacher-allocation handler queries staff for level, risk_flag, subjects,
-- allocation_periods, contract_hours, and tenant_id — none of which existed on
-- the original staff table. This migration adds them idempotently.

ALTER TABLE staff ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS level VARCHAR(100);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS risk_flag VARCHAR(20) DEFAULT 'Normal'
  CHECK (risk_flag IN ('Normal', 'Overload', 'Underutilised', 'At risk'));
ALTER TABLE staff ADD COLUMN IF NOT EXISTS subjects JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS allocation_periods INT NOT NULL DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS contract_hours INT NOT NULL DEFAULT 40;

CREATE INDEX IF NOT EXISTS idx_staff_tenant ON staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_tenant_role ON staff(tenant_id, role);

-- Backfill tenant_id for any legacy staff rows that lack it.
UPDATE staff SET tenant_id = 'default-tenant-uuid' WHERE tenant_id IS NULL;

-- Recompute allocation_periods and risk_flag from teacher_allocation_slots so
-- the teacher load insights card has real data immediately after migration.
UPDATE staff s SET
  allocation_periods = COALESCE((
    SELECT COUNT(*) FROM teacher_allocation_slots tas
    WHERE tas.teacher = s.name AND tas.coverage = 'Assigned'
  ), 0);

UPDATE staff SET risk_flag = 'Overload'
  WHERE allocation_periods > contract_hours AND contract_hours > 0;

INSERT INTO schema_migrations (version, description)
VALUES (18, 'Add teacher allocation columns to staff table')
ON CONFLICT (version) DO NOTHING;
