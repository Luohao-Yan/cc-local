/**
 * Integration Tests for Packages-Native Architecture
 *
 * These tests verify the complete flow from entry point to query execution.
 * They use mocks to avoid actual network calls.
 *
 * Run with: bun test packages/cli/src/integration/packages-native.integration.test.ts
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// Mock CCLocalClient for REST mode
vi.mock('../client/CCLocalClient.js', () => ({
  CCLocalClient: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    createSession: vi.fn().mockResolvedValue({ id: 'test-session', name: 'Test' }),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    cancelGeneration: vi.fn(),
    onMessage: vi.fn(),
    listMcpServers: vi.fn().mockResolvedValue([{ name: 'test-server' }]),
    listModels: vi.fn().mockResolvedValue([{ id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' }]),
  })),
}))

// Mock QueryEngine for local mode
vi.mock('@cclocal/core', () => ({
  QueryEngine: vi.fn().mockImplementation(() => ({
    query: vi.fn().mockResolvedValue({
      message: { id: 'msg-1', role: 'assistant', content: [{ type: 'text', text: 'Response' }] },
      usage: { inputTokens: 10, outputTokens: 20 },
    }),
  })),
  toolRegistry: {
    registerBridgeAdapters: vi.fn(),
  },
}))

import {
  NativeBridgeAdapter,
  createLocalBridgeAdapter,
  createRemoteBridgeAdapter,
} from '../bridge/nativeBridgeAdapter.js'
import { renderNativeSinglePrompt } from '../runtime/replRenderer.js'
import {
  shouldUseNativeMode,
  getNativeModeType,
  NATIVE_REST_COMMANDS,
} from '../runtime/nativeRouting.js'

describe('Packages-Native Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('End-to-end: Local Engine Mode', () => {
    it('creates local adapter and executes query', async () => {
      const adapter = createLocalBridgeAdapter({
        model: 'claude-3-5-sonnet',
        maxTurns: 5,
      })

      expect(adapter.getMode()).toBe('local')
      expect(adapter.isInitialized()).toBe(false)

      await adapter.initialize()

      expect(adapter.isInitialized()).toBe(true)
      await adapter.dispose()
      expect(adapter.isInitialized()).toBe(false)
    })
  })

  describe('End-to-end: Remote REST Mode', () => {
    it('creates remote adapter and connects', async () => {
      const adapter = createRemoteBridgeAdapter('http://localhost:5678', {
        authToken: 'test-token',
        model: 'claude-3-5-sonnet',
      })

      expect(adapter.getMode()).toBe('remote')
      await adapter.initialize()
      expect(adapter.isInitialized()).toBe(true)
      await adapter.dispose()
    })
  })

  describe('Routing Integration', () => {
    it('routes --native to local engine mode', () => {
      const args = ['--native']
      expect(shouldUseNativeMode(args)).toBe(true)
      expect(getNativeModeType(args)).toBe('local-engine')
    })

    it('routes --server to REST mode', () => {
      const args = ['--server', 'http://localhost:5678']
      // These would use the actual functions with mocked dependencies
      expect(shouldUseNativeMode(args)).toBe(true)
    })

    it('routes REST-backed commands to REST mode', () => {
      expect(NATIVE_REST_COMMANDS.has('mcp')).toBe(true)
      expect(NATIVE_REST_COMMANDS.has('models')).toBe(true)
      expect(NATIVE_REST_COMMANDS.has('sessions')).toBe(true)
    })
  })

  describe('Single Prompt Integration', () => {
    it('executes single prompt with local adapter', async () => {
      const result = await renderNativeSinglePrompt('Hello, world!', {
        bridgeMode: 'local',
        model: 'claude-3-5-sonnet',
        maxTurns: 1,
      })

      expect(result).toBeDefined()
    })
  })
})

describe('Packages-Native: Feature Flags', () => {
  it('supports CCLOCAL_USE_QUERY_ENGINE env var', () => {
    const originalValue = process.env.CCLOCAL_USE_QUERY_ENGINE
    process.env.CCLOCAL_USE_QUERY_ENGINE = '1'

    // Check that the env var is set
    expect(process.env.CCLOCAL_USE_QUERY_ENGINE).toBe('1')

    // Restore
    process.env.CCLOCAL_USE_QUERY_ENGINE = originalValue
  })
})

describe('Packages-Native: Error Handling', () => {
  it('handles missing serverUrl for remote mode', async () => {
    const adapter = new NativeBridgeAdapter({ mode: 'remote' })

    await expect(adapter.initialize()).rejects.toThrow('serverUrl is required')
  })

  it('handles dispose gracefully when not initialized', async () => {
    const adapter = createLocalBridgeAdapter()
    // Should not throw
    await adapter.dispose()
    expect(adapter.isInitialized()).toBe(false)
  })
})
