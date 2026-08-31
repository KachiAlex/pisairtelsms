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

function sql(strings, ...values) {
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

export { sql };
export default { sql };
