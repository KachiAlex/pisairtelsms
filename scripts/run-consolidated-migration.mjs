/**
 * Migration runner for all schema migrations
 * Runs every *.sql file in api/_migrations in sorted order
 */
import pg from 'pg';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env without process.loadEnvFile (Node 18 lacks it). Values already
// present in the real environment take precedence.
function loadEnvFileManually(file) {
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) {
        let value = m[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[m[1]] = value;
      }
    }
  } catch {
    // unreadable/missing .env — fall through to process env
  }
}

if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  if (existsSync('.env.local')) {
    loadEnvFileManually('.env.local');
  } else if (existsSync('.env')) {
    loadEnvFileManually('.env');
  }
}

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL or POSTGRES_URL environment variable is not set');
  process.exit(1);
}

const { Pool } = pg;
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('postgres') ? false : { rejectUnauthorized: false },
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('Connected to database');

    const migrationsDir = join(__dirname, '..', 'api', '_migrations');
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let totalStatements = 0;
    let totalFailed = 0;

    for (const file of files) {
      const migrationPath = join(migrationsDir, file);
      const migrationSQL = readFileSync(migrationPath, 'utf8');

      console.log(`\n📄 Applying ${file}...`);

      const statements = migrationSQL
        .split(';')
        .map(s => {
          // strip line comments before checking if the statement is empty
          return s
            .replace(/--[^\n]*/g, '')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .trim()
        })
        .filter(s => s.length > 0);

      console.log(`  ${statements.length} statements...`);

      let failed = 0;
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
          await client.query(stmt);
        } catch (err) {
          console.log(`  statement ${i + 1}/${statements.length} failed: ${err.message}`);
          failed++;
        }
      }

      totalStatements += statements.length;
      totalFailed += failed;
      console.log(`  ✅ ${statements.length - failed}/${statements.length} succeeded`);
    }

    console.log(`\n✅ All migrations complete! ${totalStatements - totalFailed}/${totalStatements} statements succeeded, ${totalFailed} failed (likely already exist)`);
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
