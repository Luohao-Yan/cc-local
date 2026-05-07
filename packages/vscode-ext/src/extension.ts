/**
 * CCLocal VS Code Extension
 *
 * Features:
 *  - Two communication modes: WebSocket (default) or CLI process
 *  - Complete hook system (20+ hook types)
 *  - Authentication management (5 providers)
 *  - Full configuration system (76+ settings)
 *  - MCP server management with approval and auth
 *  - Plugin system with marketplace and trust
 *  - Complete session management with search, fork, tree view
 */

import * as vscode from 'vscode'
import * as path from 'path'
import { CliViewProvider } from './CliViewProvider.js'
import { WsViewProvider } from './WsViewProvider.js'
import { ServerManager } from './ServerManager.js'
import { HookManager, getHookManager, disposeHookManager } from './hooks/index.js'
import { ConfigurationManager } from './ConfigurationManager.js'
import { AuthStatusBar } from './auth/AuthStatusBar.js'
import { MCPManager, getMCPManager, disposeMCPManager, registerFileSaveListener } from './mcp/index.js'
import { MCPPanelProvider } from './mcp/MCPPanelProvider.js'
import { PluginManager, getPluginManager, disposePluginManager } from './plugins/index.js'
import { PluginPanelProvider } from './plugins/PluginPanelProvider.js'
import { SessionManager, getSessionManager, disposeSessionManager } from './session/index.js'
import { SessionTreeProvider, SessionTreeItem } from './session/SessionTreeProvider.js'
import {
  registerAllCommands,
  registerKeyboardShortcuts,
  registerCommandPalette,
  type CommandDependencies,
} from './commands/index.js'

