/**
 * Database Connection and Initialization for CBT Dashboard
 */

import { Pool, PoolConfig } from 'pg';
import { runMigrations, verifySchema, getMigrationStatus } from './migrations/migrate';

let pool: Pool | null = null;

/**
 * Initialize database connection pool
 */
export function initializeDatabase(config?: PoolConfig): Pool {
  if (pool) {
    return pool;
  }

  const poolConfig: PoolConfig = config || {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'school_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  pool = new Pool(poolConfig);

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  return pool;
}

/**
 * Get database connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

/**
 * Close database connection pool
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Initialize database schema and run migrations
 */
export async function initializeSchema(): Promise<void> {
  const dbPool = getPool();

  try {
    console.log('Running database migrations...');
    const results = await runMigrations(dbPool);

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\nMigration Summary:`);
    console.log(`  Successful: ${successful}`);
    console.log(`  Failed: ${failed}`);

    if (failed > 0) {
      const errors = results.filter(r => !r.success);
      console.error('\nFailed migrations:');
      errors.forEach(e => {
        console.error(`  - ${e.name}: ${e.error}`);
      });
      throw new Error('Some migrations failed');
    }

    console.log('\nVerifying schema...');
    const schemaValid = await verifySchema(dbPool);

    if (!schemaValid) {
      throw new Error('Schema verification failed');
    }

    console.log('✓ Database schema initialized successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Database initialization failed:', errorMessage);
    throw error;
  }
}

/**
 * Get database status
 */
export async function getDatabaseStatus(): Promise<{
  connected: boolean;
  migrations: {
    executed: string[];
    pending: string[];
  };
}> {
  const dbPool = getPool();

  try {
    const client = await dbPool.connect();
    client.release();

    const migrations = await getMigrationStatus(dbPool);

    return {
      connected: true,
      migrations,
    };
  } catch (error) {
    return {
      connected: false,
      migrations: {
        executed: [],
        pending: [],
      },
    };
  }
}

/**
 * Execute a query
 */
export async function query<T = any>(
  text: string,
  values?: any[]
): Promise<T[]> {
  const dbPool = getPool();
  const result = await dbPool.query(text, values);
  return result.rows as T[];
}

/**
 * Execute a query and return single row
 */
export async function queryOne<T = any>(
  text: string,
  values?: any[]
): Promise<T | null> {
  const dbPool = getPool();
  const result = await dbPool.query(text, values);
  return (result.rows[0] as T) || null;
}

/**
 * Execute a query and return count
 */
export async function queryCount(
  text: string,
  values?: any[]
): Promise<number> {
  const dbPool = getPool();
  const result = await dbPool.query(text, values);
  return result.rowCount || 0;
}

/**
 * Begin transaction
 */
export async function beginTransaction() {
  const dbPool = getPool();
  const client = await dbPool.connect();

  try {
    await client.query('BEGIN');
    return client;
  } catch (error) {
    client.release();
    throw error;
  }
}

/**
 * Commit transaction
 */
export async function commitTransaction(client: any): Promise<void> {
  try {
    await client.query('COMMIT');
  } finally {
    client.release();
  }
}

/**
 * Rollback transaction
 */
export async function rollbackTransaction(client: any): Promise<void> {
  try {
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
}
