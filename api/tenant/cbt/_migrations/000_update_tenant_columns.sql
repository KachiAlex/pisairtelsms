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

-- Convert attendance tables tenant/user columns to TEXT
ALTER TABLE IF EXISTS absence_reasons
  DROP CONSTRAINT IF EXISTS absence_reasons_tenant_id_fkey;

ALTER TABLE IF EXISTS absence_reasons
  ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text;

ALTER TABLE IF EXISTS biometric_devices
  DROP CONSTRAINT IF EXISTS biometric_devices_tenant_id_fkey;

ALTER TABLE IF EXISTS biometric_devices
  ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text;

ALTER TABLE IF EXISTS attendance_records
  DROP CONSTRAINT IF EXISTS attendance_records_tenant_id_fkey;

ALTER TABLE IF EXISTS attendance_records
  ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text,
  ALTER COLUMN user_id TYPE TEXT USING user_id::text,
  ALTER COLUMN created_by TYPE TEXT USING created_by::text,
  ALTER COLUMN updated_by TYPE TEXT USING updated_by::text;

ALTER TABLE IF EXISTS attendance_audit_trail
  ALTER COLUMN changed_by TYPE TEXT USING changed_by::text;

-- Convert notification tables tenant/user columns to TEXT
ALTER TABLE IF EXISTS guardian_notifications
  DROP CONSTRAINT IF EXISTS guardian_notifications_tenant_id_fkey;

ALTER TABLE IF EXISTS guardian_notifications
  ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text,
  ALTER COLUMN created_by TYPE TEXT USING created_by::text;

ALTER TABLE IF EXISTS bulk_notification_jobs
  DROP CONSTRAINT IF EXISTS bulk_notification_jobs_tenant_id_fkey;

ALTER TABLE IF EXISTS bulk_notification_jobs
  ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text,
  ALTER COLUMN created_by TYPE TEXT USING created_by::text;

ALTER TABLE IF EXISTS notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_tenant_id_fkey;

ALTER TABLE IF EXISTS notification_preferences
  ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text;

-- Convert students table tenant_id to TEXT
ALTER TABLE IF EXISTS students
  DROP CONSTRAINT IF EXISTS students_tenant_id_fkey;

ALTER TABLE IF EXISTS students
  ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text;
