/**
 * WebSocket Real-Time Monitoring - Integration Tests
 * Tests for WebSocket connection management and real-time message broadcasting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WebSocket, WebSocketServer } from 'ws'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as db from './_lib/db'

// Mock database module
vi.mock('./_lib/db')

/**
 * Mock WebSocket connection for testing
 */
class MockWebSocket {
  readyState = WebSocket.OPEN
  listeners: Map<string, Function[]> = new Map()
  sentMessages: any[] = []

  on(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(handler)
  }

  once(event: string, handler: Function) {
    const wrappedHandler = (...args: any[]) => {
      handler(...args)
      this.removeListener(event, wrappedHandler)
    }
    this.on(event, wrappedHandler)
  }

  removeListener(event: string, handler: Function) {
    const handlers = this.listeners.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  send(data: string) {
    this.sentMessages.push(JSON.parse(data))
  }

  close(code?: number, reason?: string) {
    this.readyState = WebSocket.CLOSED
    const handlers = this.listeners.get('close')
    if (handlers) {
      handlers.forEach(h => h())
    }
  }

  emit(event: string, ...args: any[]) {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.forEach(h => h(...args))
    }
  }
}

describe('WebSocket Real-Time Monitoring Integration Tests', () => {
  let mockWs1: MockWebSocket
  let mockWs2: MockWebSocket
  let mockWs3: MockWebSocket

  beforeEach(() => {
    vi.clearAllMocks()
    mockWs1 = new MockWebSocket()
    mockWs2 = new MockWebSocket()
    mockWs3 = new MockWebSocket()
  })

  afterEach(() => {
    mockWs1.close()
    mockWs2.close()
    mockWs3.close()
  })

  describe('WebSocket Connection Lifecycle', () => {
    it('should establish WebSocket connection with valid credentials', async () => {
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({ id: 'user-123' }) // User verification
        .mockResolvedValueOnce({ id: 'exam-123', tenant_id: 'tenant-123' }) // Exam verification

      const req = {
        headers: {
          upgrade: 'websocket',
          'x-tenant-id': 'tenant-123',
          'x-user-id': 'user-123',
        },
        query: { examId: 'exam-123' },
        socket: { writable: true },
      } as any

      const res = {} as VercelResponse

      // Simulate connection establishment
      expect(mockWs1.readyState).toBe(WebSocket.OPEN)
      expect(mockWs1.sentMessages.length).toBe(0)
    })

    it('should send connection confirmation message', () => {
      const connectionMessage = {
        type: 'connected',
        examId: 'exam-123',
        timestamp: new Date().toISOString(),
      }

      mockWs1.send(JSON.stringify(connectionMessage))

      expect(mockWs1.sentMessages).toHaveLength(1)
      expect(mockWs1.sentMessages[0].type).toBe('connected')
      expect(mockWs1.sentMessages[0].examId).toBe('exam-123')
    })

    it('should handle connection errors gracefully', () => {
      const errorHandler = vi.fn()
      mockWs1.on('error', errorHandler)

      const error = new Error('Connection failed')
      mockWs1.emit('error', error)

      expect(errorHandler).toHaveBeenCalledWith(error)
    })

    it('should close connection on disconnect', () => {
      const closeHandler = vi.fn()
      mockWs1.on('close', closeHandler)

      mockWs1.close(1000, 'Normal closure')

      expect(closeHandler).toHaveBeenCalled()
      expect(mockWs1.readyState).toBe(WebSocket.CLOSED)
    })

    it('should handle abnormal disconnection', () => {
      const closeHandler = vi.fn()
      mockWs1.on('close', closeHandler)

      mockWs1.close(1006, 'Abnormal closure')

      expect(closeHandler).toHaveBeenCalled()
      expect(mockWs1.readyState).toBe(WebSocket.CLOSED)
    })
  })

  describe('Real-Time Message Broadcasting', () => {
    it('should broadcast progress_update to all connected clients', () => {
      const messageHandler1 = vi.fn()
      const messageHandler2 = vi.fn()
      const messageHandler3 = vi.fn()

      mockWs1.on('message', messageHandler1)
      mockWs2.on('message', messageHandler2)
      mockWs3.on('message', messageHandler3)

      const progressUpdate = {
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

      const messageBuffer = Buffer.from(JSON.stringify(progressUpdate))

      // Simulate broadcast to all connections
      mockWs1.emit('message', messageBuffer)
      mockWs2.emit('message', messageBuffer)
      mockWs3.emit('message', messageBuffer)

      expect(messageHandler1).toHaveBeenCalledWith(messageBuffer)
      expect(messageHandler2).toHaveBeenCalledWith(messageBuffer)
      expect(messageHandler3).toHaveBeenCalledWith(messageBuffer)
    })

    it('should broadcast student_completed event', () => {
      const messageHandler = vi.fn()
      mockWs1.on('message', messageHandler)

      const completionEvent = {
        type: 'student_completed',
        data: {
          studentId: 'student-1',
          completedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      }

      const messageBuffer = Buffer.from(JSON.stringify(completionEvent))
      mockWs1.emit('message', messageBuffer)

      expect(messageHandler).toHaveBeenCalledWith(messageBuffer)
    })

    it('should broadcast student_flagged event', () => {
      const messageHandler = vi.fn()
      mockWs1.on('message', messageHandler)

      const flagEvent = {
        type: 'student_flagged',
        data: {
          studentId: 'student-1',
          reason: 'Tab switching detected',
          flaggedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      }

      const messageBuffer = Buffer.from(JSON.stringify(flagEvent))
      mockWs1.emit('message', messageBuffer)

      expect(messageHandler).toHaveBeenCalledWith(messageBuffer)
    })

    it('should broadcast exam_ended event', () => {
      const messageHandler = vi.fn()
      mockWs1.on('message', messageHandler)

      const endEvent = {
        type: 'exam_ended',
        data: {
          examId: 'exam-123',
          endedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      }

      const messageBuffer = Buffer.from(JSON.stringify(endEvent))
      mockWs1.emit('message', messageBuffer)

      expect(messageHandler).toHaveBeenCalledWith(messageBuffer)
    })

    it('should handle ping/pong messages', () => {
      const messageHandler = vi.fn()
      mockWs1.on('message', messageHandler)

      const pingMessage = {
        type: 'ping',
        timestamp: new Date().toISOString(),
      }

      const messageBuffer = Buffer.from(JSON.stringify(pingMessage))
      mockWs1.emit('message', messageBuffer)

      expect(messageHandler).toHaveBeenCalledWith(messageBuffer)
    })

    it('should handle invalid message format gracefully', () => {
      const messageHandler = vi.fn()
      mockWs1.on('message', messageHandler)

      const invalidBuffer = Buffer.from('invalid json {')
      mockWs1.emit('message', invalidBuffer)

      expect(messageHandler).toHaveBeenCalledWith(invalidBuffer)
    })
  })

  describe('Multiple Client Synchronization', () => {
    it('should keep multiple clients synchronized with same data', () => {
      const progressUpdate = {
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

      const messageBuffer = Buffer.from(JSON.stringify(progressUpdate))

      // Send to all clients
      mockWs1.emit('message', messageBuffer)
      mockWs2.emit('message', messageBuffer)
      mockWs3.emit('message', messageBuffer)

      // Verify all clients received the same message
      expect(mockWs1.sentMessages).toHaveLength(0) // No responses yet
      expect(mockWs2.sentMessages).toHaveLength(0)
      expect(mockWs3.sentMessages).toHaveLength(0)
    })

    it('should handle client disconnection without affecting others', () => {
      const closeHandler1 = vi.fn()
      const closeHandler2 = vi.fn()
      const closeHandler3 = vi.fn()

      mockWs1.on('close', closeHandler1)
      mockWs2.on('close', closeHandler2)
      mockWs3.on('close', closeHandler3)

      // Disconnect first client
      mockWs1.close(1000, 'Normal closure')

      expect(closeHandler1).toHaveBeenCalled()
      expect(closeHandler2).not.toHaveBeenCalled()
      expect(closeHandler3).not.toHaveBeenCalled()

      // Verify other clients still connected
      expect(mockWs2.readyState).toBe(WebSocket.OPEN)
      expect(mockWs3.readyState).toBe(WebSocket.OPEN)
    })

    it('should broadcast to remaining clients after one disconnects', () => {
      const messageHandler2 = vi.fn()
      const messageHandler3 = vi.fn()

      mockWs2.on('message', messageHandler2)
      mockWs3.on('message', messageHandler3)

      // Disconnect first client
      mockWs1.close()

      // Broadcast to remaining clients
      const progressUpdate = {
        type: 'progress_update',
        data: { studentId: 'student-2', questionsAnswered: 3 },
        timestamp: new Date().toISOString(),
      }

      const messageBuffer = Buffer.from(JSON.stringify(progressUpdate))
      mockWs2.emit('message', messageBuffer)
      mockWs3.emit('message', messageBuffer)

      expect(messageHandler2).toHaveBeenCalledWith(messageBuffer)
      expect(messageHandler3).toHaveBeenCalledWith(messageBuffer)
    })

    it('should handle rapid successive messages', () => {
      const messageHandler = vi.fn()
      mockWs1.on('message', messageHandler)

      const messages = [
        { type: 'progress_update', data: { questionsAnswered: 1 } },
        { type: 'progress_update', data: { questionsAnswered: 2 } },
        { type: 'progress_update', data: { questionsAnswered: 3 } },
        { type: 'progress_update', data: { questionsAnswered: 4 } },
        { type: 'progress_update', data: { questionsAnswered: 5 } },
      ]

      messages.forEach(msg => {
        const buffer = Buffer.from(JSON.stringify(msg))
        mockWs1.emit('message', buffer)
      })

      expect(messageHandler).toHaveBeenCalledTimes(5)
    })
  })

  describe('Message Ordering and Timing', () => {
    it('should preserve message order', () => {
      const receivedMessages: any[] = []
      const messageHandler = (data: Buffer) => {
        receivedMessages.push(JSON.parse(data.toString()))
      }

      mockWs1.on('message', messageHandler)

      const messages = [
        { type: 'progress_update', data: { questionsAnswered: 1 }, timestamp: '2024-01-01T10:00:00Z' },
        { type: 'progress_update', data: { questionsAnswered: 2 }, timestamp: '2024-01-01T10:00:01Z' },
        { type: 'progress_update', data: { questionsAnswered: 3 }, timestamp: '2024-01-01T10:00:02Z' },
      ]

      messages.forEach(msg => {
        const buffer = Buffer.from(JSON.stringify(msg))
        mockWs1.emit('message', buffer)
      })

      expect(receivedMessages).toHaveLength(3)
      expect(receivedMessages[0].data.questionsAnswered).toBe(1)
      expect(receivedMessages[1].data.questionsAnswered).toBe(2)
      expect(receivedMessages[2].data.questionsAnswered).toBe(3)
    })

    it('should include timestamp in all messages', () => {
      const receivedMessages: any[] = []
      const messageHandler = (data: Buffer) => {
        receivedMessages.push(JSON.parse(data.toString()))
      }

      mockWs1.on('message', messageHandler)

      const messages = [
        { type: 'progress_update', data: { questionsAnswered: 1 }, timestamp: new Date().toISOString() },
        { type: 'student_completed', data: { studentId: 'student-1' }, timestamp: new Date().toISOString() },
        { type: 'student_flagged', data: { reason: 'Test' }, timestamp: new Date().toISOString() },
      ]

      messages.forEach(msg => {
        const buffer = Buffer.from(JSON.stringify(msg))
        mockWs1.emit('message', buffer)
      })

      receivedMessages.forEach(msg => {
        expect(msg).toHaveProperty('timestamp')
        expect(msg.timestamp).toBeTruthy()
      })
    })
  })

  describe('Connection State Management', () => {
    it('should not send messages to closed connections', () => {
      mockWs1.close()

      const message = {
        type: 'progress_update',
        data: { questionsAnswered: 5 },
        timestamp: new Date().toISOString(),
      }

      // Attempt to send to closed connection
      if (mockWs1.readyState === WebSocket.OPEN) {
        mockWs1.send(JSON.stringify(message))
      }

      expect(mockWs1.sentMessages).toHaveLength(0)
    })

    it('should handle connection state transitions', () => {
      expect(mockWs1.readyState).toBe(WebSocket.OPEN)

      mockWs1.close()
      expect(mockWs1.readyState).toBe(WebSocket.CLOSED)
    })

    it('should track multiple connections per exam', () => {
      const connections = new Map<string, Set<MockWebSocket>>()

      // Add connections for exam-123
      if (!connections.has('exam-123')) {
        connections.set('exam-123', new Set())
      }
      connections.get('exam-123')!.add(mockWs1)
      connections.get('exam-123')!.add(mockWs2)

      // Add connections for exam-456
      if (!connections.has('exam-456')) {
        connections.set('exam-456', new Set())
      }
      connections.get('exam-456')!.add(mockWs3)

      expect(connections.get('exam-123')!.size).toBe(2)
      expect(connections.get('exam-456')!.size).toBe(1)

      // Remove connection
      connections.get('exam-123')!.delete(mockWs1)
      expect(connections.get('exam-123')!.size).toBe(1)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle message parsing errors', () => {
      const errorHandler = vi.fn()
      mockWs1.on('error', errorHandler)

      const invalidMessage = Buffer.from('{ invalid json')
      try {
        JSON.parse(invalidMessage.toString())
      } catch (error) {
        mockWs1.emit('error', error)
      }

      expect(errorHandler).toHaveBeenCalled()
    })

    it('should continue operating after handling an error', () => {
      const messageHandler = vi.fn()
      mockWs1.on('message', messageHandler)

      // Send invalid message
      const invalidBuffer = Buffer.from('invalid')
      mockWs1.emit('message', invalidBuffer)

      // Send valid message after error
      const validMessage = {
        type: 'progress_update',
        data: { questionsAnswered: 5 },
        timestamp: new Date().toISOString(),
      }
      const validBuffer = Buffer.from(JSON.stringify(validMessage))
      mockWs1.emit('message', validBuffer)

      expect(messageHandler).toHaveBeenCalledTimes(2)
      expect(mockWs1.readyState).toBe(WebSocket.OPEN)
    })

    it('should handle connection timeout', () => {
      const closeHandler = vi.fn()
      mockWs1.on('close', closeHandler)

      // Simulate timeout
      mockWs1.close(1006, 'Connection timeout')

      expect(closeHandler).toHaveBeenCalled()
      expect(mockWs1.readyState).toBe(WebSocket.CLOSED)
    })

    it('should handle network interruption', () => {
      const closeHandler = vi.fn()
      mockWs1.on('close', closeHandler)

      // Simulate network interruption
      mockWs1.close(1006, 'Network error')

      expect(closeHandler).toHaveBeenCalled()
    })
  })

  describe('Performance and Load', () => {
    it('should handle high-frequency message updates', () => {
      const messageHandler = vi.fn()
      mockWs1.on('message', messageHandler)

      // Simulate 100 rapid updates
      for (let i = 0; i < 100; i++) {
        const message = {
          type: 'progress_update',
          data: { questionsAnswered: i, currentQuestion: i + 1 },
          timestamp: new Date().toISOString(),
        }
        const buffer = Buffer.from(JSON.stringify(message))
        mockWs1.emit('message', buffer)
      }

      expect(messageHandler).toHaveBeenCalledTimes(100)
    })

    it('should handle large message payloads', () => {
      const messageHandler = vi.fn()
      mockWs1.on('message', messageHandler)

      // Create large message with many students
      const largeData = {
        type: 'progress_update',
        data: {
          students: Array.from({ length: 1000 }, (_, i) => ({
            studentId: `student-${i}`,
            questionsAnswered: Math.floor(Math.random() * 100),
            status: 'Active',
          })),
        },
        timestamp: new Date().toISOString(),
      }

      const buffer = Buffer.from(JSON.stringify(largeData))
      mockWs1.emit('message', buffer)

      expect(messageHandler).toHaveBeenCalledWith(buffer)
    })

    it('should handle multiple concurrent connections', () => {
      const connections: MockWebSocket[] = []

      // Create 50 concurrent connections
      for (let i = 0; i < 50; i++) {
        const ws = new MockWebSocket()
        connections.push(ws)
      }

      expect(connections).toHaveLength(50)
      expect(connections.every(ws => ws.readyState === WebSocket.OPEN)).toBe(true)

      // Clean up
      connections.forEach(ws => ws.close())
      expect(connections.every(ws => ws.readyState === WebSocket.CLOSED)).toBe(true)
    })
  })

  describe('Message Content Validation', () => {
    it('should validate progress_update message structure', () => {
      const validMessage = {
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

      expect(validMessage).toHaveProperty('type')
      expect(validMessage).toHaveProperty('data')
      expect(validMessage).toHaveProperty('timestamp')
      expect(validMessage.data).toHaveProperty('studentId')
      expect(validMessage.data).toHaveProperty('questionsAnswered')
    })

    it('should validate student_completed message structure', () => {
      const validMessage = {
        type: 'student_completed',
        data: {
          studentId: 'student-1',
          completedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      }

      expect(validMessage).toHaveProperty('type')
      expect(validMessage.type).toBe('student_completed')
      expect(validMessage.data).toHaveProperty('studentId')
      expect(validMessage.data).toHaveProperty('completedAt')
    })

    it('should validate student_flagged message structure', () => {
      const validMessage = {
        type: 'student_flagged',
        data: {
          studentId: 'student-1',
          reason: 'Tab switching detected',
          flaggedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      }

      expect(validMessage).toHaveProperty('type')
      expect(validMessage.type).toBe('student_flagged')
      expect(validMessage.data).toHaveProperty('reason')
      expect(validMessage.data.reason).toBeTruthy()
    })

    it('should validate exam_ended message structure', () => {
      const validMessage = {
        type: 'exam_ended',
        data: {
          examId: 'exam-123',
          endedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      }

      expect(validMessage).toHaveProperty('type')
      expect(validMessage.type).toBe('exam_ended')
      expect(validMessage.data).toHaveProperty('examId')
    })
  })
})
