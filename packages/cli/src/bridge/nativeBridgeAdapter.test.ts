/**
 * Tests for Native Bridge Adapter
 *
 * Tests the unified interface for local and remote query execution.
 * This is a NEW test file for NEW code.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// Mock CCLocalClient first (before any imports that use it)
vi.mock('../client/CCLocalClient.js', () => ({
  CCLocalClient: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    createSession: vi.fn().mockResolvedValue({ id: 'test-session-id', name: 'Test Session' }),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    cancelGeneration: vi.fn(),
    onMessage: vi.fn().mockReturnValue(() => {}), // 返回取消订阅函数
  })),
}))

// Mock queryEngineAdapter
vi.mock('./queryEngineAdapter.js', () => ({
  createQueryEngineAdapter: vi.fn().mockImplementation(function* () {
    yield { type: 'stream_request_start' }
    yield { type: 'stream_event', event: { type: 'message_start' } }
    yield { type: 'message', message: { id: 'msg-1', role: 'assistant', content: [] } }
  }),
}))

// Import after mocks are set up
import {
  NativeBridgeAdapter,
  createLocalBridgeAdapter,
  createRemoteBridgeAdapter,
  type NativeQueryOptions,
} from './nativeBridgeAdapter.js'
import { CCLocalClient } from '../client/CCLocalClient.js'

const MockCCLocalClient = CCLocalClient as ReturnType<typeof vi.fn>

describe('NativeBridgeAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('creates adapter with local mode', () => {
      const adapter = new NativeBridgeAdapter({ mode: 'local' })
      expect(adapter.getMode()).toBe('local')
      expect(adapter.isInitialized()).toBe(false)
    })

    it('creates adapter with remote mode', () => {
      const adapter = new NativeBridgeAdapter({
        mode: 'remote',
        serverUrl: 'http://localhost:5678',
      })
      expect(adapter.getMode()).toBe('remote')
    })
  })

  describe('initialize', () => {
    it('initializes local mode without client', async () => {
      const adapter = new NativeBridgeAdapter({ mode: 'local' })
      await adapter.initialize()
      expect(adapter.isInitialized()).toBe(true)
      expect(MockCCLocalClient).not.toHaveBeenCalled()
    })

    it('initializes remote mode with client', async () => {
      const adapter = new NativeBridgeAdapter({
        mode: 'remote',
        serverUrl: 'http://localhost:5678',
      })
      await adapter.initialize()
      expect(adapter.isInitialized()).toBe(true)
      expect(MockCCLocalClient).toHaveBeenCalledWith(
        expect.objectContaining({
          serverUrl: 'http://localhost:5678',
        })
      )
    })

    it('throws error when remote mode has no serverUrl', async () => {
      const adapter = new NativeBridgeAdapter({ mode: 'remote' })
      await expect(adapter.initialize()).rejects.toThrow('serverUrl is required')
    })

    it('does not initialize twice', async () => {
      const adapter = new NativeBridgeAdapter({ mode: 'local' })
      await adapter.initialize()
      await adapter.initialize()
      expect(adapter.isInitialized()).toBe(true)
    })
  })

  describe('query (local mode)', () => {
    it('yields events from local engine', async () => {
      const adapter = new NativeBridgeAdapter({ mode: 'local' })

      const options: NativeQueryOptions = {
        messages: [{ id: 'user-1', role: 'user', content: [{ type: 'text', text: 'Hello' }], timestamp: Date.now() }],
      }

      const events = []
      for await (const event of adapter.query(options)) {
        events.push(event)
      }

      expect(events.length).toBeGreaterThan(0)
      expect(events[0]).toEqual({ type: 'stream_request_start' })
    })
  })

  describe('query (remote mode)', () => {
    it('creates session and sends message', async () => {
      let messageHandler: ((event: any) => void) | undefined
      const mockClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn(),
        createSession: vi.fn().mockResolvedValue({ id: 'session-1', name: 'Test' }),
        sendMessage: vi.fn().mockImplementation(async () => {
          // 模拟流式响应
          if (messageHandler) {
            messageHandler({ type: 'stream_start', messageId: 'msg-1' })
            messageHandler({ type: 'stream_delta', delta: { type: 'text', text: 'Hello' } })
            messageHandler({ type: 'stream_end' })
          }
        }),
        cancelGeneration: vi.fn(),
        onMessage: vi.fn().mockImplementation((handler: (event: any) => void) => {
          messageHandler = handler
          return () => { messageHandler = undefined }
        }),
      }
      MockCCLocalClient.mockImplementation(() => mockClient as any)

      const adapter = new NativeBridgeAdapter({
        mode: 'remote',
        serverUrl: 'http://localhost:5678',
      })

      const options: NativeQueryOptions = {
        messages: [{ id: 'user-1', role: 'user', content: [{ type: 'text', text: 'Hello' }], timestamp: Date.now() }],
      }

      // Consume the generator
      const events = []
      for await (const event of adapter.query(options)) {
        events.push(event)
      }

      expect(mockClient.createSession).toHaveBeenCalled()
      expect(mockClient.sendMessage).toHaveBeenCalled()
      expect(events.length).toBeGreaterThan(0)
    })
  })

  describe('cancel', () => {
    it('cancels remote mode query', async () => {
      const mockClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn(),
        cancelGeneration: vi.fn(),
        onMessage: vi.fn().mockReturnValue(() => {}),
      }
      MockCCLocalClient.mockImplementation(() => mockClient as any)

      const adapter = new NativeBridgeAdapter({
        mode: 'remote',
        serverUrl: 'http://localhost:5678',
      })
      await adapter.initialize()
      adapter.cancel()

      expect(mockClient.cancelGeneration).toHaveBeenCalled()
    })
  })

  describe('dispose', () => {
    it('cleans up remote client', async () => {
      const mockClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn(),
        onMessage: vi.fn().mockReturnValue(() => {}),
      }
      MockCCLocalClient.mockImplementation(() => mockClient as any)

      const adapter = new NativeBridgeAdapter({
        mode: 'remote',
        serverUrl: 'http://localhost:5678',
      })
      await adapter.initialize()
      await adapter.dispose()

      expect(mockClient.disconnect).toHaveBeenCalled()
      expect(adapter.isInitialized()).toBe(false)
    })
  })
})

describe('Factory functions', () => {
  it('creates local bridge adapter', () => {
    const adapter = createLocalBridgeAdapter()
    expect(adapter.getMode()).toBe('local')
  })

  it('creates local bridge adapter with options', () => {
    const adapter = createLocalBridgeAdapter({ model: 'claude-3-5-sonnet' })
    expect(adapter.getMode()).toBe('local')
  })

  it('creates remote bridge adapter', () => {
    const adapter = createRemoteBridgeAdapter('http://localhost:5678')
    expect(adapter.getMode()).toBe('remote')
  })

  it('creates remote bridge adapter with options', () => {
    const adapter = createRemoteBridgeAdapter('http://localhost:5678', {
      authToken: 'test-token',
    })
    expect(adapter.getMode()).toBe('remote')
  })
})
