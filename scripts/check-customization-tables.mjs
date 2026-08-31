import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_BIlfNjZg2Ko7@ep-restless-union-ai4sgr7d-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

const client = await pool.connect();
const r = await client.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public'
  AND table_name IN ('branding_configs','branding_audit_logs','grading_scales','grading_scale_bands','report_templates','report_template_fields')
  ORDER BY table_name
`);
console.log('Existing tables:', r.rows.map(x => x.table_name).join(', ') || 'none');
client.release();
await pool.end();
