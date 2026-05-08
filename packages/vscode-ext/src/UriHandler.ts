/**
 * URI Handler — 处理 cclocal:// 深链接
 *
 * 路由:
 *   cclocal://auth/callback?code=xxx&state=xxx  → OAuth 回调
 *   cclocal://open?file=xxx&line=xxx             → 打开文件
 *   cclocal://focus                               → 聚焦侧边栏
 */

import * as vscode from 'vscode'
import * as path from 'path'

export class CclocalUriHandler implements vscode.UriHandler {
  private pendingOAuthCallbacks: Map<string, {
    resolve: (code: string) => void
    reject: (error: Error) => void
    timer: ReturnType<typeof setTimeout>
  }> = new Map()

  constructor(private readonly outputChannel: vscode.LogOutputChannel) {}

  async handleUri(uri: vscode.Uri): Promise<void> {
    this.outputChannel.info(`[URI Handler] Received: ${uri.path}?${uri.query}`)

    const { path: uriPath, query } = uri

    // Parse query params
    const params = new URLSearchParams(query)
    const code = params.get('code')
    const state = params.get('state')

    if (uriPath === '/auth/callback' || uriPath === 'auth/callback') {
      // OAuth callback
      if (code && state) {
        this.outputChannel.info(`[URI Handler] OAuth callback: state=${state}`)
        const pending = this.pendingOAuthCallbacks.get(state)
        if (pending) {
          clearTimeout(pending.timer)
          this.pendingOAuthCallbacks.delete(state)
          pending.resolve(code)
        } else {
          this.outputChannel.warn(`[URI Handler] No pending OAuth callback for state: ${state}`)
          vscode.window.showWarningMessage('Unexpected OAuth callback. Please try logging in again.')
        }
      } else {
        const error = params.get('error')
        const errorDesc = params.get('error_description')
        this.outputChannel.error(`[URI Handler] OAuth error: ${error} - ${errorDesc}`)
        vscode.window.showErrorMessage(`Login failed: ${errorDesc || error || 'Unknown error'}`)
      }
    } else if (uriPath === '/open' || uriPath === 'open') {
      // Open file
      const filePath = params.get('file')
      const line = params.get('line')
      if (filePath) {
        try {
          const doc = await vscode.workspace.openTextDocument(filePath)
          const editor = await vscode.window.showTextDocument(doc, {
            selection: line ? new vscode.Selection(parseInt(line) - 1, 0, parseInt(line) - 1, 0) : undefined,
          })
        } catch (err) {
          vscode.window.showErrorMessage(`Failed to open file: ${filePath}`)
        }
      }
    } else if (uriPath === '/focus' || uriPath === 'focus') {
      // Focus sidebar
      void vscode.commands.executeCommand('cclocal.chat.focus')
    } else {
      this.outputChannel.warn(`[URI Handler] Unknown path: ${uriPath}`)
    }
  }

  /**
   * Wait for an OAuth callback with the given state parameter.
   * Returns a Promise that resolves with the authorization code.
   * Rejects after timeoutMs if no callback is received.
   */
  waitForOAuthCallback(state: string, timeoutMs = 300000): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingOAuthCallbacks.delete(state)
        reject(new Error('OAuth callback timed out'))
      }, timeoutMs)

      this.pendingOAuthCallbacks.set(state, { resolve, reject, timer })
    })
  }

  /** Cancel all pending OAuth callbacks */
  cancelAll(): void {
    for (const [state, pending] of this.pendingOAuthCallbacks) {
      clearTimeout(pending.timer)
      pending.reject(new Error('OAuth callback cancelled'))
    }
    this.pendingOAuthCallbacks.clear()
  }

  dispose(): void {
    this.cancelAll()
  }
}