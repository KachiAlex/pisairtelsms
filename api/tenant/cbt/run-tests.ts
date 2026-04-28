/**
 * Test Runner for Question Bank API
 * Executes all property-based tests
 */

import { Pool } from 'pg';
import { runAllTests } from './questions.test';

// Initialize database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    await runAllTests(pool);
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Test execution failed:', error);
    await pool.end();
    process.exit(1);
  }
}

main();
