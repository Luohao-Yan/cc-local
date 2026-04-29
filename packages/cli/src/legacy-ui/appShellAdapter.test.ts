import { describe, expect, it, vi } from 'vitest'
import { createLegacyAppShellAdapter, loadLegacyAppShellRuntime } from './appShellAdapter.js'

describe('legacy app shell adapter', () => {
  it('maps legacy UI source runtime into an app shell adapter contract', async () => {
    const loader = vi.fn(async () => ({
      moduleMap: {} as never,
      appShellModule: { App: Symbol('App') },
      replLauncherModule: { launchRepl: Symbol('launchRepl') },
      appStateModule: {
        AppStateProvider: Symbol('AppStateProvider'),
        getDefaultAppState: Symbol('getDefaultAppState'),
      },
      inkModule: { render: Symbol('render') },
      loadReplScreenModule: async () => ({ REPL: Symbol('REPL') }),
    }))

    const adapter = createLegacyAppShellAdapter(loader as never)
    expect(adapter.mode).toBe('legacy-source-shell')

    const runtime = await adapter.load()
    expect(runtime.App).toBeTypeOf('symbol')
    expect(runtime.AppStateProvider).toBeTypeOf('symbol')
    expect(runtime.getDefaultAppState).toBeTypeOf('symbol')
    expect(runtime.launchRepl).toBeTypeOf('symbol')
    expect(runtime.inkRender).toBeTypeOf('symbol')
    expect(await runtime.loadREPL()).toBeTypeOf('symbol')
  })

  it('can load the real legacy app shell runtime from src/*', async () => {
    const runtime = await loadLegacyAppShellRuntime()

    expect(runtime.App).toBeTypeOf('function')
    expect(runtime.AppStateProvider).toBeTypeOf('function')
    expect(runtime.getDefaultAppState).toBeTypeOf('function')
    expect(runtime.launchRepl).toBeTypeOf('function')
    expect(runtime.inkRender).toBeTypeOf('function')
    expect(runtime.loadREPL).toBeTypeOf('function')
  }, 30000)
})