// Global instances
let hookManager: HookManager | undefined
let configManager: ConfigurationManager | undefined
let outputChannel: vscode.LogOutputChannel | undefined
let mcpManager: MCPManager | undefined
let pluginManager: PluginManager | undefined
let sessionManager: SessionManager | undefined

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('CCLocal extension activating...')

  // Create output channel for logging
  outputChannel = vscode.window.createOutputChannel('CCLocal', { log: true })
  context.subscriptions.push(outputChannel)

  // Initialize configuration manager
  configManager = new ConfigurationManager(context)
  context.subscriptions.push(configManager)

  // Initialize hook manager
  hookManager = getHookManager(outputChannel, {
    allowedHttpUrls: configManager.get('allowedHttpHookUrls'),
    allowedCommands: configManager.get('allowedCommands'),
    allowedEnvVars: configManager.get('allowedEnvVars'),
  })
  context.subscriptions.push(hookManager)

  // Load hooks from configuration
  const hooksConfig = configManager.get('hooks')
  if (hooksConfig) {
    hookManager.loadFromConfig(hooksConfig)
  }

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('cclocal.hooks')) {
        const newHooksConfig = configManager?.get('hooks')
        if (newHooksConfig && hookManager) {
          hookManager.loadFromConfig(newHooksConfig)
        }
      }
      if (e.affectsConfiguration('cclocal.disableAllHooks')) {
        const disabled = configManager?.get('disableAllHooks')
        if (hookManager) {
          hookManager.setEnabled(!disabled)
        }
      }
    })
  )

  // Initialize auth status bar
  const authStatusBar = new AuthStatusBar(context)
  context.subscriptions.push(authStatusBar)

  // Initialize MCP manager
  mcpManager = getMCPManager(outputChannel, {
    autoDiscoverProject: configManager.get('enableAllProjectMcpServers'),
    preApprovedServers: configManager.get('allowedMcpServers'),
    deniedServers: configManager.get('deniedMcpServers'),
  })
  context.subscriptions.push(mcpManager)

  // Discover MCP servers on activation
  void mcpManager.discoverServers()

  // Register VS Code file save listener for MCP tools
  registerFileSaveListener(context)

  // Initialize plugin manager
  pluginManager = getPluginManager(context, outputChannel, {
    extraKnownMarketplaces: configManager.get('extraKnownMarketplaces'),
    strictKnownMarketplaces: configManager.get('strictKnownMarketplaces'),
    blockedMarketplaces: configManager.get('blockedMarketplaces'),
  })
  context.subscriptions.push(pluginManager)

  // Load installed plugins
  await pluginManager.loadInstalledPlugins()

  // Initialize session manager
  sessionManager = getSessionManager(context, outputChannel)
  context.subscriptions.push(sessionManager)

  // Register session tree provider
  const sessionTree = new SessionTreeProvider(sessionManager)
  context.subscriptions.push(sessionTree)
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('cclocal.sessions', sessionTree)
  )

  // Register all commands from registry
  const commandDeps: CommandDependencies = {
    sessionManager,
    sessionTree,
    hookManager,
    mcpManager,
    pluginManager,
    configManager,
    outputChannel,
  }
  registerAllCommands(context, commandDeps)

  // Register keyboard shortcuts
  registerKeyboardShortcuts(context, sessionManager)

  // Register command palette
  registerCommandPalette(context)

  // Register session commands
  registerSessionCommands(context, sessionManager, sessionTree)

  // Register hook-related commands
  registerHookCommands(context, hookManager)

  // Register MCP-related commands
  registerMCPCommands(context, mcpManager)

  // Register plugin-related commands
  registerPluginCommands(context, pluginManager)

  const config = vscode.workspace.getConfiguration('cclocal')
  const mode: string = config.get('mode') || 'websocket'

  // 统一的消息发送接口，两种模式共享 sendSelectedCode 命令
  let sendMessage: (text: string) => Promise<void> | void

  if (mode === 'cli') {
    const provider = new CliViewProvider(context.extensionUri)

    sendMessage = (text: string) => provider.sendMessage(text)

    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        CliViewProvider.viewType,
        provider,
        { webviewOptions: { retainContextWhenHidden: true } },
      ),
    )

    context.subscriptions.push(
      vscode.commands.registerCommand('cclocal.newSession', () => {
        void vscode.commands.executeCommand('cclocal.chatView.focus')
        provider.handleCommand('newSession')
      }),
    )

    context.subscriptions.push(
      vscode.commands.registerCommand('cclocal.clearChat', () => {
        provider.handleCommand('clearChat')
      }),
    )

    context.subscriptions.push(
      vscode.commands.registerCommand('cclocal.stopGeneration', () => {
        provider.handleCommand('stopGeneration')
      }),
    )
  } else {
    const serverManager = new ServerManager()
    await serverManager.ensureServerRunning()

    const provider = new WsViewProvider(context.extensionUri, serverManager)

    sendMessage = (text: string) => provider.sendMessage(text)

    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(WsViewProvider.viewType, provider),
    )

    context.subscriptions.push(
      vscode.commands.registerCommand('cclocal.sendMessage', async () => {
        const message = await vscode.window.showInputBox({
          prompt: 'Enter your message to CCLocal',
          placeHolder: 'How can I help you today?',
        })
        if (message) {
          await provider.sendMessage(message)
        }
      }),
    )

    context.subscriptions.push(
      vscode.commands.registerCommand('cclocal.clearChat', () => {
        provider.clearChat()
      }),
    )

    context.subscriptions.push(
      vscode.commands.registerCommand('cclocal.stopGeneration', () => {
        provider.stopGeneration()
      }),
    )
  }

  // 公共命令：发送选中代码（两种模式共享）
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.sendSelectedCode', () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        vscode.window.showWarningMessage('CCLocal: 没有活动的编辑器')
        return
      }
      const selection = editor.selection
      if (selection.isEmpty) {
        vscode.window.showWarningMessage('CCLocal: 请先选中代码')
        return
      }
      const selectedText = editor.document.getText(selection)
      const language = editor.document.languageId
      const fileName = editor.document.fileName.split('/').pop() ?? ''
      const message = `请解释以下 ${language} 代码（来自 ${fileName}）：\n\n\`\`\`${language}\n${selectedText}\n\`\`\``
      void vscode.commands.executeCommand('cclocal.chatView.focus').then(() => {
        sendMessage(message)
      })
    }),
  )

  console.log('CCLocal extension activated')
}

