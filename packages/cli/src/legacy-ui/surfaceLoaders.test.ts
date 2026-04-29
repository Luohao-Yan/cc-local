import { existsSync } from 'fs'
import { describe, expect, it } from 'vitest'
import {
  assertLegacyUiSurfaceFiles,
  createLegacyUiSurfaceLoaders,
  legacyUiSurfaceUrls,
  loadLegacyUiSurfaces,
  resolveLegacyUiSurfaceMap,
} from './surfaceLoaders.js'

describe('legacy UI surface loaders', () => {
  it('resolves all legacy UI surface files that packages must progressively own', () => {
    const surfaceMap = resolveLegacyUiSurfaceMap()

    assertLegacyUiSurfaceFiles(surfaceMap)
    expect(surfaceMap.inkEntry).toContain('/packages/cli/src/ink.ts')
    expect(surfaceMap.appShellEntry).toContain('/packages/cli/src/components/App.tsx')
    expect(surfaceMap.appStateEntry).toContain('/packages/cli/src/state/AppState.tsx')
    expect(surfaceMap.replScreenEntry).toContain('/packages/cli/src/screens/REPL.tsx')
    expect(surfaceMap.commandRegistryEntry).toContain('/packages/cli/src/commands.ts')
    expect(surfaceMap.toolRegistryEntry).toContain('/packages/cli/src/tools.ts')
    expect(surfaceMap.permissionRequestEntry).toContain('/packages/cli/src/components/permissions/PermissionRequest.tsx')
    expect(surfaceMap.mcpToolListEntry).toContain('/packages/cli/src/components/mcp/MCPToolListView.tsx')
    expect(surfaceMap.messagesEntry).toContain('/packages/cli/src/components/Messages.tsx')
    expect(surfaceMap.messageResponseEntry).toContain('/packages/cli/src/components/MessageResponse.tsx')
    expect(surfaceMap.assistantToolUseMessageEntry).toContain('/packages/cli/src/components/messages/AssistantToolUseMessage.tsx')
    expect(surfaceMap.diffRenderingEntry).toContain('/packages/cli/src/components/FileEditToolDiff.tsx')

    for (const [key, value] of Object.entries(surfaceMap)) {
      if (key !== 'repoRoot') {
        expect(existsSync(value), key).toBe(true)
      }
    }
  })

  it('exposes file URL based lazy loaders without statically importing legacy UI into package typecheck', () => {
    const surfaceMap = resolveLegacyUiSurfaceMap()
    const urls = legacyUiSurfaceUrls(surfaceMap)
    const loaders = createLegacyUiSurfaceLoaders()

    expect(urls.replScreenEntry).toMatch(/^file:\/\//)
    expect(urls.permissionRequestEntry).toMatch(/^file:\/\//)
    expect(loaders.loadReplScreen).toBeTypeOf('function')
    expect(loaders.loadCommandRegistry).toBeTypeOf('function')
    expect(loaders.loadToolRegistry).toBeTypeOf('function')
    expect(loaders.loadPermissionUi).toBeTypeOf('function')
    expect(loaders.loadMcpUi).toBeTypeOf('function')
    expect(loaders.loadMessageUi).toBeTypeOf('function')
    expect(loaders.loadDiffRendering).toBeTypeOf('function')
  })

  it('loads safe core Ink, App, AppState, and repl launcher surfaces eagerly', async () => {
    const surfaces = await loadLegacyUiSurfaces()

    expect(surfaces.ink.render).toBeTypeOf('function')
    expect(surfaces.ink.createRoot).toBeTypeOf('function')
    expect(surfaces.app.App).toBeTypeOf('function')
    expect(surfaces.appState.AppStateProvider).toBeTypeOf('function')
    expect(surfaces.appState.getDefaultAppState).toBeTypeOf('function')
    expect(surfaces.replLauncher.launchRepl).toBeTypeOf('function')
    expect(surfaces.lazy.loadReplScreen).toBeTypeOf('function')
    expect(surfaces.lazy.loadCommandRegistry).toBeTypeOf('function')
    expect(surfaces.lazy.loadToolRegistry).toBeTypeOf('function')
    expect(surfaces.lazy.loadPermissionUi).toBeTypeOf('function')
    expect(surfaces.lazy.loadMcpUi).toBeTypeOf('function')
    expect(surfaces.lazy.loadMessageUi).toBeTypeOf('function')
    expect(surfaces.lazy.loadDiffRendering).toBeTypeOf('function')
  }, 30000)
})
