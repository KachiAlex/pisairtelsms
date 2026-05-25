import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

const { Pool } = pg;
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const TARGET_TABLES = [
  'student_health_records',
  'student_vaccinations',
  'student_allergies',
  'student_emergency_contacts',
  'behavioral_incidents',
  'behavioral_recognition',
  'teacher_comments',
];

async function run() {
  const client = await pool.connect();
  try {
    console.log('Connected to database');

    const check = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1)`,
      [TARGET_TABLES]
    );
    const existing = check.rows.map(r => r.table_name);
    console.log('Already existing tables:', existing.length > 0 ? existing.join(', ') : 'none');

    if (existing.length === TARGET_TABLES.length) {
      console.log('All 7 tables already exist. Migration already applied.');
      return;
    }

    const sqlPath = join(__dirname, '..', 'api', 'tenant', 'cbt', '_migrations', '013_create_health_behavioral_schema.sql');
    const migrationSQL = readFileSync(sqlPath, 'utf8');

    console.log('Applying migration 013_create_health_behavioral_schema...');
    await client.query('BEGIN');
    try {
      await client.query(migrationSQL);
      await client.query('COMMIT');
      console.log('Migration committed.');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    const verify = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1)
       ORDER BY table_name`,
      [TARGET_TABLES]
    );
    console.log('Tables created:', verify.rows.map(r => r.table_name).join(', '));
    console.log(`\n✅ Migration complete! ${verify.rows.length}/${TARGET_TABLES.length} tables present.`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Migration failed:', err.message);
  if (err.detail) console.error('Detail:', err.detail);
  if (err.hint)   console.error('Hint:',   err.hint);
  process.exit(1);
});