export function deactivate(): void {
  disposeHookManager()
  disposeMCPManager()
  disposePluginManager()
  disposeSessionManager()
  outputChannel?.dispose()
}

// ─── Hook Commands Registration ──────────────────────────────────────────────

function registerHookCommands(
  context: vscode.ExtensionContext,
  hookManager: HookManager
): void {
  // Enable/disable hooks
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.hooks.enable', () => {
      hookManager.setEnabled(true)
      vscode.window.showInformationMessage('CCLocal: Hooks enabled')
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.hooks.disable', () => {
      hookManager.setEnabled(false)
      vscode.window.showInformationMessage('CCLocal: Hooks disabled')
    })
  )

  // Clear all hooks
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.hooks.clear', () => {
      hookManager.clear()
      vscode.window.showInformationMessage('CCLocal: All hooks cleared')
    })
  )

  // Show hook statistics
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.hooks.stats', () => {
      const stats = hookManager.getStats()
      const message = `Total hooks: ${stats.totalHooks}\n${Object.entries(stats.hooksByType)
        .filter(([, count]) => count > 0)
        .map(([type, count]) => `  ${type}: ${count}`)
        .join('\n')}`
      vscode.window.showInformationMessage(message, { modal: true })
    })
  )

  // Test hook execution (for debugging)
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.hooks.test', async () => {
      const hookTypes = [
        'PreToolUse',
        'PostToolUse',
        'SessionStart',
        'SessionEnd',
        'FileWrite',
        'FileEdit',
        'BashExecution',
        'Error',
      ] as const

      const selected = await vscode.window.showQuickPick(hookTypes, {
        placeHolder: 'Select hook type to test',
      })

      if (selected) {
        const results = await hookManager.execute(selected, {
          type: selected,
          timestamp: Date.now(),
          toolName: 'TestTool',
        })

        const output = results.map(r =>
          `Handler ${r.handlerIndex}: ${r.success ? '✓' : '✗'} (${r.duration}ms)\n` +
          (r.output ? `  Output: ${r.output.slice(0, 100)}\n` : '') +
          (r.error ? `  Error: ${r.error}\n` : '')
        ).join('\n')

        outputChannel?.info(`Hook test results:\n${output}`)
        vscode.window.showInformationMessage(
          `Hook test completed: ${results.filter(r => r.success).length}/${results.length} passed`
        )
      }
    })
  )

  // Register function hook
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.hooks.registerFunction', async () => {
      const name = await vscode.window.showInputBox({
        prompt: 'Enter function name',
        placeHolder: 'myCustomHook',
      })

      if (name) {
        // Register a sample function that can be called by function hooks
        hookManager.registerFunction(name, async (context) => {
          outputChannel?.debug(`Function hook "${name}" called with context:`, context)
          return {
            success: true,
            message: `Hook ${name} executed`,
            timestamp: Date.now(),
          }
        })
        vscode.window.showInformationMessage(`CCLocal: Function hook "${name}" registered`)
      }
    })
  )
}

// ─── Export for Testing ───────────────────────────────────────────────────────

export { hookManager, configManager, outputChannel, mcpManager }

// ─── MCP Commands Registration ───────────────────────────────────────────────

