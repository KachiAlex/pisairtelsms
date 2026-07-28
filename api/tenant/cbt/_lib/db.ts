/**
 * CBT Database Connection and Utilities
 * Handles database initialization, migrations, and query execution
 */

import { Pool, QueryResult } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Database connection pool
let pool: Pool | null = null;

// Track if migrations have been run
let migrationsRun = false;

/**
 * Initialize database connection pool
 */
export function initializeDatabase(): Pool {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  // Run migrations on first initialization
  if (!migrationsRun) {
    migrationsRun = true;
    runMigrations().catch((err) => {
      console.error('Failed to run migrations:', err);
    });
  }

  return pool;
}

/**
 * Get database connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    return initializeDatabase();
  }
  return pool;
}

/**
 * Execute a query
 */
export async function query<T = any>(
  text: string,
  values?: any[]
): Promise<QueryResult<T>> {
  const pool = getPool();
  try {
    return await pool.query<T>(text, values);
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Execute a query and return single row
 */
export async function queryOne<T = any>(
  text: string,
  values?: any[]
): Promise<T | null> {
  const result = await query<T>(text, values);
  return result.rows[0] || null;
}

/**
 * Execute a query and return all rows
 */
export async function queryAll<T = any>(
  text: string,
  values?: any[]
): Promise<T[]> {
  const result = await query<T>(text, values);
  return result.rows;
}

/**
 * Execute a transaction
 */
export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run database migrations
 */
export async function runMigrations(): Promise<void> {
  const pool = getPool();
  const moduleDirname = typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));
  const migrationsDir = path.join(moduleDirname, '../_migrations');

  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        description VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get list of migration files
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .filter(f => /^\d+_/.test(f))
      .sort();

    for (const file of files) {
      const version = parseInt(file.split('_')[0]);
      if (Number.isNaN(version)) {
        console.warn(`Skipping migration with invalid version: ${file}`);
        continue;
      }
      
      // Check if migration has already been run
      const result = await pool.query(
        'SELECT * FROM schema_migrations WHERE version = $1',
        [version]
      );

      if (result.rows.length === 0) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');

        console.log(`Running migration: ${file}`);
        
        // Execute migration
        await pool.query(sql);

        // Record migration
        const description = file.replace(/^\d+_/, '').replace(/\.sql$/, '');
        await pool.query(
          'INSERT INTO schema_migrations (version, description) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
          [version, description]
        );

        console.log(`Migration ${file} completed successfully`);
      }
    }

    console.log('All migrations completed');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
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
 * Health check for database connection
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT 1');
    return result.rows.length > 0;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  questionsCount: number;
  examsCount: number;
  resultsCount: number;
  progressCount: number;
}> {
  const [questions, exams, results, progress] = await Promise.all([
    queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM questions_bank WHERE deleted_at IS NULL'
    ),
    queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM exams WHERE deleted_at IS NULL'
    ),
    queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM exam_results'
    ),
    queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM student_exam_progress'
    ),
  ]);

  return {
    questionsCount: parseInt(questions?.count || '0'),
    examsCount: parseInt(exams?.count || '0'),
    resultsCount: parseInt(results?.count || '0'),
    progressCount: parseInt(progress?.count || '0'),
  };
}
