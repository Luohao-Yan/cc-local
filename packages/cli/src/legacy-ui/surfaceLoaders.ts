import { existsSync } from 'fs'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { legacyUiModuleUrls, resolveLegacyUiModuleMap } from './moduleMap.js'

export interface LegacyUiSurfaceMap {
  repoRoot: string
  inkEntry: string
  appShellEntry: string
  appStateEntry: string
  replLauncherEntry: string
  replScreenEntry: string
  commandRegistryEntry: string
  toolRegistryEntry: string
  permissionRequestEntry: string
  mcpToolListEntry: string
  messagesEntry: string
  messageResponseEntry: string
  assistantToolUseMessageEntry: string
  diffRenderingEntry: string
}

export type LegacyUiSurfaceKey = keyof Omit<LegacyUiSurfaceMap, 'repoRoot'>

export type LegacyUiSurfaceUrls = Record<LegacyUiSurfaceKey, string>

export interface LegacyUiSurfaceLoaders {
  surfaceMap: LegacyUiSurfaceMap
  surfaceUrls: LegacyUiSurfaceUrls
  loadInkRuntime: () => Promise<Record<string, unknown>>
  loadAppComponent: () => Promise<Record<string, unknown>>
  loadAppStateRuntime: () => Promise<Record<string, unknown>>
  loadReplLauncher: () => Promise<Record<string, unknown>>
  loadReplScreen: () => Promise<Record<string, unknown>>
  loadCommandRegistry: () => Promise<Record<string, unknown>>
  loadToolRegistry: () => Promise<Record<string, unknown>>
  loadPermissionUi: () => Promise<Record<string, unknown>>
  loadMcpUi: () => Promise<Record<string, unknown>>
  loadMessageUi: () => Promise<Record<string, unknown>>
  loadDiffRendering: () => Promise<Record<string, unknown>>
}

export interface LegacyCoreUiSurfaces {
  surfaceMap: LegacyUiSurfaceMap
  surfaceUrls: LegacyUiSurfaceUrls
  ink: Record<string, unknown>
  app: Record<string, unknown>
  appState: Record<string, unknown>
  replLauncher: Record<string, unknown>
  lazy: Pick<
    LegacyUiSurfaceLoaders,
    | 'loadReplScreen'
    | 'loadCommandRegistry'
    | 'loadToolRegistry'
    | 'loadPermissionUi'
    | 'loadMcpUi'
    | 'loadMessageUi'
    | 'loadDiffRendering'
  >
}

function toUrl(path: string): string {
  return pathToFileURL(path).href
}

async function importLegacyModule(url: string): Promise<Record<string, unknown>> {
  return await import(url)
}

export function resolveLegacyUiSurfaceMap(repoRoot?: string): LegacyUiSurfaceMap {
  const coreMap = resolveLegacyUiModuleMap(repoRoot)

  return {
    repoRoot: coreMap.repoRoot,
    inkEntry: coreMap.inkEntry,
    appShellEntry: coreMap.appShellEntry,
    appStateEntry: coreMap.appStateEntry,
    replLauncherEntry: coreMap.replLauncherEntry,
    replScreenEntry: coreMap.replScreenEntry,
    commandRegistryEntry: join(coreMap.repoRoot, 'packages', 'cli', 'src', 'commands.ts'),
    toolRegistryEntry: join(coreMap.repoRoot, 'packages', 'cli', 'src', 'tools.ts'),
    permissionRequestEntry: join(coreMap.repoRoot, 'packages', 'cli', 'src', 'components', 'permissions', 'PermissionRequest.tsx'),
    mcpToolListEntry: join(coreMap.repoRoot, 'packages', 'cli', 'src', 'components', 'mcp', 'MCPToolListView.tsx'),
    messagesEntry: join(coreMap.repoRoot, 'packages', 'cli', 'src', 'components', 'Messages.tsx'),
    messageResponseEntry: join(coreMap.repoRoot, 'packages', 'cli', 'src', 'components', 'MessageResponse.tsx'),
    assistantToolUseMessageEntry: join(coreMap.repoRoot, 'packages', 'cli', 'src', 'components', 'messages', 'AssistantToolUseMessage.tsx'),
    diffRenderingEntry: join(coreMap.repoRoot, 'packages', 'cli', 'src', 'components', 'FileEditToolDiff.tsx'),
  }
}

export function legacyUiSurfaceUrls(surfaceMap: LegacyUiSurfaceMap): LegacyUiSurfaceUrls {
  return {
    inkEntry: toUrl(surfaceMap.inkEntry),
    appShellEntry: toUrl(surfaceMap.appShellEntry),
    appStateEntry: toUrl(surfaceMap.appStateEntry),
    replLauncherEntry: toUrl(surfaceMap.replLauncherEntry),
    replScreenEntry: toUrl(surfaceMap.replScreenEntry),
    commandRegistryEntry: toUrl(surfaceMap.commandRegistryEntry),
    toolRegistryEntry: toUrl(surfaceMap.toolRegistryEntry),
    permissionRequestEntry: toUrl(surfaceMap.permissionRequestEntry),
    mcpToolListEntry: toUrl(surfaceMap.mcpToolListEntry),
    messagesEntry: toUrl(surfaceMap.messagesEntry),
    messageResponseEntry: toUrl(surfaceMap.messageResponseEntry),
    assistantToolUseMessageEntry: toUrl(surfaceMap.assistantToolUseMessageEntry),
    diffRenderingEntry: toUrl(surfaceMap.diffRenderingEntry),
  }
}

