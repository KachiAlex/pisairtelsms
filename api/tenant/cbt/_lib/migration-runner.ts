/**
 * Migration Runner for CBT Database Schema
 * Executes SQL migration files in order to set up the database schema
 */

import { sql } from '@vercel/postgres'
import fs from 'fs'
import path from 'path'

interface MigrationResult {
  version: string
  name: string
  success: boolean
  error?: string
  executedAt: Date
}

/**
 * Runs all pending migrations in order
 * @returns Array of migration results
 */
export async function runMigrations(): Promise<MigrationResult[]> {
  const results: MigrationResult[] = []
  const migrationsDir = path.join(__dirname, 'migrations')

  try {
    // Get all migration files sorted by version
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    console.log(`Found ${files.length} migration files`)

    for (const file of files) {
      const filePath = path.join(migrationsDir, file)
      const migrationContent = fs.readFileSync(filePath, 'utf-8')
      
      // Extract version and name from filename (e.g., 001_create_questions_bank_table.sql)
      const match = file.match(/^(\d+)_(.+)\.sql$/)
      if (!match) {
        console.warn(`Skipping invalid migration file: ${file}`)
        continue
      }

      const [, version, name] = match
      const result: MigrationResult = {
        version,
        name,
        success: false,
        executedAt: new Date()
      }

      try {
        console.log(`Running migration ${version}: ${name}...`)
        
        // Execute the migration
        await sql.query(migrationContent)
        
        result.success = true
        console.log(`✓ Migration ${version} completed successfully`)
      } catch (error) {
        result.error = error instanceof Error ? error.message : String(error)
        console.error(`✗ Migration ${version} failed: ${result.error}`)
      }

      results.push(result)
    }

    // Log summary
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    
    console.log(`\nMigration Summary:`)
    console.log(`  Total: ${results.length}`)
    console.log(`  Successful: ${successful}`)
    console.log(`  Failed: ${failed}`)

    if (failed > 0) {
      console.error('\nFailed migrations:')
      results.filter(r => !r.success).forEach(r => {
        console.error(`  - ${r.version}: ${r.name} - ${r.error}`)
      })
    }

    return results
  } catch (error) {
    console.error('Error running migrations:', error)
    throw error
  }
}

/**
 * Runs a specific migration by version
 * @param version Migration version (e.g., "001")
 */
export async function runMigration(version: string): Promise<MigrationResult> {
  const migrationsDir = path.join(__dirname, 'migrations')
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.startsWith(version) && f.endsWith('.sql'))

  if (files.length === 0) {
    throw new Error(`Migration ${version} not found`)
  }

  const file = files[0]
  const filePath = path.join(migrationsDir, file)
  const migrationContent = fs.readFileSync(filePath, 'utf-8')

  const match = file.match(/^(\d+)_(.+)\.sql$/)
  if (!match) {
    throw new Error(`Invalid migration file format: ${file}`)
  }

  const [, ver, name] = match
  const result: MigrationResult = {
    version: ver,
    name,
    success: false,
    executedAt: new Date()
  }

  try {
    console.log(`Running migration ${ver}: ${name}...`)
    await sql.query(migrationContent)
    result.success = true
    console.log(`✓ Migration ${ver} completed successfully`)
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error)
    console.error(`✗ Migration ${ver} failed: ${result.error}`)
  }

  return result
}

/**
 * Checks if all migrations have been applied
 * @returns true if all migrations are applied, false otherwise
 */
export async function checkMigrationsStatus(): Promise<boolean> {
  try {
    // Check if all tables exist
    const tables = [
      'questions_bank',
      'exams',
      'exam_questions',
      'student_exam_progress',
      'exam_results',
      'student_answers',
      'security_settings',
      'proctoring_logs'
    ]

    for (const table of tables) {
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = ${table}
        )
      `
      
      if (!result.rows[0]?.exists) {
        console.log(`Table ${table} does not exist`)
        return false
      }
    }

    console.log('All migration tables exist')
    return true
  } catch (error) {
    console.error('Error checking migration status:', error)
    return false
  }
}

// Export for use in scripts
export default {
  runMigrations,
  runMigration,
  checkMigrationsStatus
}
