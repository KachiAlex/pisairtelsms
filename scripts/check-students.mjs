import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const client = await pool.connect();
const r = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('students', 'classes') ORDER BY table_name");
console.log('Found:', r.rows.map(x => x.table_name).join(', ') || 'none');
client.release();
await pool.end();
