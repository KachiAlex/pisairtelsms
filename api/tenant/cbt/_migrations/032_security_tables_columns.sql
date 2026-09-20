-- Backfill missing columns on the security/operations tables.
--
-- These tables pre-existed as minimal stubs (created at runtime before
-- migration 024's full definitions could apply — CREATE TABLE IF NOT EXISTS
-- skipped them). The security handlers then fail with
-- "column X does not exist". Add the columns 024 intended, plus the three
-- tables that are missing entirely.

-- security_events — needs event_type/description/user_id for all 4 endpoints
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'low';
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_security_events_tenant ON security_events(tenant_id, created_at);

-- privileged_roles — needs role_name/description/mfa_required/last_review_date
ALTER TABLE privileged_roles ADD COLUMN IF NOT EXISTS role_name TEXT;
ALTER TABLE privileged_roles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE privileged_roles ADD COLUMN IF NOT EXISTS mfa_required BOOLEAN DEFAULT false;
ALTER TABLE privileged_roles ADD COLUMN IF NOT EXISTS last_review_date TIMESTAMP;
ALTER TABLE privileged_roles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_privileged_roles_tenant ON privileged_roles(tenant_id, is_active);

-- role_assignments — needs user_id
ALTER TABLE role_assignments ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE role_assignments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_role_assignments_tenant ON role_assignments(tenant_id, is_active);

-- encryption_keys — needs key metadata columns
ALTER TABLE encryption_keys ADD COLUMN IF NOT EXISTS key_id TEXT;
ALTER TABLE encryption_keys ADD COLUMN IF NOT EXISTS key_name TEXT;
ALTER TABLE encryption_keys ADD COLUMN IF NOT EXISTS algorithm TEXT;
ALTER TABLE encryption_keys ADD COLUMN IF NOT EXISTS surface TEXT;
ALTER TABLE encryption_keys ADD COLUMN IF NOT EXISTS rotation_days INTEGER;
ALTER TABLE encryption_keys ADD COLUMN IF NOT EXISTS last_rotation TIMESTAMP;
ALTER TABLE encryption_keys ADD COLUMN IF NOT EXISTS next_rotation TIMESTAMP;
ALTER TABLE encryption_keys ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_encryption_keys_tenant ON encryption_keys(tenant_id);

-- backup_jobs — needs job metadata columns
ALTER TABLE backup_jobs ADD COLUMN IF NOT EXISTS job_type TEXT;
ALTER TABLE backup_jobs ADD COLUMN IF NOT EXISTS schedule TEXT;
ALTER TABLE backup_jobs ADD COLUMN IF NOT EXISTS size_bytes BIGINT;
ALTER TABLE backup_jobs ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE backup_jobs ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
ALTER TABLE backup_jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_backup_jobs_tenant ON backup_jobs(tenant_id, created_at);

-- key_vaults / restore_requests / compliance_tasks — missing entirely
CREATE TABLE IF NOT EXISTS key_vaults (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  vault_name TEXT NOT NULL,
  vault_type TEXT,
  region TEXT,
  keys_count INTEGER DEFAULT 0,
  health_status VARCHAR(20) DEFAULT 'operational',
  last_rotation TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_key_vaults_tenant ON key_vaults(tenant_id);

CREATE TABLE IF NOT EXISTS restore_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  scope TEXT,
  requested_by TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  approved_by TEXT,
  approved_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_restore_requests_tenant ON restore_requests(tenant_id);

CREATE TABLE IF NOT EXISTS compliance_tasks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  task_name TEXT,
  task_type TEXT,
  owner TEXT,
  due_date TIMESTAMP,
  status VARCHAR(20) DEFAULT 'scheduled',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE compliance_tasks ADD COLUMN IF NOT EXISTS task_name TEXT;
ALTER TABLE compliance_tasks ADD COLUMN IF NOT EXISTS task_type TEXT;
ALTER TABLE compliance_tasks ADD COLUMN IF NOT EXISTS owner TEXT;
ALTER TABLE compliance_tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;
ALTER TABLE compliance_tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_tenant ON compliance_tasks(tenant_id, status);

INSERT INTO schema_migrations (version, description)
VALUES (32, 'Backfill security/operations table columns and create missing tables')
ON CONFLICT (version) DO NOTHING;
