/**
 * Database Migration Runner for CBT Dashboard
 * Executes SQL migrations against PostgreSQL database
 */

import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';

interface MigrationResult {
  name: string;
  success: boolean;
  error?: string;
  duration: number;
}

/**
 * Run all pending migrations
 */
export async function runMigrations(pool: Pool): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];
  let client: PoolClient | null = null;

  try {
    client = await pool.connect();

    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get list of migration files
    const migrationsDir = path.join(__dirname);
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    // Execute each migration
    for (const file of files) {
      const startTime = Date.now();
      const migrationName = file.replace('.sql', '');

      try {
        // Check if migration already executed
        const result = await client.query(
          'SELECT * FROM migrations WHERE name = $1',
          [migrationName]
        );

        if (result.rows.length > 0) {
          results.push({
            name: migrationName,
            success: true,
            duration: 0,
          });
          continue;
        }

        // Read and execute migration
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');

        await client.query(sql);

        // Record migration execution
        await client.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [migrationName]
        );

        const duration = Date.now() - startTime;
        results.push({
          name: migrationName,
          success: true,
          duration,
        });

        console.log(`✓ Migration ${migrationName} completed in ${duration}ms`);
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        results.push({
          name: migrationName,
          success: false,
          error: errorMessage,
          duration,
        });

        console.error(`✗ Migration ${migrationName} failed: ${errorMessage}`);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Migration runner error:', errorMessage);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }

  return results;
}

/**
 * Verify database schema integrity
 */
export async function verifySchema(pool: Pool): Promise<boolean> {
  const client = await pool.connect();

  try {
    // Check if all required tables exist
    const requiredTables = [
      'questions_bank',
      'exams',
      'exam_questions',
      'student_exam_progress',
      'exam_results',
      'student_answers',
      'security_settings',
      'proctoring_logs',
      'sessions',
      'session_policies',
      'session_history',
    ];

    for (const table of requiredTables) {
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )`,
        [table]
      );

      if (!result.rows[0].exists) {
        console.error(`✗ Table ${table} does not exist`);
        return false;
      }

      console.log(`✓ Table ${table} exists`);
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Schema verification error:', errorMessage);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Get migration status
 */
export async function getMigrationStatus(pool: Pool): Promise<{
  executed: string[];
  pending: string[];
}> {
  const client = await pool.connect();

  try {
    // Get executed migrations
    const result = await client.query(
      'SELECT name FROM migrations ORDER BY executed_at'
    );
    const executed = result.rows.map(r => r.name);

    // Get all migration files
    const migrationsDir = path.join(__dirname);
    const allMigrations = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .map(f => f.replace('.sql', ''))
      .sort();

    // Find pending migrations
    const pending = allMigrations.filter(m => !executed.includes(m));

    return { executed, pending };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error getting migration status:', errorMessage);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Rollback last migration (for development only)
 */
export async function rollbackLastMigration(pool: Pool): Promise<boolean> {
  const client = await pool.connect();

  try {
    // Get last executed migration
    const result = await client.query(
      'SELECT name FROM migrations ORDER BY executed_at DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      console.log('No migrations to rollback');
      return false;
    }

    const migrationName = result.rows[0].name;

    // Delete migration record
    await client.query(
      'DELETE FROM migrations WHERE name = $1',
      [migrationName]
    );

    console.log(`✓ Rolled back migration: ${migrationName}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Rollback error:', errorMessage);
    return false;
  } finally {
    client.release();
  }
}
