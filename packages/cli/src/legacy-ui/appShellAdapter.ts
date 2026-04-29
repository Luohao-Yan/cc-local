import { loadLegacyUiSourceRuntime } from './sourceRuntime.js'

export interface LegacyAppShellRuntime {
  App: unknown
  AppStateProvider: unknown
  getDefaultAppState: unknown
  launchRepl: unknown
  inkRender: unknown
  loadREPL: () => Promise<unknown>
}

export interface LegacyAppShellAdapter {
  mode: 'legacy-source-shell'
  load: () => Promise<LegacyAppShellRuntime>
}

export function createLegacyAppShellAdapter(
  loader: typeof loadLegacyUiSourceRuntime = loadLegacyUiSourceRuntime
): LegacyAppShellAdapter {
  return {
    mode: 'legacy-source-shell',
    async load() {
      const runtime = await loader()

      return {
        App: runtime.appShellModule.App,
        AppStateProvider: runtime.appStateModule.AppStateProvider,
        getDefaultAppState: runtime.appStateModule.getDefaultAppState,
        launchRepl: runtime.replLauncherModule.launchRepl,
        inkRender: runtime.inkModule.render,
        loadREPL: async () => (await runtime.loadReplScreenModule()).REPL,
      }
    },
  }
}

export async function loadLegacyAppShellRuntime(): Promise<LegacyAppShellRuntime> {
  return await createLegacyAppShellAdapter().load()
}
