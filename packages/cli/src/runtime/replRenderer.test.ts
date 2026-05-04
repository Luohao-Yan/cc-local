/**
 * Tests for REPL Renderer
 *
 * Tests the native mode rendering functionality.
 * This is a NEW test file for modified NEW code.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// Mock dependencies
vi.mock('../replLauncher.js', () => ({
  launchRepl: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../ink.js', () => ({
  renderAndRun: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../bridge/nativeBridgeAdapter.js', () => ({
  NativeBridgeAdapter: vi.fn(),
  createLocalBridgeAdapter: vi.fn().mockReturnValue({
    initialize: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockImplementation(function* () {
      yield { type: 'stream_request_start' }
      yield { type: 'message', message: { id: 'msg-1', role: 'assistant', content: [{ type: 'text', text: 'Hello' }] } }
    }),
  }),
  createRemoteBridgeAdapter: vi.fn().mockReturnValue({
    initialize: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockImplementation(function* () {
      yield { type: 'stream_request_start' }
      yield { type: 'message', message: { id: 'msg-1', role: 'assistant', content: [{ type: 'text', text: 'Hello remote' }] } }
    }),
  }),
}))

vi.mock('../query.js', () => ({
  Query: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockResolvedValue('Query result'),
  })),
}))

import {
  renderInteractiveRepl,
  renderSinglePrompt,
  renderNativeSinglePrompt,
  type RenderReplOptions,
  type NativeRenderOptions,
} from './replRenderer.js'
import { launchRepl } from '../replLauncher.js'
import { createLocalBridgeAdapter, createRemoteBridgeAdapter } from '../bridge/nativeBridgeAdapter.js'

const mockLaunchRepl = launchRepl as ReturnType<typeof vi.fn>
const mockCreateLocalBridgeAdapter = createLocalBridgeAdapter as ReturnType<typeof vi.fn>
const mockCreateRemoteBridgeAdapter = createRemoteBridgeAdapter as ReturnType<typeof vi.fn>

describe('replRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('renderInteractiveRepl', () => {
    const mockRoot = {} as any
    const mockAppState = {} as any

    const defaultOptions: RenderReplOptions = {
      rootOptions: {
        model: 'claude-3-5-sonnet',
        cwd: '/test',
      } as any,
      appState: mockAppState,
    }

    it('renders legacy mode by default', async () => {
      await renderInteractiveRepl(mockRoot, defaultOptions)

      expect(mockLaunchRepl).toHaveBeenCalled()
      const callArgs = mockLaunchRepl.mock.calls[0]
      expect(callArgs[0]).toBe(mockRoot)
      expect(callArgs[1].initialState).toBe(mockAppState)
    })

    it('renders native mode with bridgeMode option', async () => {
      const nativeOptions: NativeRenderOptions = {
        ...defaultOptions,
        bridgeMode: 'local',
      }

      await renderInteractiveRepl(mockRoot, nativeOptions)

      expect(mockCreateLocalBridgeAdapter).toHaveBeenCalled()
    })

    it('creates remote adapter for remote mode', async () => {
      const nativeOptions: NativeRenderOptions = {
        ...defaultOptions,
        bridgeMode: 'remote',
        serverUrl: 'http://localhost:5678',
        authToken: 'test-token',
      }

      await renderInteractiveRepl(mockRoot, nativeOptions)

      expect(mockCreateRemoteBridgeAdapter).toHaveBeenCalledWith(
        'http://localhost:5678',
        expect.objectContaining({
          authToken: 'test-token',
        })
      )
    })
  })

  describe('renderSinglePrompt', () => {
    const mockRoot = {} as any
    const mockAppState = {} as any

    it('throws error when no prompt provided', async () => {
      const options: RenderReplOptions = {
        rootOptions: {} as any,
        appState: mockAppState,
      }

      await expect(renderSinglePrompt(mockRoot, options)).rejects.toThrow('No prompt provided')
    })

    it('executes query with prompt', async () => {
      const options: RenderReplOptions = {
        rootOptions: {
          print: 'Hello',
          model: 'claude-3-5-sonnet',
        } as any,
        appState: mockAppState,
      }

      await renderSinglePrompt(mockRoot, options)

      // Query is mocked, so we just verify it doesn't throw
    })
  })

  describe('renderNativeSinglePrompt', () => {
    it('uses local adapter by default', async () => {
      const result = await renderNativeSinglePrompt('Hello', {
        bridgeMode: 'local',
        model: 'claude-3-5-sonnet',
      })

      expect(mockCreateLocalBridgeAdapter).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('uses remote adapter when serverUrl provided', async () => {
      const result = await renderNativeSinglePrompt('Hello', {
        bridgeMode: 'remote',
        serverUrl: 'http://localhost:5678',
        model: 'claude-3-5-sonnet',
      })

      expect(mockCreateRemoteBridgeAdapter).toHaveBeenCalled()
    })
  })
})
