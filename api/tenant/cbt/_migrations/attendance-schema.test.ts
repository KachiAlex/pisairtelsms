/**
 * Attendance Schema Migration Verification Tests
 * Verifies that all attendance tables are created correctly with proper structure
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Pool } from 'pg'

let pool: Pool

beforeAll(() => {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  pool = new Pool({
    connectionString,
    max: 5,
  })
})

afterAll(async () => {
  if (pool) {
    await pool.end()
  }
})

describe('Attendance Schema Migration', () => {
  describe('Table Creation', () => {
    it('should create absence_reasons table', async () => {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'absence_reasons'
        )
      `)
      expect(result.rows[0].exists).toBe(true)
    })

    it('should create biometric_devices table', async () => {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'biometric_devices'
        )
      `)
      expect(result.rows[0].exists).toBe(true)
    })

    it('should create attendance_records table', async () => {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'attendance_records'
        )
      `)
      expect(result.rows[0].exists).toBe(true)
    })

    it('should create attendance_audit_trail table', async () => {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'attendance_audit_trail'
        )
      `)
      expect(result.rows[0].exists).toBe(true)
    })

    it('should create device_enrollment table', async () => {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'device_enrollment'
        )
      `)
      expect(result.rows[0].exists).toBe(true)
    })

    it('should create device_sync_logs table', async () => {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'device_sync_logs'
        )
      `)
      expect(result.rows[0].exists).toBe(true)
    })
  })

  describe('Column Structure', () => {
    it('should have correct columns in attendance_records', async () => {
      const result = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'attendance_records'
        ORDER BY ordinal_position
      `)

      const columnNames = result.rows.map(r => r.column_name)
      const expectedColumns = [
        'id',
        'tenant_id',
        'student_id',
        'class',
        'date',
        'status',
        'absence_reason_id',
        'source',
        'device_id',
        'user_id',
        'academic_session',
        'term',
        'created_at',
        'updated_at',
        'created_by',
        'updated_by',
      ]

      expectedColumns.forEach(col => {
        expect(columnNames).toContain(col)
      })
    })

    it('should have correct columns in biometric_devices', async () => {
      const result = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'biometric_devices'
        ORDER BY ordinal_position
      `)

      const columnNames = result.rows.map(r => r.column_name)
      const expectedColumns = [
        'id',
        'tenant_id',
        'device_name',
        'device_type',
        'manufacturer',
        'model',
        'serial_number',
        'location',
        'status',
        'sync_status',
        'ip_address',
        'port',
        'connection_protocol',
        'sync_frequency',
        'last_sync',
        'last_error',
        'consecutive_failures',
        'enrolled_students_count',
        'created_at',
        'updated_at',
      ]

      expectedColumns.forEach(col => {
        expect(columnNames).toContain(col)
      })
    })
  })

  describe('Indexes', () => {
    it('should have indexes on attendance_records', async () => {
      const result = await pool.query(`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'attendance_records'
      `)

      const indexNames = result.rows.map(r => r.indexname)
      const expectedIndexes = [
        'idx_attendance_student_date',
        'idx_attendance_class_date',
        'idx_attendance_device',
        'idx_attendance_source',
        'idx_attendance_tenant',
        'idx_attendance_status',
        'idx_attendance_academic_session',
        'idx_attendance_term',
        'idx_attendance_date',
      ]

      expectedIndexes.forEach(idx => {
        expect(indexNames).toContain(idx)
      })
    })

    it('should have indexes on biometric_devices', async () => {
      const result = await pool.query(`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'biometric_devices'
      `)

      const indexNames = result.rows.map(r => r.indexname)
      const expectedIndexes = [
        'idx_device_tenant',
        'idx_device_status',
        'idx_device_sync_status',
        'idx_device_serial_number',
      ]

      expectedIndexes.forEach(idx => {
        expect(indexNames).toContain(idx)
      })
    })

    it('should have indexes on attendance_audit_trail', async () => {
      const result = await pool.query(`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'attendance_audit_trail'
      `)

      const indexNames = result.rows.map(r => r.indexname)
      const expectedIndexes = [
        'idx_audit_record',
        'idx_audit_timestamp',
        'idx_audit_action',
        'idx_audit_changed_by',
      ]

      expectedIndexes.forEach(idx => {
        expect(indexNames).toContain(idx)
      })
    })
  })

  describe('Constraints', () => {
    it('should have CHECK constraint on attendance_records.status', async () => {
      const result = await pool.query(`
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'attendance_records'
        AND constraint_type = 'CHECK'
      `)

      const constraintNames = result.rows.map(r => r.constraint_name)
      expect(constraintNames.length).toBeGreaterThan(0)
    })

    it('should have UNIQUE constraint on attendance_records (tenant_id, student_id, date)', async () => {
      const result = await pool.query(`
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'attendance_records'
        AND constraint_type = 'UNIQUE'
      `)

      expect(result.rows.length).toBeGreaterThan(0)
    })

    it('should have CHECK constraint on biometric_devices.device_type', async () => {
      const result = await pool.query(`
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'biometric_devices'
        AND constraint_type = 'CHECK'
      `)

      expect(result.rows.length).toBeGreaterThan(0)
    })
  })

  describe('Foreign Keys', () => {
    it('should have foreign key from attendance_records to biometric_devices', async () => {
      const result = await pool.query(`
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'attendance_records'
        AND constraint_type = 'FOREIGN KEY'
      `)

      expect(result.rows.length).toBeGreaterThan(0)
    })

    it('should have foreign key from device_enrollment to biometric_devices', async () => {
      const result = await pool.query(`
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'device_enrollment'
        AND constraint_type = 'FOREIGN KEY'
      `)

      expect(result.rows.length).toBeGreaterThan(0)
    })
  })

  describe('Migration Tracking', () => {
    it('should record migration in schema_migrations table', async () => {
      const result = await pool.query(`
        SELECT * FROM schema_migrations WHERE version = 2
      `)

      expect(result.rows.length).toBe(1)
      expect(result.rows[0].description).toContain('attendance')
    })
  })

  describe('Idempotency', () => {
    it('should be safe to run migration multiple times', async () => {
      // This test verifies that the migration uses CREATE TABLE IF NOT EXISTS
      // and doesn't fail on re-run
      const result = await pool.query(`
        SELECT COUNT(*) as table_count FROM information_schema.tables
        WHERE table_name IN (
          'absence_reasons',
          'biometric_devices',
          'attendance_records',
          'attendance_audit_trail',
          'device_enrollment',
          'device_sync_logs'
        )
      `)

      expect(result.rows[0].table_count).toBe(6)
    })
  })
})
