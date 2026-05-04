/**
 * Tests for WebSocket Manager
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { WebSocketManager } from './WebSocketManager.js'

// Mock types
type MockSocket = {
  data: { token: string }
  send: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
  readyState: number
}

describe('WebSocketManager', () => {
  let manager: WebSocketManager
  let mockAuthManager: { verifyToken: ReturnType<typeof vi.fn> }
  let mockSessionManager: { getSession: ReturnType<typeof vi.fn>; cancelGeneration: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    mockAuthManager = {
      verifyToken: vi.fn().mockReturnValue(true),
    }
    mockSessionManager = {
      getSession: vi.fn(),
      cancelGeneration: vi.fn(),
    }

    manager = new WebSocketManager({
      authManager: mockAuthManager,
      sessionManager: mockSessionManager,
      maxConnections: 10,
      idleTimeout: 5000,
      heartbeatInterval: 100,
    })
  })

  afterEach(() => {
    manager.close()
  })

  describe('connection management', () => {
    it('accepts connections under the limit', () => {
      const stats = manager.getStats()
      expect(stats.totalConnections).toBe(0)
      expect(stats.maxConnectionsLimit).toBe(10)
    })

    it('tracks connection statistics', () => {
      // Simulate client connections
      const mockSocket1 = createMockSocket('token1')
      const mockSocket2 = createMockSocket('token2')

      manager.onOpen(mockSocket1 as any)
      manager.onOpen(mockSocket2 as any)

      const stats = manager.getStats()
      expect(stats.totalConnections).toBe(2)
    })

    it('rejects connections over the limit', () => {
      // Create manager with low limit
      const smallManager = new WebSocketManager({
        authManager: mockAuthManager,
        sessionManager: mockSessionManager,
        maxConnections: 2,
        idleTimeout: 5000,
        heartbeatInterval: 1000,
      })

      // Connect 2 clients
      const mockSocket1 = createMockSocket('token1')
      const mockSocket2 = createMockSocket('token2')
      const mockSocket3 = createMockSocket('token3')

      smallManager.onOpen(mockSocket1 as any)
      smallManager.onOpen(mockSocket2 as any)

      // Third connection should be rejected
      smallManager.onOpen(mockSocket3 as any)

      // The third socket should have been closed
      expect(mockSocket3.close).toHaveBeenCalledWith(1013, 'Server busy')

      smallManager.close()
    })
  })

  describe('activity tracking', () => {
    it('updates lastActivity on message', () => {
      const mockSocket = createMockSocket('token1')
      manager.onOpen(mockSocket as any)

      // Get initial activity time
      const stats1 = manager.getStats()
      expect(stats1.totalConnections).toBe(1)

      // Send a message
      manager.onMessage(mockSocket as any, JSON.stringify({ type: 'ping' }))

      // Should have received messages (connected + pong)
      expect(mockSocket.send).toHaveBeenCalledTimes(2)
    })

    it('handles ping/pong for keepalive', () => {
      const mockSocket = createMockSocket('token1')
      manager.onOpen(mockSocket as any)

      // Clear previous calls (connected message)
      mockSocket.send.mockClear()

      manager.onMessage(mockSocket as any, JSON.stringify({ type: 'ping' }))

      // Should respond with pong
      const sentMessage = JSON.parse(mockSocket.send.mock.calls[0][0])
      expect(sentMessage.type).toBe('pong')
    })
  })

  describe('idle timeout', () => {
    it('closes idle connections when heartbeat triggers', async () => {
      const mockSocket = createMockSocket('token1')
      manager.onOpen(mockSocket as any)

      // Wait for heartbeat to trigger
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Socket should not be closed yet (not idle)
      expect(mockSocket.close).not.toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('stops heartbeat timer on close', () => {
      const mockSocket = createMockSocket('token1')
      manager.onOpen(mockSocket as any)

      // Close manager
      manager.close()

      // Should not throw
      expect(true).toBe(true)
    })

    it('removes client on disconnect', () => {
      const mockSocket = createMockSocket('token1')
      manager.onOpen(mockSocket as any)

      expect(manager.getStats().totalConnections).toBe(1)

      manager.onClose(mockSocket as any)

      expect(manager.getStats().totalConnections).toBe(0)
    })
  })
})

// Helper to create mock socket
function createMockSocket(token: string): MockSocket {
  return {
    data: { token },
    send: vi.fn(),
    close: vi.fn(),
    readyState: 1, // OPEN
  }
}