function registerMCPCommands(
  context: vscode.ExtensionContext,
  mcpManager: MCPManager
): void {
  // Show MCP management panel
  const mcpPanel = new MCPPanelProvider(mcpManager)
  context.subscriptions.push(mcpPanel)

  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.showMCPSettings', () => {
      mcpPanel.show()
    })
  )

  // Refresh/discover MCP servers
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.mcp.refresh', async () => {
      await mcpManager.discoverServers()
      vscode.window.showInformationMessage('CCLocal: MCP servers refreshed')
    })
  )

  // Review pending approvals
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.mcp.reviewPending', async () => {
      const pending = mcpManager.getPendingApprovals()
      if (pending.length === 0) {
        vscode.window.showInformationMessage('CCLocal: No pending MCP server approvals')
        return
      }

      for (const server of pending) {
        const approved = await mcpManager.showApprovalUI({
          name: server.name,
          info: server,
          tools: server.tools,
          reason: 'auto_discovery',
        })

        if (approved) {
          vscode.window.showInformationMessage(`CCLocal: Approved MCP server "${server.name}"`)
        } else {
          vscode.window.showInformationMessage(`CCLocal: Denied MCP server "${server.name}"`)
        }
      }
    })
  )

  // List MCP servers in quick pick
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.mcp.listServers', async () => {
      const servers = mcpManager.getAllServers()
      if (servers.length === 0) {
        vscode.window.showInformationMessage('CCLocal: No MCP servers discovered')
        return
      }

      const items = servers.map(s => ({
        label: s.name,
        description: `${s.status} | ${s.source} | ${s.config.type}`,
        detail: s.tools.length > 0
          ? `Tools: ${s.tools.map(t => t.name).join(', ')}`
          : 'No tools',
        server: s,
      }))

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select an MCP server',
      })

      if (selected) {
        const actions = await vscode.window.showQuickPick(
          [
            { label: 'Enable', value: 'enable' },
            { label: 'Disable', value: 'disable' },
            { label: 'Remove', value: 'remove' },
            { label: 'View Details', value: 'details' },
          ],
          { placeHolder: `Action for "${selected.label}"` }
        )

        if (actions) {
          switch (actions.value) {
            case 'enable':
              await mcpManager.enableServer(selected.label)
              break
            case 'disable':
              await mcpManager.disableServer(selected.label)
              break
            case 'remove':
              await mcpManager.removeServer(selected.label)
              break
            case 'details':
              mcpPanel.show()
              break
          }
        }
      }
    })
  )

  // Show MCP statistics
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.mcp.stats', () => {
      const stats = mcpManager.getStats()
      const lines = [
        `Total Discovered: ${stats.totalDiscovered}`,
        `Connected: ${stats.byStatus.connected || 0}`,
        `Approved: ${stats.byApproval.approved || 0}`,
        `Pending: ${stats.byApproval.pending || 0}`,
        `Denied: ${stats.byApproval.denied || 0}`,
        `Total Tools: ${stats.totalTools}`,
        '',
        'By Source:',
        `  User: ${stats.bySource.user || 0}`,
        `  Local: ${stats.bySource.local || 0}`,
        `  Project: ${stats.bySource.project || 0}`,
      ]

      if (stats.connectedServers.length > 0) {
        lines.push('', 'Connected Servers:')
        stats.connectedServers.forEach(s => lines.push(`  - ${s}`))
      }

      if (stats.failedServers.length > 0) {
        lines.push('', 'Failed Servers:')
        stats.failedServers.forEach(s => lines.push(`  - ${s}`))
      }

      vscode.window.showInformationMessage(lines.join('\n'), { modal: true })
    })
  )

  // Open MCP config files
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.mcp.openUserConfig', async () => {
      const home = process.env.HOME || process.env.USERPROFILE || ''
      const doc = await vscode.workspace.openTextDocument(path.join(home, '.claude.json'))
      await vscode.window.showTextDocument(doc)
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.mcp.openProjectConfig', async () => {
      const ws = vscode.workspace.workspaceFolders?.[0]
      if (!ws) {
        vscode.window.showWarningMessage('CCLocal: No workspace folder open')
        return
      }
      const doc = await vscode.workspace.openTextDocument(path.join(ws.uri.fsPath, '.mcp.json'))
      await vscode.window.showTextDocument(doc)
    })
  )
}

