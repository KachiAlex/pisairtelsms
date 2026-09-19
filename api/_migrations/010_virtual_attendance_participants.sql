-- Virtual attendance identity fix:
-- student_id now stores the real student/staff/parent ID (from the JWT);
-- the RealtimeKit participant UUID is kept separately for diagnostics.

ALTER TABLE virtual_attendance ADD COLUMN IF NOT EXISTS participant_id TEXT;
ALTER TABLE virtual_attendance ADD COLUMN IF NOT EXISTS participant_name TEXT;
ALTER TABLE virtual_attendance ADD COLUMN IF NOT EXISTS participant_role TEXT;
