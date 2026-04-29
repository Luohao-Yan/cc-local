import { describe, expect, it, vi } from 'vitest'
import {
  createInteractiveReplRenderer,
  createLegacyInteractiveReplRendererBridge,
  loadLegacyInteractiveReplRuntime,
} from './replRenderer.js'

describe('repl renderer', () => {
  it('wraps the current packages REPL renderer behind an adapter interface', async () => {
    const renderImpl = vi.fn(async () => {})
    const renderer = createInteractiveReplRenderer(renderImpl as never)

    expect(renderer.mode).toBe('packages-simple')
    await renderer.render({} as never, { prefill: 'hello' })

    expect(renderImpl).toHaveBeenCalledWith({} as never, { prefill: 'hello' })
  })

  it('exports a default interactive REPL renderer entrypoint', async () => {
    const renderImpl = vi.fn(async () => {})
    const renderer = createInteractiveReplRenderer(renderImpl as never)

    await renderer.render({} as never)
    expect(renderImpl).toHaveBeenCalledOnce()
  })

  it('exposes a legacy source-shell bridge for loading the old App/REPL runtime', async () => {
    const loader = vi.fn(async () => ({
      App: Symbol('App'),
      AppStateProvider: Symbol('AppStateProvider'),
      getDefaultAppState: Symbol('getDefaultAppState'),
      launchRepl: Symbol('launchRepl'),
      inkRender: Symbol('inkRender'),
      loadREPL: async () => Symbol('REPL'),
    }))
    const bridge = createLegacyInteractiveReplRendererBridge(loader as never)

    expect(bridge.mode).toBe('legacy-source-shell')

    const runtime = await bridge.loadRuntime()
    expect(runtime.App).toBeTypeOf('symbol')
    expect(runtime.AppStateProvider).toBeTypeOf('symbol')
    expect(runtime.getDefaultAppState).toBeTypeOf('symbol')
    expect(runtime.launchRepl).toBeTypeOf('symbol')
    expect(runtime.inkRender).toBeTypeOf('symbol')
    expect(await runtime.loadREPL()).toBeTypeOf('symbol')
  })

  it('can load the real legacy interactive runtime from src/*', async () => {
    const runtime = await loadLegacyInteractiveReplRuntime()

    expect(runtime.App).toBeTypeOf('function')
    expect(runtime.AppStateProvider).toBeTypeOf('function')
    expect(runtime.getDefaultAppState).toBeTypeOf('function')
    expect(runtime.launchRepl).toBeTypeOf('function')
    expect(runtime.inkRender).toBeTypeOf('function')
    expect(runtime.loadREPL).toBeTypeOf('function')
  }, 30000)
})
