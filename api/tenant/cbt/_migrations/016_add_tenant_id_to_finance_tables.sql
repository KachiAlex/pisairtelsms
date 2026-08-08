-- Ensure tenant_id column exists on all finance tables for Vercel pg migrations
ALTER TABLE IF EXISTS fee_records ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE IF EXISTS tenant_payment_settings ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE IF EXISTS payment_proofs ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE IF EXISTS admin_notifications ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE IF EXISTS fee_structures ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE IF EXISTS fee_items ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE IF EXISTS fee_assignments ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE IF EXISTS exemptions ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE IF EXISTS student_payments ADD COLUMN IF NOT EXISTS tenant_id TEXT;

CREATE INDEX IF NOT EXISTS idx_fee_records_tenant_id ON fee_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_tenant_id ON admin_notifications(tenant_id);
