/**
 * Database utility module for CBT system
 * Provides database connection and query helpers
 */

import { sql } from '@vercel/postgres'

// Legacy db stub for backward compatibility with old Express router files
export const db = {
  prepare: (queryText: string) => ({
    all: (...params: any[]) => { throw new Error('Legacy db.prepare().all() not supported in Vercel environment') },
    get: (...params: any[]) => { throw new Error('Legacy db.prepare().get() not supported in Vercel environment') },
    run: (...params: any[]) => { throw new Error('Legacy db.prepare().run() not supported in Vercel environment') },
  })
}

/**
 * Execute a raw SQL query
 */
export async function executeQuery(query: string, values?: any[]) {
  try {
    const result = await sql.query(query, values)
    return result
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}

/**
 * Get database connection status
 */
export async function checkDatabaseConnection() {
  try {
    const result = await sql`SELECT NOW()`
    return { connected: true, timestamp: result.rows[0] }
  } catch (error) {
    console.error('Database connection error:', error)
    return { connected: false, error: String(error) }
  }
}

/**
 * Get schema information
 */
export async function getSchemaInfo() {
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `
    return tables.rows
  } catch (error) {
    console.error('Error fetching schema info:', error)
    throw error
  }
}

/**
 * Get table structure
 */
export async function getTableStructure(tableName: string) {
  try {
    const columns = await sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = ${tableName}
      ORDER BY ordinal_position
    `
    return columns.rows
  } catch (error) {
    console.error(`Error fetching structure for table ${tableName}:`, error)
    throw error
  }
}

/**
 * Get table indexes
 */
export async function getTableIndexes(tableName: string) {
  try {
    const indexes = await sql`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = ${tableName}
      ORDER BY indexname
    `
    return indexes.rows
  } catch (error) {
    console.error(`Error fetching indexes for table ${tableName}:`, error)
    throw error
  }
}

/**
 * Get foreign key constraints
 */
export async function getForeignKeys(tableName: string) {
  try {
    const fks = await sql`
      SELECT 
        constraint_name,
        table_name,
        column_name,
        foreign_table_name,
        foreign_column_name
      FROM information_schema.key_column_usage
      WHERE table_name = ${tableName}
        AND foreign_table_name IS NOT NULL
      ORDER BY constraint_name
    `
    return fks.rows
  } catch (error) {
    console.error(`Error fetching foreign keys for table ${tableName}:`, error)
    throw error
  }
}

/**
 * Verify all CBT tables exist
 */
export async function verifyCBTSchema() {
  const requiredTables = [
    'tenants',
    'users',
    'questions_bank',
    'exams',
    'exam_questions',
    'student_exam_progress',
    'exam_results',
    'student_answers',
    'security_settings',
    'proctoring_logs',
    'audit_logs',
    'offline_sync_queue'
  ]

  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `
    
    const existingTables = tables.rows.map((row: any) => row.table_name)
    const missingTables = requiredTables.filter(t => !existingTables.includes(t))
    
    return {
      allTablesExist: missingTables.length === 0,
      existingTables,
      missingTables,
      totalExpected: requiredTables.length,
      totalFound: existingTables.length
    }
  } catch (error) {
    console.error('Error verifying CBT schema:', error)
    throw error
  }
}

/**
 * Get comprehensive schema report
 */
export async function getSchemaReport() {
  const tables = [
    'tenants',
    'users',
    'questions_bank',
    'exams',
    'exam_questions',
    'student_exam_progress',
    'exam_results',
    'student_answers',
    'security_settings',
    'proctoring_logs',
    'audit_logs',
    'offline_sync_queue'
  ]

  const report: any = {
    timestamp: new Date().toISOString(),
    tables: {}
  }

  for (const table of tables) {
    try {
      const structure = await getTableStructure(table)
      const indexes = await getTableIndexes(table)
      const fks = await getForeignKeys(table)

      report.tables[table] = {
        columns: structure,
        indexes,
        foreignKeys: fks
      }
    } catch (error) {
      report.tables[table] = { error: String(error) }
    }
  }

  return report
}
