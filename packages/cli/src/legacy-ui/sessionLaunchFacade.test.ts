import { describe, expect, it, vi } from 'vitest'
import {
  launchLegacyNormalSession,
  launchLegacyResumeSession,
} from './sessionLaunchFacade.js'

describe('legacy session launch facade', () => {
  const root = { id: 'root' }
  const renderAndRun = vi.fn(async () => {})
  type LaunchReplCall = [
    typeof root,
    { initialState: unknown; stats?: unknown },
    Record<string, unknown>,
    typeof renderAndRun,
  ]

  function createRuntime() {
    const launchRepl = vi.fn(async () => {})
    const loadRuntime = vi.fn(async () => ({
      App: Symbol('App'),
      AppStateProvider: Symbol('AppStateProvider'),
      getDefaultAppState: Symbol('getDefaultAppState'),
      launchRepl,
      inkRender: Symbol('inkRender'),
      loadREPL: async () => Symbol('REPL'),
    }))
    return { launchRepl, loadRuntime }
  }

  it('launches a normal legacy session through context builder and bridge', async () => {
    const { launchRepl, loadRuntime } = createRuntime()

    await launchLegacyNormalSession({
      root,
      renderAndRun,
      loadRuntime,
      getFpsMetrics: vi.fn(() => undefined),
      stats: { turns: 0 },
      initialState: { cwd: '/tmp/project' },
      replBase: {
        debug: false,
        commands: ['help'],
        initialTools: ['bash'],
        mcpClients: [],
        thinkingConfig: { type: 'adaptive' },
      },
      hookMessages: ['hook-message'],
    })

    expect(loadRuntime).toHaveBeenCalledOnce()
    expect(launchRepl).toHaveBeenCalledOnce()
    const [, appProps, replProps, actualRenderAndRun] = launchRepl.mock.calls[0]! as unknown as LaunchReplCall
    expect(appProps.initialState).toEqual({ cwd: '/tmp/project' })
    expect(appProps.stats).toEqual({ turns: 0 })
    expect(replProps.initialMessages).toEqual(['hook-message'])
    expect(replProps.pendingHookMessages).toBeUndefined()
    expect(actualRenderAndRun).toBe(renderAndRun)
  })

  it('launches a restored legacy resume session through context builder and bridge', async () => {
    const { launchRepl, loadRuntime } = createRuntime()

    await launchLegacyResumeSession({
      root,
      renderAndRun,
      loadRuntime,
      getFpsMetrics: vi.fn(() => undefined),
      stats: { resumes: 1 },
      replBase: {
        debug: true,
        commands: ['help', 'model'],
        initialTools: ['bash'],
        mcpClients: ['mcp-local'],
        mainThreadAgentDefinition: { name: 'base-main' },
        thinkingConfig: { type: 'disabled' },
      },
      fallbackMainThreadAgentDefinition: { name: 'fallback-main' },
      resumeData: {
        initialState: { sessionId: 'session-1' },
        messages: ['user', 'assistant'],
        fileHistorySnapshots: ['snapshot'],
        contentReplacements: ['replacement'],
        agentName: 'worker',
        agentColor: 'green',
        restoredAgentDef: { name: 'restored-main' },
      },
    })

    expect(loadRuntime).toHaveBeenCalledOnce()
    expect(launchRepl).toHaveBeenCalledOnce()
    const [, appProps, replProps, actualRenderAndRun] = launchRepl.mock.calls[0]! as unknown as LaunchReplCall
    expect(appProps.initialState).toEqual({ sessionId: 'session-1' })
    expect(appProps.stats).toEqual({ resumes: 1 })
    expect(replProps.mainThreadAgentDefinition).toEqual({ name: 'restored-main' })
    expect(replProps.initialMessages).toEqual(['user', 'assistant'])
    expect(replProps.initialFileHistorySnapshots).toEqual(['snapshot'])
    expect(replProps.initialContentReplacements).toEqual(['replacement'])
    expect(replProps.initialAgentName).toBe('worker')
    expect(replProps.initialAgentColor).toBe('green')
    expect(actualRenderAndRun).toBe(renderAndRun)
  })
})
