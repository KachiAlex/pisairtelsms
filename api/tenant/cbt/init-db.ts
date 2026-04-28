/**
 * Database Initialization Endpoint for CBT Dashboard
 * POST /api/tenant/cbt/init-db
 * 
 * This endpoint initializes the database schema and runs all migrations.
 * Should only be called once during initial setup.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { runMigrations, verifySchema, getMigrationStatus } from './_lib/migrations/migrate';
import {
  testQuestionAdditionRoundTrip,
  testDatabaseConstraints,
  testIndexesExist,
} from './_lib/migrations/schema.test';

interface InitResponse {
  success: boolean;
  message: string;
  migrations?: {
    executed: string[];
    pending: string[];
  };
  errors?: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<InitResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  // Verify admin authorization (implement based on your auth system)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
    });
  }

  try {
    // Initialize database connection
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'school_management',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 5,
    });

    // Run migrations
    console.log('Running database migrations...');
    const migrationResults = await runMigrations(pool);

    const successful = migrationResults.filter(r => r.success).length;
    const failed = migrationResults.filter(r => !r.success).length;

    if (failed > 0) {
      const errors = migrationResults
        .filter(r => !r.success)
        .map(r => `${r.name}: ${r.error}`);

      await pool.end();

      return res.status(500).json({
        success: false,
        message: `${failed} migration(s) failed`,
        errors,
      });
    }

    // Verify schema
    console.log('Verifying database schema...');
    const schemaValid = await verifySchema(pool);

    if (!schemaValid) {
      await pool.end();

      return res.status(500).json({
        success: false,
        message: 'Schema verification failed',
      });
    }

    // Run property-based tests
    console.log('Running property-based tests...');
    try {
      await testQuestionAdditionRoundTrip(pool);
      await testDatabaseConstraints(pool);
      await testIndexesExist(pool);
    } catch (testError) {
      const errorMessage = testError instanceof Error ? testError.message : String(testError);
      console.error('Property-based tests failed:', errorMessage);

      await pool.end();

      return res.status(500).json({
        success: false,
        message: 'Property-based tests failed',
        errors: [errorMessage],
      });
    }

    // Get migration status
    const status = await getMigrationStatus(pool);

    await pool.end();

    return res.status(200).json({
      success: true,
      message: 'Database initialized successfully',
      migrations: status,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Database initialization error:', errorMessage);

    return res.status(500).json({
      success: false,
      message: 'Database initialization failed',
      errors: [errorMessage],
    });
  }
}
