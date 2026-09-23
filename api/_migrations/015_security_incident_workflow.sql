-- Migration 015: Security incident workflow columns.
-- security_events rows double as the incident response queue consumed by
-- IncidentManagement; add triage workflow fields.

ALTER TABLE security_events
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active'
    CHECK (status IN ('Active','Triage','Investigating','Resolved','Closed')),
  ADD COLUMN IF NOT EXISTS assignee TEXT,
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_security_events_tenant_status
  ON security_events(tenant_id, status, created_at DESC);
