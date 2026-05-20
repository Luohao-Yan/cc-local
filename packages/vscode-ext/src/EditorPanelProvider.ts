/**
 * EditorPanelProvider — Editor tab panel for conversations.
 *
 * Matches official extension's `claudeVSCodePanel` webview panel.
 * Opens the same React webview in an editor tab (or new window),
 * sharing the same CLI session as the sidebar via message bridging.
 */

import * as crypto from 'crypto'
import * as vscode from 'vscode'
import type { WebviewToExtensionMessage } from './types.js'

export class EditorPanelProvider {
  public static readonly viewType = 'cclocalVSCodePanel'

  private panel: vscode.WebviewPanel | undefined
  private extensionUri: vscode.Uri
  private outputChannel: vscode.LogOutputChannel

  /** Callback to register panel's webview as a broadcast target on the sidebar */
  private onDidCreatePanel?: (webview: vscode.Webview) => void

  constructor(
    extensionUri: vscode.Uri,
    outputChannel: vscode.LogOutputChannel,
  ) {
    this.extensionUri = extensionUri
    this.outputChannel = outputChannel
  }

  /** Set callback that fires when the panel is created, to register its webview for broadcast */
  setOnDidCreatePanel(callback: (webview: vscode.Webview) => void): void {
    this.onDidCreatePanel = callback
  }

  /** Open conversation in an editor tab */
  openInEditorTab(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside)
      return
    }

    this.panel = vscode.window.createWebviewPanel(
      EditorPanelProvider.viewType,
      'CCLocal',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.extensionUri],
      },
    )

    this.panel.iconPath = vscode.Uri.joinPath(this.extensionUri, 'images', 'icon.png')
    this.panel.webview.html = this.getWebviewHtml(this.panel.webview)

    // Register this panel's webview as a broadcast target on the sidebar
    this.onDidCreatePanel?.(this.panel.webview)

    // Route messages from editor panel back to the sidebar provider
    this.panel.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => {
        this.outputChannel.debug(`[EditorPanel] received webview message: ${message.type}`)
      },
    )

    this.panel.onDidDispose(() => {
      this.panel = undefined
    })
  }

  /** Open conversation in a new window */
  openInNewWindow(): void {
    this.openInEditorTab()
    if (this.panel) {
      void vscode.commands.executeCommand('workbench.action.moveEditorToNewWindow')
    }
  }

  /** Forward a message from sidebar → editor panel webview */
  sendToWebview(message: any): void {
    this.panel?.webview.postMessage(message)
  }

  /** Get the panel's webview if available */
  getWebview(): vscode.Webview | undefined {
    return this.panel?.webview
  }

  /** Restore panel state from serialized data (called by WebviewPanelSerializer) */
  restorePanel(state: unknown): void {
    // The panel is re-created via openInEditorTab() — state is kept via retainContextWhenHidden
    this.outputChannel.debug('[EditorPanel] Restoring panel state')
  }

  // ─── Internal ────────────────────────────────────────────────────────────

  private getWebviewHtml(webview: vscode.Webview): string {
    const nonce = crypto.randomBytes(16).toString('base64')

    const webviewDistUri = (fileName: string) =>
      webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'webview-dist', fileName))

    const scriptUri = webviewDistUri('index.js')
    const styleUri = webviewDistUri('index.css')

    return /* html */ `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
            style-src 'nonce-${nonce}' https:;
            script-src 'nonce-${nonce}';
            img-src 'self' data: https:;
            font-src 'self' https:;" />
  <link rel="stylesheet" type="text/css" href="${styleUri}" nonce="${nonce}">
  <title>CCLocal</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`
  }
}

/**
 * Serializer that persists and restores the editor panel across VS Code restarts.
 * Registered via `vscode.window.registerWebviewPanelSerializer`.
 */
export class EditorPanelSerializer implements vscode.WebviewPanelSerializer {
  private extensionUri: vscode.Uri
  private outputChannel: vscode.LogOutputChannel
  private onDidRestore?: (webview: vscode.Webview) => void

  constructor(
    extensionUri: vscode.Uri,
    outputChannel: vscode.LogOutputChannel,
    onDidRestore?: (webview: vscode.Webview) => void,
  ) {
    this.extensionUri = extensionUri
    this.outputChannel = outputChannel
    this.onDidRestore = onDidRestore
  }

  async deserializeWebviewPanel(
    panel: vscode.WebviewPanel,
    _state: unknown,
  ): Promise<void> {
    this.outputChannel.debug('[EditorPanelSerializer] Restoring panel')

    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    }

    const nonce = crypto.randomBytes(16).toString('base64')
    const webviewDistUri = (fileName: string) =>
      panel.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'webview-dist', fileName))

    const scriptUri = webviewDistUri('index.js')
    const styleUri = webviewDistUri('index.css')

    panel.webview.html = /* html */ `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
            style-src 'nonce-${nonce}' https:;
            script-src 'nonce-${nonce}';
            img-src 'self' data: https:;
            font-src 'self' https:;" />
  <link rel="stylesheet" type="text/css" href="${styleUri}" nonce="${nonce}">
  <title>CCLocal</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`

    // Notify parent that panel was restored — register webview as broadcast target
    this.onDidRestore?.(panel.webview)

    panel.iconPath = vscode.Uri.joinPath(this.extensionUri, 'images', 'icon.png')
  }
}
