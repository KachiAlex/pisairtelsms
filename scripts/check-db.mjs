/**
 * Check what tables exist in the database
 */
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
const { Pool } = pg;
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function checkDB() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('Tables in database:');
    if (result.rows.length === 0) {
      console.log('  (none)');
    } else {
      result.rows.forEach(r => console.log(' -', r.table_name));
    }
  } finally {
    client.release();
    await pool.end();
  }
}

checkDB().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