// ─── Plugin Commands Registration ──────────────────────────────────────────────

function registerPluginCommands(
  context: vscode.ExtensionContext,
  pluginManager: PluginManager
): void {
  const pluginPanel = new PluginPanelProvider(pluginManager)
  context.subscriptions.push(pluginPanel)

  // Show plugin management panel
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.showPluginSettings', () => {
      pluginPanel.show()
    })
  )

  // Install plugin from marketplace
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.installPlugin', async () => {
      const marketplaces = pluginManager.getMarketplaces()
      if (marketplaces.length === 0) {
        vscode.window.showWarningMessage('CCLocal: No marketplaces configured. Add a marketplace source first.')
        return
      }

      // Flatten all available plugins
      const allPlugins: { id: string; name: string; marketplaceUrl: string }[] = []
      for (const mp of marketplaces) {
        for (const p of mp.plugins || []) {
          allPlugins.push({
            id: p.manifest.id,
            name: `${p.manifest.name} v${p.manifest.version} (${mp.name})`,
            marketplaceUrl: mp.url,
          })
        }
      }

      if (allPlugins.length === 0) {
        vscode.window.showInformationMessage('CCLocal: No plugins available in marketplaces')
        return
      }

      const selected = await vscode.window.showQuickPick(
        allPlugins.map(p => ({ label: p.name, ...p })),
        { placeHolder: 'Select a plugin to install' }
      )

      if (selected) {
        try {
          await pluginManager.install(selected.id, selected.marketplaceUrl)
          vscode.window.showInformationMessage(`CCLocal: Plugin "${selected.id}" installed`)
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to install plugin: ${error}`)
        }
      }
    })
  )

  // Uninstall plugin
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.uninstallPlugin', async () => {
      const plugins = pluginManager.getAllPlugins()
      if (plugins.length === 0) {
        vscode.window.showInformationMessage('CCLocal: No plugins installed')
        return
      }

      const selected = await vscode.window.showQuickPick(
        plugins.map(p => ({
          label: `${p.manifest.name} v${p.manifest.version}`,
          pluginId: p.manifest.id,
        })),
        { placeHolder: 'Select a plugin to uninstall' }
      )

      if (selected) {
        const confirm = await vscode.window.showWarningMessage(
          `Uninstall plugin "${selected.label}"?`,
          'Yes',
          'No'
        )
        if (confirm === 'Yes') {
          await pluginManager.uninstall(selected.pluginId)
          vscode.window.showInformationMessage(`CCLocal: Plugin uninstalled`)
        }
      }
    })
  )

  // Add marketplace
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.addMarketplace', async () => {
      const url = await vscode.window.showInputBox({
        prompt: 'Enter marketplace URL',
        placeHolder: 'https://marketplace.example.com',
      })

      if (url) {
        try {
          await pluginManager.addMarketplace(url)
          vscode.window.showInformationMessage(`CCLocal: Marketplace "${url}" added`)
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to add marketplace: ${error}`)
        }
      }
    })
  )

  // List plugins
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.listPlugins', () => {
      const plugins = pluginManager.getAllPlugins()
      if (plugins.length === 0) {
        vscode.window.showInformationMessage('CCLocal: No plugins installed')
        return
      }

      const lines = plugins.map(p =>
        `  ${p.state === 'active' ? '●' : p.state === 'error' ? '✗' : '○'} ${p.manifest.name} v${p.manifest.version} [${p.state}] (${p.trustLevel})`
      )

      vscode.window.showInformationMessage(
        `Installed Plugins (${plugins.length}):\n${lines.join('\n')}`,
        { modal: true }
      )
    })
  )

  // Plugin stats
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.pluginStats', () => {
      const stats = pluginManager.getStats()
      const lines = [
        `Total Installed: ${stats.totalInstalled}`,
        `Active: ${stats.totalActive}`,
        '',
        'By State:',
        ...Object.entries(stats.byState)
          .filter(([, v]) => v > 0)
          .map(([k, v]) => `  ${k}: ${v}`),
        '',
        'By Trust:',
        ...Object.entries(stats.byTrust)
          .filter(([, v]) => v > 0)
          .map(([k, v]) => `  ${k}: ${v}`),
        '',
        `Marketplaces: ${stats.marketplaces}`,
        `Available: ${stats.availablePlugins}`,
      ]

      vscode.window.showInformationMessage(lines.join('\n'), { modal: true })
    })
  )
}

