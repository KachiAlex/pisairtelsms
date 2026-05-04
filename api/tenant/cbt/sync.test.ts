/**
 * Offline Sync API Routes - Unit Tests
 * Tests for offline answer synchronization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from './sync'
import * as syncService from './_lib/sync'
import * as db from './_lib/db'

// Mock dependencies
vi.mock('./_lib/sync')
vi.mock('./_lib/db')

// Helper to create mock request
function createMockRequest(overrides: Partial<VercelRequest> = {}): VercelRequest {
  return {
    method: 'POST',
    headers: {
      'x-tenant-id': 'tenant-123',
      'x-user-id': 'user-123',
    },
    query: {},
    body: null,
    ...overrides,
  } as VercelRequest
}

// Helper to create mock response
function createMockResponse(): VercelResponse {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  }
  return res as VercelResponse
}

describe('Offline Sync API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/tenant/cbt/sync', () => {
    it('should sync offline answers successfully', async () => {
      const mockResult = {
        success: true,
        synced: 5,
        conflicts: 0,
        failed: 0,
        errors: [],
      }

      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({
          id: 'user-123',
        })
        .mockResolvedValueOnce({
          id: 'exam-123',
          tenant_id: 'tenant-123',
        })
        .mockResolvedValueOnce({
          id: 'student-123',
        })

      vi.mocked(syncService.syncOfflineAnswers).mockResolvedValueOnce(mockResult)

      const req = createMockRequest({
        method: 'POST',
        body: {
          studentId: 'student-123',
          examId: 'exam-123',
          answers: [
            {
              questionId: 'q1',
              studentAnswer: 'A',
              correctAnswer: 'A',
              isCorrect: true,
              marksObtained: 1,
              totalMarks: 1,
            },
            {
              questionId: 'q2',
              studentAnswer: 'B',
              correctAnswer: 'C',
              isCorrect: false,
              marksObtained: 0,
              totalMarks: 1,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          synced: 5,
          conflicts: 0,
          failed: 0,
          errors: [],
        },
        requestId: expect.any(String),
      })
    })

    it('should return 400 if studentId is missing', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'user-123',
      })

      const req = createMockRequest({
        method: 'POST',
        body: {
          examId: 'exam-123',
          answers: [],
          timestamp: new Date().toISOString(),
        },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          studentId: 'Student ID is required and must be a string',
        },
      })
    })

    it('should return 400 if studentId is not a string', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'user-123',
      })

      const req = createMockRequest({
        method: 'POST',
        body: {
          studentId: 123,
          examId: 'exam-123',
          answers: [],
          timestamp: new Date().toISOString(),
        },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          studentId: 'Student ID is required and must be a string',
        },
      })
    })

    it('should return 400 if examId is missing', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'user-123',
      })

      const req = createMockRequest({
        method: 'POST',
        body: {
          studentId: 'student-123',
          answers: [],
          timestamp: new Date().toISOString(),
        },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          examId: 'Exam ID is required and must be a string',
        },
      })
    })

    it('should return 400 if answers is not an array', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'user-123',
      })

      const req = createMockRequest({
        method: 'POST',
        body: {
          studentId: 'student-123',
          examId: 'exam-123',
          answers: 'not-an-array',
          timestamp: new Date().toISOString(),
        },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          answers: 'Answers must be an array',
        },
      })
    })

    it('should return 400 if answers array is empty', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'user-123',
      })

      const req = createMockRequest({
        method: 'POST',
        body: {
          studentId: 'student-123',
          examId: 'exam-123',
          answers: [],
          timestamp: new Date().toISOString(),
        },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          answers: 'At least one answer is required',
        },
      })
    })

    it('should return 400 if timestamp is missing', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'user-123',
      })

      const req = createMockRequest({
        method: 'POST',
        body: {
          studentId: 'student-123',
          examId: 'exam-123',
          answers: [
            {
              questionId: 'q1',
              studentAnswer: 'A',
              isCorrect: true,
              marksObtained: 1,
              totalMarks: 1,
            },
          ],
        },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          timestamp: 'Valid timestamp is required',
        },
      })
    })

    it('should return 400 if timestamp is invalid', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'user-123',
      })

      const req = createMockRequest({
        method: 'POST',
        body: {
          studentId: 'student-123',
          examId: 'exam-123',
          answers: [
            {
              questionId: 'q1',
              studentAnswer: 'A',
              isCorrect: true,
              marksObtained: 1,
              totalMarks: 1,
            },
          ],
          timestamp: 'invalid-date',
        },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          timestamp: 'Valid timestamp is required',
        },
      })
    })

    it('should return 404 if exam not found', async () => {
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({
          id: 'user-123',
        })
        .mockResolvedValueOnce(null)

      const req = createMockRequest({
        method: 'POST',
        body: {
          studentId: 'student-123',
          examId: 'exam-999',
          answers: [
            {
              questionId: 'q1',
              studentAnswer: 'A',
              isCorrect: true,
              marksObtained: 1,
              totalMarks: 1,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Exam not found',
      })
    })

    it('should return 404 if exam belongs to different tenant', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'exam-123',
        tenant_id: 'other-tenant',
      })

      const req = createMockRequest({
        method: 'POST',
        body: {
          studentId: 'student-123',
          examId: 'exam-123',
          answers: [
            {
              questionId: 'q1',
              studentAnswer: 'A',
              isCorrect: true,
              marksObtained: 1,
              totalMarks: 1,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Exam not found',
      })
    })

    it('should return 404 if student not found', async () => {
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({
          id: 'user-123',
        })
        .mockResolvedValueOnce({
          id: 'exam-123',
          tenant_id: 'tenant-123',
        })
        .mockResolvedValueOnce(null)

      const req = createMockRequest({
        method: 'POST',
        body: {
          studentId: 'student-999',
          examId: 'exam-123',
          answers: [
            {
              questionId: 'q1',
              studentAnswer: 'A',
              isCorrect: true,
              marksObtained: 1,
              totalMarks: 1,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Student not found',
      })
    })

    it('should return 207 if sync partially succeeds', async () => {
      const mockResult = {
        success: false,
        synced: 3,
        conflicts: 1,
        failed: 1,
        errors: ['Question q5 not found'],
      }

      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({
          id: 'user-123',
        })
        .mockResolvedValueOnce({
          id: 'exam-123',
          tenant_id: 'tenant-123',
        })
        .mockResolvedValueOnce({
          id: 'student-123',
        })

      vi.mocked(syncService.syncOfflineAnswers).mockResolvedValueOnce(mockResult)

      const req = createMockRequest({
        method: 'POST',
        body: {
          studentId: 'student-123',
          examId: 'exam-123',
          answers: [
            {
              questionId: 'q1',
              studentAnswer: 'A',
              isCorrect: true,
              marksObtained: 1,
              totalMarks: 1,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(207)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        data: {
          synced: 3,
          conflicts: 1,
          failed: 1,
          errors: ['Question q5 not found'],
        },
        requestId: expect.any(String),
      })
    })

    it('should return 400 if x-tenant-id header missing', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: { 'x-user-id': 'user-123' },
        body: {
          studentId: 'student-123',
          examId: 'exam-123',
          answers: [],
          timestamp: new Date().toISOString(),
        },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        error: 'x-tenant-id header is required',
      })
    })

    it('should return 401 if x-user-id header missing', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: { 'x-tenant-id': 'tenant-123' },
        body: {
          studentId: 'student-123',
          examId: 'exam-123',
          answers: [],
          timestamp: new Date().toISOString(),
        },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        error: 'x-user-id header is required',
      })
    })

    it('should return 401 if user not found', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce(null)

      const req = createMockRequest({
        method: 'POST',
        body: {
          studentId: 'student-123',
          examId: 'exam-123',
          answers: [],
          timestamp: new Date().toISOString(),
        },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found',
      })
    })

    it('should return 500 on service error', async () => {
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({
          id: 'user-123',
        })
        .mockResolvedValueOnce({
          id: 'exam-123',
          tenant_id: 'tenant-123',
        })
        .mockResolvedValueOnce({
          id: 'student-123',
        })

      vi.mocked(syncService.syncOfflineAnswers).mockRejectedValueOnce(
        new Error('Database error')
      )

      const req = createMockRequest({
        method: 'POST',
        body: {
          studentId: 'student-123',
          examId: 'exam-123',
          answers: [
            {
              questionId: 'q1',
              studentAnswer: 'A',
              isCorrect: true,
              marksObtained: 1,
              totalMarks: 1,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to sync offline answers',
      })
    })
  })

  describe('POST /api/tenant/cbt/sync/queue', () => {
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

      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({
          id: 'user-123',
        })
        .mockResolvedValueOnce({
          id: 'exam-123',
          tenant_id: 'tenant-123',
        })

      vi.mocked(syncService.createSyncQueueEntry).mockResolvedValueOnce(mockEntry)

      const req = createMockRequest({
        method: 'POST',
        query: { action: 'queue' },
        body: {
          studentId: 'student-123',
          examId: 'exam-123',
          answers: [
            {
              questionId: 'q1',
              studentAnswer: 'A',
              isCorrect: true,
              marksObtained: 1,
              totalMarks: 1,
            },
          ],
        },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: 'queue-123',
          status: 'pending',
          createdAt: expect.any(Date),
        },
        requestId: expect.any(String),
      })
    })

    it('should return 400 if studentId is missing', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'user-123',
      })

      const req = createMockRequest({
        method: 'POST',
        query: { action: 'queue' },
        body: {
          examId: 'exam-123',
          answers: [],
        },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          studentId: 'Student ID is required and must be a string',
        },
      })
    })

    it('should return 400 if examId is missing', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'user-123',
      })

      const req = createMockRequest({
        method: 'POST',
        query: { action: 'queue' },
        body: {
          studentId: 'student-123',
          answers: [],
        },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          examId: 'Exam ID is required and must be a string',
        },
      })
    })

    it('should return 400 if answers is not an array', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'user-123',
      })

      const req = createMockRequest({
        method: 'POST',
        query: { action: 'queue' },
        body: {
          studentId: 'student-123',
          examId: 'exam-123',
          answers: 'not-an-array',
        },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          answers: 'Answers must be an array',
        },
      })
    })

    it('should return 404 if exam not found', async () => {
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({
          id: 'user-123',
        })
        .mockResolvedValueOnce(null)

      const req = createMockRequest({
        method: 'POST',
        query: { action: 'queue' },
        body: {
          studentId: 'student-123',
          examId: 'exam-999',
          answers: [
            {
              questionId: 'q1',
              studentAnswer: 'A',
              isCorrect: true,
              marksObtained: 1,
              totalMarks: 1,
            },
          ],
        },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Exam not found',
      })
    })
  })

  describe('GET /api/tenant/cbt/sync/queue/:studentId/:examId', () => {
    it('should get sync queue entry status', async () => {
      const mockEntry = {
        id: 'queue-123',
        studentId: 'student-123',
        examId: 'exam-123',
        answers: [],
        syncStatus: 'pending',
        retryCount: 0,
        createdAt: new Date(),
      }

      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({
          id: 'user-123',
        })
        .mockResolvedValueOnce({
          id: 'exam-123',
          tenant_id: 'tenant-123',
        })

      vi.mocked(syncService.getSyncQueueEntry).mockResolvedValueOnce(mockEntry)

      const req = createMockRequest({
        method: 'GET',
        query: { studentId: 'student-123', examId: 'exam-123' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: 'queue-123',
          status: 'pending',
          retryCount: 0,
          lastError: undefined,
          createdAt: expect.any(Date),
          syncedAt: undefined,
        },
        requestId: expect.any(String),
      })
    })

    it('should return 404 if sync queue entry not found', async () => {
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({
          id: 'user-123',
        })
        .mockResolvedValueOnce({
          id: 'exam-123',
          tenant_id: 'tenant-123',
        })

      vi.mocked(syncService.getSyncQueueEntry).mockResolvedValueOnce(null)

      const req = createMockRequest({
        method: 'GET',
        query: { studentId: 'student-123', examId: 'exam-123' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Sync queue entry not found',
      })
    })

    it('should return 404 if exam not found', async () => {
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({
          id: 'user-123',
        })
        .mockResolvedValueOnce(null)

      const req = createMockRequest({
        method: 'GET',
        query: { studentId: 'student-123', examId: 'exam-999' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Exam not found',
      })
    })
  })

  describe('GET /api/tenant/cbt/sync/statistics', () => {
    it('should get sync statistics', async () => {
      const mockStats = {
        pending: 5,
        synced: 20,
        failed: 2,
        totalRetries: 3,
      }

      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'user-123',
      })

      vi.mocked(syncService.getSyncStatistics).mockResolvedValueOnce(mockStats)

      const req = createMockRequest({
        method: 'GET',
        query: { action: 'statistics' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
        requestId: expect.any(String),
      })
    })
  })

  describe('POST /api/tenant/cbt/sync/retry', () => {
    it('should retry failed syncs', async () => {
      const mockResult = {
        retried: 2,
        succeeded: 1,
        failed: 1,
      }

      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'user-123',
      })

      vi.mocked(syncService.retryFailedSyncs).mockResolvedValueOnce(mockResult)

      const req = createMockRequest({
        method: 'POST',
        query: { action: 'retry' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        requestId: expect.any(String),
      })
    })
  })
})
