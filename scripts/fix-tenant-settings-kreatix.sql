-- Complete the tenant_settings per-tenant migration and seed Kreatix Academy's
-- own settings row (admission numbers: KTX/{YEAR}/{SEQ}, 3-digit sequence).

-- Assign the legacy shared row to default-tenant
UPDATE tenant_settings SET tenant_id = 'default-tenant' WHERE tenant_id IS NULL;

-- Give id a sequence so per-tenant inserts don't collide on the PK (default 1)
CREATE SEQUENCE IF NOT EXISTS tenant_settings_id_seq;
ALTER TABLE tenant_settings ALTER COLUMN id SET DEFAULT nextval('tenant_settings_id_seq');
SELECT setval('tenant_settings_id_seq', COALESCE((SELECT MAX(id) FROM tenant_settings), 1));

-- One settings row per tenant
CREATE UNIQUE INDEX IF NOT EXISTS tenant_settings_tenant_id_key ON tenant_settings (tenant_id);

-- Kreatix Academy settings: own row with KTX admission-number format
INSERT INTO tenant_settings (tenant_id, settings)
SELECT 'f038d6a2-8957-45e6-a716-393dfd69173b',
       settings || jsonb_build_object(
         'schoolName', 'Kreatix Academy',
         'admissionNoFormat', 'KTX/{YEAR}/{SEQ}',
         'admissionNoDigits', 3
       )
FROM tenant_settings WHERE tenant_id = 'default-tenant'
ON CONFLICT (tenant_id) DO UPDATE SET
  settings = tenant_settings.settings || jsonb_build_object(
    'schoolName', 'Kreatix Academy',
    'admissionNoFormat', 'KTX/{YEAR}/{SEQ}',
    'admissionNoDigits', 3
  );
