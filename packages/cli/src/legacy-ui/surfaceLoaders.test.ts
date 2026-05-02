import { existsSync } from 'fs'
import { describe, expect, it } from 'vitest'
import {
  assertLegacyUiSurfaceFiles,
  createLegacyUiSurfaceLoaders,
  legacyUiSurfaceUrls,
  loadLegacyUiSurfaces,
  resolveLegacyUiSurfaceMap,
} from './surfaceLoaders.js'

// Normalize path to forward slashes for cross-platform assertions
const toPosix = (p: string) => p.replace(/\\/g, '/')

describe('legacy UI surface loaders', () => {
  it('resolves all legacy UI surface files that packages must progressively own', () => {
    const surfaceMap = resolveLegacyUiSurfaceMap()

    assertLegacyUiSurfaceFiles(surfaceMap)
    expect(toPosix(surfaceMap.inkEntry)).toContain('/packages/cli/src/ink.ts')
    expect(toPosix(surfaceMap.appShellEntry)).toContain('/packages/cli/src/components/App.tsx')
    expect(toPosix(surfaceMap.appStateEntry)).toContain('/packages/cli/src/state/AppState.tsx')
    expect(toPosix(surfaceMap.replScreenEntry)).toContain('/packages/cli/src/screens/REPL.tsx')
    expect(toPosix(surfaceMap.commandRegistryEntry)).toContain('/packages/cli/src/commands.ts')
    expect(toPosix(surfaceMap.toolRegistryEntry)).toContain('/packages/cli/src/tools.ts')
    expect(toPosix(surfaceMap.permissionRequestEntry)).toContain('/packages/cli/src/components/permissions/PermissionRequest.tsx')
    expect(toPosix(surfaceMap.mcpToolListEntry)).toContain('/packages/cli/src/components/mcp/MCPToolListView.tsx')
    expect(toPosix(surfaceMap.messagesEntry)).toContain('/packages/cli/src/components/Messages.tsx')
    expect(toPosix(surfaceMap.messageResponseEntry)).toContain('/packages/cli/src/components/MessageResponse.tsx')
    expect(toPosix(surfaceMap.assistantToolUseMessageEntry)).toContain('/packages/cli/src/components/messages/AssistantToolUseMessage.tsx')
    expect(toPosix(surfaceMap.diffRenderingEntry)).toContain('/packages/cli/src/components/FileEditToolDiff.tsx')

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
  }, 120000)
})
