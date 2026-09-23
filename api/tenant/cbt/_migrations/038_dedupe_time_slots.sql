-- Dedupe timetable_time_slots: identical (tenant_id, name, sequence) rows were
-- created by re-running the slot setup, which doubled the effective grid and
-- broke teacher-conflict detection (conflicts are keyed on slot id — the two
-- copies of "Period 1" were treated as different slots).
-- For each duplicate group keep the row with the most schedule entries (then
-- earliest created), remap entries onto the kept id, delete the rest.

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tenant_id, name, sequence,
           (array_agg(id ORDER BY entry_cnt DESC, created_at ASC, id))[1] AS keep_id,
           array_agg(id ORDER BY entry_cnt DESC, created_at ASC, id) AS ids
    FROM (
      SELECT t.*,
             (SELECT COUNT(*) FROM timetable_class_schedule_entries e
               WHERE e.time_slot_id = t.id) AS entry_cnt
      FROM timetable_time_slots t
    ) t
    GROUP BY tenant_id, name, sequence
    HAVING COUNT(*) > 1
  LOOP
    UPDATE timetable_class_schedule_entries
      SET time_slot_id = r.keep_id
      WHERE time_slot_id = ANY(r.ids) AND time_slot_id <> r.keep_id;
    DELETE FROM timetable_time_slots
      WHERE id = ANY(r.ids) AND id <> r.keep_id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS timetable_time_slots_tenant_sequence_key
  ON timetable_time_slots (tenant_id, sequence);
