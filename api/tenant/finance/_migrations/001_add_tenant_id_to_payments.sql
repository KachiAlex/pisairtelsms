-- Add tenant_id column to payments table if it doesn't exist
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tenant_id TEXT;

-- Add tenant_id column to tenant_payment_settings table if it doesn't exist
ALTER TABLE tenant_payment_settings ADD COLUMN IF NOT EXISTS tenant_id TEXT;

-- Create indexes for tenant_id if they don't exist
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_payment_settings_tenant_id ON tenant_payment_settings(tenant_id);
