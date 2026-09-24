-- 019_exam_taking_progress.sql
-- Support the student exam player: persist draft answers (autosave/resume)
-- and the server-side start timestamp used to compute time remaining.

ALTER TABLE student_exam_progress
  ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}'::jsonb;

ALTER TABLE student_exam_progress
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
