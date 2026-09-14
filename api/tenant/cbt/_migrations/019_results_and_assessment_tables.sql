-- 019_results_and_assessment_tables.sql
-- Proper migration for Results & Assessment core tables.
-- These tables were previously created at runtime via ensureXxxTable() calls;
-- this migration makes them explicit and idempotent.

-- ─── grading_scales class-level index ───────────────────────────────
-- Supports per-class-level scale lookups: WHERE tenant_id=$1 AND status='live' AND type=$2
CREATE INDEX IF NOT EXISTS idx_grading_scales_tenant_status_type
  ON grading_scales(tenant_id, status, type);

-- ─── student_scores ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_scores (
  id                      TEXT PRIMARY KEY,
  tenant_id               TEXT NOT NULL,
  student_id              TEXT NOT NULL,
  subject                 TEXT NOT NULL,
  academic_session        TEXT NOT NULL,
  term                    TEXT NOT NULL,
  ca_score                NUMERIC(5,2) DEFAULT 0,
  exam_score              NUMERIC(5,2) DEFAULT 0,
  total_score             NUMERIC(5,2) DEFAULT 0,
  attendance_percentage   NUMERIC(5,2) DEFAULT 0,
  class                   TEXT,
  tests_score             NUMERIC(5,2) DEFAULT 0,
  assignments_score       NUMERIC(5,2) DEFAULT 0,
  projects_score          NUMERIC(5,2) DEFAULT 0,
  exams_score             NUMERIC(5,2) DEFAULT 0,
  submitted_by            TEXT,
  submitted_by_name       TEXT,
  submission_status       TEXT DEFAULT 'submitted',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add breakdown columns if table existed with old schema
ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS tests_score NUMERIC DEFAULT 0;
ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS assignments_score NUMERIC DEFAULT 0;
ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS projects_score NUMERIC DEFAULT 0;
ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS exams_score NUMERIC DEFAULT 0;
ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS submitted_by TEXT;
ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS submitted_by_name TEXT;
ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS submission_status TEXT DEFAULT 'submitted';

-- Drop legacy check constraint that limited ca_score to <= 100
ALTER TABLE student_scores DROP CONSTRAINT IF EXISTS student_scores_ca_score_check;

-- Unique constraint for ON CONFLICT upserts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'student_scores_unique_composite'
      AND conrelid = 'student_scores'::regclass
  ) THEN
    ALTER TABLE student_scores
      ADD CONSTRAINT student_scores_unique_composite
      UNIQUE (tenant_id, student_id, subject, academic_session, term);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_student_scores_tenant ON student_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_scores_student ON student_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_student_scores_class ON student_scores(class);
CREATE INDEX IF NOT EXISTS idx_student_scores_session_term ON student_scores(academic_session, term);

-- ─── compiled_results ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compiled_results (
  id                      TEXT PRIMARY KEY,
  tenant_id               TEXT NOT NULL,
  student_id              TEXT NOT NULL,
  subject                 TEXT NOT NULL,
  class                   TEXT NOT NULL,
  academic_session        TEXT NOT NULL,
  term                    TEXT NOT NULL,
  total_score             NUMERIC(5,2) DEFAULT 0,
  grade                   TEXT,
  remark                  TEXT,
  class_average           NUMERIC(5,2) DEFAULT 0,
  highest_score           NUMERIC(5,2) DEFAULT 0,
  lowest_score            NUMERIC(5,2) DEFAULT 0,
  subject_position        INTEGER DEFAULT 0,
  overall_total           NUMERIC(6,2) DEFAULT 0,
  overall_average         NUMERIC(5,2) DEFAULT 0,
  class_position          INTEGER DEFAULT 0,
  total_students          INTEGER DEFAULT 0,
  attendance_percent      NUMERIC(5,2) DEFAULT 0,
  principal_comment       TEXT,
  status                  TEXT DEFAULT 'compiled',
  compiled_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, student_id, subject, academic_session, term)
);

CREATE INDEX IF NOT EXISTS idx_compiled_results_tenant ON compiled_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compiled_results_status ON compiled_results(status);
CREATE INDEX IF NOT EXISTS idx_compiled_results_session_term ON compiled_results(academic_session, term);
CREATE INDEX IF NOT EXISTS idx_compiled_results_class ON compiled_results(class);

-- ─── ca_config ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ca_config (
  id                      SERIAL PRIMARY KEY,
  tenant_id               TEXT UNIQUE NOT NULL,
  published_config        JSONB NOT NULL,
  draft_config            JSONB,
  status                  TEXT NOT NULL DEFAULT 'published',
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at            TIMESTAMPTZ
);

ALTER TABLE ca_config ADD COLUMN IF NOT EXISTS published_config JSONB;
ALTER TABLE ca_config ADD COLUMN IF NOT EXISTS draft_config JSONB;
ALTER TABLE ca_config ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE ca_config ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE ca_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── ca_config_audit ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ca_config_audit (
  id                      SERIAL PRIMARY KEY,
  tenant_id               TEXT NOT NULL,
  action                  TEXT NOT NULL,
  config                  JSONB,
  actor_id                TEXT,
  actor_name              TEXT,
  summary                 TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ca_config_audit_tenant ON ca_config_audit(tenant_id);

-- ─── ca_config_overrides ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ca_config_overrides (
  id                      SERIAL PRIMARY KEY,
  tenant_id               TEXT NOT NULL,
  class_name              TEXT NOT NULL,
  subject_name            TEXT,
  config                  JSONB NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, class_name, subject_name)
);

-- ─── student_scores_audit ───────────────────────────────────────────
-- Tracks every insert/update/delete on student_scores for academic integrity.
CREATE TABLE IF NOT EXISTS student_scores_audit (
  id                      SERIAL PRIMARY KEY,
  tenant_id               TEXT NOT NULL,
  student_id              TEXT NOT NULL,
  subject                 TEXT NOT NULL,
  academic_session        TEXT NOT NULL,
  term                    TEXT NOT NULL,
  action                  TEXT NOT NULL,          -- 'insert' | 'update' | 'delete'
  old_values              JSONB,
  new_values              JSONB,
  actor_id                TEXT,
  actor_name              TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_scores_audit_tenant ON student_scores_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_scores_audit_student ON student_scores_audit(student_id);
CREATE INDEX IF NOT EXISTS idx_student_scores_audit_session_term ON student_scores_audit(academic_session, term);

-- ─── student_scores: is_absent column ───────────────────────────────
-- Allows marking a student as absent for a subject (excluded from averages/rankings).
ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS is_absent BOOLEAN DEFAULT false;

-- ─── compiled_results: gpa_weight and credit_hours ──────────────────
-- Supports proper GPA computation: GPA = Σ(gpa_weight × credit_hours) / Σ(credit_hours)
ALTER TABLE compiled_results ADD COLUMN IF NOT EXISTS gpa_weight NUMERIC(3,2) DEFAULT 0;
ALTER TABLE compiled_results ADD COLUMN IF NOT EXISTS credit_hours INTEGER DEFAULT 1;
