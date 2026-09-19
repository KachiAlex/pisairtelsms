-- Operational tables for tasks, approvals, alerts, security, risk alerts, and
-- certificate verification. These endpoints already query these tables but the
-- tables were never migrated (the consolidated schema directory is shadowed by
-- this one), so every page depending on them silently failed.
-- All statements are idempotent.

-- ── Tasks ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  assigned_to TEXT,
  created_by TEXT,
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON tasks(tenant_id, status);

CREATE TABLE IF NOT EXISTS task_comments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);

CREATE TABLE IF NOT EXISTS squad_assignments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  squad_name TEXT NOT NULL,
  owner TEXT NOT NULL,
  focus TEXT,
  risk VARCHAR(20) NOT NULL DEFAULT 'low',
  task_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_squad_assignments_tenant ON squad_assignments(tenant_id);

CREATE TABLE IF NOT EXISTS workstreams (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  label TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  blockers INTEGER NOT NULL DEFAULT 0,
  next_milestone TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workstreams_tenant ON workstreams(tenant_id);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  task_id TEXT,
  message TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'warning',
  due_date TIMESTAMP,
  is_sent BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reminders_tenant ON reminders(tenant_id, is_sent);

-- ── Approvals ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL,
  requester TEXT,
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  sla_deadline TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  approved_by TEXT,
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_approval_requests_tenant ON approval_requests(tenant_id, status);

CREATE TABLE IF NOT EXISTS approval_streams (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  surface TEXT NOT NULL,
  owner TEXT,
  sla_hours INTEGER,
  risk VARCHAR(20),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_approval_streams_tenant ON approval_streams(tenant_id);

CREATE TABLE IF NOT EXISTS approval_policies (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  policy_type TEXT NOT NULL,
  approvers JSONB,
  sla_hours INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_approval_policies_tenant ON approval_policies(tenant_id, is_active);

CREATE TABLE IF NOT EXISTS sla_breaches (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  label TEXT,
  owner TEXT,
  severity VARCHAR(20),
  breach_minutes INTEGER,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sla_breaches_tenant ON sla_breaches(tenant_id, resolved_at);

CREATE TABLE IF NOT EXISTS reviewer_workloads (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  reviewer TEXT NOT NULL,
  pending_count INTEGER NOT NULL DEFAULT 0,
  eta TEXT,
  last_updated TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reviewer_workloads_tenant ON reviewer_workloads(tenant_id);

-- ── System alerts ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_alerts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  impact TEXT,
  owner TEXT,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  eta TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_system_alerts_tenant ON system_alerts(tenant_id, status);

CREATE TABLE IF NOT EXISTS channel_health (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Healthy',
  latency TEXT,
  uptime NUMERIC(5,2) DEFAULT 99.9,
  last_checked TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, channel)
);

CREATE TABLE IF NOT EXISTS maintenance_windows (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  label TEXT NOT NULL,
  window_start TIMESTAMP,
  window_end TIMESTAMP,
  owner TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_maintenance_windows_tenant ON maintenance_windows(tenant_id);

-- ── Notifications (may already exist thin — add any missing columns) ─────────
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT,
  message TEXT,
  type VARCHAR(30) DEFAULT 'system',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  read_at TIMESTAMP
);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(30) DEFAULT 'system';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_user ON notifications(tenant_id, user_id, is_read);

-- ── Security ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  name TEXT,
  role TEXT,
  email TEXT
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT;

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  device_info JSONB,
  ip_address TEXT,
  location TEXT,
  risk_level VARCHAR(20) DEFAULT 'Low',
  last_activity TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  terminated_at TIMESTAMP
);
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS device_info JSONB;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'Low';
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_user_sessions_tenant ON user_sessions(tenant_id);

CREATE TABLE IF NOT EXISTS security_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  event_type TEXT,
  description TEXT,
  severity VARCHAR(20) DEFAULT 'low',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_security_events_tenant ON security_events(tenant_id, created_at);

CREATE TABLE IF NOT EXISTS privileged_roles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  role_name TEXT,
  description TEXT,
  mfa_required BOOLEAN DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_review_date TIMESTAMP,
  next_review_date TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_privileged_roles_tenant ON privileged_roles(tenant_id, is_active);

CREATE TABLE IF NOT EXISTS role_assignments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  role_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_role_assignments_tenant ON role_assignments(tenant_id, is_active);

CREATE TABLE IF NOT EXISTS user_mfa (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  mfa_type VARCHAR(20) DEFAULT 'totp',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  enrolled_at TIMESTAMP,
  last_verified_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS encryption_keys (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  key_id TEXT,
  key_name TEXT,
  algorithm TEXT,
  surface TEXT,
  rotation_days INTEGER,
  last_rotation TIMESTAMP,
  next_rotation TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_tenant ON encryption_keys(tenant_id);

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

CREATE TABLE IF NOT EXISTS backup_jobs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  job_type TEXT,
  schedule TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  size_bytes BIGINT,
  location TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_tenant ON backup_jobs(tenant_id, created_at);

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
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_tenant ON compliance_tasks(tenant_id, status);

-- ── Predictive risk alerts ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS risk_alerts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  student_id TEXT,
  surface TEXT,
  signal TEXT,
  likelihood VARCHAR(20) NOT NULL DEFAULT 'medium',
  risk_score NUMERIC(4,3) NOT NULL DEFAULT 0,
  eta TEXT,
  owner TEXT,
  interventions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_tenant ON risk_alerts(tenant_id, likelihood);

CREATE TABLE IF NOT EXISTS risk_model_performance (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  model TEXT NOT NULL,
  precision NUMERIC(5,4) DEFAULT 0,
  recall NUMERIC(5,4) DEFAULT 0,
  f1_score NUMERIC(5,4) DEFAULT 0,
  accuracy NUMERIC(5,4) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_risk_model_perf_tenant ON risk_model_performance(tenant_id);

CREATE TABLE IF NOT EXISTS risk_playbooks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  steps INTEGER DEFAULT 0,
  coverage NUMERIC(5,2) DEFAULT 0,
  status TEXT,
  automation_level VARCHAR(30) DEFAULT 'manual',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_risk_playbooks_tenant ON risk_playbooks(tenant_id);

CREATE TABLE IF NOT EXISTS risk_signal_clusters (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  cluster TEXT NOT NULL,
  confidence NUMERIC(5,4) DEFAULT 0,
  incidents INTEGER DEFAULT 0,
  trend VARCHAR(20) DEFAULT 'stable',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_risk_clusters_tenant ON risk_signal_clusters(tenant_id);

CREATE TABLE IF NOT EXISTS risk_interventions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  risk_alert_id TEXT NOT NULL REFERENCES risk_alerts(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  expected_outcome TEXT,
  owner TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_risk_interventions_alert ON risk_interventions(tenant_id, risk_alert_id);

-- ── Certificate verification ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS certificate_verifications (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  certificate_code TEXT NOT NULL,
  holder TEXT,
  credential TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'validated',
  method TEXT,
  latency TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cert_verifications_tenant ON certificate_verifications(tenant_id, status);

CREATE TABLE IF NOT EXISTS certificate_registries (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'live',
  uptime NUMERIC(5,2) DEFAULT 0,
  coverage TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cert_registries_tenant ON certificate_registries(tenant_id);

CREATE TABLE IF NOT EXISTS certificate_fraud_signals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  flag TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'low',
  volume INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cert_fraud_tenant ON certificate_fraud_signals(tenant_id);

CREATE TABLE IF NOT EXISTS certificate_issuances (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  certificate_code TEXT NOT NULL,
  student_id TEXT,
  exam_id TEXT,
  issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
  blockchain_anchor TEXT,
  revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMP,
  revoked_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, certificate_code)
);

CREATE TABLE IF NOT EXISTS certificate_audit_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  certificate_code TEXT,
  action VARCHAR(30),
  actor TEXT,
  details TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cert_audit_tenant ON certificate_audit_log(tenant_id, certificate_code);

INSERT INTO schema_migrations (version, description)
VALUES (24, 'Operational tables for tasks, approvals, alerts, security, risk alerts, certificates')
ON CONFLICT DO NOTHING;
