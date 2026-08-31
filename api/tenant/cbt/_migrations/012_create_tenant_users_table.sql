-- Tenant Users Table Migration
-- Creates the tenant_users table for managing tenant-level user accounts

CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL DEFAULT 'Staff',
  status VARCHAR(50) NOT NULL DEFAULT 'invited',
  last_active TIMESTAMP WITH TIME ZONE,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant-scoped unique constraint on email
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenant_users_tenant_id_email_key'
      AND conrelid = 'tenant_users'::regclass
  ) THEN
    ALTER TABLE tenant_users ADD CONSTRAINT tenant_users_tenant_id_email UNIQUE (tenant_id, email);
  END IF;
END $$;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_email ON tenant_users(email);
CREATE INDEX IF NOT EXISTS idx_tenant_users_status ON tenant_users(status);

INSERT INTO schema_migrations (version, description)
VALUES (12, 'Create tenant users table')
ON CONFLICT DO NOTHING;
