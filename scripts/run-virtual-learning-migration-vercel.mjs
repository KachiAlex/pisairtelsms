/**
 * Run virtual learning migration via Vercel Postgres SDK
 * This uses the same connection method as the deployed API endpoints
 */
import { db } from '@vercel/postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigration() {
  console.log('Applying virtual learning schema migration via @vercel/postgres...');
  
  const migrationPath = join(__dirname, '..', 'api', '_migrations', '002_virtual_learning.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf8');
  
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => {
      // Remove leading comment lines
      const lines = s.split('\n').filter(line => !line.trim().startsWith('--'));
      return lines.join('\n').trim();
    })
    .filter(s => s.length > 0);
  
  console.log(`Executing ${statements.length} statements...`);
  
  let failed = 0;
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      await db.query(stmt);
    } catch (err) {
      console.log(`Statement ${i + 1} failed: ${err.message}`);
      failed++;
    }
  }
  
  console.log(`\n✅ Migration complete! ${statements.length - failed}/${statements.length} statements succeeded, ${failed} failed`);
}

runMigration().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
