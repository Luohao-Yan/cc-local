import { describe, expect, it } from 'vitest'
import { loadLegacyUiSourceRuntime } from './sourceRuntime.js'

describe('legacy UI source runtime', () => {
  it('loads the legacy app shell, repl launcher, app state, and ink runtime, and exposes a lazy REPL screen loader', async () => {
    const runtime = await loadLegacyUiSourceRuntime()

    expect(runtime.appShellModule.App).toBeTypeOf('function')
    expect(runtime.replLauncherModule.launchRepl).toBeTypeOf('function')
    expect(runtime.appStateModule.AppStateProvider).toBeTypeOf('function')
    expect(runtime.appStateModule.getDefaultAppState).toBeTypeOf('function')
    expect(runtime.inkModule.render).toBeTypeOf('function')
    expect(runtime.loadReplScreenModule).toBeTypeOf('function')
  }, 30000)
})
