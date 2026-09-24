-- 022_lesson_note_attachments.sql
-- Optional file attachment on lesson notes, stored as a base64 data URL
-- (consistent with proctoring_snapshots — no external object storage yet).

ALTER TABLE lesson_notes
  ADD COLUMN IF NOT EXISTS attachment_data TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;
