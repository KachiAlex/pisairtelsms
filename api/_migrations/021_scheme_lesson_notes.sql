-- 021_scheme_lesson_notes.sql
-- Lesson plan / lesson note management:
--   scheme_topics  — admin-managed scheme of work per subject/class/term/week
--   lesson_notes   — teacher-written notes with draft→submitted→approved|
--                    returned workflow and taught-tracking

CREATE TABLE IF NOT EXISTS scheme_topics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT NOT NULL,
  subject     TEXT NOT NULL,
  class       TEXT NOT NULL,
  session     TEXT NOT NULL,           -- e.g. '2025/2026'
  term        TEXT NOT NULL,           -- e.g. 'First Term'
  week        INTEGER NOT NULL CHECK (week BETWEEN 1 AND 20),
  topic       TEXT NOT NULL,
  description TEXT,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, subject, class, session, term, week)
);

CREATE TABLE IF NOT EXISTS lesson_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  staff_id        TEXT NOT NULL,
  staff_name      TEXT,
  subject         TEXT NOT NULL,
  class           TEXT NOT NULL,
  session         TEXT NOT NULL,
  term            TEXT NOT NULL,
  week            INTEGER NOT NULL CHECK (week BETWEEN 1 AND 20),
  topic           TEXT,
  scheme_topic_id UUID REFERENCES scheme_topics(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  link            TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','submitted','approved','returned')),
  submitted_at    TIMESTAMPTZ,
  reviewed_by     TEXT,
  review_comment  TEXT,
  reviewed_at     TIMESTAMPTZ,
  taught_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lesson_notes_staff   ON lesson_notes (tenant_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_status  ON lesson_notes (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_scope   ON lesson_notes (tenant_id, subject, class, session, term);
CREATE INDEX IF NOT EXISTS idx_scheme_topics_scope  ON scheme_topics (tenant_id, subject, class, session, term);
