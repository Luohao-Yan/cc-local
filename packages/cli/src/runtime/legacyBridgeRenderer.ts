import {
  loadLegacyAppShellRuntime,
  type LegacyAppShellRuntime,
} from '../legacy-ui/appShellAdapter.js'
import {
  launchLegacyReplFromContext,
  type LegacyRenderAndRun,
} from '../legacy-ui/launchReplBridge.js'
import {
  buildLegacyLaunchContext,
  type LegacyLaunchContext,
  type LegacyAppShellProps,
  type LegacyReplBaseConfig,
  type LegacyReplOverrides,
} from '../legacy-ui/launchContextBuilder.js'
import { MCPBridgeAdapter } from '../bridge/mcpBridgeAdapter.js'

export interface LegacyBridgeReplOptions {
  debug?: boolean
  /** Resume an existing session by providing its data */
  resumeData?: {
    initialState: unknown
    messages: unknown[]
    fileHistorySnapshots?: unknown[]
    contentReplacements?: unknown[]
    agentName?: string
    agentColor?: unknown
    restoredAgentDef?: unknown
  }
  /** Session ID for SessionStore persistence */
  sessionId?: string
  /** Session display name */
  sessionName?: string
  /** Enable IDE integration (--ide flag) */
  ide?: boolean
  /** Enable Chrome integration (--chrome flag) */
  chrome?: boolean | undefined
  /** Worktree name or flag (--worktree) */
  worktree?: string | boolean | undefined
  /** Tmux flag (--tmux) */
  tmux?: boolean | string | undefined
}

/**
 * Build the launch context for the bridge, importing real tools and
 * commands from the core registries, connecting MCP servers, and
 * setting up IDE/Chrome/worktree integrations.
 */
async function buildBridgeLaunchContext(
  options: LegacyBridgeReplOptions,
): Promise<LegacyLaunchContext> {
  // Import core registries to get real tools and commands
  const { toolRegistry, commandRegistry, mcpManager } = await import('@cclocal/core')

  // Ensure default commands are registered (singleton doesn't auto-register)
  commandRegistry.registerDefaults()

  // Get all tools from the core registry
  const allTools = toolRegistry.getAll()

  // Get all commands from the core registry
  const allCommands = commandRegistry.getAll()

  // Accumulate system prompt additions from integrations
  let appendSystemPrompt: string | undefined

  // ─── IDE Integration ───
  if (options.ide) {
    try {
      const { detectAndConnectIDE } = await import('../repl/ideIntegration.js')
      const ideResult = await detectAndConnectIDE(true, mcpManager)
      if (ideResult?.metadataString) {
        appendSystemPrompt = (appendSystemPrompt ?? '') + '\n' + ideResult.metadataString
      }
    } catch {
      // IDE not available, continue without it
    }
  }

  // ─── Chrome Integration ───
  if (options.chrome !== undefined || options.chrome !== false) {
    try {
      const { setupChromeIntegration } = await import('../repl/chromeIntegration.js')
      const chromeResult = await setupChromeIntegration(options.chrome, mcpManager)
      if (chromeResult?.systemPrompt) {
        appendSystemPrompt = (appendSystemPrompt ?? '') + '\n' + chromeResult.systemPrompt
      }
    } catch {
      // Chrome not available, continue without it
    }
  }

  // ─── Worktree Integration ───
  let effectiveCwd: string | undefined
  if (options.worktree !== undefined && options.worktree !== false) {
    try {
      const { setupWorktree } = await import('../repl/worktreeIntegration.js')
      const worktreeName = typeof options.worktree === 'string' ? options.worktree : undefined
      const tmuxEnabled = options.tmux !== undefined && options.tmux !== false
      const wtResult = await setupWorktree(worktreeName, tmuxEnabled)
      if (wtResult?.created && wtResult.effectiveCwd) {
        effectiveCwd = wtResult.effectiveCwd
      }
    } catch {
      // Worktree not available, continue without it
    }
  }

  // Build dynamicMcpConfig from registered servers for the legacy UI
  const dynamicMcpConfig: Record<string, any> = {}
  for (const server of mcpManager.listServers()) {
    dynamicMcpConfig[server.name] = {
      ...server.config,
      scope: 'project',
    }
  }

  const appProps: LegacyAppShellProps<unknown> = {
    getFpsMetrics: () => undefined,
    initialState: {},
  }

  const replBase: LegacyReplBaseConfig = {
    debug: options.debug ?? false,
    commands: allCommands as unknown[],
    initialTools: allTools as unknown[],
    mcpClients: [],
    thinkingConfig: {},
    dynamicMcpConfig,
    systemPrompt: undefined,
    appendSystemPrompt: appendSystemPrompt || undefined,
  }

  const replOverrides: LegacyReplOverrides = options.resumeData
    ? {
        initialMessages: options.resumeData.messages,
        initialFileHistorySnapshots: options.resumeData.fileHistorySnapshots,
        initialContentReplacements: options.resumeData.contentReplacements,
        initialAgentName: options.resumeData.agentName,
        initialAgentColor: options.resumeData.agentColor,
      }
    : {}

  return buildLegacyLaunchContext({
    getFpsMetrics: () => undefined,
    initialState: {},
    replBase,
    replOverrides,
  })
}

export async function renderLegacyBridgeRepl(
  options: LegacyBridgeReplOptions = {},
  loadRuntime: () => Promise<LegacyAppShellRuntime> = loadLegacyAppShellRuntime,
): Promise<void> {
  const runtime = await loadRuntime()

  if (typeof runtime.launchRepl !== 'function') {
    throw new TypeError('Legacy UI runtime did not expose a launchRepl function.')
  }

  if (typeof runtime.inkRender !== 'function') {
    throw new TypeError('Legacy UI runtime did not expose an inkRender function.')
  }

  const context = await buildBridgeLaunchContext(options)

  // Connect the core MCPManager and set up the bridge adapter.
  // The bridge adapter syncs MCPManager state into AppState.mcp
  // so the legacy Ink UI sees MCP tools/clients/resources.
  const { mcpManager } = await import('@cclocal/core')
  const { createStore } = await import('../state/store.js')
  const { getDefaultAppState } = await import('../state/AppStateStore.js')

  // Create a minimal store wrapper compatible with MCPBridgeAdapter
  const store = createStore(getDefaultAppState())

  const mcpBridgeAdapter = new MCPBridgeAdapter({
    mcpManager,
    store,
    dynamicMcpConfig: (context.replProps as any).dynamicMcpConfig ?? {},
  })

  // Connect all registered MCP servers
  await mcpBridgeAdapter.connectAll()

  // Inject MCP clients into replProps so the legacy UI sees them.
  // The legacy UI's MCPConnectionManager reads from AppState.mcp.clients
  // which is now populated by the bridge adapter.
  // Set autoConnectIdeFlag: false to prevent the legacy UI from
  // independently connecting IDE — that's now handled by our
  // detectAndConnectIDE() call above.
  const mcpClients = (store.getState() as any).mcp?.clients ?? []
  const replProps = {
    ...context.replProps,
    mcpClients,
    autoConnectIdeFlag: false,
  }

  const renderAndRun: LegacyRenderAndRun<unknown> = async (root, element) => {
    await (runtime.inkRender as Function)(element)
  }

  await runtime.launchRepl(undefined, context.appProps, replProps, renderAndRun)
}