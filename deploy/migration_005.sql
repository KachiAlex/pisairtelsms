-- Migration 005: Extend tenants table for multitenant flow
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subdomain VARCHAR(100) UNIQUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_starts_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_status VARCHAR(50) DEFAULT 'active';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_students INT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_staff INT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
UPDATE tenants SET subscription_plan = 'starter' WHERE subscription_plan = 'basic';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id VARCHAR(255) NOT NULL,
  admin_email VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  target_id VARCHAR(255),
  target_type VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
