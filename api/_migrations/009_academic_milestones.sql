-- Migration 009: Academic milestones table.
-- Stores academic calendar milestones (term dates, holidays, events, exams)
-- per tenant, replacing the placeholder data in the calendar handler.

CREATE TABLE IF NOT EXISTS academic_milestones (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL,
  title       TEXT NOT NULL,
  date        TEXT NOT NULL,
  owner       TEXT NOT NULL DEFAULT 'Admin',
  status      TEXT NOT NULL DEFAULT 'Tentative' CHECK (status IN ('Tentative', 'Live', 'Locked', 'High priority')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academic_milestones_tenant_id ON academic_milestones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_academic_milestones_date ON academic_milestones(date);