/**
 * @vercel/postgres shim for Docker deployment
 * 
 * Replaces @vercel/postgres with a pg.Pool-based implementation
 * that works with any PostgreSQL connection string (not just Neon).
 * 
 * This file is placed in the Node.js module resolution path via
 * the Dockerfile's NODE_PATH or imports override.
 */
import { Pool } from 'pg';

let pool = null;

function getPool() {
  if (pool) return pool;

  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('POSTGRES_URL or DATABASE_URL environment variable is not set');
  }

  pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
  });

  return pool;
}

/**
 * Tagged template SQL function — matches @vercel/postgres `sql` API
 * Usage: const result = await sql`SELECT * FROM users WHERE id = ${userId}`
 */
function sql(strings, ...values) {
  const pool = getPool();

  // Build parameterized query from template strings
  let text = strings[0] || '';
  const params = [];

  for (let i = 0; i < values.length; i++) {
    params.push(values[i]);
    text += `$${i + 1}${strings[i + 1] || ''}`;
  }

  return pool.query(text, params);
}

// Add query method for raw SQL queries (used by some handlers)
sql.query = function(text, values) {
  const pool = getPool();
  return pool.query(text, values);
};

// Export types for compatibility
export { sql };
export default { sql };
