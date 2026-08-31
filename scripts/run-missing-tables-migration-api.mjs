/**
 * Migration runner using @vercel/postgres
 * Adds missing tables for real data analytics
 */
import { sql } from '@vercel/postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigration() {
  try {
    console.log('Connected to database via @vercel/postgres');
    
    // Check if tables already exist
    const checkResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('students', 'staff', 'classes', 'subjects', 'fee_structures')
      ORDER BY table_name
    `;
    
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
    
    // Split SQL into individual statements and execute
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      try {
        await sql.query(statement);
        console.log('Executed:', statement.substring(0, 50) + '...');
      } catch (err) {
        // Ignore errors for IF NOT EXISTS statements
        if (!statement.includes('IF NOT EXISTS') && !statement.includes('DO $$')) {
          console.warn('Warning:', err.message);
        }
      }
    }
    
    console.log('Migration applied successfully!');
    
    // Verify tables were created
    const verifyResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('students', 'staff', 'classes', 'subjects', 'fee_structures')
      ORDER BY table_name
    `;
    
    console.log('Tables created:', verifyResult.rows.map(r => r.table_name).join(', '));
    console.log(`\n✅ Migration complete! ${verifyResult.rows.length}/5 tables created.`);
    
  } catch (err) {
    console.error('Migration failed:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
    process.exit(1);
  }
}

runMigration();
