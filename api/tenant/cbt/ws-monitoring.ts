/**
 * WebSocket Real-Time Monitoring
 * Handles real-time exam progress updates via WebSocket
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../../_lib/auth-middleware'
import { WebSocketServer, WebSocket } from 'ws'
import { queryOne } from './_lib/db.js'

// Store active WebSocket connections per exam
const examConnections = new Map<string, Set<WebSocket>>()

// Store connection metadata
interface ConnectionMetadata {
  tenantId: string
  userId: string
  examId: string
  connectedAt: Date
}

const connectionMetadata = new WeakMap<WebSocket, ConnectionMetadata>()

/**
 * Initialize WebSocket server
 */
let wss: WebSocketServer | null = null

function getWebSocketServer(req: VercelRequest, res: VercelResponse): WebSocketServer {
  if (wss) {
    return wss
  }

  // Create WebSocket server
  wss = new WebSocketServer({ noServer: true })

  wss.on('connection', (ws: WebSocket, req: any) => {
    const metadata = connectionMetadata.get(ws)
    if (!metadata) {
      ws.close(1008, 'Invalid connection metadata')
      return
    }

    const { tenantId, userId, examId } = metadata

    console.log(`WebSocket connected: exam=${examId}, user=${userId}`)

    // Add to exam connections
    if (!examConnections.has(examId)) {
      examConnections.set(examId, new Set())
    }
    examConnections.get(examId)!.add(ws)

    // Send connection confirmation
    ws.send(
      JSON.stringify({
        type: 'connected',
        examId,
        timestamp: new Date().toISOString(),
      })
    )

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString())
        handleWebSocketMessage(ws, message, metadata)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
        ws.send(
          JSON.stringify({
            type: 'error',
            error: 'Invalid message format',
          })
        )
      }
    })

    // Handle disconnection
    ws.on('close', () => {
      console.log(`WebSocket disconnected: exam=${examId}, user=${userId}`)
      const connections = examConnections.get(examId)
      if (connections) {
        connections.delete(ws)
        if (connections.size === 0) {
          examConnections.delete(examId)
        }
      }
    })

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error)
    })
  })

  return wss
}

/**
 * Handle WebSocket messages
 */
function handleWebSocketMessage(
  ws: WebSocket,
  message: any,
  metadata: ConnectionMetadata
) {
  const { type, data } = message
  const { examId, tenantId } = metadata

  switch (type) {
    case 'ping':
      ws.send(
        JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString(),
        })
      )
      break

    case 'progress_update':
      // Broadcast progress update to all connected clients for this exam
      broadcastToExam(examId, {
        type: 'progress_update',
        data,
        timestamp: new Date().toISOString(),
      })
      break

    case 'student_completed':
      // Broadcast student completion to all connected clients
      broadcastToExam(examId, {
        type: 'student_completed',
        data,
        timestamp: new Date().toISOString(),
      })
      break

    case 'exam_ended':
      // Broadcast exam end to all connected clients
      broadcastToExam(examId, {
        type: 'exam_ended',
        data,
        timestamp: new Date().toISOString(),
      })
      break

    default:
      console.warn(`Unknown message type: ${type}`)
  }
}

/**
 * Broadcast message to all clients connected to an exam
 */
function broadcastToExam(examId: string, message: any) {
  const connections = examConnections.get(examId)
  if (!connections) {
    return
  }

  const messageStr = JSON.stringify(message)
  connections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr)
    }
  })
}

/**
 * Broadcast message to all clients except sender
 */
function broadcastToExamExcept(examId: string, message: any, excludeWs: WebSocket) {
  const connections = examConnections.get(examId)
  if (!connections) {
    return
  }

  const messageStr = JSON.stringify(message)
  connections.forEach((ws) => {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr)
    }
  })
}

/**
 * Get connection count for exam
 */
export function getExamConnectionCount(examId: string): number {
  const connections = examConnections.get(examId)
  return connections ? connections.size : 0
}

/**
 * Close all connections for exam
 */
export function closeExamConnections(examId: string) {
  const connections = examConnections.get(examId)
  if (!connections) {
    return
  }

  connections.forEach((ws) => {
    ws.close(1000, 'Exam ended')
  })
  examConnections.delete(examId)
}

/**
 * Main WebSocket handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  // Only handle WebSocket upgrade requests
  if (req.headers.upgrade !== 'websocket') {
    return res.status(400).json({ error: 'Expected WebSocket upgrade' })
  }

  const tenantId = req.headers['x-tenant-id'] as string
  const userId = req.headers['x-user-id'] as string
  const examId = req.query.examId as string

  // Validate headers
  if (!tenantId) {
    return res.status(400).json({ error: 'x-tenant-id header is required' })
  }

  if (!userId) {
    return res.status(401).json({ error: 'x-user-id header is required' })
  }

  if (!examId) {
    return res.status(400).json({ error: 'examId is required' })
  }

  try {
    // Verify user exists
    const user = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    )

    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    // Verify exam exists and belongs to tenant
    const exam = await queryOne<{ id: string; tenant_id: string }>(
      'SELECT id, tenant_id FROM exams WHERE id = $1',
      [examId]
    )

    if (!exam || exam.tenant_id !== tenantId) {
      return res.status(404).json({ error: 'Exam not found' })
    }

    // Get WebSocket server
    const wss = getWebSocketServer(req, res)

    // Store metadata for this connection
    const ws = new WebSocket(null)
    connectionMetadata.set(ws, {
      tenantId,
      userId,
      examId,
      connectedAt: new Date(),
    })

    // Handle upgrade
    if (req.socket.writable) {
      wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
        wss.emit('connection', ws, req)
      })
    }
  } catch (error) {
    console.error('Error handling WebSocket connection:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * Export broadcast functions for use in other modules
 */
export { broadcastToExam, broadcastToExamExcept }
