-- Fix course_materials table to support the Digital Learning 2.0 schema
-- This only adds the missing columns the api/tenant/course-materials.ts endpoint expects.

ALTER TABLE course_materials
  ADD COLUMN IF NOT EXISTS classroom_id TEXT,
  ADD COLUMN IF NOT EXISTS lesson_id TEXT,
  ADD COLUMN IF NOT EXISTS tenant_id TEXT,
  ADD COLUMN IF NOT EXISTS uploaded_by TEXT,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_materials_classroom ON course_materials(classroom_id);
CREATE INDEX IF NOT EXISTS idx_materials_tenant ON course_materials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_materials_lesson ON course_materials(lesson_id);
