-- Drop abandoned first-pass tables. Zero rows, zero code references, no
-- inbound foreign keys (verified). Replacements: compiled_results,
-- attendance_records, and calendar derivation from timetable_terms/holidays/
-- milestones. RLS policies on these tables drop with them.
DROP TABLE IF EXISTS results;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS school_events;
