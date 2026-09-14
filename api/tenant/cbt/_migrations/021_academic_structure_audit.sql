-- Academic Structure Audit Log
-- Created: 2026-09-14
-- Tracks create/update/delete operations on classes, subjects, departments,
-- programs, and milestones for accountability and traceability.

CREATE TABLE IF NOT EXISTS academic_structure_audit (
  id          SERIAL PRIMARY KEY,
  tenant_id   TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('class', 'subject', 'department', 'program', 'milestone')),
  entity_id   TEXT,
  action      TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  old_values  JSONB,
  new_values  JSONB,
  actor_id    TEXT,
  actor_name TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academic_structure_audit_tenant ON academic_structure_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_academic_structure_audit_entity ON academic_structure_audit(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_academic_structure_audit_action ON academic_structure_audit(action);

INSERT INTO schema_migrations (version, description)
VALUES (21, 'Create academic_structure_audit table')
ON CONFLICT (version) DO NOTHING;
