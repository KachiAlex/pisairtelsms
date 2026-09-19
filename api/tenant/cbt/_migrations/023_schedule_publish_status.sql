-- Draft/publish lifecycle for class timetables.
-- Derived views (student/parent/staff) only expose published schedules.

ALTER TABLE timetable_class_schedules
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'draft';
ALTER TABLE timetable_class_schedules
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;
ALTER TABLE timetable_class_schedules
  ADD COLUMN IF NOT EXISTS published_by TEXT;

CREATE INDEX IF NOT EXISTS idx_tt_class_schedules_status
  ON timetable_class_schedules(tenant_id, term_id, status);

INSERT INTO schema_migrations (version, description)
VALUES (23, 'Add publish status to class schedules')
ON CONFLICT DO NOTHING;
