import { legacyUiModuleUrls, resolveLegacyUiModuleMap } from './moduleMap.js'

export interface LegacyUiSourceRuntime {
  moduleMap: ReturnType<typeof resolveLegacyUiModuleMap>
  appShellModule: Record<string, unknown>
  replLauncherModule: Record<string, unknown>
  appStateModule: Record<string, unknown>
  inkModule: Record<string, unknown>
  loadReplScreenModule: () => Promise<Record<string, unknown>>
}

export async function loadLegacyUiSourceRuntime(): Promise<LegacyUiSourceRuntime> {
  const moduleMap = resolveLegacyUiModuleMap()
  const urls = legacyUiModuleUrls(moduleMap)

  const [appShellModule, replLauncherModule, appStateModule, inkModule] = await Promise.all([
    import(urls.appShellEntry),
    import(urls.replLauncherEntry),
    import(urls.appStateEntry),
    import(urls.inkEntry),
  ])

  return {
    moduleMap,
    appShellModule,
    replLauncherModule,
    appStateModule,
    inkModule,
    loadReplScreenModule: async () => await import(urls.replScreenEntry),
  }
}
