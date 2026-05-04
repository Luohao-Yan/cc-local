/**
 * Tests for IDE Bridge
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { IDEBridge } from './IDEBridge.js'

// Mock WebSocket
function createMockWebSocket() {
  const handlers: Record<string, Function[]> = {}

  return {
    on: vi.fn((event: string, callback: Function) => {
      if (!handlers[event]) handlers[event] = []
      handlers[event].push(callback)
    }),
    send: vi.fn((data: string, callback?: (err?: Error) => void) => {
      callback?.(undefined)
    }),
    close: vi.fn(),
    // Test helpers
    _emit: (event: string, data?: any) => {
      handlers[event]?.forEach(cb => cb(data))
    },
    _simulateOpen: function() {
      handlers['open']?.forEach(cb => cb())
    },
    _simulateError: function(err: Error) {
      handlers['error']?.forEach(cb => cb(err))
    },
    _simulateMessage: function(data: Buffer) {
      handlers['message']?.forEach(cb => cb(data))
    },
    _simulateClose: function() {
      handlers['close']?.forEach(cb => cb())
    },
  }
}

type MockWebSocket = ReturnType<typeof createMockWebSocket>

describe('IDEBridge', () => {
  let bridge: IDEBridge
  let mockWs: MockWebSocket

  beforeEach(() => {
    mockWs = createMockWebSocket()
    bridge = new IDEBridge({
      pingInterval: 10000,
      pongTimeout: 5000,
      reconnectInterval: 100,
      maxReconnectAttempts: 3,
      webSocketFactory: () => mockWs as any,
    })
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await bridge.disconnect()
  })

  describe('initialization', () => {
    it('starts disconnected', () => {
      expect(bridge.isConnected()).toBe(false)
    })

    it('has no IDE info initially', () => {
      expect(bridge.getIDEInfo()).toBeNull()
    })
  })

  describe('connect', () => {
    it('attempts connection and sets up event handlers', async () => {
      const connectPromise = bridge.connect('ws://localhost:8080')

      // Simulate successful connection
      mockWs._simulateOpen()

      await connectPromise

      expect(bridge.isConnected()).toBe(true)
      expect(mockWs.on).toHaveBeenCalled()
    })

    it('rejects without URL', async () => {
      await expect(bridge.connect()).rejects.toThrow('No IDE URL provided')
    })
  })

  describe('disconnect', () => {
    it('disconnects from IDE', async () => {
      const connectPromise = bridge.connect('ws://localhost:8080')
      mockWs._simulateOpen()
      await connectPromise

      await bridge.disconnect()

      expect(bridge.isConnected()).toBe(false)
      expect(mockWs.close).toHaveBeenCalled()
    })

    it('emits disconnected event', async () => {
      const connectPromise = bridge.connect('ws://localhost:8080')
      mockWs._simulateOpen()
      await connectPromise

      const disconnectedSpy = vi.fn()
      bridge.on('disconnected', disconnectedSpy)

      await bridge.disconnect()

      expect(disconnectedSpy).toHaveBeenCalled()
    })

    it('handles disconnect when not connected', async () => {
      // Should not throw
      await bridge.disconnect()
      expect(bridge.isConnected()).toBe(false)
    })
  })

  describe('send', () => {
    it('rejects when not connected', async () => {
      await expect(bridge.send('notification', { message: 'test' }))
        .rejects.toThrow('Not connected')
    })

    it('sends message when connected', async () => {
      const connectPromise = bridge.connect('ws://localhost:8080')
      mockWs._simulateOpen()
      await connectPromise

      const id = await bridge.send('notification', { message: 'test' })

      expect(id).toBeDefined()
      expect(mockWs.send).toHaveBeenCalled()

      const sentData = JSON.parse(mockWs.send.mock.calls[0][0])
      expect(sentData.type).toBe('notification')
      expect(sentData.payload).toEqual({ message: 'test' })
    })
  })

  describe('events', () => {
    it('emits error event on invalid message', async () => {
      const connectPromise = bridge.connect('ws://localhost:8080')
      mockWs._simulateOpen()
      await connectPromise

      const errorSpy = vi.fn()
      bridge.on('error', errorSpy)

      mockWs._simulateMessage(Buffer.from('invalid json'))

      expect(errorSpy).toHaveBeenCalled()
    })

    it('emits message event on valid message', async () => {
      const connectPromise = bridge.connect('ws://localhost:8080')
      mockWs._simulateOpen()
      await connectPromise

      const messageSpy = vi.fn()
      bridge.on('message', messageSpy)

      mockWs._simulateMessage(Buffer.from(JSON.stringify({
        id: 'test-id',
        type: 'notification',
        payload: { message: 'test' },
        timestamp: Date.now(),
      })))

      expect(messageSpy).toHaveBeenCalled()
    })
  })

  describe('getIDEInfo', () => {
    it('returns null when no info received', () => {
      expect(bridge.getIDEInfo()).toBeNull()
    })

    it('returns IDE info after receiving status_update', async () => {
      const connectPromise = bridge.connect('ws://localhost:8080')
      mockWs._simulateOpen()
      await connectPromise

      mockWs._simulateMessage(Buffer.from(JSON.stringify({
        id: 'info-id',
        type: 'status_update',
        payload: {
          ide: {
            name: 'VSCode',
            version: '1.80.0',
            workspaceFolders: ['/workspace'],
            capabilities: {
              fileEdit: true,
              fileRead: true,
              terminal: true,
              debug: true,
              notifications: true,
              diagnostics: true,
            },
          },
        },
        timestamp: Date.now(),
      })))

      const info = bridge.getIDEInfo()
      expect(info).not.toBeNull()
      expect(info?.name).toBe('VSCode')
      expect(info?.workspaceFolders).toContain('/workspace')
    })
  })

  describe('terminal output', () => {
    it('sends terminal output', async () => {
      const connectPromise = bridge.connect('ws://localhost:8080')
      mockWs._simulateOpen()
      await connectPromise

      await bridge.sendTerminalOutput({
        type: 'stdout',
        data: 'hello world',
        timestamp: Date.now(),
      })

      expect(mockWs.send).toHaveBeenCalled()
    })
  })

  describe('debug log', () => {
    it('sends debug log', async () => {
      const connectPromise = bridge.connect('ws://localhost:8080')
      mockWs._simulateOpen()
      await connectPromise

      await bridge.sendDebugLog({
        level: 'info',
        message: 'test log',
        category: 'test',
      })

      expect(mockWs.send).toHaveBeenCalled()
    })
  })

  describe('notification', () => {
    it('sends notification', async () => {
      const connectPromise = bridge.connect('ws://localhost:8080')
      mockWs._simulateOpen()
      await connectPromise

      await bridge.sendNotification('test message', 'info')

      expect(mockWs.send).toHaveBeenCalled()
    })
  })
})
