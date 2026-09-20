-- The entity_type CHECK predates student auditing; api/tenant/students.ts
-- writes entity_type='student', which was rejected and silently dropped.
ALTER TABLE academic_structure_audit
  DROP CONSTRAINT IF EXISTS academic_structure_audit_entity_type_check;

ALTER TABLE academic_structure_audit
  ADD CONSTRAINT academic_structure_audit_entity_type_check
  CHECK (entity_type = ANY (ARRAY[
    'class'::text, 'subject'::text, 'department'::text,
    'program'::text, 'milestone'::text, 'student'::text
  ]));
