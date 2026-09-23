-- 013_class_form_teacher.sql
-- Form teacher (class master) per class arm. When set, only that teacher
-- (or a tenant admin) may compile the class's results.
ALTER TABLE classes ADD COLUMN IF NOT EXISTS form_teacher_id TEXT;

CREATE INDEX IF NOT EXISTS idx_classes_form_teacher
  ON classes(form_teacher_id)
  WHERE form_teacher_id IS NOT NULL;
