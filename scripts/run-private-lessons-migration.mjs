/**
 * Migration runner for private lessons schema (003)
 */
import { db } from '@vercel/postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigration() {
  console.log('Applying private lessons schema migration...');
  const migrationPath = join(__dirname, '..', 'api', '_migrations', '003_private_lessons.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf8');

  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => {
      const lines = s.split('\n').filter(line => !line.trim().startsWith('--'));
      return lines.join('\n').trim();
    })
    .filter(s => s.length > 0);

  console.log(`Executing ${statements.length} statements...`);
  let failed = 0;
  for (let i = 0; i < statements.length; i++) {
    try {
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      await db.query(statements[i]);
    } catch (err) {
      console.log(`Statement ${i + 1} failed: ${err.message}`);
      failed++;
    }
  }
  console.log(`\n✅ Migration complete! ${statements.length - failed}/${statements.length} succeeded, ${failed} failed`);
}

runMigration().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
