-- Dedupe + renumber Kreatix Academy students to KTX/{YEAR}/{SEQ}.
-- 1. Back up the tenant's student rows.
-- 2. Migrate any dependent student_id refs from each SAM/2026 loser to its SCH/2024 twin.
-- 3. Delete the 20 duplicate SAM/2026 rows (all verified dependency-free).
-- 4. Renumber all 22 survivors KTX/<created year>/<seq> ordered by created_at.
-- 5. Sync denormalized admission_no copies (fee_records).
BEGIN;

CREATE TABLE IF NOT EXISTS students_backup_pre_ktx AS
  SELECT * FROM students WHERE tenant_id = 'f038d6a2-8957-45e6-a716-393dfd69173b';

CREATE TEMP TABLE id_map (loser text, winner text);
INSERT INTO id_map VALUES
  ('7ffe3b12-504f-4da4-8a35-808b428d9297','41eefcce-4c80-4bc4-ad1e-fdd8bc588d35'), -- Bright Anyanwu
  ('f45da188-1038-4d98-b4fc-7dd1d9589447','d620c1e9-f583-4bde-b2eb-1af46bdbef16'), -- Michael Okafor
  ('740562c4-c6b7-419d-9f69-e0d404d1dbb7','4db765c8-c4c9-4e76-91f3-458471a666d0'), -- Somtochukwu Okeke
  ('f7a8bb69-a53f-494a-90fc-dcc4b3e0a2c8','2777864e-d05f-477c-8236-24d7b2900ae6'), -- Favour Chukwu
  ('94163d50-0022-4e2b-af46-01d9faf87bb1','0946da3e-36e6-4a28-9a1b-b0e7fb4d2a00'), -- Kingsley Agu
  ('f9ff3a9c-1aa8-4d60-8df5-9c71785ecb98','5f61501e-bd26-415f-8b66-9149b0e86178'), -- Favour Ugwu
  ('067812d2-4cbf-4edc-8d90-7458cb2f3d00','e0077d90-fb67-4f9c-b88d-e685aaece47e'), -- Obinna Ugwu
  ('906eddc8-acb2-4d30-82ef-4d0e4b80ad8b','d344c2c6-9a0a-4b3c-b269-57593bff5ec8'), -- Ifeanyi Ibekwe
  ('75847c76-2cda-4b27-8dd3-716d6f3ab71b','ce12b253-eeb0-4432-a9a2-0b785cc8b723'), -- Favour Umeh
  ('50670d5f-b742-4bd2-8577-b8cefe573f8b','71a1787f-e9d6-4c2b-9349-39889010d48f'), -- Samuel Obi
  ('27ffa6f6-78c0-4366-8538-1d600f2f34a3','d39484d1-e4e4-4fe9-b036-1a8181464719'), -- Grace Okeke
  ('7a567547-4561-4519-9012-bf53e48bfb72','a6e7fc6b-d49d-4d4a-bb28-0353634fcc13'), -- Ngozi Ojukwu
  ('8d17ff9a-c6fc-43e8-b323-b5523e5c6b1f','df4a02d5-0073-446d-9bd4-c0d7a9d3fada'), -- Favour Onyeka
  ('4fff7a1d-9492-4478-9e10-89b4e9deea37','327ce61a-adc7-4559-8c8e-c43a10df06da'), -- Adaeze Mbah
  ('3672ae24-9401-47d2-a6e1-67a387045912','17e34b12-213d-4cbd-af62-f5ef767c2647'), -- Precious Ojukwu
  ('414e8d92-db59-4812-8bd9-9de574fb9ec6','863c22e4-2c37-4d7c-8c28-ca4f1a3ee7f8'), -- Jennifer Okafor
  ('78df0f50-eab3-46d5-aa63-3d510bf4f18f','0aeb9a44-9fef-4419-a80c-9124eb0bb9d8'), -- Ifeoma Ezeani (keeps score)
  ('a3fbacd2-2d08-4028-84d1-e4638111d7de','52ae2fbb-1603-423e-9328-f462a08a6df2'), -- Chiamaka Umeh
  ('848c8fe3-aa50-491d-8ae2-7ae35ba01c36','073560fc-676d-4574-bbe3-c00aa0ef3f46'), -- Amaka Chukwu
  ('f8b46767-003c-4c1a-930f-c2f5f020deeb','dd87d237-2a96-47ad-9997-df92e3548837'); -- Joy Nnamani

-- Re-point any dependent records loser -> winner across every table with student_id
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT table_name, udt_name FROM information_schema.columns
           WHERE column_name = 'student_id' AND table_schema = 'public' LOOP
    IF t.udt_name = 'uuid' THEN
      EXECUTE format('UPDATE %I x SET student_id = m.winner::uuid FROM id_map m WHERE x.student_id::text = m.loser', t.table_name);
    ELSE
      EXECUTE format('UPDATE %I x SET student_id = m.winner FROM id_map m WHERE x.student_id::text = m.loser', t.table_name);
    END IF;
  END LOOP;
END $$;

-- Remove the duplicate rows
DELETE FROM students WHERE id::text IN (SELECT loser FROM id_map);

-- Renumber survivors: KTX/<registration year>/<seq per year, ordered by registration>
WITH surv AS (
  SELECT id,
         EXTRACT(YEAR FROM created_at)::int AS yr,
         ROW_NUMBER() OVER (
           PARTITION BY EXTRACT(YEAR FROM created_at)
           ORDER BY created_at, id
         ) AS rn
  FROM students
  WHERE tenant_id = 'f038d6a2-8957-45e6-a716-393dfd69173b'
)
UPDATE students s
SET admission_no = 'KTX/' || surv.yr || '/' || lpad(surv.rn::text, 3, '0')
FROM surv WHERE s.id = surv.id;

-- Sync denormalized admission_no copies
UPDATE fee_records fr SET admission_no = s.admission_no
FROM students s WHERE fr.student_id::text = s.id::text;

COMMIT;

-- Verification
SELECT admission_no, name, class, created_at::date AS registered
FROM students
WHERE tenant_id = 'f038d6a2-8957-45e6-a716-393dfd69173b'
ORDER BY admission_no;
