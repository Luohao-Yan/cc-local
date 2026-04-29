import { describe, expect, it, vi } from 'vitest'
import { launchLegacyReplFromContext } from './launchReplBridge.js'

describe('legacy launchRepl bridge', () => {
  it('loads the legacy runtime and invokes src/replLauncher.tsx with app and repl props', async () => {
    const launchRepl = vi.fn(async () => {})
    const loadRuntime = vi.fn(async () => ({
      App: Symbol('App'),
      AppStateProvider: Symbol('AppStateProvider'),
      getDefaultAppState: Symbol('getDefaultAppState'),
      launchRepl,
      inkRender: Symbol('inkRender'),
      loadREPL: async () => Symbol('REPL'),
    }))
    const renderAndRun = vi.fn(async () => {})
    const root = { id: 'root' }
    const context = {
      appProps: {
        getFpsMetrics: vi.fn(() => undefined),
        stats: { turns: 1 },
        initialState: { cwd: '/tmp/project' },
      },
      replProps: {
        debug: false,
        commands: ['help'],
        initialTools: ['bash'],
        mcpClients: [],
        thinkingConfig: { type: 'adaptive' },
      },
    }

    await launchLegacyReplFromContext({
      root,
      context,
      renderAndRun,
      loadRuntime,
    })

    expect(loadRuntime).toHaveBeenCalledOnce()
    expect(launchRepl).toHaveBeenCalledWith(
      root,
      context.appProps,
      context.replProps,
      renderAndRun,
    )
  })

  it('fails clearly when the loaded runtime does not expose launchRepl', async () => {
    await expect(launchLegacyReplFromContext({
      root: {},
      context: {
        appProps: {
          getFpsMetrics: () => undefined,
          initialState: {},
        },
        replProps: {
          debug: false,
          commands: [],
          initialTools: [],
          mcpClients: [],
          thinkingConfig: { type: 'disabled' },
        },
      },
      renderAndRun: async () => {},
      loadRuntime: async () => ({
        App: Symbol('App'),
        AppStateProvider: Symbol('AppStateProvider'),
        getDefaultAppState: Symbol('getDefaultAppState'),
        launchRepl: undefined,
        inkRender: Symbol('inkRender'),
        loadREPL: async () => Symbol('REPL'),
      }),
    })).rejects.toThrow('launchRepl')
  })
})
