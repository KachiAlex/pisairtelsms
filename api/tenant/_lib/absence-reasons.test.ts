import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as db from '../cbt/_lib/db.js'
import {
  getAbsenceReasons,
  getAbsenceReasonById,
  createAbsenceReason,
  updateAbsenceReason,
  deleteAbsenceReason,
  absenceReasonExists,
} from './absence-reasons.js'

// Mock the database module
vi.mock('../cbt/_lib/db.js', () => ({
  queryAll: vi.fn(),
  queryOne: vi.fn(),
  query: vi.fn(),
}))

describe('Absence Reasons Library', () => {
  const tenantId = 'test-tenant'
  const mockReason = {
    id: 'reason-1',
    tenant_id: tenantId,
    reason_name: 'Sick Leave',
    description: 'Student is ill',
    is_active: true,
    created_at: '2024-05-04T10:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAbsenceReasons', () => {
    it('should fetch all active absence reasons', async () => {
      const mockReasons = [
        mockReason,
        { ...mockReason, id: 'reason-2', reason_name: 'Family Emergency' },
      ]

      vi.mocked(db.queryAll).mockResolvedValue(mockReasons)

      const result = await getAbsenceReasons(tenantId, false)

      expect(result).toHaveLength(2)
      expect(result[0].reasonName).toBe('Sick Leave')
      expect(result[0].isActive).toBe(true)
      expect(db.queryAll).toHaveBeenCalledWith(
        expect.stringContaining('is_active = true'),
        [tenantId]
      )
    })

    it('should fetch all reasons including inactive when requested', async () => {
      const mockReasons = [
        mockReason,
        { ...mockReason, id: 'reason-2', is_active: false },
      ]

      vi.mocked(db.queryAll).mockResolvedValue(mockReasons)

      const result = await getAbsenceReasons(tenantId, true)

      expect(result).toHaveLength(2)
      expect(db.queryAll).toHaveBeenCalledWith(
        expect.not.stringContaining('is_active = true'),
        [tenantId]
      )
    })
  })

  describe('getAbsenceReasonById', () => {
    it('should fetch a single absence reason by ID', async () => {
      vi.mocked(db.queryOne).mockResolvedValue(mockReason)

      const result = await getAbsenceReasonById(tenantId, 'reason-1')

      expect(result).not.toBeNull()
      expect(result?.reasonName).toBe('Sick Leave')
      expect(result?.id).toBe('reason-1')
    })

    it('should return null if reason not found', async () => {
      vi.mocked(db.queryOne).mockResolvedValue(null)

      const result = await getAbsenceReasonById(tenantId, 'non-existent')

      expect(result).toBeNull()
    })
  })

  describe('createAbsenceReason', () => {
    it('should create a new absence reason', async () => {
      vi.mocked(db.queryOne).mockResolvedValue(null) // No duplicate
      vi.mocked(db.query).mockResolvedValue(undefined)

      const result = await createAbsenceReason(tenantId, {
        reasonName: 'Sick Leave',
        description: 'Student is ill',
      })

      expect(result.reasonName).toBe('Sick Leave')
      expect(result.description).toBe('Student is ill')
      expect(result.isActive).toBe(true)
      expect(result.id).toBeDefined()
      expect(db.query).toHaveBeenCalled()
    })

    it('should reject empty reason name', async () => {
      await expect(
        createAbsenceReason(tenantId, {
          reasonName: '',
        })
      ).rejects.toThrow('Reason name is required')
    })

    it('should reject duplicate reason name', async () => {
      vi.mocked(db.queryOne).mockResolvedValue({ id: 'existing-id' })

      await expect(
        createAbsenceReason(tenantId, {
          reasonName: 'Sick Leave',
        })
      ).rejects.toThrow('already exists')
    })

    it('should trim whitespace from reason name', async () => {
      vi.mocked(db.queryOne).mockResolvedValue(null)
      vi.mocked(db.query).mockResolvedValue(undefined)

      const result = await createAbsenceReason(tenantId, {
        reasonName: '  Sick Leave  ',
      })

      expect(result.reasonName).toBe('Sick Leave')
    })
  })

  describe('updateAbsenceReason', () => {
    it('should update reason name', async () => {
      const updatedReason = { ...mockReason, reason_name: 'Updated Name' }
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce(mockReason) // getAbsenceReasonById
        .mockResolvedValueOnce(null) // duplicate check
        .mockResolvedValueOnce(updatedReason) // getAbsenceReasonById after update
      vi.mocked(db.query).mockResolvedValue(undefined)

      const result = await updateAbsenceReason(tenantId, 'reason-1', {
        reasonName: 'Updated Name',
      })

      expect(result.reasonName).toBe('Updated Name')
    })

    it('should update description', async () => {
      const updatedReason = { ...mockReason, description: 'New description' }
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce(mockReason) // getAbsenceReasonById
        .mockResolvedValueOnce(updatedReason) // getAbsenceReasonById after update
      vi.mocked(db.query).mockResolvedValue(undefined)

      const result = await updateAbsenceReason(tenantId, 'reason-1', {
        description: 'New description',
      })

      expect(result.description).toBe('New description')
    })

    it('should update isActive status', async () => {
      const updatedReason = { ...mockReason, is_active: false }
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce(mockReason) // getAbsenceReasonById
        .mockResolvedValueOnce(updatedReason) // getAbsenceReasonById after update
      vi.mocked(db.query).mockResolvedValue(undefined)

      const result = await updateAbsenceReason(tenantId, 'reason-1', {
        isActive: false,
      })

      expect(result.isActive).toBe(false)
    })

    it('should reject if reason not found', async () => {
      vi.mocked(db.queryOne).mockResolvedValue(null)

      await expect(
        updateAbsenceReason(tenantId, 'non-existent', {
          reasonName: 'New Name',
        })
      ).rejects.toThrow('not found')
    })

    it('should reject duplicate name on update', async () => {
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce(mockReason) // getAbsenceReasonById
        .mockResolvedValueOnce({ id: 'other-id' }) // duplicate check

      await expect(
        updateAbsenceReason(tenantId, 'reason-1', {
          reasonName: 'Existing Name',
        })
      ).rejects.toThrow('already exists')
    })

    it('should return existing reason if no updates provided', async () => {
      vi.mocked(db.queryOne).mockResolvedValue(mockReason)

      const result = await updateAbsenceReason(tenantId, 'reason-1', {})

      expect(result.reasonName).toBe('Sick Leave')
    })
  })

  describe('deleteAbsenceReason', () => {
    it('should hard delete unused reason', async () => {
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce(mockReason) // getAbsenceReasonById
        .mockResolvedValueOnce({ count: 0 }) // usage check
      vi.mocked(db.query).mockResolvedValue(undefined)

      await deleteAbsenceReason(tenantId, 'reason-1')

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM absence_reasons'),
        expect.any(Array)
      )
    })

    it('should soft delete reason in use', async () => {
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce(mockReason) // getAbsenceReasonById
        .mockResolvedValueOnce({ count: 5 }) // usage check
      vi.mocked(db.query).mockResolvedValue(undefined)

      await deleteAbsenceReason(tenantId, 'reason-1')

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE absence_reasons SET is_active = false'),
        expect.any(Array)
      )
    })

    it('should reject if reason not found', async () => {
      vi.mocked(db.queryOne).mockResolvedValue(null)

      await expect(deleteAbsenceReason(tenantId, 'non-existent')).rejects.toThrow(
        'not found'
      )
    })
  })

  describe('absenceReasonExists', () => {
    it('should return true if active reason exists', async () => {
      vi.mocked(db.queryOne).mockResolvedValue({ id: 'reason-1' })

      const result = await absenceReasonExists(tenantId, 'reason-1')

      expect(result).toBe(true)
    })

    it('should return false if reason does not exist', async () => {
      vi.mocked(db.queryOne).mockResolvedValue(null)

      const result = await absenceReasonExists(tenantId, 'non-existent')

      expect(result).toBe(false)
    })
  })
})
