/**
 * WebSocket Manager for Real-Time CBT Monitoring
 * 
 * Manages WebSocket connections for real-time exam monitoring.
 * Supports connection pooling, authentication, and message broadcasting.
 * 
 * Note: This implementation is designed to work with both traditional Node.js
 * servers and Vercel's serverless environment. For Vercel, use SSE as fallback.
 */

import { EventEmitter } from 'events';

export interface WebSocketMessage {
  type: 'progress_update' | 'student_completed' | 'exam_ended' | 'error' | 'ping' | 'pong';
  data: Record<string, any>;
  timestamp?: number;
}

export interface WebSocketClient {
  id: string;
  examId: string;
  tenantId: string;
  userId: string;
  role: 'invigilator' | 'admin';
  connectedAt: number;
  lastActivity: number;
}

export interface ConnectionPool {
  [examId: string]: Map<string, WebSocketClient>;
}

/**
 * WebSocket Manager
 * Handles connection lifecycle, authentication, and message broadcasting
 */
export class WebSocketManager extends EventEmitter {
  private connectionPool: ConnectionPool = {};
  private messageQueue: Map<string, WebSocketMessage[]> = new Map();
  private maxQueueSize = 1000;
  private heartbeatInterval = 30000; // 30 seconds
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startHeartbeat();
  }

  /**
   * Register a new WebSocket connection
   */
  registerConnection(
    clientId: string,
    examId: string,
    tenantId: string,
    userId: string,
    role: 'invigilator' | 'admin'
  ): WebSocketClient {
    // Validate inputs
    if (!clientId || !examId || !tenantId || !userId) {
      throw new Error('Missing required connection parameters');
    }

    if (!['invigilator', 'admin'].includes(role)) {
      throw new Error('Invalid role');
    }

    // Initialize exam pool if needed
    if (!this.connectionPool[examId]) {
      this.connectionPool[examId] = new Map();
    }

    // Create client record
    const client: WebSocketClient = {
      id: clientId,
      examId,
      tenantId,
      userId,
      role,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
    };

    // Store connection
    this.connectionPool[examId].set(clientId, client);

    // Initialize message queue for this exam if needed
    if (!this.messageQueue.has(examId)) {
      this.messageQueue.set(examId, []);
    }

    this.emit('connection', client);
    return client;
  }

  /**
   * Unregister a WebSocket connection
   */
  unregisterConnection(clientId: string, examId: string): void {
    if (this.connectionPool[examId]) {
      this.connectionPool[examId].delete(clientId);

      // Clean up empty pools
      if (this.connectionPool[examId].size === 0) {
        delete this.connectionPool[examId];
      }
    }

    this.emit('disconnection', { clientId, examId });
  }

  /**
   * Get all connected clients for an exam
   */
  getExamClients(examId: string): WebSocketClient[] {
    if (!this.connectionPool[examId]) {
      return [];
    }
    return Array.from(this.connectionPool[examId].values());
  }

  /**
   * Get a specific client
   */
  getClient(clientId: string, examId: string): WebSocketClient | null {
    if (!this.connectionPool[examId]) {
      return null;
    }
    return this.connectionPool[examId].get(clientId) || null;
  }

  /**
   * Broadcast message to all clients for an exam
   */
  broadcastToExam(examId: string, message: WebSocketMessage): void {
    const messageWithTimestamp = {
      ...message,
      timestamp: Date.now(),
    };

    // Emit to all connected clients
    if (this.connectionPool[examId]) {
      const clients = Array.from(this.connectionPool[examId].values());
      clients.forEach((client) => {
        this.emit('message', {
          clientId: client.id,
          message: messageWithTimestamp,
        });

        // Update last activity
        client.lastActivity = Date.now();
      });
    }

    // Queue message for late-joining clients (always queue, even if no clients connected)
    this.queueMessage(examId, messageWithTimestamp);
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, examId: string, message: WebSocketMessage): void {
    const client = this.getClient(clientId, examId);
    if (!client) {
      return;
    }

    const messageWithTimestamp = {
      ...message,
      timestamp: Date.now(),
    };

    this.emit('message', {
      clientId,
      message: messageWithTimestamp,
    });

    client.lastActivity = Date.now();
  }

  /**
   * Queue message for late-joining clients
   */
  private queueMessage(examId: string, message: WebSocketMessage): void {
    if (!this.messageQueue.has(examId)) {
      this.messageQueue.set(examId, []);
    }

    const queue = this.messageQueue.get(examId)!;

    // Add message to queue
    queue.push(message);

    // Trim queue if it exceeds max size (keep most recent messages)
    if (queue.length > this.maxQueueSize) {
      queue.shift();
    }
  }

  /**
   * Get queued messages for an exam
   */
  getQueuedMessages(examId: string): WebSocketMessage[] {
    return this.messageQueue.get(examId) || [];
  }

  /**
   * Clear message queue for an exam
   */
  clearQueue(examId: string): void {
    this.messageQueue.delete(examId);
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    examCount: number;
    exams: Record<string, number>;
  } {
    let totalConnections = 0;
    const exams: Record<string, number> = {};

    Object.entries(this.connectionPool).forEach(([examId, clients]) => {
      const count = clients.size;
      exams[examId] = count;
      totalConnections += count;
    });

    return {
      totalConnections,
      examCount: Object.keys(this.connectionPool).length,
      exams,
    };
  }

  /**
   * Start heartbeat to detect stale connections
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 60 seconds

      Object.entries(this.connectionPool).forEach(([examId, clients]) => {
        const staleClients: string[] = [];

        clients.forEach((client, clientId) => {
          if (now - client.lastActivity > timeout) {
            staleClients.push(clientId);
          }
        });

        // Remove stale connections
        staleClients.forEach((clientId) => {
          this.unregisterConnection(clientId, examId);
          this.emit('stale_connection', { clientId, examId });
        });
      });

      // Send heartbeat to all active connections
      Object.keys(this.connectionPool).forEach((examId) => {
        this.broadcastToExam(examId, {
          type: 'ping',
          data: { timestamp: Date.now() },
        });
      });
    }, this.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Validate connection authorization
   */
  validateConnection(
    tenantId: string,
    examId: string,
    userId: string,
    role: string
  ): { valid: boolean; error?: string } {
    // Validate tenant ID
    if (!tenantId) {
      return { valid: false, error: 'Missing tenant ID' };
    }

    // Validate exam ID
    if (!examId) {
      return { valid: false, error: 'Missing exam ID' };
    }

    // Validate user ID
    if (!userId) {
      return { valid: false, error: 'Missing user ID' };
    }

    // Validate role
    if (!['invigilator', 'admin'].includes(role)) {
      return { valid: false, error: 'Invalid role' };
    }

    return { valid: true };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopHeartbeat();
    this.connectionPool = {};
    this.messageQueue.clear();
    this.removeAllListeners();
  }
}

// Export singleton instance
export const wsManager = new WebSocketManager();
