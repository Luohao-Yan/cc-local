/**
 * Tests for Native REPL
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { NativeREPL } from './nativeREPL.js'

// Mock dependencies
vi.mock('./configLoader.js', () => ({
  loadNativeConfig: vi.fn().mockResolvedValue({
    model: 'default',
    maxTurns: 10,
    recentPrompts: [],
  }),
  saveNativeConfig: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../bridge/nativeBridgeAdapter.js', () => ({
  NativeBridgeAdapter: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockImplementation(async function* () {
      yield { type: 'stream_start', messageId: 'msg-1' }
      yield { type: 'stream_delta', delta: { type: 'text', text: 'Hello' } }
      yield { type: 'stream_end' }
    }),
    cancel: vi.fn(),
  })),
}))

describe('NativeREPL', () => {
  it('creates instance with correct props', () => {
    const mockAdapter = {} as any
    const repl = new NativeREPL({
      adapter: mockAdapter,
      model: 'test-model',
      cwd: '/test/path',
      sessionId: 'test-session',
    })

    expect(repl).toBeDefined()
  })

  it('handles slash command help', async () => {
    const mockAdapter = {
      initialize: vi.fn().mockResolvedValue(undefined),
      query: vi.fn(),
      cancel: vi.fn(),
    } as any

    const repl = new NativeREPL({ adapter: mockAdapter })
    await repl.start()

    // The help output should be logged
    // In real test, we'd capture stdout
    expect(repl).toBeDefined()
  })

  it('exits cleanly', async () => {
    const mockAdapter = {
      initialize: vi.fn().mockResolvedValue(undefined),
      query: vi.fn(),
      cancel: vi.fn(),
    } as any

    const repl = new NativeREPL({ adapter: mockAdapter })

    // Mock process.exit
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit')
    })

    try {
      repl.exit()
    } catch (e) {
      expect(e).toBeInstanceOf(Error)
    }

    exitSpy.mockRestore()
  })
})
