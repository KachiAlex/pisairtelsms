-- Migration 005: Extend tenants table for proper multitenant flow
-- Adds subdomain, contact info, billing, trial, limits, settings, and audit logging

-- Extend tenants table
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

-- Update default subscription_plan from 'basic' to 'starter'
UPDATE tenants SET subscription_plan = 'starter' WHERE subscription_plan = 'basic';

-- Add tenant_id column to staff table (proper FK instead of overloading department)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS tenant_id_fk VARCHAR(255);
-- Backfill from department for existing records
UPDATE staff SET tenant_id_fk = department WHERE tenant_id_fk IS NULL AND department IS NOT NULL;

-- Ensure staff table has columns needed by tenant-admins-handler (for older deployments)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default-tenant';

-- Admin audit log
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
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
