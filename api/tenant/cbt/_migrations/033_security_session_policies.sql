CREATE TABLE IF NOT EXISTS security_session_policies (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,
  timeout_minutes INTEGER NOT NULL DEFAULT 30,
  max_sessions INTEGER NOT NULL DEFAULT 10,
  updated_by TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_security_session_policies_tenant ON security_session_policies(tenant_id);

INSERT INTO schema_migrations (version, description)
VALUES (33, 'Persist tenant session management policies')
ON CONFLICT (version) DO NOTHING;
