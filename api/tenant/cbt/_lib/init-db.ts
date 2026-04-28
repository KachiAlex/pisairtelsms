/**
 * Database Initialization Script for CBT System
 * This script initializes the database schema for the CBT Dashboard functionality
 * 
 * Usage:
 *   npx ts-node api/tenant/cbt/_lib/init-db.ts
 */

import { runMigrations, checkMigrationsStatus } from './migration-runner'

async function initializeDatabase() {
  console.log('Starting CBT Database Initialization...\n')

  try {
    // Check if migrations have already been applied
    const alreadyApplied = await checkMigrationsStatus()
    
    if (alreadyApplied) {
      console.log('Database schema is already initialized. Skipping migrations.')
      return
    }

    console.log('Database schema not found. Running migrations...\n')

    // Run all migrations
    const results = await runMigrations()

    // Check if all migrations were successful
    const allSuccessful = results.every(r => r.success)

    if (allSuccessful) {
      console.log('\n✓ Database initialization completed successfully!')
      process.exit(0)
    } else {
      console.error('\n✗ Some migrations failed. Please review the errors above.')
      process.exit(1)
    }
  } catch (error) {
    console.error('Fatal error during database initialization:', error)
    process.exit(1)
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initializeDatabase()
}

export default initializeDatabase
