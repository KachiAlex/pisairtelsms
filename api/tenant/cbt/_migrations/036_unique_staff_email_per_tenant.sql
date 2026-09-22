-- 036_unique_staff_email_per_tenant.sql
-- A person's email is their identity: duplicate staff rows with the same email
-- fragment attendance/timetable references and make login lookup ambiguous.
-- One staff record per email per tenant.

-- Remove unreferenced duplicate staff rows (keep the oldest row per email —
-- the one most likely to hold historical references).
DELETE FROM staff s
USING (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY tenant_id, lower(email) ORDER BY created_at ASC) AS rn
  FROM staff
  WHERE email IS NOT NULL
) d
WHERE s.id = d.id AND d.rn > 1
  AND NOT EXISTS (SELECT 1 FROM timetable_class_schedule_entries e WHERE e.teacher_id = s.id)
  AND NOT EXISTS (SELECT 1 FROM staff_attendance a WHERE a.staff_id = s.id)
  AND NOT EXISTS (SELECT 1 FROM staff_leave l WHERE l.staff_id = s.id)
  AND NOT EXISTS (SELECT 1 FROM staff_payroll p WHERE p.staff_id = s.id)
  AND NOT EXISTS (SELECT 1 FROM staff_tasks t WHERE t.staff_id = s.id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_tenant_email
  ON staff (tenant_id, lower(email))
  WHERE email IS NOT NULL;
