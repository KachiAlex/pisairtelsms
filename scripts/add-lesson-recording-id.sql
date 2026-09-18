-- Adds server-side recording tracking to lessons
-- Run: docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -f scripts/add-lesson-recording-id.sql
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS recording_id text;
