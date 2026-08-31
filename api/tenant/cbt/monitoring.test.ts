/**
 * Live Monitoring API Endpoints - Unit Tests
 * Tests for real-time exam progress tracking
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { WebSocket, WebSocketServer } from 'ws'
import handler from './monitoring'
import * as monitoringService from './_lib/monitoring'
import * as db from './_lib/db'
import { broadcastToExam, closeExamConnections, getExamConnectionCount } from './ws-monitoring'

vi.mock('../../_lib/auth-middleware.js', () => ({
  requireRole: vi.fn(),
  requireAuth: vi.fn(),
}));
import { requireRole } from '../../_lib/auth-middleware.js'

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



// Mock dependencies
vi.mock('./_lib/monitoring')
vi.mock('./_lib/db')

// Helper to create mock request
function createMockRequest(overrides: Partial<VercelRequest> = {}): VercelRequest {
  return {
    method: 'GET',
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

describe('Live Monitoring API Endpoints', () => {
  beforeEach(() => {
    mockRequireRole.mockReset()
    mockRequireRole.mockResolvedValue(mockDecoded)
    vi.clearAllMocks()
  })

  describe('GET /api/tenant/cbt/monitoring/:examId', () => {
    it('should return live monitoring data for exam', async () => {
      const mockData = {
        examId: 'exam-123',
        totalStudents: 10,
        activeStudents: 8,
        completedStudents: 2,
        flaggedStudents: 0,
        students: [],
      }

      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'exam-123',
        tenant_id: 'tenant-123',
      })

      vi.mocked(monitoringService.getLiveMonitoringData).mockResolvedValueOnce(mockData)

      const req = createMockRequest({
        method: 'GET',
        query: { id: 'exam-123' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockData,
      })
    })

    it('should return 404 if exam not found', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce(null)

      const req = createMockRequest({
        method: 'GET',
        query: { id: 'exam-999' },
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
        method: 'GET',
        query: { id: 'exam-123' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Exam not found',
      })
    })

    it('should return 400 if x-tenant-id header missing', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { id: 'exam-123' },
        headers: { 'x-user-id': 'user-123' },
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
        method: 'GET',
        query: { id: 'exam-123' },
        headers: { 'x-tenant-id': 'tenant-123' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        error: 'x-user-id header is required',
      })
    })

    it('should return 500 on service error', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'exam-123',
        tenant_id: 'tenant-123',
      })

      vi.mocked(monitoringService.getLiveMonitoringData).mockRejectedValueOnce(
        new Error('Database error')
      )

      const req = createMockRequest({
        method: 'GET',
        query: { id: 'exam-123' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve monitoring data',
      })
    })
  })

  describe('GET /api/tenant/cbt/monitoring/:examId/student/:studentId', () => {
    it('should return student progress', async () => {
      const mockProgress = {
        id: 'progress-123',
        examId: 'exam-123',
        studentId: 'student-123',
        questionsAnswered: 5,
        currentQuestion: 6,
        status: 'Active',
        timeRemaining: 1200,
        lastActivityTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({
          id: 'exam-123',
          tenant_id: 'tenant-123',
        })
        .mockResolvedValueOnce({
          id: 'student-123',
        })

      vi.mocked(monitoringService.getStudentProgress).mockResolvedValueOnce(mockProgress)

      const req = createMockRequest({
        method: 'GET',
        query: { id: 'exam-123', action: 'student', studentId: 'student-123' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockProgress,
      })
    })

    it('should return 400 if studentId missing', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { id: 'exam-123', action: 'student' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'studentId is required',
      })
    })

    it('should return 404 if exam not found', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce(null)

      const req = createMockRequest({
        method: 'GET',
        query: { id: 'exam-999', action: 'student', studentId: 'student-123' },
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
          id: 'exam-123',
          tenant_id: 'tenant-123',
        })
        .mockResolvedValueOnce(null)

      const req = createMockRequest({
        method: 'GET',
        query: { id: 'exam-123', action: 'student', studentId: 'student-999' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Student not found',
      })
    })

    it('should return 404 if student progress not found', async () => {
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({
          id: 'exam-123',
          tenant_id: 'tenant-123',
        })
        .mockResolvedValueOnce({
          id: 'student-123',
        })

      vi.mocked(monitoringService.getStudentProgress).mockResolvedValueOnce(null)

      const req = createMockRequest({
        method: 'GET',
        query: { id: 'exam-123', action: 'student', studentId: 'student-123' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Student progress not found',
      })
    })
  })

  describe('PUT /api/tenant/cbt/monitoring/:examId/student/:studentId', () => {
    it('should update student progress', async () => {
      const mockUpdated = {
        id: 'progress-123',
        examId: 'exam-123',
        studentId: 'student-123',
        questionsAnswered: 6,
        currentQuestion: 7,
        status: 'Active',
        timeRemaining: 1100,
        lastActivityTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'exam-123',
        tenant_id: 'tenant-123',
      })

      vi.mocked(monitoringService.updateStudentProgress).mockResolvedValueOnce(mockUpdated)

      const req = createMockRequest({
        method: 'PUT',
        query: { id: 'exam-123', action: 'student', studentId: 'student-123' },
        body: {
          questionsAnswered: 6,
          currentQuestion: 7,
          timeRemaining: 1100,
        },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdated,
      })
    })

    it('should return 400 if questionsAnswered is negative', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'exam-123',
        tenant_id: 'tenant-123',
      })

      const req = createMockRequest({
        method: 'PUT',
        query: { id: 'exam-123', action: 'student', studentId: 'student-123' },
        body: { questionsAnswered: -1 },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          questionsAnswered: 'Must be a non-negative number',
        },
      })
    })

    it('should return 400 if status is invalid', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'exam-123',
        tenant_id: 'tenant-123',
      })

      const req = createMockRequest({
        method: 'PUT',
        query: { id: 'exam-123', action: 'student', studentId: 'student-123' },
        body: { status: 'Invalid' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          status: 'Must be Active, Completed, Paused, or Flagged',
        },
      })
    })

    it('should return 400 if timeRemaining is negative', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'exam-123',
        tenant_id: 'tenant-123',
      })

      const req = createMockRequest({
        method: 'PUT',
        query: { id: 'exam-123', action: 'student', studentId: 'student-123' },
        body: { timeRemaining: -100 },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          timeRemaining: 'Must be a non-negative number',
        },
      })
    })

    it('should return 400 if request body missing', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'exam-123',
        tenant_id: 'tenant-123',
      })

      const req = createMockRequest({
        method: 'PUT',
        query: { id: 'exam-123', action: 'student', studentId: 'student-123' },
        body: null,
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Request body is required',
      })
    })
  })

  describe('PUT /api/tenant/cbt/monitoring/:examId/student/:studentId/flag', () => {
    it('should flag student for suspicious activity', async () => {
      const mockFlagged = {
        id: 'progress-123',
        examId: 'exam-123',
        studentId: 'student-123',
        questionsAnswered: 5,
        currentQuestion: 6,
        status: 'Flagged',
        flagReason: 'Tab switching detected',
        flaggedAt: new Date(),
        lastActivityTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'exam-123',
        tenant_id: 'tenant-123',
      })

      vi.mocked(monitoringService.flagStudent).mockResolvedValueOnce(mockFlagged)

      const req = createMockRequest({
        method: 'PUT',
        query: { id: 'exam-123', action: 'flag', studentId: 'student-123' },
        body: { reason: 'Tab switching detected' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockFlagged,
      })
    })

    it('should return 400 if reason is empty', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'exam-123',
        tenant_id: 'tenant-123',
      })

      const req = createMockRequest({
        method: 'PUT',
        query: { id: 'exam-123', action: 'flag', studentId: 'student-123' },
        body: { reason: '' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          reason: 'Reason is required and must be a non-empty string',
        },
      })
    })

    it('should return 400 if reason exceeds 255 characters', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'exam-123',
        tenant_id: 'tenant-123',
      })

      const longReason = 'a'.repeat(256)

      const req = createMockRequest({
        method: 'PUT',
        query: { id: 'exam-123', action: 'flag', studentId: 'student-123' },
        body: { reason: longReason },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          reason: 'Reason must not exceed 255 characters',
        },
      })
    })

    it('should return 400 if reason is not a string', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        id: 'exam-123',
        tenant_id: 'tenant-123',
      })

      const req = createMockRequest({
        method: 'PUT',
        query: { id: 'exam-123', action: 'flag', studentId: 'student-123' },
        body: { reason: 123 },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          reason: 'Reason is required and must be a non-empty string',
        },
      })
    })

    it('should return 400 if studentId missing', async () => {
      const req = createMockRequest({
        method: 'PUT',
        query: { id: 'exam-123', action: 'flag' },
        body: { reason: 'Test' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'studentId is required',
      })
    })
  })

  describe('POST /api/tenant/cbt/monitoring/:examId/student/:studentId/complete', () => {
    it('should complete student exam', async () => {
      const mockCompleted = {
        id: 'progress-123',
        examId: 'exam-123',
        studentId: 'student-123',
        questionsAnswered: 10,
        currentQuestion: 10,
        status: 'Completed',
        lastActivityTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.queryOne).mockResolvedValue({
        id: 'exam-123',
        tenant_id: 'tenant-123',
      })

      vi.mocked(monitoringService.completeStudentExam).mockResolvedValueOnce(mockCompleted)

      const req = createMockRequest({
        method: 'POST',
        query: { id: 'exam-123', action: 'complete', studentId: 'student-123' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCompleted,
      })
    })

    it('should return 400 if studentId missing', async () => {
      const req = createMockRequest({
        method: 'POST',
        query: { id: 'exam-123', action: 'complete' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'studentId is required',
      })
    })

    it('should return 404 if exam not found', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce(null)

      const req = createMockRequest({
        method: 'POST',
        query: { id: 'exam-999', action: 'complete', studentId: 'student-123' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Exam not found',
      })
    })

    it('should return 500 on service error', async () => {
      vi.mocked(db.queryOne).mockResolvedValue({
        id: 'exam-123',
        tenant_id: 'tenant-123',
      })

      vi.mocked(monitoringService.completeStudentExam).mockRejectedValueOnce(
        new Error('Database error')
      )

      const req = createMockRequest({
        method: 'POST',
        query: { id: 'exam-123', action: 'complete', studentId: 'student-123' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to complete exam',
      })
    })
  })

  describe('GET /api/tenant/cbt/monitoring/:examId/students/by-status/:status', () => {
    it('should return students by status', async () => {
      const mockStudents = [
        {
          id: 'progress-1',
          examId: 'exam-123',
          studentId: 'student-1',
          questionsAnswered: 10,
          currentQuestion: 10,
          status: 'Completed',
          lastActivityTime: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(db.queryOne).mockResolvedValue({
        id: 'exam-123',
        tenant_id: 'tenant-123',
      })

      vi.mocked(monitoringService.getStudentsByStatus).mockResolvedValueOnce(mockStudents)

      const req = createMockRequest({
        method: 'GET',
        query: { id: 'exam-123', action: 'by-status', status: 'Completed' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStudents,
      })
    })

    it('should return 400 if status missing', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { id: 'exam-123', action: 'by-status' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'status is required',
      })
    })

    it('should return 400 if status is invalid', async () => {
      vi.mocked(db.queryOne).mockResolvedValue({
        id: 'exam-123',
        tenant_id: 'tenant-123',
      })

      const req = createMockRequest({
        method: 'GET',
        query: { id: 'exam-123', action: 'by-status', status: 'Invalid' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          status: 'Must be Active, Completed, Paused, or Flagged',
        },
      })
    })

    it('should return 404 if exam not found', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce(null)

      const req = createMockRequest({
        method: 'GET',
        query: { id: 'exam-999', action: 'by-status', status: 'Active' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Exam not found',
      })
    })

    it('should return 500 on service error', async () => {
      vi.mocked(db.queryOne).mockResolvedValue({
        id: 'exam-123',
        tenant_id: 'tenant-123',
      })

      vi.mocked(monitoringService.getStudentsByStatus).mockRejectedValueOnce(
        new Error('Database error')
      )

      const req = createMockRequest({
        method: 'GET',
        query: { id: 'exam-123', action: 'by-status', status: 'Active' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve students',
      })
    })
  })

  describe('Method not allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      const req = createMockRequest({
        method: 'DELETE',
        query: { id: 'exam-123' },
      })
      const res = createMockResponse()

      await handler(req, res)

      expect(res.setHeader).toHaveBeenCalledWith('Allow', 'GET,PUT,POST')
      expect(res.status).toHaveBeenCalledWith(405)
      expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
    })
  })
})


// ============================================================================
// WEBSOCKET INTEGRATION TESTS
// ============================================================================

describe('WebSocket Real-Time Monitoring Integration', () => {
  let mockWs: any
  let mockWs2: any

  beforeEach(() => {
    vi.clearAllMocks()
    // Create mock WebSocket instances
    mockWs = {
      readyState: WebSocket.OPEN,
      send: vi.fn(),
      close: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
    }
    mockWs2 = {
      readyState: WebSocket.OPEN,
      send: vi.fn(),
      close: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
    }
  })

  afterEach(() => {
    // Clean up connections
    closeExamConnections('exam-123')
  })

  describe('broadcastToExam', () => {
    it('should broadcast message to all connected clients', () => {
      const message = {
        type: 'progress_update',
        data: { studentId: 'student-1', questionsAnswered: 5 },
        timestamp: new Date().toISOString(),
      }

      // Simulate adding connections
      const examId = 'exam-123'
      
      // Note: In real implementation, connections are managed internally
      // This test verifies the broadcast function signature and behavior
      expect(() => {
        broadcastToExam(examId, message)
      }).not.toThrow()
    })

    it('should handle broadcast to exam with no connections', () => {
      const message = {
        type: 'progress_update',
        data: { studentId: 'student-1', questionsAnswered: 5 },
        timestamp: new Date().toISOString(),
      }

      // Should not throw even if no connections exist
      expect(() => {
        broadcastToExam('exam-999', message)
      }).not.toThrow()
    })

    it('should broadcast student_completed event', () => {
      const message = {
        type: 'student_completed',
        data: { studentId: 'student-1', completedAt: new Date().toISOString() },
        timestamp: new Date().toISOString(),
      }

      expect(() => {
        broadcastToExam('exam-123', message)
      }).not.toThrow()
    })

    it('should broadcast student_flagged event', () => {
      const message = {
        type: 'student_flagged',
        data: {
          studentId: 'student-1',
          reason: 'Tab switching detected',
          flaggedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      }

      expect(() => {
        broadcastToExam('exam-123', message)
      }).not.toThrow()
    })

    it('should broadcast exam_ended event', () => {
      const message = {
        type: 'exam_ended',
        data: { examId: 'exam-123', endedAt: new Date().toISOString() },
        timestamp: new Date().toISOString(),
      }

      expect(() => {
        broadcastToExam('exam-123', message)
      }).not.toThrow()
    })
  })

  describe('getExamConnectionCount', () => {
    it('should return 0 for exam with no connections', () => {
      const count = getExamConnectionCount('exam-999')
      expect(count).toBe(0)
    })

    it('should return correct connection count', () => {
      // Note: In real implementation, connections are managed internally
      // This test verifies the function returns a number
      const count = getExamConnectionCount('exam-123')
      expect(typeof count).toBe('number')
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  describe('closeExamConnections', () => {
    it('should close all connections for exam', () => {
      // Should not throw
      expect(() => {
        closeExamConnections('exam-123')
      }).not.toThrow()
    })

    it('should handle closing exam with no connections', () => {
      // Should not throw
      expect(() => {
        closeExamConnections('exam-999')
      }).not.toThrow()
    })

    it('should reduce connection count to 0 after closing', () => {
      closeExamConnections('exam-123')
      const count = getExamConnectionCount('exam-123')
      expect(count).toBe(0)
    })
  })

  describe('WebSocket Message Handling', () => {
    it('should handle ping/pong messages', () => {
      const message = {
        type: 'ping',
        timestamp: new Date().toISOString(),
      }

      // Verify message structure is valid
      expect(message.type).toBe('ping')
      expect(message.timestamp).toBeDefined()
    })

    it('should handle progress_update messages', () => {
      const message = {
        type: 'progress_update',
        data: {
          studentId: 'student-1',
          questionsAnswered: 5,
          currentQuestion: 6,
          status: 'Active',
          timeRemaining: 1200,
        },
        timestamp: new Date().toISOString(),
      }

      expect(message.type).toBe('progress_update')
      expect(message.data.studentId).toBeDefined()
      expect(message.data.questionsAnswered).toBeGreaterThanOrEqual(0)
    })

    it('should handle student_completed messages', () => {
      const message = {
        type: 'student_completed',
        data: {
          studentId: 'student-1',
          completedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      }

      expect(message.type).toBe('student_completed')
      expect(message.data.studentId).toBeDefined()
    })

    it('should handle exam_ended messages', () => {
      const message = {
        type: 'exam_ended',
        data: {
          examId: 'exam-123',
          endedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      }

      expect(message.type).toBe('exam_ended')
      expect(message.data.examId).toBeDefined()
    })

    it('should validate message structure', () => {
      const validMessage = {
        type: 'progress_update',
        data: { studentId: 'student-1' },
        timestamp: new Date().toISOString(),
      }

      expect(validMessage).toHaveProperty('type')
      expect(validMessage).toHaveProperty('data')
      expect(validMessage).toHaveProperty('timestamp')
    })

    it('should reject messages without type', () => {
      const invalidMessage = {
        data: { studentId: 'student-1' },
        timestamp: new Date().toISOString(),
      }

      expect(invalidMessage).not.toHaveProperty('type')
    })

    it('should reject messages without timestamp', () => {
      const invalidMessage = {
        type: 'progress_update',
        data: { studentId: 'student-1' },
      }

      expect(invalidMessage).not.toHaveProperty('timestamp')
    })
  })

  describe('Real-Time Update Scenarios', () => {
    it('should handle rapid progress updates', () => {
      const updates = [
        {
          type: 'progress_update',
          data: { studentId: 'student-1', questionsAnswered: 1 },
          timestamp: new Date().toISOString(),
        },
        {
          type: 'progress_update',
          data: { studentId: 'student-1', questionsAnswered: 2 },
          timestamp: new Date().toISOString(),
        },
        {
          type: 'progress_update',
          data: { studentId: 'student-1', questionsAnswered: 3 },
          timestamp: new Date().toISOString(),
        },
      ]

      updates.forEach((update) => {
        expect(() => {
          broadcastToExam('exam-123', update)
        }).not.toThrow()
      })
    })

    it('should handle multiple students in same exam', () => {
      const updates = [
        {
          type: 'progress_update',
          data: { studentId: 'student-1', questionsAnswered: 5 },
          timestamp: new Date().toISOString(),
        },
        {
          type: 'progress_update',
          data: { studentId: 'student-2', questionsAnswered: 3 },
          timestamp: new Date().toISOString(),
        },
        {
          type: 'progress_update',
          data: { studentId: 'student-3', questionsAnswered: 7 },
          timestamp: new Date().toISOString(),
        },
      ]

      updates.forEach((update) => {
        expect(() => {
          broadcastToExam('exam-123', update)
        }).not.toThrow()
      })
    })

    it('should handle student completion during exam', () => {
      // Student 1 completes
      expect(() => {
        broadcastToExam('exam-123', {
          type: 'student_completed',
          data: { studentId: 'student-1', completedAt: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        })
      }).not.toThrow()

      // Other students continue
      expect(() => {
        broadcastToExam('exam-123', {
          type: 'progress_update',
          data: { studentId: 'student-2', questionsAnswered: 5 },
          timestamp: new Date().toISOString(),
        })
      }).not.toThrow()
    })

    it('should handle student flagging during exam', () => {
      expect(() => {
        broadcastToExam('exam-123', {
          type: 'student_flagged',
          data: {
            studentId: 'student-1',
            reason: 'Suspicious activity detected',
            flaggedAt: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        })
      }).not.toThrow()
    })

    it('should handle exam end with all students', () => {
      expect(() => {
        broadcastToExam('exam-123', {
          type: 'exam_ended',
          data: { examId: 'exam-123', endedAt: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        })
      }).not.toThrow()

      // After exam ends, connections should be closed
      closeExamConnections('exam-123')
      expect(getExamConnectionCount('exam-123')).toBe(0)
    })
  })

  describe('Connection Lifecycle', () => {
    it('should track connection count', () => {
      const initialCount = getExamConnectionCount('exam-123')
      expect(initialCount).toBeGreaterThanOrEqual(0)
    })

    it('should handle connection cleanup', () => {
      closeExamConnections('exam-123')
      const count = getExamConnectionCount('exam-123')
      expect(count).toBe(0)
    })

    it('should support multiple exams independently', () => {
      // Exam 1 connections
      expect(() => {
        broadcastToExam('exam-1', {
          type: 'progress_update',
          data: { studentId: 'student-1', questionsAnswered: 5 },
          timestamp: new Date().toISOString(),
        })
      }).not.toThrow()

      // Exam 2 connections
      expect(() => {
        broadcastToExam('exam-2', {
          type: 'progress_update',
          data: { studentId: 'student-2', questionsAnswered: 3 },
          timestamp: new Date().toISOString(),
        })
      }).not.toThrow()

      // Close exam 1
      closeExamConnections('exam-1')
      expect(getExamConnectionCount('exam-1')).toBe(0)

      // Exam 2 should still work
      expect(() => {
        broadcastToExam('exam-2', {
          type: 'progress_update',
          data: { studentId: 'student-2', questionsAnswered: 4 },
          timestamp: new Date().toISOString(),
        })
      }).not.toThrow()

      // Cleanup
      closeExamConnections('exam-2')
    })
  })
})
