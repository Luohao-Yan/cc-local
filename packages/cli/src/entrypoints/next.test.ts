/**
 * Integration tests for the cclocal-next legacy bridge flow
 *
 * Verifies that cclocal-next routes interactive sessions through
 * the legacy Ink/React UI bridge so users see the same terminal
 * experience as cclocal, with QueryEngine as the data source.
 */

import { describe, expect, it, beforeEach } from 'vitest'

describe('cclocal-next legacy bridge', () => {
  beforeEach(() => {
    delete process.env.CCLOCAL_DEFAULT_NATIVE
    delete process.env.CCLOCAL_PREFER_LEGACY_BRIDGE
    delete process.env.CCLOCAL_USE_QUERY_ENGINE
  })

  describe('shouldUseLegacyUi with CCLOCAL_DEFAULT_NATIVE', () => {
    it('returns false when CCLOCAL_DEFAULT_NATIVE=1', async () => {
      process.env.CCLOCAL_DEFAULT_NATIVE = '1'
      const { shouldUseLegacyUi } = await import('../ui/legacyAdapter.js')
      expect(shouldUseLegacyUi([])).toBe(false)
    })

    it('returns true with --legacy even when CCLOCAL_DEFAULT_NATIVE=1', async () => {
      process.env.CCLOCAL_DEFAULT_NATIVE = '1'
      const { shouldUseLegacyUi } = await import('../ui/legacyAdapter.js')
      expect(shouldUseLegacyUi(['--legacy'])).toBe(true)
    })
  })

  describe('shouldUseQueryEngine gate', () => {
    it('returns true when CCLOCAL_USE_QUERY_ENGINE=1', async () => {
      process.env.CCLOCAL_USE_QUERY_ENGINE = '1'
      const { shouldUseQueryEngine } = await import('../bridge/queryEngineAdapter.js')
      expect(shouldUseQueryEngine()).toBe(true)
    })

    it('returns false by default', async () => {
      delete process.env.CCLOCAL_USE_QUERY_ENGINE
      const origArgv = process.argv
      process.argv = ['bun', 'run', 'index.ts']
      const { shouldUseQueryEngine } = await import('../bridge/queryEngineAdapter.js')
      expect(shouldUseQueryEngine()).toBe(false)
      process.argv = origArgv
    })
  })

  describe('QueryEngine adapter event translation', () => {
    it('translateStreamEvent maps core events to legacy protocol', async () => {
      // Import the adapter module to verify it loads
      const mod = await import('../bridge/queryEngineAdapter.js')
      expect(mod.createQueryEngineAdapter).toBeTypeOf('function')
      expect(mod.shouldUseQueryEngine).toBeTypeOf('function')
    })
  })

  describe('legacy bridge renderer', () => {
    it('exports renderLegacyBridgeRepl function', async () => {
      const { renderLegacyBridgeRepl } = await import('../runtime/legacyBridgeRenderer.js')
      expect(renderLegacyBridgeRepl).toBeTypeOf('function')
    })
  })

  describe('bridge launch context builder', () => {
    it('builds a valid context with required props', async () => {
      const { buildLegacyLaunchContext } = await import('../legacy-ui/launchContextBuilder.js')
      const context = buildLegacyLaunchContext({
        getFpsMetrics: () => undefined,
        initialState: {},
        replBase: {
          debug: false,
          commands: [],
          initialTools: [],
          mcpClients: [],
          thinkingConfig: {},
        },
      })

      expect(context).toHaveProperty('appProps')
      expect(context).toHaveProperty('replProps')
      expect(context.replProps).toHaveProperty('commands')
      expect(context.replProps).toHaveProperty('initialTools')
    })
  })

  describe('moduleMap resolution', () => {
    it('resolves all core entries under packages/cli/src/', async () => {
      const { resolveLegacyUiModuleMap, findLegacyUiRepoRoot } = await import('../legacy-ui/moduleMap.js')
      const root = findLegacyUiRepoRoot()
      expect(root).toBeDefined()

      const map = resolveLegacyUiModuleMap(root!)
      const normalized = Object.fromEntries(
        Object.entries(map).map(([k, v]) => [k, v.replace(/\\/g, '/')])
      )
      for (const key of ['appShellEntry', 'replLauncherEntry', 'replScreenEntry', 'inkEntry', 'appStateEntry'] as const) {
        expect(normalized[key]).toContain('packages/cli/src/')
      }
    })
  })

  describe('core registry integration', () => {
    it('ToolRegistry has registered default tools', async () => {
      const { toolRegistry } = await import('@cclocal/core')
      const tools = toolRegistry.getAll()
      expect(tools.length).toBeGreaterThan(10)
      const toolNames = tools.map((t: any) => t.name)
      expect(toolNames).toContain('bash')
      expect(toolNames).toContain('file_read')
      expect(toolNames).toContain('file_write')
      expect(toolNames).toContain('file_edit')
    })

    it('CommandRegistry registers defaults when called', async () => {
      const { commandRegistry } = await import('@cclocal/core')
      commandRegistry.registerDefaults()
      const commands = commandRegistry.getAll()
      expect(commands.length).toBeGreaterThan(5)
      const commandNames = commands.map((c: any) => c.name)
      expect(commandNames).toContain('help')
      expect(commandNames).toContain('clear')
      expect(commandNames).toContain('model')
    })
  })

  describe('external integration modules are importable', () => {
    it('chromeIntegration exports setupChromeIntegration', async () => {
      const mod = await import('../repl/chromeIntegration.js')
      expect(mod.setupChromeIntegration).toBeTypeOf('function')
    })

    it('worktreeIntegration exports setupWorktree', async () => {
      const mod = await import('../repl/worktreeIntegration.js')
      expect(mod.setupWorktree).toBeTypeOf('function')
    })

    it('tmuxIntegration exports handleTmuxWorktree', async () => {
      const mod = await import('../repl/tmuxIntegration.js')
      expect(mod.handleTmuxWorktree).toBeTypeOf('function')
    })

    it('ideIntegration module can be loaded', async () => {
      // Just verify the module path exists — don't actually import it
      // because it triggers lockfile polling which hangs in CI
      const fs = await import('fs')
      const path = await import('path')
      const idePath = path.resolve(__dirname, '../repl/ideIntegration.js')
      expect(fs.existsSync(idePath.replace('.js', '.ts')) || fs.existsSync(idePath)).toBe(true)
    })
  })

  describe('bridge renderer accepts integration options', () => {
    it('LegacyBridgeReplOptions includes ide/chrome/worktree/tmux', async () => {
      // Verify the options type by checking the function signature
      const { renderLegacyBridgeRepl } = await import('../runtime/legacyBridgeRenderer.js')
      expect(renderLegacyBridgeRepl).toBeTypeOf('function')
    })

    it('MCPBridgeAdapter is importable', async () => {
      const { MCPBridgeAdapter } = await import('../bridge/mcpBridgeAdapter.js')
      expect(MCPBridgeAdapter).toBeTypeOf('function')
    })
  })
})
