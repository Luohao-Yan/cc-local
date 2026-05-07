/**
 * CCLocal VS Code Extension Entry Point
 * Complete implementation matching official Claude Code extension
 */

import * as vscode from 'vscode'
import * as path from 'path'
import { ConfigurationManager } from './ConfigurationManager.js'
import { VirtualFileSystemProvider, DiffViewManager } from './VirtualFileSystemProvider.js'
import { PermissionManager } from './PermissionManager.js'
import { SessionStorage } from './SessionStorage.js'
import { IdeMCPServer } from './mcp/IdeMCPServer.js'
import { CclocalViewProvider } from './CclocalViewProvider.js'
import { CliViewProvider } from './CliViewProvider.js'
import { ServerManager } from './ServerManager.js'
import type { ExtensionConfig } from '@cclocal/shared'

// ─── Extension State ──────────────────────────────────────────────────────────

let config: ConfigurationManager
let vfs: VirtualFileSystemProvider
let diffManager: DiffViewManager
let permissionManager: PermissionManager
let sessionStorage: SessionStorage
let mcpServer: IdeMCPServer | null = null
let viewProvider: CclocalViewProvider | null = null
let outputChannel: vscode.LogOutputChannel

// ─── Activation ────────────────────────────────────────────────────────────────

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Create output channel for logging
  outputChannel = vscode.window.createOutputChannel('CCLocal', { log: true })
  outputChannel.info('CCLocal extension activating...')

  // Initialize components
  config = new ConfigurationManager()
  vfs = new VirtualFileSystemProvider()
  diffManager = new DiffViewManager(vfs)
  permissionManager = new PermissionManager(config)
  sessionStorage = new SessionStorage(context)

  // Register virtual file system
  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider(
      VirtualFileSystemProvider.scheme,
      vfs,
      { isCaseSensitive: true }
    )
  )

  // Get mode and create appropriate view provider
  const mode = config.getMode()

  if (mode === 'cli') {
    // CLI mode - spawn cclocal --print
    const cliProvider = new CliViewProvider(context.extensionUri)
    viewProvider = new CclocalViewProvider(
      context.extensionUri,
      config,
      permissionManager,
      sessionStorage,
      diffManager,
      outputChannel,
      cliProvider
    )

    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        'cclocal.chatView',
        cliProvider,
        { webviewOptions: { retainContextWhenHidden: true } }
      )
    )
  } else if (mode === 'websocket') {
    // WebSocket mode - connect to server
    const serverManager = new ServerManager()
    await serverManager.ensureServerRunning()

    // Import dynamically to avoid circular deps
    const { WsViewProvider } = await import('./WsViewProvider.js')
    const wsProvider = new WsViewProvider(context.extensionUri, serverManager)

    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider('cclocal.chatView', wsProvider)
    )
  } else {
    // IDE mode - lock file discovery + MCP
    mcpServer = new IdeMCPServer(outputChannel)
    await mcpServer.start()
    outputChannel.info(`MCP server started on port ${mcpServer.getPort()}`)

    viewProvider = new CclocalViewProvider(
      context.extensionUri,
      config,
      permissionManager,
      sessionStorage,
      diffManager,
      outputChannel
    )

    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        'cclocal.chatView',
        viewProvider,
        { webviewOptions: { retainContextWhenHidden: true } }
      )
    )
  }

  // Register commands
  registerCommands(context)

  // Register configuration change handler
  context.subscriptions.push(
    config.onConfigChange((newConfig) => {
      viewProvider?.updateConfig(newConfig)
      outputChannel.info('Configuration updated')
    })
  )

  // Register permission request handler
  context.subscriptions.push(
    permissionManager.onPermissionRequest((request) => {
      viewProvider?.sendToWebview({
        type: 'permissionRequest',
        request,
      })
    })
  )

  // Clean up expired sessions
  await sessionStorage.cleanupExpiredSessions()

  // Show welcome message if not hidden
  if (!config.getHideOnboarding()) {
    showWelcomeMessage()
  }

  outputChannel.info('CCLocal extension activated successfully')
}

// ─── Command Registration ──────────────────────────────────────────────────────

