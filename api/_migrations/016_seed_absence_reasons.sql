-- Migration 016: Seed a default absence-reason catalog per tenant.
-- absence_reasons is the staff-managed catalog feeding the reason dropdown
-- in attendance entry and the parent/student attendance views. New tenants
-- start empty; this seeds standard reasons for every existing tenant that
-- has none yet, and the same defaults can be added via the admin UI.

INSERT INTO absence_reasons (id, tenant_id, reason_name, description, is_active, created_at)
SELECT
  'ar_' || t.id::text || '_' || lower(regexp_replace(d.reason_name, '[^a-zA-Z0-9]+', '_', 'g')),
  t.id::text,
  d.reason_name,
  d.description,
  TRUE,
  NOW()
FROM tenants t
CROSS JOIN (VALUES
  ('Illness',            'Student was unwell'),
  ('Medical appointment','Doctor, dentist, or hospital visit'),
  ('Family emergency',   'Family emergency or bereavement'),
  ('Family travel',      'Travel or family commitment'),
  ('Religious observance','Religious event or observance'),
  ('Weather/transport',  'Transport or weather-related absence'),
  ('School activity',    'Approved school event, excursion, or competition'),
  ('Suspension',         'Disciplinary suspension'),
  ('Unexcused',          'Absence without a valid reason')
) AS d(reason_name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM absence_reasons ar
  WHERE ar.tenant_id = t.id::text AND ar.reason_name = d.reason_name
);
