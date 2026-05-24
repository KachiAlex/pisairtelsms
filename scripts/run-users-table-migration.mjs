import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { Pool } = pg;
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_BIlfNjZg2Ko7@ep-restless-union-ai4sgr7d-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require', 
  ssl: { rejectUnauthorized: false } 
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database');
    
    // Read the migration SQL
    const migrationPath = join(__dirname, 'add-users-table.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('Applying missing columns migration...');
    
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
    
    console.log('✅ Migration complete!');
    
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