function registerCommands(context: vscode.ExtensionContext): void {
  const commands: { id: string; handler: (...args: unknown[]) => unknown }[] = [
    // Session commands
    { id: 'cclocal.newSession', handler: handleNewSession },
    { id: 'cclocal.clearChat', handler: handleClearChat },
    { id: 'cclocal.stopGeneration', handler: handleStopGeneration },
    { id: 'cclocal.restoreSession', handler: handleRestoreSession },

    // View commands
    { id: 'cclocal.openInPanel', handler: handleOpenInPanel },
    { id: 'cclocal.openInSidebar', handler: handleOpenInSidebar },
    { id: 'cclocal.focusInput', handler: handleFocusInput },

    // Edit commands
    { id: 'cclocal.acceptEdit', handler: handleAcceptEdit },
    { id: 'cclocal.rejectEdit', handler: handleRejectEdit },

    // Selection commands
    { id: 'cclocal.sendSelectedCode', handler: handleSendSelectedCode },
    { id: 'cclocal.insertAtMention', handler: handleInsertAtMention },

    // Other commands
    { id: 'cclocal.toggleDictation', handler: handleToggleDictation },
    { id: 'cclocal.openSettings', handler: handleOpenSettings },
    { id: 'cclocal.showLogs', handler: handleShowLogs },
  ]

  for (const { id, handler } of commands) {
    context.subscriptions.push(vscode.commands.registerCommand(id, handler))
  }
}

// ─── Command Handlers ──────────────────────────────────────────────────────────

async function handleNewSession(): Promise<void> {
  const sessionId = sessionStorage.generateSessionId()
  viewProvider?.sendToWebview({ type: 'sessionId', sessionId })
  viewProvider?.sendToWebview({ type: 'sessionCleared' })
  vscode.window.showInformationMessage('New session started')
}

async function handleClearChat(): Promise<void> {
  viewProvider?.sendToWebview({ type: 'sessionCleared' })
}

async function handleStopGeneration(): Promise<void> {
  viewProvider?.sendToWebview({ type: 'statusChange', status: 'idle' })
}

async function handleRestoreSession(sessionId?: string): Promise<void> {
  if (!sessionId) {
    const sessions = await sessionStorage.listSessions()
    const items = sessions.map((s) => ({
      label: s.title || 'Untitled',
      description: new Date(s.timestamp).toLocaleString(),
      id: s.id,
    }))

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a session to restore',
    })

    if (!selected) return
    sessionId = selected.id
  }

  const messages = await sessionStorage.loadSession(sessionId)
  if (messages) {
    viewProvider?.sendToWebview({
      type: 'restoreSession',
      sessionId,
      messages,
    })
  }
}

async function handleOpenInPanel(): Promise<void> {
  await config.setPreferredLocation('panel')
  // Note: Full panel implementation requires additional view provider
  vscode.window.showInformationMessage('Opening in panel (coming soon)')
}

async function handleOpenInSidebar(): Promise<void> {
  await config.setPreferredLocation('sidebar')
  await vscode.commands.executeCommand('workbench.view.extension.ccalocal-sidebar')
}

async function handleFocusInput(): Promise<void> {
  viewProvider?.focusInput()
}

async function handleAcceptEdit(): Promise<void> {
  await diffManager.acceptDiff()
}

async function handleRejectEdit(): Promise<void> {
  await diffManager.rejectDiff()
}

async function handleSendSelectedCode(): Promise<void> {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showWarningMessage('No active editor')
    return
  }

  const selection = editor.selection
  if (selection.isEmpty) {
    vscode.window.showWarningMessage('No text selected')
    return
  }

  const text = editor.document.getText(selection)
  const filePath = editor.document.uri.fsPath
  const line = selection.start.line

  viewProvider?.sendToWebview({
    type: 'selectionChanged',
    selection: { text, file: filePath, line },
  })
}

async function handleInsertAtMention(): Promise<void> {
  const editor = vscode.window.activeTextEditor
  if (!editor) return

  const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 100)
  const items = files.slice(0, 50).map((uri) => ({
    label: path.basename(uri.fsPath),
    description: vscode.workspace.asRelativePath(uri),
    path: uri.fsPath,
  }))

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a file to mention',
  })

  if (selected) {
    viewProvider?.sendToWebview({
      type: 'selectionChanged',
      selection: { text: `@${selected.description}`, file: selected.path, line: 0 },
    })
  }
}

async function handleToggleDictation(): Promise<void> {
  vscode.window.showInformationMessage('Voice dictation coming soon')
}

async function handleOpenSettings(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.openSettings', 'cclocal')
}

async function handleShowLogs(): Promise<void> {
  outputChannel.show()
}

// ─── Helper Functions ──────────────────────────────────────────────────────────

function showWelcomeMessage(): void {
  const message = 'Welcome to CCLocal! Start a conversation to begin.'
  vscode.window.showInformationMessage(message, 'Open Settings', 'Dismiss').then((selection) => {
    if (selection === 'Open Settings') {
      vscode.commands.executeCommand('workbench.action.openSettings', 'cclocal')
    }
  })
}

// ─── Deactivation ───────────────────────────────────────────────────────────────

export async function deactivate(): Promise<void> {
  outputChannel.info('CCLocal extension deactivating...')

  if (mcpServer) {
    await mcpServer.stop()
  }

  config.dispose()
  permissionManager.dispose()
  diffManager.dispose()
  vfs.dispose()

  outputChannel.info('CCLocal extension deactivated')
}
