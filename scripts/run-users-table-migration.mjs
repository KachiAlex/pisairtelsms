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
    
    // Check if users table already exists
    const checkResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('users table already exists. Migration already applied.');
      return;
    }
    
    // Read the migration SQL
    const migrationPath = join(__dirname, 'add-users-table.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('Applying users table migration...');
    
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
    
    // Verify table was created
    const verifyResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    `);
    
    console.log('✅ Users table created successfully!');
    
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