export function assertLegacyUiSurfaceFiles(surfaceMap = resolveLegacyUiSurfaceMap()): void {
  const missing = Object.entries(surfaceMap)
    .filter(([key, value]) => key !== 'repoRoot' && !existsSync(value))
    .map(([key, value]) => `${key}: ${value}`)

  if (missing.length > 0) {
    throw new Error(`Legacy UI surface files are missing:\n${missing.join('\n')}`)
  }
}

export function createLegacyUiSurfaceLoaders(repoRoot?: string): LegacyUiSurfaceLoaders {
  const surfaceMap = resolveLegacyUiSurfaceMap(repoRoot)
  assertLegacyUiSurfaceFiles(surfaceMap)
  const surfaceUrls = legacyUiSurfaceUrls(surfaceMap)

  return {
    surfaceMap,
    surfaceUrls,
    loadInkRuntime: async () => await importLegacyModule(surfaceUrls.inkEntry),
    loadAppComponent: async () => await importLegacyModule(surfaceUrls.appShellEntry),
    loadAppStateRuntime: async () => await importLegacyModule(surfaceUrls.appStateEntry),
    loadReplLauncher: async () => await importLegacyModule(surfaceUrls.replLauncherEntry),
    loadReplScreen: async () => await importLegacyModule(surfaceUrls.replScreenEntry),
    loadCommandRegistry: async () => await importLegacyModule(surfaceUrls.commandRegistryEntry),
    loadToolRegistry: async () => await importLegacyModule(surfaceUrls.toolRegistryEntry),
    loadPermissionUi: async () => await importLegacyModule(surfaceUrls.permissionRequestEntry),
    loadMcpUi: async () => await importLegacyModule(surfaceUrls.mcpToolListEntry),
    loadMessageUi: async () => {
      const [messagesModule, messageResponseModule, assistantToolUseModule] = await Promise.all([
        importLegacyModule(surfaceUrls.messagesEntry),
        importLegacyModule(surfaceUrls.messageResponseEntry),
        importLegacyModule(surfaceUrls.assistantToolUseMessageEntry),
      ])

      return {
        Messages: messagesModule.Messages,
        MessageResponse: messageResponseModule.MessageResponse,
        AssistantToolUseMessage: assistantToolUseModule.AssistantToolUseMessage,
      }
    },
    loadDiffRendering: async () => await importLegacyModule(surfaceUrls.diffRenderingEntry),
  }
}

export async function loadLegacyInkRuntime(): Promise<Record<string, unknown>> {
  return await createLegacyUiSurfaceLoaders().loadInkRuntime()
}

export async function loadLegacyAppComponent(): Promise<Record<string, unknown>> {
  return await createLegacyUiSurfaceLoaders().loadAppComponent()
}

export async function loadLegacyAppStateRuntime(): Promise<Record<string, unknown>> {
  return await createLegacyUiSurfaceLoaders().loadAppStateRuntime()
}

export async function loadLegacyReplScreen(): Promise<Record<string, unknown>> {
  return await createLegacyUiSurfaceLoaders().loadReplScreen()
}

export async function loadLegacyCommandRegistry(): Promise<Record<string, unknown>> {
  return await createLegacyUiSurfaceLoaders().loadCommandRegistry()
}

export async function loadLegacyToolRegistry(): Promise<Record<string, unknown>> {
  return await createLegacyUiSurfaceLoaders().loadToolRegistry()
}

export async function loadLegacyPermissionUi(): Promise<Record<string, unknown>> {
  return await createLegacyUiSurfaceLoaders().loadPermissionUi()
}

export async function loadLegacyMcpUi(): Promise<Record<string, unknown>> {
  return await createLegacyUiSurfaceLoaders().loadMcpUi()
}

export async function loadLegacyMessageUi(): Promise<Record<string, unknown>> {
  return await createLegacyUiSurfaceLoaders().loadMessageUi()
}

export async function loadLegacyUiSurfaces(): Promise<LegacyCoreUiSurfaces> {
  const loaders = createLegacyUiSurfaceLoaders()
  const urls = legacyUiModuleUrls(resolveLegacyUiModuleMap(loaders.surfaceMap.repoRoot))

  const [ink, app, appState, replLauncher] = await Promise.all([
    importLegacyModule(urls.inkEntry),
    importLegacyModule(urls.appShellEntry),
    importLegacyModule(urls.appStateEntry),
    importLegacyModule(urls.replLauncherEntry),
  ])

  return {
    surfaceMap: loaders.surfaceMap,
    surfaceUrls: loaders.surfaceUrls,
    ink,
    app,
    appState,
    replLauncher,
    lazy: {
      loadReplScreen: loaders.loadReplScreen,
      loadCommandRegistry: loaders.loadCommandRegistry,
      loadToolRegistry: loaders.loadToolRegistry,
      loadPermissionUi: loaders.loadPermissionUi,
      loadMcpUi: loaders.loadMcpUi,
      loadMessageUi: loaders.loadMessageUi,
      loadDiffRendering: loaders.loadDiffRendering,
    },
  }
}
