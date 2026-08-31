const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  try {
    const r = await pool.query("SELECT email, role, status, password_hash IS NOT NULL as has_pw FROM staff LIMIT 20");
    console.log(JSON.stringify(r.rows, null, 2));
    await pool.end();
  } catch (e) {
    console.error('ERR:', e.message);
    await pool.end();
  }
})();
