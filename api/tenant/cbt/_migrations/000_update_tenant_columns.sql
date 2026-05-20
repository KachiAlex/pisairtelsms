-- Migration 000: Align tenant/user column types and add missing metadata columns
-- Ensures existing databases match the updated schema expectations

-- Convert questions_bank tenant_id/created_by to TEXT
ALTER TABLE IF EXISTS questions_bank
  ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text,
  ALTER COLUMN created_by TYPE TEXT USING created_by::text;

-- Ensure question_tags has deleted_at and TEXT columns
ALTER TABLE IF EXISTS question_tags
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
  ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text,
  ALTER COLUMN created_by TYPE TEXT USING created_by::text;

-- Convert question_tag_links tenant_id to TEXT
ALTER TABLE IF EXISTS question_tag_links
  ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text;

-- Convert exams tenant_id/created_by to TEXT
ALTER TABLE IF EXISTS exams
  ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text,
  ALTER COLUMN created_by TYPE TEXT USING created_by::text;

-- Convert student_exam_progress student_id to TEXT
ALTER TABLE IF EXISTS student_exam_progress
  ALTER COLUMN student_id TYPE TEXT USING student_id::text;

-- Convert exam_results student_id to TEXT
ALTER TABLE IF EXISTS exam_results
  ALTER COLUMN student_id TYPE TEXT USING student_id::text;

-- Convert proctoring_logs student_id to TEXT
ALTER TABLE IF EXISTS proctoring_logs
  ALTER COLUMN student_id TYPE TEXT USING student_id::text;

-- Convert audit_logs user_id to TEXT
ALTER TABLE IF EXISTS audit_logs
  ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- Convert offline_sync_queue student_id to TEXT
ALTER TABLE IF EXISTS offline_sync_queue
  ALTER COLUMN student_id TYPE TEXT USING student_id::text;
