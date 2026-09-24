-- 020_proctoring_snapshots.sql
-- Periodic webcam captures for exams with security_settings.require_camera.
-- Kept out of proctoring_logs so the (potentially large) image payloads do
-- not bloat the event log that staff viewers page through.

CREATE TABLE IF NOT EXISTS proctoring_snapshots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id     UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id  TEXT NOT NULL,
  image_data  TEXT NOT NULL,                 -- data:image/jpeg;base64,... capture
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proctoring_snapshots_exam_student
  ON proctoring_snapshots (exam_id, student_id, captured_at);
