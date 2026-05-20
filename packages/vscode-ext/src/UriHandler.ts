/**
 * URI Handler — 处理 cclocal:// 深链接
 *
 * 1:1 match with official Claude Code extension's URI handler.
 *
 * 路由:
 *   cclocal://auth/callback?code=xxx&state=xxx           → OAuth 回调
 *   cclocal://mcp/callback?code=xxx&state=xxx&server=yyy → MCP OAuth 回调
 *   cclocal://open?file=xxx&line=xxx                     → 打开文件
 *   cclocal://diff?left=xxx&right=xxx&title=xxx          → 打开 diff
 *   cclocal://focus                                      → 聚焦侧边栏
 *   cclocal://config                                     → 打开配置
 *   cclocal://help                                       → 打开帮助
 *   cclocal://session?id=xxx                             → 恢复会话
 */

import * as vscode from 'vscode'
import * as path from 'path'

export class CclocalUriHandler implements vscode.UriHandler {
  private pendingOAuthCallbacks: Map<string, {
    resolve: (code: string) => void
    reject: (error: Error) => void
    timer: ReturnType<typeof setTimeout>
  }> = new Map()

  /** MCP-specific pending callbacks: serverName → { resolve, reject, timer } */
  private pendingMcpCallbacks: Map<string, {
    resolve: (code: string) => void
    reject: (error: Error) => void
    timer: ReturnType<typeof setTimeout>
  }> = new Map()

  constructor(
    private readonly outputChannel: vscode.LogOutputChannel,
    private readonly opts?: {
      onFocus?: () => void
      onOpenConfig?: () => void
      onOpenHelp?: () => void
      onResumeSession?: (sessionId: string) => void
    }
  ) {}

  async handleUri(uri: vscode.Uri): Promise<void> {
    this.outputChannel.info(`[URI Handler] Received: ${uri.path}?${uri.query}`)

    const uriPath = uri.path.replace(/^\//, '') // normalize: "/auth/callback" → "auth/callback"
    const params = new URLSearchParams(uri.query)
    const code = params.get('code')
    const state = params.get('state')

    // ─── OAuth callback (main auth) ────────────────────────────
    if (uriPath === 'auth/callback') {
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
      return
    }

    // ─── MCP OAuth callback ────────────────────────────────────
    if (uriPath === 'mcp/callback') {
      const serverName = params.get('server') ?? ''
      if (code && serverName) {
        this.outputChannel.info(`[URI Handler] MCP OAuth callback: server=${serverName}`)
        const pending = this.pendingMcpCallbacks.get(serverName)
        if (pending) {
          clearTimeout(pending.timer)
          this.pendingMcpCallbacks.delete(serverName)
          pending.resolve(code)
        } else {
          this.outputChannel.warn(`[URI Handler] No pending MCP callback for server: ${serverName}`)
          vscode.window.showWarningMessage(`Unexpected MCP OAuth callback for "${serverName}".`)
        }
      } else {
        const error = params.get('error')
        this.outputChannel.error(`[URI Handler] MCP OAuth error: ${error}`)
        vscode.window.showErrorMessage(`MCP server authentication failed: ${error || 'Unknown error'}`)
      }
      return
    }

    // ─── Open file ─────────────────────────────────────────────
    if (uriPath === 'open') {
      const filePath = params.get('file')
      const line = params.get('line')
      if (filePath) {
        try {
          const doc = await vscode.workspace.openTextDocument(filePath)
          await vscode.window.showTextDocument(doc, {
            selection: line ? new vscode.Selection(parseInt(line) - 1, 0, parseInt(line) - 1, 0) : undefined,
          })
        } catch (err) {
          vscode.window.showErrorMessage(`Failed to open file: ${filePath}`)
        }
      }
      return
    }

    // ─── Open diff ─────────────────────────────────────────────
    if (uriPath === 'diff') {
      const left = params.get('left')
      const right = params.get('right')
      const title = params.get('title') ?? 'Diff'
      if (left && right) {
        try {
          await vscode.commands.executeCommand('vscode.diff', vscode.Uri.parse(left), vscode.Uri.parse(right), title)
        } catch (err) {
          vscode.window.showErrorMessage(`Failed to open diff: ${err}`)
        }
      }
      return
    }

    // ─── Focus sidebar ────────────────────────────────────────
    if (uriPath === 'focus') {
      this.opts?.onFocus?.()
      void vscode.commands.executeCommand('cclocal.focus')
      return
    }

    // ─── Open config ──────────────────────────────────────────
    if (uriPath === 'config') {
      this.opts?.onOpenConfig?.()
      return
    }

    // ─── Open help ────────────────────────────────────────────
    if (uriPath === 'help') {
      this.opts?.onOpenHelp?.()
      return
    }

    // ─── Resume session ───────────────────────────────────────
    if (uriPath === 'session') {
      const sessionId = params.get('id')
      if (sessionId) {
        this.opts?.onResumeSession?.(sessionId)
      }
      return
    }

    this.outputChannel.warn(`[URI Handler] Unknown path: ${uriPath}`)
  }

  /**
   * Wait for a main OAuth callback with the given state parameter.
   * Returns a Promise that resolves with the authorization code.
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

  /**
   * Wait for an MCP server OAuth callback.
   * Returns a Promise that resolves with the authorization code.
   */
  waitForMcpCallback(serverName: string, timeoutMs = 300000): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingMcpCallbacks.delete(serverName)
        reject(new Error('MCP OAuth callback timed out'))
      }, timeoutMs)

      this.pendingMcpCallbacks.set(serverName, { resolve, reject, timer })
    })
  }

  /** Cancel all pending OAuth callbacks */
  cancelAll(): void {
    for (const [, pending] of this.pendingOAuthCallbacks) {
      clearTimeout(pending.timer)
      pending.reject(new Error('OAuth callback cancelled'))
    }
    this.pendingOAuthCallbacks.clear()

    for (const [, pending] of this.pendingMcpCallbacks) {
      clearTimeout(pending.timer)
      pending.reject(new Error('MCP OAuth callback cancelled'))
    }
    this.pendingMcpCallbacks.clear()
  }

  dispose(): void {
    this.cancelAll()
  }
}