// ─── Session Commands Registration ──────────────────────────────────────────────

function registerSessionCommands(
  context: vscode.ExtensionContext,
  sessionManager: SessionManager,
  sessionTree: SessionTreeProvider
): void {
  // New session
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.newConversation', async () => {
      await sessionManager.create()
      sessionTree.refresh()
    })
  )

  // Switch session (from tree click)
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.switchSession', async (sessionId: string) => {
      await sessionManager.switchSession(sessionId)
      sessionTree.refresh()
    })
  )

  // Rename session
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.renameSession', async (item: SessionTreeItem) => {
      const newName = await vscode.window.showInputBox({
        prompt: 'Rename session',
        value: item.sessionItem.name,
        placeHolder: 'Enter new name',
      })

      if (newName) {
        await sessionManager.rename(item.sessionItem.id, newName)
        sessionTree.refresh()
      }
    })
  )

  // Delete session
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.deleteSession', async (item: SessionTreeItem) => {
      const confirm = await vscode.window.showWarningMessage(
        `Delete session "${item.sessionItem.name}"?`,
        'Delete',
        'Cancel'
      )

      if (confirm === 'Delete') {
        await sessionManager.delete(item.sessionItem.id)
        sessionTree.refresh()
      }
    })
  )

  // Fork session
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.forkSession', async (item: SessionTreeItem) => {
      const forked = await sessionManager.fork(item.sessionItem.id)
      vscode.window.showInformationMessage(`Forked session: ${forked.name}`)
      sessionTree.refresh()
    })
  )

  // Search sessions
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.searchSessions', async () => {
      const query = await vscode.window.showInputBox({
        prompt: 'Search sessions by name or content',
        placeHolder: 'Type search query...',
      })

      if (query !== undefined) {
        sessionTree.setSearchQuery(query)
      }
    })
  )

  // Clear search
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.clearSessionSearch', () => {
      sessionTree.setSearchQuery('')
    })
  )

  // Auto-generate title
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.generateSessionTitle', async (item: SessionTreeItem) => {
      const title = await sessionManager.generateTitle(item.sessionItem.id)
      if (title) {
        vscode.window.showInformationMessage(`Generated title: ${title}`)
      } else {
        vscode.window.showInformationMessage('No user message found to generate title from')
      }
      sessionTree.refresh()
    })
  )

  // Session stats
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.sessionStats', () => {
      const stats = sessionManager.getStats()
      const lines = [
        `Total Sessions: ${stats.totalSessions}`,
        `Active: ${stats.activeSessionId || 'none'}`,
        `Total Messages: ${stats.totalMessages}`,
        '',
        'By Status:',
        ...Object.entries(stats.byStatus)
          .filter(([, v]) => v > 0)
          .map(([k, v]) => `  ${k}: ${v}`),
      ]

      if (stats.oldestSession) {
        lines.push('', `Oldest: ${new Date(stats.oldestSession).toLocaleString()}`)
      }
      if (stats.newestSession) {
        lines.push(`Newest: ${new Date(stats.newestSession).toLocaleString()}`)
      }

      vscode.window.showInformationMessage(lines.join('\n'), { modal: true })
    })
  )
}
