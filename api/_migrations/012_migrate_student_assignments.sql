-- 012_migrate_student_assignments.sql
-- Reconciles the legacy per-student `student_assignments` table into the
-- canonical `assignments` + `submissions` model, then drops it.
--
-- Legacy rows have no tenant_id — it is resolved through the student row.
-- For each distinct (tenant, subject, teacher, class audience, title,
-- due_date) we find-or-create a virtual_classrooms shell and one canonical
-- assignment, then attach a submission for every legacy row that had been
-- submitted or graded. Idempotent: re-running skips submissions already
-- linked via the `legacy_student_assignment_id` marker column.

ALTER TABLE IF EXISTS submissions ADD COLUMN IF NOT EXISTS legacy_student_assignment_id TEXT;
ALTER TABLE IF EXISTS assignments ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'homework';
ALTER TABLE IF EXISTS virtual_classrooms ADD COLUMN IF NOT EXISTS class_level TEXT;

DO $$
DECLARE
  legacy RECORD;
  v_tenant TEXT;
  v_class TEXT;
  v_arm TEXT;
  v_subject_id TEXT;
  v_class_arm_id TEXT;
  v_classroom TEXT;
  v_assignment TEXT;
  v_submission_status TEXT;
  v_is_late BOOLEAN;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_assignments') THEN
    RETURN;
  END IF;

  FOR legacy IN SELECT * FROM student_assignments LOOP
    -- Resolve tenant + class via the student.
    SELECT tenant_id, class, arm INTO v_tenant, v_class, v_arm
      FROM students WHERE id = legacy.student_id LIMIT 1;
    CONTINUE WHEN v_tenant IS NULL;

    -- Resolve subject id if the subject exists.
    SELECT id::text INTO v_subject_id FROM subjects
      WHERE tenant_id = v_tenant AND LOWER(name) = LOWER(COALESCE(legacy.subject, ''))
      LIMIT 1;

    -- Resolve the student's class-arm row if it exists.
    SELECT c.id::text INTO v_class_arm_id FROM classes c
      WHERE c.tenant_id = v_tenant AND LOWER(c.name) = LOWER(COALESCE(v_class, ''))
        AND LOWER(COALESCE(c.arm, '')) = LOWER(COALESCE(v_arm, ''))
      LIMIT 1;

    -- Find-or-create a classroom shell for this audience.
    SELECT vc.id::text INTO v_classroom FROM virtual_classrooms vc
      WHERE vc.tenant_id = v_tenant
        AND COALESCE(vc.subject_id::text, '') = COALESCE(v_subject_id, '')
        AND COALESCE(vc.teacher_id, '') = COALESCE(legacy.teacher_id, '')
        AND (
          (v_class_arm_id IS NOT NULL AND vc.class_arm_id = v_class_arm_id)
          OR (v_class_arm_id IS NULL AND vc.class_level IS NOT NULL AND LOWER(vc.class_level) = LOWER(COALESCE(v_class, '')))
        )
      LIMIT 1;

    IF v_classroom IS NULL THEN
      INSERT INTO virtual_classrooms (tenant_id, subject_id, class_arm_id, class_level, teacher_id, name, status)
      VALUES (
        v_tenant, v_subject_id, v_class_arm_id,
        CASE WHEN v_class_arm_id IS NULL THEN v_class ELSE NULL END,
        legacy.teacher_id,
        COALESCE(legacy.subject, 'General') || ' — ' || COALESCE(v_class, 'Unknown') || COALESCE(' ' || v_arm, ''),
        'active'
      )
      RETURNING id::text INTO v_classroom;
    END IF;

    -- Find-or-create the canonical assignment for this classroom+title+due.
    SELECT a.id::text INTO v_assignment FROM assignments a
      WHERE a.classroom_id = v_classroom AND a.tenant_id = v_tenant
        AND a.title = legacy.title
        AND COALESCE(a.due_date::date, '9999-12-31'::date) = COALESCE(legacy.due_date, '9999-12-31'::date)
      LIMIT 1;

    IF v_assignment IS NULL THEN
      INSERT INTO assignments (classroom_id, tenant_id, title, instructions, points, due_date, created_by, is_published, type)
      VALUES (v_classroom, v_tenant, legacy.title, legacy.description,
              COALESCE(legacy.max_score, 100), legacy.due_date, legacy.teacher_id, true,
              COALESCE(legacy.type, 'homework'))
      RETURNING id::text INTO v_assignment;
    END IF;

    -- Attach a submission when the legacy row was submitted or graded.
    v_submission_status := CASE
      WHEN legacy.score IS NOT NULL THEN 'graded'
      WHEN legacy.status IN ('submitted', 'graded', 'returned', 'completed') OR legacy.submitted_at IS NOT NULL THEN 'submitted'
      ELSE NULL END;
    v_is_late := legacy.due_date IS NOT NULL
      AND COALESCE(legacy.submitted_at, legacy.created_at, NOW())::date > legacy.due_date;

    IF v_submission_status IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM submissions s WHERE s.legacy_student_assignment_id = legacy.id) THEN
      INSERT INTO submissions (
        assignment_id, student_id, tenant_id, submitted_at, is_late,
        grade, feedback, status, legacy_student_assignment_id
      ) VALUES (
        v_assignment, legacy.student_id, v_tenant,
        COALESCE(legacy.submitted_at, legacy.created_at, NOW()),
        v_is_late, legacy.score, legacy.feedback, v_submission_status, legacy.id
      )
      ON CONFLICT (assignment_id, student_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

DROP TABLE IF EXISTS student_assignments;
