-- Seed default terms for demo-tenant-001
INSERT INTO timetable_terms (id, tenant_id, name, start_date, end_date, academic_year)
VALUES
  ('term-001', 'demo-tenant-001', '1st Term', '2024-09-01', '2024-12-15', '2024/2025'),
  ('term-002', 'demo-tenant-001', '2nd Term', '2025-01-05', '2025-04-10', '2024/2025'),
  ('term-003', 'demo-tenant-001', '3rd Term', '2025-04-28', '2025-07-15', '2024/2025')
ON CONFLICT DO NOTHING;

INSERT INTO schema_migrations (version, description)
VALUES (11, 'Seed default timetable terms')
ON CONFLICT DO NOTHING;
