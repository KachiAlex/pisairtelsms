#!/bin/bash
docker exec pisairtel-sms node -e "
const { hash } = require('@node-rs/argon2');
const { Pool } = require('pg');
(async () => {
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const passwordHash = await hash('admin123');
    const res = await pool.query(
      'INSERT INTO super_admin_accounts (full_name, organization, email, password_hash) VALUES (\$1, \$2, \$3, \$4) ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, organization = EXCLUDED.organization, password_hash = EXCLUDED.password_hash, updated_at = NOW() RETURNING id, full_name, organization, email, created_at, updated_at',
      ['System Administrator', 'Pisairtel SMS', 'admin@pisairtelsms.com', passwordHash]
    );
    console.log('SUCCESS:', JSON.stringify(res.rows[0], null, 2));
    await pool.end();
  } catch(e) {
    console.error('ERROR:', e.message);
  }
  process.exit(0);
})();
" 2>&1
