import { describe, expect, it } from 'vitest'
import {
  buildLegacyNormalSessionLaunchContext,
  buildLegacyResumeSessionLaunchContext,
  launchLegacyNormalSession,
  launchLegacyResumeSession,
  loadLegacyAppShellRuntime,
  loadLegacyUiSourceRuntime,
  resolveLegacyUiModuleMap,
} from './index.js'

// Normalize path to forward slashes for cross-platform assertions
const toPosix = (p: string) => p.replace(/\\/g, '/')

describe('legacy UI public package boundary', () => {
  it('exports the production migration entrypoints used to replace packages/cli/src/main.tsx launch calls', () => {
    expect(buildLegacyNormalSessionLaunchContext).toBeTypeOf('function')
    expect(buildLegacyResumeSessionLaunchContext).toBeTypeOf('function')
    expect(launchLegacyNormalSession).toBeTypeOf('function')
    expect(launchLegacyResumeSession).toBeTypeOf('function')
  })

  it('exports stable runtime loaders for the legacy Ink/App/AppState/REPL source tree', async () => {
    const moduleMap = resolveLegacyUiModuleMap()
    expect(toPosix(moduleMap.inkEntry).endsWith('src/ink.ts')).toBe(true)
    expect(toPosix(moduleMap.appShellEntry).endsWith('src/components/App.tsx')).toBe(true)
    expect(toPosix(moduleMap.appStateEntry).endsWith('src/state/AppState.tsx')).toBe(true)
    expect(toPosix(moduleMap.replScreenEntry).endsWith('src/screens/REPL.tsx')).toBe(true)

    const sourceRuntime = await loadLegacyUiSourceRuntime()
    expect(sourceRuntime.inkModule.render).toBeTypeOf('function')
    expect(sourceRuntime.appShellModule.App).toBeTypeOf('function')
    expect(sourceRuntime.appStateModule.AppStateProvider).toBeTypeOf('function')
    expect(sourceRuntime.loadReplScreenModule).toBeTypeOf('function')

    const appShellRuntime = await loadLegacyAppShellRuntime()
    expect(appShellRuntime.launchRepl).toBeTypeOf('function')
    expect(appShellRuntime.loadREPL).toBeTypeOf('function')
  }, 120000)
})
