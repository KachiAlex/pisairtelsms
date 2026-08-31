/**
 * Migration runner for virtual learning schema
 * Runs api/_migrations/002_virtual_learning.sql against the database
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
  connectionTimeoutMillis: 30000,
  max: 1,
});

async function runMigration() {
  let client;
  let retries = 3;
  
  while (retries > 0) {
    try {
      console.log(`Connecting to database (attempt ${4 - retries}/3)...`);
      client = await pool.connect();
      break;
    } catch (err) {
      retries--;
      console.log(`Connection failed: ${err.message}, retrying... (${retries} attempts left)`);
      if (retries === 0) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  try {
    console.log('Connected to database');
    
    const migrationPath = join(__dirname, '..', 'api', '_migrations', '002_virtual_learning.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('Applying virtual learning schema migration...');
    
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Executing ${statements.length} statements...`);
    
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
    
    console.log(`\n✅ Migration complete! ${statements.length - failed}/${statements.length} statements succeeded, ${failed} failed`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
