/**
 * Migration runner - adds missing tables for real data analytics
 * Adds: students, staff, classes, subjects, fee_structures
 */
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

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database');
    
    // Check if tables already exist
    const checkResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('students', 'staff', 'classes', 'subjects', 'fee_structures')
      ORDER BY table_name
    `);
    
    const existingTables = checkResult.rows.map(r => r.table_name);
    console.log('Existing tables:', existingTables.length > 0 ? existingTables.join(', ') : 'none');
    
    if (existingTables.length === 5) {
      console.log('All 5 tables already exist. Migration already applied.');
      return;
    }
    
    // Read the migration SQL
    const migrationPath = join(__dirname, 'add-missing-tables.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('Applying missing tables migration...');
    
    // Run migration in a transaction
    await client.query('BEGIN');
    
    try {
      await client.query(migrationSQL);
      await client.query('COMMIT');
      console.log('Migration applied successfully!');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
    
    // Verify tables were created
    const verifyResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('students', 'staff', 'classes', 'subjects', 'fee_structures')
      ORDER BY table_name
    `);
    
    console.log('Tables created:', verifyResult.rows.map(r => r.table_name).join(', '));
    console.log(`\n✅ Migration complete! ${verifyResult.rows.length}/5 tables created.`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('Migration failed:', err.message);
  if (err.detail) console.error('Detail:', err.detail);
  if (err.hint) console.error('Hint:', err.hint);
  process.exit(1);
});
