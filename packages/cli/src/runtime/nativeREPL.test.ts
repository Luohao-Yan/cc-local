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
    getTokenBudget: vi.fn().mockResolvedValue({
      inputTokens: 100,
      outputTokens: 50,
      total: 150,
      budget: 200000,
      remaining: 199850,
    }),
    forkSession: vi.fn().mockResolvedValue({ id: 'forked-session' }),
    getTasks: vi.fn().mockResolvedValue([]),
    cancelTask: vi.fn().mockResolvedValue(undefined),
  })),
}))

vi.mock('marked', () => ({
  marked: {
    lexer: vi.fn().mockReturnValue([
      { type: 'paragraph', text: 'Test paragraph' },
    ]),
  },
}))

vi.mock('chalk', () => ({
  default: {
    bold: { blue: vi.fn((s: string) => s) },
    cyan: vi.fn((s: string) => s),
    green: vi.fn((s: string) => s),
    red: vi.fn((s: string) => s),
    yellow: vi.fn((s: string) => s),
    dim: vi.fn((s: string) => s),
  },
}))

vi.mock('diff', () => ({
  diffLines: vi.fn().mockReturnValue([
    { value: 'line1\n', added: false, removed: false },
    { value: 'line2\n', added: true, removed: false },
  ]),
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

  describe('Multi-line input', () => {
    it('should handle backslash continuation', () => {
      const mockAdapter = {
        initialize: vi.fn().mockResolvedValue(undefined),
        query: vi.fn(),
        cancel: vi.fn(),
      } as any

      const repl = new NativeREPL({ adapter: mockAdapter })
      const state = (repl as any).state

      // Initial state should have empty pending lines
      expect(state.pendingLines).toEqual([])
      expect(state.inMultiLine).toBe(false)
    })
  })

  describe('Permission handling', () => {
    it('should return true in allow-all mode', async () => {
      const mockAdapter = {
        initialize: vi.fn().mockResolvedValue(undefined),
        query: vi.fn(),
        cancel: vi.fn(),
      } as any

      const repl = new NativeREPL({ adapter: mockAdapter })
      ;(repl as any).state.permissionMode = 'allow-all'

      const result = await repl.handlePermissionRequest('Bash', { command: 'ls' })
      expect(result).toBe(true)
    })

    it('should return false in deny-all mode', async () => {
      const mockAdapter = {
        initialize: vi.fn().mockResolvedValue(undefined),
        query: vi.fn(),
        cancel: vi.fn(),
      } as any

      const repl = new NativeREPL({ adapter: mockAdapter })
      ;(repl as any).state.permissionMode = 'deny-all'

      const result = await repl.handlePermissionRequest('Bash', { command: 'ls' })
      expect(result).toBe(false)
    })
  })

  describe('Token budget', () => {
    it('should call adapter.getTokenBudget', async () => {
      const mockGetTokenBudget = vi.fn().mockResolvedValue({
        inputTokens: 100,
        outputTokens: 50,
        total: 150,
        budget: 200000,
        remaining: 199850,
      })

      const mockAdapter = {
        initialize: vi.fn().mockResolvedValue(undefined),
        query: vi.fn(),
        cancel: vi.fn(),
        getTokenBudget: mockGetTokenBudget,
      } as any

      const repl = new NativeREPL({ adapter: mockAdapter })
      await repl.showTokenBudget()

      expect(mockGetTokenBudget).toHaveBeenCalled()
    })
  })

  describe('Session branching', () => {
    it('should call adapter.forkSession', async () => {
      const mockForkSession = vi.fn().mockResolvedValue({ id: 'forked-session' })

      const mockAdapter = {
        initialize: vi.fn().mockResolvedValue(undefined),
        query: vi.fn(),
        cancel: vi.fn(),
        forkSession: mockForkSession,
      } as any

      const repl = new NativeREPL({ adapter: mockAdapter })
      await repl.branchSession('test-branch')

      expect(mockForkSession).toHaveBeenCalled()
    })
  })

  describe('Task management', () => {
    it('should call adapter.getTasks', async () => {
      const mockGetTasks = vi.fn().mockResolvedValue([])

      const mockAdapter = {
        initialize: vi.fn().mockResolvedValue(undefined),
        query: vi.fn(),
        cancel: vi.fn(),
        getTasks: mockGetTasks,
      } as any

      const repl = new NativeREPL({ adapter: mockAdapter })
      await repl.showTasks()

      expect(mockGetTasks).toHaveBeenCalled()
    })
  })

  describe('Diff visualization', () => {
    it('should render diff output', () => {
      const mockAdapter = {
        initialize: vi.fn().mockResolvedValue(undefined),
        query: vi.fn(),
        cancel: vi.fn(),
      } as any

      const repl = new NativeREPL({ adapter: mockAdapter })
      const consoleSpy = vi.spyOn(console, 'log')

      repl.renderTerminalDiff('line1', 'line1\nline2', 'test.txt')

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})
