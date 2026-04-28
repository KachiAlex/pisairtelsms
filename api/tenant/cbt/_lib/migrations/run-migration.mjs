#!/usr/bin/env node

/**
 * Migration Runner Script (ES Module)
 * Executes SQL migrations against PostgreSQL database
 * Usage: node run-migration.mjs <database-url>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration(databaseUrl) {
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✓ Connected to database');

    // Create migrations table if it doesn't exist
    console.log('\nCreating migrations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Migrations table ready');

    // Get list of migration files
    const migrationsDir = __dirname;
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`\nFound ${files.length} migration file(s)`);

    let executedCount = 0;
    let skippedCount = 0;

    // Execute each migration
    for (const file of files) {
      const migrationName = file.replace('.sql', '');

      try {
        // Check if migration already executed
        const result = await client.query(
          'SELECT * FROM migrations WHERE name = $1',
          [migrationName]
        );

        if (result.rows.length > 0) {
          console.log(`⊘ ${migrationName} (already executed)`);
          skippedCount++;
          continue;
        }

        // Read and execute migration
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');

        console.log(`→ Executing ${migrationName}...`);
        const startTime = Date.now();

        await client.query(sql);

        // Record migration execution
        await client.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [migrationName]
        );

        const duration = Date.now() - startTime;
        console.log(`✓ ${migrationName} completed in ${duration}ms`);
        executedCount++;
      } catch (error) {
        console.error(`✗ ${migrationName} failed:`, error.message);
        throw error;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('Migration Summary:');
    console.log(`  Executed: ${executedCount}`);
    console.log(`  Skipped:  ${skippedCount}`);
    console.log(`  Total:    ${files.length}`);
    console.log(`${'='.repeat(60)}`);

    // Verify schema
    console.log('\nVerifying schema...');
    const requiredTables = [
      'questions_bank',
      'exams',
      'exam_questions',
      'student_exam_progress',
      'exam_results',
      'student_answers',
      'security_settings',
      'proctoring_logs',
    ];

    for (const table of requiredTables) {
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )`,
        [table]
      );

      if (result.rows[0].exists) {
        console.log(`✓ Table ${table} exists`);
      } else {
        throw new Error(`Table ${table} does not exist`);
      }
    }

    console.log('\n✓ Database schema initialized successfully!');
    console.log('\nNext steps:');
    console.log('1. Implement Question Bank API (Task 2)');
    console.log('2. Implement Exam Management API (Task 8)');
    console.log('3. Implement Live Monitoring API (Task 14)');
    console.log('4. Implement Exam Results API (Task 20)');
    console.log('5. Implement Security Settings API (Task 27)');

  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Get database URL from command line or environment
const databaseUrl = process.argv[2] || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Error: Database URL not provided');
  console.error('Usage: node run-migration.mjs <database-url>');
  console.error('Or set DATABASE_URL environment variable');
  process.exit(1);
}

console.log('CBT Dashboard Database Migration');
console.log('='.repeat(60));
console.log(`Database: ${databaseUrl.split('@')[1] || 'unknown'}`);
console.log('='.repeat(60));

runMigration(databaseUrl).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
