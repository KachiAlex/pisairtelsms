-- Normalize class names to the canonical 'BAND N' spelling everywhere.
-- The classes table is the source of truth (name + arm). Dependent tables
-- store either the base name ('JSS 1') or the display form ('JSS 1 A').
-- Both are normalized so 'JSS1'/'JSS1 A'/'jss1' collapse to canonical form.

-- 1. Dependent tables that store the class name as text
UPDATE teacher_allocation_slots
SET class = TRIM(REGEXP_REPLACE(class, '^([A-Za-z]+)\s*([0-9]+)\s*', '\1 \2 '))
WHERE class ~ '^[A-Za-z]+\s*[0-9]';

UPDATE student_scores
SET class = TRIM(REGEXP_REPLACE(class, '^([A-Za-z]+)\s*([0-9]+)\s*', '\1 \2 '))
WHERE class ~ '^[A-Za-z]+\s*[0-9]';

UPDATE exams
SET class = TRIM(REGEXP_REPLACE(class, '^([A-Za-z]+)\s*([0-9]+)\s*', '\1 \2 '))
WHERE class ~ '^[A-Za-z]+\s*[0-9]' AND deleted_at IS NULL;

UPDATE students
SET class = TRIM(REGEXP_REPLACE(class, '^([A-Za-z]+)\s*([0-9]+)\s*', '\1 \2 '))
WHERE class ~ '^[A-Za-z]+\s*[0-9]' AND deleted_at IS NULL;

UPDATE attendance_records
SET class = TRIM(REGEXP_REPLACE(class, '^([A-Za-z]+)\s*([0-9]+)\s*', '\1 \2 '))
WHERE class ~ '^[A-Za-z]+\s*[0-9]';

UPDATE compiled_results
SET class = TRIM(REGEXP_REPLACE(class, '^([A-Za-z]+)\s*([0-9]+)\s*', '\1 \2 '))
WHERE class ~ '^[A-Za-z]+\s*[0-9]';

UPDATE promotion_records
SET to_class = TRIM(REGEXP_REPLACE(to_class, '^([A-Za-z]+)\s*([0-9]+)\s*', '\1 \2 ')),
    from_class = TRIM(REGEXP_REPLACE(from_class, '^([A-Za-z]+)\s*([0-9]+)\s*', '\1 \2 '))
WHERE to_class ~ '^[A-Za-z]+\s*[0-9]' OR from_class ~ '^[A-Za-z]+\s*[0-9]';

UPDATE fee_records
SET class = TRIM(REGEXP_REPLACE(class, '^([A-Za-z]+)\s*([0-9]+)\s*', '\1 \2 '))
WHERE class ~ '^[A-Za-z]+\s*[0-9]';

-- 2. classes table: soft-delete rows whose normalized name collides with an
--    already-canonical row for the same arm (e.g. 'JSS1'/'A' when 'JSS 1'/'A'
--    exists), then normalize the survivors. Dependents were already repointed
--    above, so the duplicate row is no longer referenced.
UPDATE classes c
SET deleted_at = NOW()
WHERE c.deleted_at IS NULL
  AND c.name <> TRIM(REGEXP_REPLACE(c.name, '^([A-Za-z]+)\s*([0-9]+)\s*', '\1 \2 '))
  AND EXISTS (
    SELECT 1 FROM classes c2
    WHERE c2.tenant_id = c.tenant_id
      AND c2.deleted_at IS NULL
      AND c2.id <> c.id
      AND c2.arm IS NOT DISTINCT FROM c.arm
      AND c2.name = TRIM(REGEXP_REPLACE(c.name, '^([A-Za-z]+)\s*([0-9]+)\s*', '\1 \2 '))
  );

UPDATE classes
SET name = TRIM(REGEXP_REPLACE(name, '^([A-Za-z]+)\s*([0-9]+)\s*', '\1 \2 '))
WHERE deleted_at IS NULL AND name ~ '^[A-Za-z]+\s*[0-9]';

INSERT INTO schema_migrations (version, description)
VALUES (30, 'Normalize class names to canonical spelling across all tables')
ON CONFLICT (version) DO NOTHING;
