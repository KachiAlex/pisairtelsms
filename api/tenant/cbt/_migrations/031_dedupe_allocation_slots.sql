-- Resolve multi-teacher allocation conflicts and prevent recurrence.
--
-- After class-name normalization (030), duplicate slot generations that
-- differed only by spelling ('JSS1' vs 'JSS 1') became true duplicates with
-- different teachers. Newest wins: the later generation superseded the
-- earlier one for overlapping subjects.

-- Keep the most recently created slot per (tenant, class, subject, day).
DELETE FROM teacher_allocation_slots a
USING teacher_allocation_slots b
WHERE a.tenant_id = b.tenant_id
  AND a.class = b.class
  AND a.subject = b.subject
  AND a.day_of_week IS NOT DISTINCT FROM b.day_of_week
  AND (a.created_at < b.created_at
       OR (a.created_at = b.created_at AND a.id < b.id));

-- Hard guarantee: one slot per (tenant, class, subject, day).
-- COALESCE treats NULL day_of_week (matrix slots) as a single group.
CREATE UNIQUE INDEX IF NOT EXISTS teacher_allocation_slots_class_subject_day_uniq
  ON teacher_allocation_slots (tenant_id, class, subject, COALESCE(day_of_week, -1));

INSERT INTO schema_migrations (version, description)
VALUES (31, 'Dedupe allocation slots (newest wins) + unique index per class/subject/day')
ON CONFLICT (version) DO NOTHING;
