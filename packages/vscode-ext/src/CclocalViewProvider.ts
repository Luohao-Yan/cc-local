/**
 * CCLocal View Provider
 * Coordinates webview communication with all backend components
 */

import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
  ExtensionConfig,
  ChatMessage,
  PermissionResponse,
} from '@cclocal/shared'
import { ConfigurationManager } from './ConfigurationManager.js'
import { PermissionManager } from './PermissionManager.js'
import { SessionStorage } from './SessionStorage.js'
import { DiffViewManager } from './VirtualFileSystemProvider.js'
import { CliViewProvider } from './CliViewProvider.js'

export class CclocalViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'cclocal.chatView'

  private view?: vscode.WebviewView
  private config: ConfigurationManager
  private permissionManager: PermissionManager
  private sessionStorage: SessionStorage
  private diffManager: DiffViewManager
  private outputChannel: vscode.LogOutputChannel
  private cliProvider?: CliViewProvider

  private currentSessionId: string | null = null
  private messages: ChatMessage[] = []
  private isInitialized = false

  constructor(
    private readonly extensionUri: vscode.Uri,
    config: ConfigurationManager,
    permissionManager: PermissionManager,
    sessionStorage: SessionStorage,
    diffManager: DiffViewManager,
    outputChannel: vscode.LogOutputChannel,
    cliProvider?: CliViewProvider
  ) {
    this.config = config
    this.permissionManager = permissionManager
    this.sessionStorage = sessionStorage
    this.diffManager = diffManager
    this.outputChannel = outputChannel
    this.cliProvider = cliProvider

    // Generate session ID
    this.currentSessionId = sessionStorage.generateSessionId()
  }

  // ─── WebviewViewProvider ─────────────────────────────────────────────────────

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    }

    webviewView.webview.html = this.getWebviewContent(webviewView.webview)

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage((message: WebviewToExtensionMessage) => {
      this.handleWebviewMessage(message)
    })

    this.isInitialized = true
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  sendToWebview(message: ExtensionToWebviewMessage): void {
    if (this.view) {
      this.view.webview.postMessage(message)
    }
  }

  updateConfig(config: ExtensionConfig): void {
    this.sendToWebview({ type: 'configChanged', config })
  }

  focusInput(): void {
    // Webview handles focus internally
    this.sendToWebview({ type: 'statusChange', status: 'connected' })
  }

  // ─── Message Handling ────────────────────────────────────────────────────────

  private async handleWebviewMessage(message: WebviewToExtensionMessage): Promise<void> {
    switch (message.type) {
      case 'ready':
        await this.handleReady()
        break

      case 'sendMessage':
        await this.handleSendMessage(message.text)
        break

      case 'stopGeneration':
        this.handleStopGeneration()
        break

      case 'newSession':
        await this.handleNewSession()
        break

      case 'clearChat':
        this.handleClearChat()
        break

      case 'restoreSession':
        await this.handleRestoreSession(message.sessionId)
        break

      case 'permissionResponse':
        this.handlePermissionResponse(message.requestId, message.response)
        break

      case 'diffDecision':
        await this.handleDiffDecision(message.diffId, message.accepted)
        break

      case 'openSettings':
        await vscode.commands.executeCommand('workbench.action.openSettings', 'cclocal')
        break

      case 'insertAtMention':
        await vscode.commands.executeCommand('cclocal.insertAtMention')
        break

      case 'getSelection':
        await vscode.commands.executeCommand('cclocal.sendSelectedCode')
        break

      case 'toggleDictation':
        await vscode.commands.executeCommand('cclocal.toggleDictation')
        break

      default:
        this.outputChannel.warn(`Unknown message type: ${(message as { type: string }).type}`)
    }
  }

  private async handleReady(): Promise<void> {
    // Send current session ID
    this.sendToWebview({
      type: 'sessionId',
      sessionId: this.currentSessionId || '',
    })

    // Send current status
    this.sendToWebview({
      type: 'statusChange',
      status: 'connected',
    })

    // Try to restore recent session
    const recentSession = await this.sessionStorage.getRecentSession()
    if (recentSession && recentSession.messages.length > 0) {
      this.messages = recentSession.messages
      this.sendToWebview({
        type: 'restoreSession',
        sessionId: recentSession.id,
        messages: recentSession.messages,
      })
    }
  }

  private async handleSendMessage(text: string): Promise<void> {
    if (!text.trim()) return

    this.sendToWebview({ type: 'statusChange', status: 'running' })

    // If we have a CLI provider, delegate to it
    if (this.cliProvider) {
      this.cliProvider.sendMessage(text)
      return
    }

    // Otherwise, handle through MCP or other means
    // This is a placeholder - actual implementation would communicate with CLI
    this.outputChannel.info(`Message sent: ${text.slice(0, 50)}...`)
  }

  private handleStopGeneration(): void {
    if (this.cliProvider) {
      this.cliProvider.handleCommand('stopGeneration')
    }

    this.sendToWebview({ type: 'statusChange', status: 'idle' })
  }

  private async handleNewSession(): Promise<void> {
    // Save current session if there are messages
    if (this.messages.length > 0 && this.currentSessionId) {
      await this.sessionStorage.saveSession(this.currentSessionId, this.messages)
    }

    // Create new session
    this.currentSessionId = this.sessionStorage.generateSessionId()
    this.messages = []

    this.sendToWebview({ type: 'sessionId', sessionId: this.currentSessionId })
    this.sendToWebview({ type: 'sessionCleared' })

    if (this.cliProvider) {
      this.cliProvider.handleCommand('newSession')
    }
  }

  private handleClearChat(): void {
    this.messages = []
    this.sendToWebview({ type: 'sessionCleared' })

    if (this.cliProvider) {
      this.cliProvider.handleCommand('clearChat')
    }
  }

  private async handleRestoreSession(sessionId: string): Promise<void> {
    const messages = await this.sessionStorage.loadSession(sessionId)
    if (messages) {
      this.currentSessionId = sessionId
      this.messages = messages
      this.sendToWebview({
        type: 'restoreSession',
        sessionId,
        messages,
      })
    }
  }

  private handlePermissionResponse(requestId: string, response: PermissionResponse): void {
    this.permissionManager.handlePermissionResponse(requestId, response.behavior, response.always)
  }

  private async handleDiffDecision(diffId: string, accepted: boolean): Promise<void> {
    if (accepted) {
      await this.diffManager.acceptDiff()
    } else {
      await this.diffManager.rejectDiff()
    }
  }

  // ─── Webview Content ─────────────────────────────────────────────────────────

  private getWebviewContent(webview: vscode.Webview): string {
    // Get the path to the built webview files
    const webviewDistPath = path.join(this.extensionUri.fsPath, 'webview-dist')

    // Check if webview is built
    const indexJsPath = path.join(webviewDistPath, 'index.js')
    const indexCssPath = path.join(webviewDistPath, 'index.css')

    if (fs.existsSync(indexJsPath)) {
      return this.getBuiltWebviewContent(webview, indexJsPath, indexCssPath)
    }

    // Fallback to inline HTML for development
    return this.getInlineWebviewContent(webview)
  }

  private getBuiltWebviewContent(
    webview: vscode.Webview,
    jsPath: string,
    cssPath: string
  ): string {
    const jsUri = webview.asWebviewUri(vscode.Uri.file(jsPath))
    const cssUri = webview.asWebviewUri(vscode.Uri.file(cssPath))

    return /* html */ `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https: data:; connect-src ${webview.cspSource} ws: wss:;" />
  <link href="${cssUri}" rel="stylesheet" />
  <title>CCLocal</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${jsUri}"></script>
</body>
</html>`
  }

  private getInlineWebviewContent(webview: vscode.Webview): string {
    // Development fallback - minimal HTML
    return /* html */ `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
  <title>CCLocal</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; width: 100%; }
    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-foreground, #cccccc);
      background: var(--vscode-editor-background, #1e1e1e);
      display: flex;
      flex-direction: column;
    }
    .loading {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 16px;
    }
    .loading h2 { color: var(--vscode-foreground); }
    .loading p { color: var(--vscode-descriptionForeground, #8c8c8c); }
  </style>
</head>
<body>
  <div id="root">
    <div class="loading">
      <h2>CCLocal</h2>
      <p>Loading webview... (Run 'npm run build:webview' in packages/vscode-ext/webview)</p>
    </div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`
  }
}
