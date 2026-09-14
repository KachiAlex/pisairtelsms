/**
 * ESM version of the SQL helper for standalone scripts.
 * Backed by the local PostgreSQL pool.
 */
import { Pool } from 'pg';

let pool = null;

function getPool() {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL or POSTGRES_URL environment variable is not set');
  }
  pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  pool.on('error', (err) => {
    console.error('Unexpected error on idle pool client:', err);
  });
  return pool;
}

export function sql(strings, ...values) {
  let text = '';
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) {
      text += `$${i + 1}`;
    }
  }
  return getPool().query(text, values);
}

sql.query = function (text, params) {
  return getPool().query(text, params);
};

export const db = {
  async transaction(callback) {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const tx = {
        query: (text, params) => client.query(text, params),
      };
      const result = await callback(tx);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};

export default { sql, db };
