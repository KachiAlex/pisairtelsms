const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      else resolve(`${salt}:${derived.toString('hex')}`);
    });
  });
}

(async () => {
  try {
    const hash = await hashPassword('dikaoliver2660');
    const r = await pool.query(
      "UPDATE staff SET password_hash = $1 WHERE email = 'akoma@kreatixtech.com' RETURNING id, email, role",
      [hash]
    );
    console.log('Password reset OK:', JSON.stringify(r.rows[0]));
    await pool.end();
  } catch (e) {
    console.error('ERR:', e.message);
    await pool.end();
  }
})();
