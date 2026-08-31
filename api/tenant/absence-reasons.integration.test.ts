import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { Pool } from 'pg'

vi.mock('../_lib/auth-middleware.js', () => ({
  requireRole: vi.fn(),
  requireAuth: vi.fn(),
}));

vi.mock('./cbt/_lib/db.js', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  queryAll: vi.fn(),
  transaction: vi.fn(),
}));
import { requireRole } from '../_lib/auth-middleware.js'

const mockRequireRole = vi.mocked(requireRole)
const mockDecoded = {
  tenantId: 'tenant-123',
  userId: 'test-user',
  role: 'tenant_admin',
  staffId: 'test-staff',
  parentId: 'test-parent',
  studentId: 'test-student',
  childrenIds: ['child-123'],
} as any



const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/test_db',
})

const TENANT_ID = 'test-tenant-' + Date.now()
const BASE_URL = 'http://localhost:3000/api/tenant'

async function setupTenant() {
  // Create tenant if needed
  await pool.query(
    `INSERT INTO tenants (id, name, domain) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [TENANT_ID, 'Test Tenant', 'test.example.com']
  )
}

async function cleanupTenant() {
  // Clean up absence reasons
  await pool.query(`DELETE FROM absence_reasons WHERE tenant_id = $1`, [TENANT_ID])
  // Clean up tenant
  await pool.query(`DELETE FROM tenants WHERE id = $1`, [TENANT_ID])
}

describe('Absence Reasons API Integration Tests', () => {
  beforeAll(async () => {
    await setupTenant()
  })

  afterAll(async () => {
    await cleanupTenant()
    await pool.end()
  })

  describe('POST /api/tenant/absence-reasons', () => {
    it('should create a new absence reason', async () => {
      const payload = {
        reasonName: 'Sick Leave',
        description: 'Student is ill',
      }

      const response = await fetch(`${BASE_URL}/absence-reasons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify(payload),
      })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.reasonName).toBe('Sick Leave')
      expect(data.data.description).toBe('Student is ill')
      expect(data.data.isActive).toBe(true)
      expect(data.data.id).toBeDefined()
    })

    it('should reject duplicate reason names', async () => {
      const payload = {
        reasonName: 'Medical Appointment',
        description: 'Doctor visit',
      }

      // Create first reason
      const response1 = await fetch(`${BASE_URL}/absence-reasons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify(payload),
      })
      expect(response1.status).toBe(201)

      // Try to create duplicate
      const response2 = await fetch(`${BASE_URL}/absence-reasons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify(payload),
      })
      expect(response2.status).toBe(409)
      const data = await response2.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('already exists')
    })

    it('should reject empty reason name', async () => {
      const payload = {
        reasonName: '',
      }

      const response = await fetch(`${BASE_URL}/absence-reasons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify(payload),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
    })

    it('should require tenant context', async () => {
      const payload = {
        reasonName: 'Test Reason',
      }

      const response = await fetch(`${BASE_URL}/absence-reasons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toContain('Tenant context required')
    })
  })

  describe('GET /api/tenant/absence-reasons', () => {
    it('should list all active absence reasons', async () => {
      // Create some reasons
      const reasons = ['Sick', 'Family Emergency', 'Permission']
      for (const reason of reasons) {
        await fetch(`${BASE_URL}/absence-reasons`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': TENANT_ID,
          },
          body: JSON.stringify({ reasonName: reason }),
        })
      }

      const response = await fetch(`${BASE_URL}/absence-reasons`, {
        headers: {
          'x-tenant-id': TENANT_ID,
        },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.data.length).toBeGreaterThanOrEqual(3)
      expect(data.data.every((r: any) => r.isActive === true)).toBe(true)
    })

    it('should include inactive reasons when requested', async () => {
      // Create a reason
      const createResponse = await fetch(`${BASE_URL}/absence-reasons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify({ reasonName: 'Temporary Reason' }),
      })
      const created = await createResponse.json()
      const reasonId = created.data.id

      // Deactivate it
      await fetch(`${BASE_URL}/absence-reasons/${reasonId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify({ isActive: false }),
      })

      // Get without includeInactive
      const response1 = await fetch(`${BASE_URL}/absence-reasons`, {
        headers: {
          'x-tenant-id': TENANT_ID,
        },
      })
      const data1 = await response1.json()
      const hasInactive1 = data1.data.some((r: any) => r.id === reasonId)

      // Get with includeInactive
      const response2 = await fetch(`${BASE_URL}/absence-reasons?includeInactive=true`, {
        headers: {
          'x-tenant-id': TENANT_ID,
        },
      })
      const data2 = await response2.json()
      const hasInactive2 = data2.data.some((r: any) => r.id === reasonId)

      expect(hasInactive1).toBe(false)
      expect(hasInactive2).toBe(true)
    })
  })

  describe('GET /api/tenant/absence-reasons/[reasonId]', () => {
    it('should get a single absence reason', async () => {
      // Create a reason
      const createResponse = await fetch(`${BASE_URL}/absence-reasons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify({
          reasonName: 'Get Test Reason',
          description: 'For testing GET',
        }),
      })
      const created = await createResponse.json()
      const reasonId = created.data.id

      // Get the reason
      const response = await fetch(`${BASE_URL}/absence-reasons/${reasonId}`, {
        headers: {
          'x-tenant-id': TENANT_ID,
        },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.id).toBe(reasonId)
      expect(data.data.reasonName).toBe('Get Test Reason')
      expect(data.data.description).toBe('For testing GET')
    })

    it('should return 404 for non-existent reason', async () => {
      const response = await fetch(`${BASE_URL}/absence-reasons/non-existent-id`, {
        headers: {
          'x-tenant-id': TENANT_ID,
        },
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('not found')
    })
  })

  describe('PUT /api/tenant/absence-reasons/[reasonId]', () => {
    it('should update absence reason name', async () => {
      // Create a reason
      const createResponse = await fetch(`${BASE_URL}/absence-reasons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify({ reasonName: 'Original Name' }),
      })
      const created = await createResponse.json()
      const reasonId = created.data.id

      // Update it
      const updateResponse = await fetch(`${BASE_URL}/absence-reasons/${reasonId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify({ reasonName: 'Updated Name' }),
      })

      expect(updateResponse.status).toBe(200)
      const data = await updateResponse.json()
      expect(data.success).toBe(true)
      expect(data.data.reasonName).toBe('Updated Name')
    })

    it('should update description', async () => {
      // Create a reason
      const createResponse = await fetch(`${BASE_URL}/absence-reasons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify({ reasonName: 'Reason With Desc' }),
      })
      const created = await createResponse.json()
      const reasonId = created.data.id

      // Update description
      const updateResponse = await fetch(`${BASE_URL}/absence-reasons/${reasonId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify({ description: 'New description' }),
      })

      expect(updateResponse.status).toBe(200)
      const data = await updateResponse.json()
      expect(data.data.description).toBe('New description')
    })

    it('should update isActive status', async () => {
      // Create a reason
      const createResponse = await fetch(`${BASE_URL}/absence-reasons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify({ reasonName: 'Deactivate Test' }),
      })
      const created = await createResponse.json()
      const reasonId = created.data.id

      // Deactivate it
      const updateResponse = await fetch(`${BASE_URL}/absence-reasons/${reasonId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify({ isActive: false }),
      })

      expect(updateResponse.status).toBe(200)
      const data = await updateResponse.json()
      expect(data.data.isActive).toBe(false)
    })

    it('should reject duplicate name on update', async () => {
      // Create two reasons
      const create1 = await fetch(`${BASE_URL}/absence-reasons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify({ reasonName: 'Reason A' }),
      })
      const data1 = await create1.json()
      const id1 = data1.data.id

      const create2 = await fetch(`${BASE_URL}/absence-reasons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify({ reasonName: 'Reason B' }),
      })
      const data2 = await create2.json()
      const id2 = data2.data.id

      // Try to rename reason B to reason A
      const updateResponse = await fetch(`${BASE_URL}/absence-reasons/${id2}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify({ reasonName: 'Reason A' }),
      })

      expect(updateResponse.status).toBe(409)
      const updateData = await updateResponse.json()
      expect(updateData.error).toContain('already exists')
    })

    it('should return 404 for non-existent reason', async () => {
      const response = await fetch(`${BASE_URL}/absence-reasons/non-existent-id`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify({ reasonName: 'New Name' }),
      })

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/tenant/absence-reasons/[reasonId]', () => {
    it('should delete an unused absence reason', async () => {
      // Create a reason
      const createResponse = await fetch(`${BASE_URL}/absence-reasons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify({ reasonName: 'Delete Test' }),
      })
      const created = await createResponse.json()
      const reasonId = created.data.id

      // Delete it
      const deleteResponse = await fetch(`${BASE_URL}/absence-reasons/${reasonId}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': TENANT_ID,
        },
      })

      expect(deleteResponse.status).toBe(200)
      const data = await deleteResponse.json()
      expect(data.success).toBe(true)

      // Verify it's deleted
      const getResponse = await fetch(`${BASE_URL}/absence-reasons/${reasonId}`, {
        headers: {
          'x-tenant-id': TENANT_ID,
        },
      })
      expect(getResponse.status).toBe(404)
    })

    it('should soft delete a reason in use', async () => {
      // Create a reason
      const createResponse = await fetch(`${BASE_URL}/absence-reasons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify({ reasonName: 'In Use Reason' }),
      })
      const created = await createResponse.json()
      const reasonId = created.data.id

      // Create an attendance record using this reason
      await pool.query(
        `INSERT INTO attendance_records 
         (id, tenant_id, student_id, class, date, status, absence_reason_id, source, user_id, academic_session, term)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          'test-record-' + Date.now(),
          TENANT_ID,
          'STU001',
          'JSS 1',
          '2024-05-04',
          'absent',
          reasonId,
          'teacher_entry',
          'user-123',
          '2024/2025',
          '1',
        ]
      )

      // Delete the reason
      const deleteResponse = await fetch(`${BASE_URL}/absence-reasons/${reasonId}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': TENANT_ID,
        },
      })

      expect(deleteResponse.status).toBe(200)

      // Verify it's soft deleted (marked inactive)
      const getResponse = await fetch(`${BASE_URL}/absence-reasons/${reasonId}`, {
        headers: {
          'x-tenant-id': TENANT_ID,
        },
      })
      expect(getResponse.status).toBe(404) // Not found in active list

      // But should be found with includeInactive
      const getInactiveResponse = await fetch(`${BASE_URL}/absence-reasons?includeInactive=true`, {
        headers: {
          'x-tenant-id': TENANT_ID,
        },
      })
      const data = await getInactiveResponse.json()
      const found = data.data.some((r: any) => r.id === reasonId && !r.isActive)
      expect(found).toBe(true)
    })

    it('should return 404 for non-existent reason', async () => {
      const response = await fetch(`${BASE_URL}/absence-reasons/non-existent-id`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': TENANT_ID,
        },
      })

      expect(response.status).toBe(404)
    })
  })

  describe('Tenant Isolation', () => {
    it('should not return reasons from other tenants', async () => {
      const otherTenantId = 'other-tenant-' + Date.now()

      // Setup other tenant
      await pool.query(
        `INSERT INTO tenants (id, name, domain) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [otherTenantId, 'Other Tenant', 'other.example.com']
      )

      // Create reason in other tenant
      const createResponse = await fetch(`${BASE_URL}/absence-reasons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': otherTenantId,
        },
        body: JSON.stringify({ reasonName: 'Other Tenant Reason' }),
      })
      const created = await createResponse.json()
      const reasonId = created.data.id

      // Try to access from different tenant
      const getResponse = await fetch(`${BASE_URL}/absence-reasons/${reasonId}`, {
        headers: {
          'x-tenant-id': TENANT_ID,
        },
      })

      expect(getResponse.status).toBe(404)

      // Cleanup
      await pool.query(`DELETE FROM absence_reasons WHERE tenant_id = $1`, [otherTenantId])
      await pool.query(`DELETE FROM tenants WHERE id = $1`, [otherTenantId])
    })
  })
})
