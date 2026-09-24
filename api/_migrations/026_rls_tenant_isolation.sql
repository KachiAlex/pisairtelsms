-- 026_rls_tenant_isolation.sql
-- Defense-in-depth tenant isolation: a restricted NOLOGIN role + RLS
-- policies on every table that carries tenant_id. At runtime the query
-- helpers SET LOCAL ROLE app_user + app.tenant_id inside a transaction
-- for authenticated tenant requests, so a missing/mismatched tenant filter
-- returns zero rows instead of leaking. Owner connections (migrations,
-- cron, unauthenticated/login paths, super-admin) are unaffected — RLS
-- does not apply to table owners without FORCE.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN;
  END IF;
END $$;

-- Let the connecting owner role assume app_user via SET LOCAL ROLE.
DO $$
BEGIN
  EXECUTE format('GRANT app_user TO %I', current_user);
END $$;

GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;

-- Enable RLS + a fail-closed tenant policy on every base table that has a
-- tenant_id column. Missing app.tenant_id setting → NULL → no rows match.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables tb
      ON tb.table_name = c.table_name AND tb.table_schema = c.table_schema
    WHERE c.column_name = 'tenant_id'
      AND c.table_schema = 'public'
      AND tb.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t.table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t.table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
         USING (COALESCE(tenant_id::text, '''') = current_setting(''app.tenant_id'', true))
         WITH CHECK (COALESCE(tenant_id::text, '''') = current_setting(''app.tenant_id'', true))',
      t.table_name
    );
  END LOOP;
END $$;
