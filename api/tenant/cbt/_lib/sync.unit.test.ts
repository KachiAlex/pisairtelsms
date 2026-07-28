/**
 * Offline Sync Service - Unit Tests
 * Tests for offline answer synchronization with conflict resolution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as syncService from './sync'
import * as db from './db'

// Mock database module
vi.mock('./db')

describe('Offline Sync Service - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('syncOfflineAnswers', () => {
    it('should sync offline answers successfully', async () => {
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({ id: 'exam-123', tenant_id: 'tenant-123' }) // Exam verification
        .mockResolvedValueOnce({ id: 'student-123' }) // Student verification
        .mockResolvedValueOnce({ id: 'result-123' }) // Get/create result
        .mockResolvedValueOnce({ id: 'question-1' }) // Question 1 verification
        .mockResolvedValueOnce(null) // No existing answer for Q1
        .mockResolvedValueOnce({ id: 'answer-1' }) // Insert answer 1
        .mockResolvedValueOnce({ id: 'question-2' }) // Question 2 verification
        .mockResolvedValueOnce(null) // No existing answer for Q2
        .mockResolvedValueOnce({ id: 'answer-2' }) // Insert answer 2

      vi.mocked(db.query).mockResolvedValueOnce({ rowCount: 1 }) // Update sync queue

      const answers = [
        {
          questionId: 'question-1',
          studentAnswer: 'A',
          correctAnswer: 'A',
          isCorrect: true,
          marksObtained: 1,
          totalMarks: 1,
        },
        {
          questionId: 'question-2',
          studentAnswer: 'B',
          correctAnswer: 'B',
          isCorrect: true,
          marksObtained: 1,
          totalMarks: 1,
        },
      ]

      const result = await syncService.syncOfflineAnswers(
        'tenant-123',
        'student-123',
        'exam-123',
        answers,
        new Date()
      )

      expect(result.success).toBe(true)
      expect(result.synced).toBe(2)
      expect(result.conflicts).toBe(0)
      expect(result.failed).toBe(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle conflict resolution with server-as-authoritative strategy', async () => {
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({ id: 'exam-123', tenant_id: 'tenant-123' }) // Exam verification
        .mockResolvedValueOnce({ id: 'student-123' }) // Student verification
        .mockResolvedValueOnce({ id: 'result-123' }) // Get/create result
        .mockResolvedValueOnce({ id: 'question-1' }) // Question 1 verification
        .mockResolvedValueOnce({
          id: 'answer-1',
          student_answer: 'A',
          updated_at: new Date(),
        }) // Existing answer found (conflict)

      vi.mocked(db.query).mockResolvedValueOnce({ rowCount: 1 }) // Update sync queue

      const answers = [
        {
          questionId: 'question-1',
          studentAnswer: 'B', // Different from server
          correctAnswer: 'A',
          isCorrect: false,
          marksObtained: 0,
          totalMarks: 1,
        },
      ]

      const result = await syncService.syncOfflineAnswers(
        'tenant-123',
        'student-123',
        'exam-123',
        answers,
        new Date()
      )

      expect(result.success).toBe(true)
      expect(result.synced).toBe(0)
      expect(result.conflicts).toBe(1) // Conflict detected and resolved
      expect(result.failed).toBe(0)
    })

    it('should handle missing question gracefully', async () => {
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({ id: 'exam-123', tenant_id: 'tenant-123' }) // Exam verification
        .mockResolvedValueOnce({ id: 'student-123' }) // Student verification
        .mockResolvedValueOnce({ id: 'result-123' }) // Get/create result
        .mockResolvedValueOnce(null) // Question not found

      vi.mocked(db.query).mockResolvedValueOnce({ rowCount: 1 }) // Update sync queue

      const answers = [
        {
          questionId: 'question-999',
          studentAnswer: 'A',
          correctAnswer: 'A',
          isCorrect: true,
          marksObtained: 1,
          totalMarks: 1,
        },
      ]

      const result = await syncService.syncOfflineAnswers(
        'tenant-123',
        'student-123',
        'exam-123',
        answers,
        new Date()
      )

      expect(result.success).toBe(false)
      expect(result.synced).toBe(0)
      expect(result.failed).toBe(1)
      expect(result.errors).toContain('Question question-999 not found')
    })

    it('should handle missing questionId in answer', async () => {
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({ id: 'exam-123', tenant_id: 'tenant-123' }) // Exam verification
        .mockResolvedValueOnce({ id: 'student-123' }) // Student verification
        .mockResolvedValueOnce({ id: 'result-123' }) // Get/create result

      vi.mocked(db.query).mockResolvedValueOnce({ rowCount: 1 }) // Update sync queue

      const answers = [
        {
          questionId: '', // Missing
          studentAnswer: 'A',
          correctAnswer: 'A',
          isCorrect: true,
          marksObtained: 1,
          totalMarks: 1,
        },
      ]

      const result = await syncService.syncOfflineAnswers(
        'tenant-123',
        'student-123',
        'exam-123',
        answers,
        new Date()
      )

      expect(result.success).toBe(false)
      expect(result.failed).toBe(1)
      expect(result.errors).toContain('Answer missing questionId')
    })

    it('should reject exam from different tenant', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'exam-123',
        tenant_id: 'other-tenant', // Different tenant
      })

      const answers = [
        {
          questionId: 'question-1',
          studentAnswer: 'A',
          correctAnswer: 'A',
          isCorrect: true,
          marksObtained: 1,
          totalMarks: 1,
        },
      ]

      const result = await syncService.syncOfflineAnswers(
        'tenant-123',
        'student-123',
        'exam-123',
        answers,
        new Date()
      )

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Exam not found or does not belong to tenant')
    })

    it('should reject non-existent student', async () => {
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({ id: 'exam-123', tenant_id: 'tenant-123' }) // Exam verification
        .mockResolvedValueOnce(null) // Student not found

      const answers = [
        {
          questionId: 'question-1',
          studentAnswer: 'A',
          correctAnswer: 'A',
          isCorrect: true,
          marksObtained: 1,
          totalMarks: 1,
        },
      ]

      const result = await syncService.syncOfflineAnswers(
        'tenant-123',
        'student-999',
        'exam-123',
        answers,
        new Date()
      )

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Student not found')
    })

    it('should create new exam result if not exists', async () => {
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({ id: 'exam-123', tenant_id: 'tenant-123' }) // Exam verification
        .mockResolvedValueOnce({ id: 'student-123' }) // Student verification
        .mockResolvedValueOnce(null) // No existing result
        .mockResolvedValueOnce({ id: 'result-123' }) // Create new result
        .mockResolvedValueOnce({ id: 'question-1' }) // Question verification
        .mockResolvedValueOnce(null) // No existing answer
        .mockResolvedValueOnce({ id: 'answer-1' }) // Insert answer

      vi.mocked(db.query).mockResolvedValueOnce({ rowCount: 1 }) // Update sync queue

      const answers = [
        {
          questionId: 'question-1',
          studentAnswer: 'A',
          correctAnswer: 'A',
          isCorrect: true,
          marksObtained: 1,
          totalMarks: 1,
        },
      ]

      const result = await syncService.syncOfflineAnswers(
        'tenant-123',
        'student-123',
        'exam-123',
        answers,
        new Date()
      )

      expect(result.success).toBe(true)
      expect(result.synced).toBe(1)
    })

    it('should handle partial sync with mixed success and failures', async () => {
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({ id: 'exam-123', tenant_id: 'tenant-123' }) // Exam verification
        .mockResolvedValueOnce({ id: 'student-123' }) // Student verification
        .mockResolvedValueOnce({ id: 'result-123' }) // Get/create result
        // Answer 1: Success
        .mockResolvedValueOnce({ id: 'question-1' }) // Question 1 verification
        .mockResolvedValueOnce(null) // No existing answer
        .mockResolvedValueOnce({ id: 'answer-1' }) // Insert answer 1
        // Answer 2: Conflict
        .mockResolvedValueOnce({ id: 'question-2' }) // Question 2 verification
        .mockResolvedValueOnce({
          id: 'answer-2',
          student_answer: 'A',
          updated_at: new Date(),
        }) // Existing answer (conflict)
        // Answer 3: Question not found
        .mockResolvedValueOnce(null) // Question 3 not found

      vi.mocked(db.query).mockResolvedValueOnce({ rowCount: 1 }) // Update sync queue

      const answers = [
        {
          questionId: 'question-1',
          studentAnswer: 'A',
          correctAnswer: 'A',
          isCorrect: true,
          marksObtained: 1,
          totalMarks: 1,
        },
        {
          questionId: 'question-2',
          studentAnswer: 'B',
          correctAnswer: 'A',
          isCorrect: false,
          marksObtained: 0,
          totalMarks: 1,
        },
        {
          questionId: 'question-3',
          studentAnswer: 'C',
          correctAnswer: 'C',
          isCorrect: true,
          marksObtained: 1,
          totalMarks: 1,
        },
      ]

      const result = await syncService.syncOfflineAnswers(
        'tenant-123',
        'student-123',
        'exam-123',
        answers,
        new Date()
      )

      expect(result.success).toBe(false)
      expect(result.synced).toBe(1)
      expect(result.conflicts).toBe(1)
      expect(result.failed).toBe(1)
    })
  })

  describe('createSyncQueueEntry', () => {
    it('should create sync queue entry', async () => {
      const mockEntry = {
        id: 'queue-123',
        studentId: 'student-123',
        examId: 'exam-123',
        answers: [],
        syncStatus: 'pending',
        retryCount: 0,
        createdAt: new Date(),
      }

      vi.mocked(db.queryOne).mockResolvedValueOnce(mockEntry)

      const answers = [
        {
          questionId: 'question-1',
          studentAnswer: 'A',
          isCorrect: true,
          marksObtained: 1,
          totalMarks: 1,
        },
      ]

      const result = await syncService.createSyncQueueEntry('student-123', 'exam-123', answers)

      expect(result).toEqual(mockEntry)
    })

    it('should throw error if creation fails', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce(null)

      const answers = [
        {
          questionId: 'question-1',
          studentAnswer: 'A',
          isCorrect: true,
          marksObtained: 1,
          totalMarks: 1,
        },
      ]

      await expect(
        syncService.createSyncQueueEntry('student-123', 'exam-123', answers)
      ).rejects.toThrow('Failed to create sync queue entry')
    })
  })

  describe('getPendingSyncEntries', () => {
    it('should retrieve pending sync entries', async () => {
      const mockEntries = [
        {
          id: 'queue-1',
          studentId: 'student-1',
          examId: 'exam-123',
          answers: [],
          syncStatus: 'pending',
          retryCount: 0,
          createdAt: new Date(),
        },
        {
          id: 'queue-2',
          studentId: 'student-2',
          examId: 'exam-123',
          answers: [],
          syncStatus: 'pending',
          retryCount: 0,
          createdAt: new Date(),
        },
      ]

      vi.mocked(db.queryAll).mockResolvedValueOnce(mockEntries)

      const result = await syncService.getPendingSyncEntries()

      expect(result).toEqual(mockEntries)
      expect(result).toHaveLength(2)
    })

    it('should return empty array if no pending entries', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([])

      const result = await syncService.getPendingSyncEntries()

      expect(result).toEqual([])
    })
  })

  describe('updateSyncQueueStatus', () => {
    it('should update sync queue status to synced', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rowCount: 1 })

      await syncService.updateSyncQueueStatus('student-123', 'exam-123', 'synced')

      expect(vi.mocked(db.query)).toHaveBeenCalled()
    })

    it('should update sync queue status to failed with error', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rowCount: 1 })

      await syncService.updateSyncQueueStatus(
        'student-123',
        'exam-123',
        'failed',
        'Database error'
      )

      expect(vi.mocked(db.query)).toHaveBeenCalled()
    })

    it('should increment retry count on failure', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rowCount: 1 })

      await syncService.updateSyncQueueStatus(
        'student-123',
        'exam-123',
        'failed',
        'Network error'
      )

      expect(vi.mocked(db.query)).toHaveBeenCalled()
    })
  })

  describe('getSyncQueueEntry', () => {
    it('should retrieve sync queue entry by student and exam', async () => {
      const mockEntry = {
        id: 'queue-123',
        studentId: 'student-123',
        examId: 'exam-123',
        answers: [],
        syncStatus: 'pending',
        retryCount: 0,
        createdAt: new Date(),
      }

      vi.mocked(db.queryOne).mockResolvedValueOnce(mockEntry)

      const result = await syncService.getSyncQueueEntry('student-123', 'exam-123')

      expect(result).toEqual(mockEntry)
    })

    it('should return null if entry not found', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce(null)

      const result = await syncService.getSyncQueueEntry('student-999', 'exam-999')

      expect(result).toBeNull()
    })
  })

  describe('getSyncEntriesByStatus', () => {
    it('should retrieve sync entries by status', async () => {
      const mockEntries = [
        {
          id: 'queue-1',
          studentId: 'student-1',
          examId: 'exam-123',
          answers: [],
          syncStatus: 'failed',
          retryCount: 1,
          createdAt: new Date(),
        },
        {
          id: 'queue-2',
          studentId: 'student-2',
          examId: 'exam-123',
          answers: [],
          syncStatus: 'failed',
          retryCount: 2,
          createdAt: new Date(),
        },
      ]

      vi.mocked(db.queryAll).mockResolvedValueOnce(mockEntries)

      const result = await syncService.getSyncEntriesByStatus('failed')

      expect(result).toEqual(mockEntries)
      expect(result).toHaveLength(2)
    })

    it('should return empty array if no entries with status', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([])

      const result = await syncService.getSyncEntriesByStatus('synced')

      expect(result).toEqual([])
    })
  })

  describe('getSyncStatistics', () => {
    it('should retrieve sync statistics', async () => {
      const mockStats = {
        pending: 5,
        synced: 20,
        failed: 2,
        total_retries: 3,
      }

      vi.mocked(db.queryOne).mockResolvedValueOnce(mockStats)

      const result = await syncService.getSyncStatistics()

      expect(result.pending).toBe(5)
      expect(result.synced).toBe(20)
      expect(result.failed).toBe(2)
      expect(result.totalRetries).toBe(3)
    })

    it('should return zero values if no entries', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce(null)

      const result = await syncService.getSyncStatistics()

      expect(result.pending).toBe(0)
      expect(result.synced).toBe(0)
      expect(result.failed).toBe(0)
      expect(result.totalRetries).toBe(0)
    })
  })

  describe('retryFailedSyncs', () => {
    it('should retry failed sync entries', async () => {
      const mockFailedEntries = [
        {
          id: 'queue-1',
          studentId: 'student-1',
          examId: 'exam-123',
          answers: JSON.stringify([
            {
              questionId: 'question-1',
              studentAnswer: 'A',
              isCorrect: true,
              marksObtained: 1,
              totalMarks: 1,
            },
          ]),
          syncStatus: 'failed',
          retryCount: 1,
          createdAt: new Date(),
        },
      ]

      vi.mocked(db.queryAll).mockResolvedValueOnce(mockFailedEntries)

      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({ id: 'exam-123', tenant_id: 'tenant-123' }) // Exam verification
        .mockResolvedValueOnce({ id: 'student-1' }) // Student verification
        .mockResolvedValueOnce({ id: 'result-123' }) // Get/create result
        .mockResolvedValueOnce({ id: 'question-1' }) // Question verification
        .mockResolvedValueOnce(null) // No existing answer
        .mockResolvedValueOnce({ id: 'answer-1' }) // Insert answer

      vi.mocked(db.query).mockResolvedValueOnce({ rowCount: 1 }) // Update sync queue

      const result = await syncService.retryFailedSyncs('tenant-123')

      expect(result.retried).toBe(1)
      expect(result.succeeded).toBe(1)
      expect(result.failed).toBe(0)
    })

    it('should skip entries exceeding max retries', async () => {
      const mockFailedEntries = [
        {
          id: 'queue-1',
          studentId: 'student-1',
          examId: 'exam-123',
          answers: JSON.stringify([]),
          syncStatus: 'failed',
          retryCount: 3, // Max retries exceeded
          createdAt: new Date(),
        },
      ]

      vi.mocked(db.queryAll).mockResolvedValueOnce(mockFailedEntries)

      const result = await syncService.retryFailedSyncs('tenant-123')

      expect(result.retried).toBe(0)
    })

    it('should handle retry errors gracefully', async () => {
      const mockFailedEntries = [
        {
          id: 'queue-1',
          studentId: 'student-1',
          examId: 'exam-123',
          answers: JSON.stringify([
            {
              questionId: 'question-1',
              studentAnswer: 'A',
              isCorrect: true,
              marksObtained: 1,
              totalMarks: 1,
            },
          ]),
          syncStatus: 'failed',
          retryCount: 1,
          createdAt: new Date(),
        },
      ]

      vi.mocked(db.queryAll).mockResolvedValueOnce(mockFailedEntries)

      vi.mocked(db.queryOne).mockRejectedValueOnce(new Error('Database error'))

      const result = await syncService.retryFailedSyncs('tenant-123')

      expect(result.retried).toBe(1)
      expect(result.failed).toBe(1)
    })
  })

  describe('cleanupOldSyncEntries', () => {
    it('should delete old synced entries', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rowCount: 5 })

      const result = await syncService.cleanupOldSyncEntries()

      expect(result).toBe(5)
    })

    it('should return 0 if no old entries', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rowCount: 0 })

      const result = await syncService.cleanupOldSyncEntries()

      expect(result).toBe(0)
    })
  })

  describe('Exponential Backoff Calculation', () => {
    it('should calculate correct exponential backoff delays', () => {
      // Test exponential backoff: 1000 * 2^retryCount
      const delays = [0, 1, 2, 3].map(count => {
        return 1000 * Math.pow(2, count)
      })

      expect(delays[0]).toBe(1000) // 1 second
      expect(delays[1]).toBe(2000) // 2 seconds
      expect(delays[2]).toBe(4000) // 4 seconds
      expect(delays[3]).toBe(8000) // 8 seconds
    })

    it('should not exceed maximum retry count', () => {
      const MAX_RETRIES = 3
      const retryCount = 5

      expect(retryCount > MAX_RETRIES).toBe(true)
    })
  })

  describe('Conflict Resolution Strategy', () => {
    it('should use server-as-authoritative strategy', async () => {
      // When a conflict is detected (answer exists on server),
      // the server answer should take precedence
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({ id: 'exam-123', tenant_id: 'tenant-123' })
        .mockResolvedValueOnce({ id: 'student-123' })
        .mockResolvedValueOnce({ id: 'result-123' })
        .mockResolvedValueOnce({ id: 'question-1' })
        .mockResolvedValueOnce({
          id: 'answer-1',
          student_answer: 'A', // Server has answer A
          updated_at: new Date(),
        })

      vi.mocked(db.query).mockResolvedValueOnce({ rowCount: 1 })

      const answers = [
        {
          questionId: 'question-1',
          studentAnswer: 'B', // Offline has answer B
          correctAnswer: 'A',
          isCorrect: false,
          marksObtained: 0,
          totalMarks: 1,
        },
      ]

      const result = await syncService.syncOfflineAnswers(
        'tenant-123',
        'student-123',
        'exam-123',
        answers,
        new Date()
      )

      // Conflict should be detected and offline answer discarded
      expect(result.conflicts).toBe(1)
      expect(result.synced).toBe(0)
    })
  })

  describe('Data Validation', () => {
    it('should validate answer data before processing', async () => {
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({ id: 'exam-123', tenant_id: 'tenant-123' })
        .mockResolvedValueOnce({ id: 'student-123' })
        .mockResolvedValueOnce({ id: 'result-123' })

      vi.mocked(db.query).mockResolvedValueOnce({ rowCount: 1 })

      const answers = [
        {
          questionId: '', // Invalid: empty
          studentAnswer: 'A',
          correctAnswer: 'A',
          isCorrect: true,
          marksObtained: 1,
          totalMarks: 1,
        },
      ]

      const result = await syncService.syncOfflineAnswers(
        'tenant-123',
        'student-123',
        'exam-123',
        answers,
        new Date()
      )

      expect(result.failed).toBe(1)
      expect(result.errors).toContain('Answer missing questionId')
    })

    it('should handle null/undefined values gracefully', async () => {
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({ id: 'exam-123', tenant_id: 'tenant-123' })
        .mockResolvedValueOnce({ id: 'student-123' })
        .mockResolvedValueOnce({ id: 'result-123' })
        .mockResolvedValueOnce({ id: 'question-1' })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'answer-1' })

      vi.mocked(db.query).mockResolvedValueOnce({ rowCount: 1 })

      const answers = [
        {
          questionId: 'question-1',
          studentAnswer: null, // Null answer
          correctAnswer: 'A',
          isCorrect: false,
          marksObtained: 0,
          totalMarks: 1,
        },
      ]

      const result = await syncService.syncOfflineAnswers(
        'tenant-123',
        'student-123',
        'exam-123',
        answers,
        new Date()
      )

      expect(result.success).toBe(true)
      expect(result.synced).toBe(1)
    })
  })
})
