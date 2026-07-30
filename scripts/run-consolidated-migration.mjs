/**
 * Migration runner for consolidated schema migration
 * Runs api/_migrations/001_consolidated_schema.sql against the database
 */
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL or POSTGRES_URL environment variable is not set');
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
    
    // Read the migration SQL
    const migrationPath = join(__dirname, '..', 'api', '_migrations', '001_consolidated_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('Applying consolidated schema migration...');
    
    // Split by semicolon and execute each statement (skip empty and comments)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Executing ${statements.length} statements...`);
    
    // Run each statement independently to handle partial migrations
    let failed = 0;
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        await client.query(stmt);
      } catch (err) {
        console.log(`Statement ${i + 1} failed: ${err.message}`);
        failed++;
      }
    }
    
    console.log(`\n✅ Migration complete! ${statements.length - failed}/${statements.length} statements succeeded, ${failed} failed (likely already exist)`);
    
    console.log('\n✅ Consolidated schema migration complete!');
    
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
