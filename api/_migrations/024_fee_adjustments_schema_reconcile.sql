-- 024: Reconcile fee_adjustments schema drift.
-- Two writers created/used this table with different shapes:
--   - 001_consolidated_schema.sql: tenant_id, requires_approval, status
--   - finance/_lib/adjustments-audit.ts: approved_by, approval_date, created_by
-- The live table has the audit shape only, so tenant-scoped queries 500.
-- Add every missing column and backfill tenant_id via fee_assignments.

ALTER TABLE fee_adjustments ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE fee_adjustments ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;
ALTER TABLE fee_adjustments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE fee_adjustments ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE fee_adjustments ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE fee_adjustments ADD COLUMN IF NOT EXISTS created_by TEXT;

UPDATE fee_adjustments fa
SET tenant_id = s.tenant_id
FROM fee_assignments s
WHERE s.id = fa.fee_assignment_id AND fa.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_fee_adjustments_tenant ON fee_adjustments(tenant_id);
