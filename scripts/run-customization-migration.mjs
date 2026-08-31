import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_BIlfNjZg2Ko7@ep-restless-union-ai4sgr7d-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

const sql = readFileSync(join(__dirname, 'create-customization-tables.sql'), 'utf8');
const client = await pool.connect();
try {
  await client.query(sql);
  console.log('Customization tables created successfully.');
} catch (err) {
  console.error('Migration error:', err.message);
} finally {
  client.release();
  await pool.end();
}
