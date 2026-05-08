/**
 * IdeViewProvider — 官方模式的 VS Code 扩展视图提供者。
 *
 * 工作原理（与官方 Claude Code 扩展 1:1 一致）：
 *  1. 扩展激活时启动 IdeServer（WebSocket 服务器）。
 *  2. 扩展 spawn cclocal --ide 进程。
 *  3. cclocal 发现 lock 文件后连接到扩展的 WebSocket 服务器。
 *  4. 用户消息通过 WebSocket 发送给 cclocal，响应以 stream-json 格式流式返回。
 *  5. 所有消息通过 postMessage 在 extension ↔ webview 之间桥接。
 */

import * as crypto from 'crypto'
import * as path from 'path'
import * as vscode from 'vscode'
import * as os from 'os'
import { IdeServer } from './IdeServer.js'
import { CliProcess } from './CliProcess.js'
import type { DiffManager } from './ClaudeFS.js'
import type {
  CliStreamMessage,
  CliAssistantMessage,
  CliContentBlockStartMessage,
  CliContentBlockDeltaMessage,
  CliContentBlockStopMessage,
  CliResultMessage,
  CliControlRequestMessage,
  CliProposedDiffMessage,
  CliUsageUpdateMessage,
  CliSessionStatesUpdateMessage,
  CliInitMessage,
  CliToolUseMessage,
  CliToolResultMessage,
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
  CclocalStatus,
} from './types.js'

/** 当前会话 ID（CLI init 消息中获取） */
let currentSessionId = ''

export class IdeViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'cclocal.chatView'

  private view?: vscode.WebviewView
  private ideServer: IdeServer
  private cliProcess: CliProcess
  private outputChannel: vscode.LogOutputChannel
  private resolveCallbacks: Array<(view: vscode.WebviewView) => void> = []

  /** Additional webview targets to broadcast to (e.g. editor panel) */
  private broadcastTargets: Array<{ postMessage: (msg: any) => Thenable<boolean> }> = []

  /** 当前助手消息 ID（用于增量追加） */
  private currentAssistantMessageId = ''
  /** 当前活跃的内容块索引（流式） */
  private currentContentBlockIndex = -1
  /** 内容块文本缓冲（流式 delta 合并后发送） */
  private blockTextBuffer = ''
  private blockBufferTimer: ReturnType<typeof setTimeout> | null = null
  private readonly BUFFER_FLUSH_MS = 30 // 30ms 批量刷新，减少 webview 刷新频率

  constructor(
    private readonly extensionUri: vscode.Uri,
    outputChannel: vscode.LogOutputChannel,
    private readonly diffManager: DiffManager,
  ) {
    this.outputChannel = outputChannel

    // 初始化 IdeServer
    const workspaceFolders = vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath) ?? []
    this.ideServer = new IdeServer(workspaceFolders, {
      onClientConnected: () => this.handleClientConnected(),
      onClientDisconnected: () => this.handleClientDisconnected(),
      onMessage: (line) => this.handleStreamMessage(line),
      onError: (err) => {
        this.outputChannel.error(`IdeServer error: ${err.message}`)
        this.sendToWebview({ type: 'error', message: `连接错误: ${err.message}` })
      },
    })

    // 初始化 CliProcess（延迟到 start() 才 spawn）
    const config = vscode.workspace.getConfiguration('cclocal')
    const cclocalPath = config.get<string>('cclocalPath') || 'cclocal'

    this.cliProcess = new CliProcess({
      cclocalPath,
      cwd: workspaceFolders[0] ?? os.homedir(),
      idePort: 0, // 稍后在 start() 中更新
      callbacks: {
        onLog: (line) => this.outputChannel.debug(line),
        onUnexpectedExit: (code, _signal) => this.handleUnexpectedExit(code),
      },
    })
  }

  /** 启动服务（在扩展激活时调用） */
  async start(): Promise<void> {
    try {
      await this.ideServer.start()
      this.outputChannel.info(`IdeServer started on port ${this.ideServer.getPort()}`)

      // 更新 CliProcess 的端口号
      ;(this.cliProcess as any).idePort = this.ideServer.getPort()

      // 启动 CLI 进程
      this.cliProcess.start()

      this.sendToWebview({ type: 'statusChange', status: 'connecting' })
    } catch (error) {
      this.outputChannel.error(`Failed to start: ${error}`)
      this.sendToWebview({
        type: 'error',
        message: `启动失败: ${error}`,
      })
    }
  }

  /** Register extension-level listeners (call from extension.ts) */
  registerListeners(context: vscode.ExtensionContext): void {
    // Track when diff editor tabs close to clean up context
    context.subscriptions.push(
      vscode.window.tabGroups.onDidChangeTabs((e) => {
        for (const closed of e.closed) {
          if (closed && 'input' in closed) {
            const input = closed.input as any
            // Check if it was a diff editor for our virtual FS
            if (input?.original?.scheme === '_claude_fs_left' ||
                input?.modified?.scheme === '_claude_fs_right') {
              // Check if any pending diffs remain
              const remaining = this.diffManager.getPendingDiffs()
              if (remaining.length === 0) {
                void vscode.commands.executeCommand('setContext', 'cclocal.viewingProposedDiff', false)
              }
            }
          }
        }
      }),
    )

    // Track active diff editor for Accept/Reject context
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (!editor) return
        const uri = editor.document.uri
        if (uri.scheme === '_claude_fs_right' || uri.scheme === '_claude_fs_left') {
          void vscode.commands.executeCommand('setContext', 'cclocal.viewingProposedDiff', true)
        }
      }),
    )
  }

  /** 停止服务（在扩展停用时调用） */
  async stop(): Promise<void> {
    this.cliProcess.stop()
    await this.ideServer.stop()
  }

  /** 外部发送消息（供其他模块调用） */
  sendMessage(text: string): void {
    if (!this.ideServer.isClientConnected()) {
      this.sendToWebview({ type: 'error', message: 'CLI 未连接，请稍候重试' })
      return
    }

    const messageId = this.generateId()
    this.sendToWebview({
      type: 'from-extension',
      message: { type: 'system', subtype: 'info', message: text },
    })
    this.ideServer.sendUserMessage(text, currentSessionId)
    this.sendToWebview({ type: 'statusChange', status: 'running' })
  }

  /** 处理命令（供 extension.ts 调用） */
  handleCommand(command: 'newSession' | 'clearChat' | 'stopGeneration'): void {
    switch (command) {
      case 'newSession':
        currentSessionId = ''
        this.cliProcess.resetRestartCount()
        this.sendToWebview({ type: 'sessionCleared' })
        break
      case 'clearChat':
        this.sendToWebview({ type: 'sessionCleared' })
        break
      case 'stopGeneration':
        this.ideServer.sendInterrupt()
        this.sendToWebview({ type: 'statusChange', status: 'stopped' })
        break
    }
  }

  // ─── WebviewViewProvider 接口 ────────────────────────────────────────────────

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView

    // Notify anyone waiting for the view to resolve
    for (const cb of this.resolveCallbacks) cb(webviewView)
    this.resolveCallbacks = []

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    }

    webviewView.webview.html = this.getWebviewHtml(webviewView.webview)

    webviewView.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => this.handleWebviewMessage(message),
    )
  }

  // ─── Webview 消息处理 ────────────────────────────────────────────────────

  private handleWebviewMessage(message: WebviewToExtensionMessage): void {
    switch (message.type) {
      case 'ready':
        // Webview 初始化完成，发送当前状态
        this.sendToWebview({
          type: 'statusChange',
          status: this.ideServer.isClientConnected() ? 'connected' : 'connecting',
        })
        // Check if onboarding should be shown
        const hideOnboarding = vscode.workspace.getConfiguration('cclocal').get<boolean>('hideOnboarding')
        if (!hideOnboarding) {
          this.sendToWebview({ type: 'showOnboarding' })
        }
        break

      case 'submit':
        this.sendMessage(message.text)
        break

      case 'stopGeneration':
        this.handleCommand('stopGeneration')
        break

      case 'newSession':
        this.handleCommand('newSession')
        break

      case 'clearChat':
        this.handleCommand('clearChat')
        break

      case 'permissionResponse':
        this.ideServer.sendPermissionResponse(
          message.requestId,
          message.approved,
          message.always,
        )
        break

      case 'configChange':
        this.ideServer.sendConfigUpdate(message.config)
        break

      case 'openFile':
        this.openFile(message.path, message.line)
        break

      case 'openDiff':
        this.openDiffViewer(message.filePath)
        break

      case 'acceptDiff':
        this.acceptDiff(message.filePath, message.toolUseId)
        break

      case 'rejectDiff':
        this.rejectDiff(message.filePath, message.toolUseId)
        break

      case 'copyToClipboard':
        vscode.env.clipboard.writeText(message.text)
        break

      case 'insertAtMention':
        // 将文件路径插入到编辑器（通过 webview 处理）
        this.sendToWebview({ type: 'insertAtMention' as any, filePath: message.filePath } as any)
        break

      case 'feedback':
        this.outputChannel.info(
          `Feedback: rating=${message.rating} comment=${message.comment ?? 'none'}`,
        )
        break

      case 'dismissOnboarding':
        void vscode.workspace.getConfiguration('cclocal').update('hideOnboarding', true, vscode.ConfigurationTarget.Global)
        break
    }
  }

  // ─── CLI 消息处理（核心路由） ──────────────────────────────────────────────

  /**
   * 处理来自 CLI 的 stream-json 消息。
   * 每行一个 JSON 对象，按 type 字段路由到对应处理函数。
   */
  private handleStreamMessage(line: string): void {
    try {
      const msg = JSON.parse(line) as CliStreamMessage

      switch (msg.type) {
        case 'init':
          this.handleInit(msg)
          break

        case 'assistant':
          this.handleAssistantMessage(msg)
          break

        case 'content_block_start':
          this.handleContentBlockStart(msg)
          break

        case 'content_block_delta':
          this.handleContentBlockDelta(msg)
          break

        case 'content_block_stop':
          this.handleContentBlockStop(msg)
          break

        case 'result':
          this.handleResult(msg)
          break

        case 'control_request':
          this.handleControlRequest(msg)
          break

        case 'error':
          this.handleError(msg)
          break

        case 'system':
          this.handleSystemMessage(msg)
          break

        case 'proposed_diff':
          this.handleDiff(msg as CliProposedDiffMessage)
          break

        case 'usage_update':
          this.handleCost(msg as CliUsageUpdateMessage)
          break

        case 'session_states_update':
          this.handleSessionUpdate(msg as CliSessionStatesUpdateMessage)
          break

        default:
          this.outputChannel.debug(`Unknown message type: ${(msg as any).type}`)
      }
    } catch (error) {
      this.outputChannel.error(`Failed to parse stream message: ${line}`)
    }
  }

  /** init — CLI 连接初始化 */
  private handleInit(msg: CliInitMessage): void {
    currentSessionId = msg.session_id ?? ''
    this.cliProcess.resetRestartCount()

    this.sendToWebview({
      type: 'cliConnected',
      version: msg.version,
      model: msg.model,
    })

    this.outputChannel.info(
      `CLI initialized: session=${currentSessionId} version=${msg.version} model=${msg.model}`,
    )
  }

  /** assistant — 完整的助手消息（非流式回退） */
  private handleAssistantMessage(msg: CliAssistantMessage): void {
    const messageId = msg.message?.id ?? this.generateId()
    this.currentAssistantMessageId = messageId

    // 直接将完整内容发送给 webview
    const content = msg.message?.content ?? []
    let fullText = ''
    const blocks: Array<{ type: string; name?: string; input?: unknown; text?: string; thinking?: string }> = []

    for (const block of content) {
      if (block.type === 'text' && block.text) {
        fullText += block.text
        blocks.push({ type: 'text', text: block.text })
      } else if (block.type === 'tool_use') {
        blocks.push({ type: 'tool_use', name: block.name, input: block.input })
      } else if (block.type === 'thinking') {
        blocks.push({ type: 'thinking', thinking: (block as any).thinking ?? '' })
      }
    }

    if (fullText) {
      this.sendToWebview({
        type: 'from-extension',
        message: {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: fullText },
          session_id: currentSessionId,
          message_id: messageId,
        },
      })
    }

    // 发送工具调用
    for (const block of blocks) {
      if (block.type === 'tool_use') {
        this.sendToWebview({
          type: 'from-extension',
          message: {
            type: 'tool_use',
            id: (content.find(c => c.type === 'tool_use' && c.name === block.name) as any)?.id ?? '',
            name: block.name ?? 'unknown',
            input: block.input,
            session_id: currentSessionId,
            message_id: messageId,
          },
        })
      } else if (block.type === 'thinking') {
        // thinkingStart/End have no direct equivalent; send content_block_delta with thinking_delta
        this.sendToWebview({
          type: 'from-extension',
          message: {
            type: 'content_block_delta',
            index: -1,
            delta: { type: 'thinking_delta', thinking: block.thinking ?? '' },
            session_id: currentSessionId,
            message_id: messageId,
          },
        })
      }
    }

    this.sendToWebview({
      type: 'from-extension',
      message: {
        type: 'result',
        subtype: 'success',
        session_id: currentSessionId,
      },
    })
  }

  /** content_block_start — 流式内容块开始 */
  private handleContentBlockStart(msg: CliContentBlockStartMessage): void {
    this.currentContentBlockIndex = msg.index

    if (!this.currentAssistantMessageId) {
      this.currentAssistantMessageId = msg.message_id ?? this.generateId()
    }

    const block = msg.content_block

    if (block.type === 'text') {
      // 开始文本块
      this.blockTextBuffer = ''
      this.sendToWebview({
        type: 'from-extension',
        message: {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: '' },
          session_id: currentSessionId,
          message_id: this.currentAssistantMessageId,
        },
      })
    } else if (block.type === 'tool_use') {
      // 工具调用开始
      this.sendToWebview({
        type: 'from-extension',
        message: {
          type: 'tool_use',
          id: block.id ?? '',
          name: block.name ?? 'unknown',
          input: block.input,
          session_id: currentSessionId,
          message_id: this.currentAssistantMessageId,
        },
      })
    } else if (block.type === 'thinking') {
      // 思考块开始 — no thinkingStart equivalent, just start buffering
      this.blockTextBuffer = ''
    }
  }

  /** content_block_delta — 流式增量 */
  private handleContentBlockDelta(msg: CliContentBlockDeltaMessage): void {
    const delta = msg.delta

    if (delta.type === 'text_delta') {
      // 文本增量：缓冲后批量发送
      this.blockTextBuffer += delta.text

      if (!this.blockBufferTimer) {
        this.blockBufferTimer = setTimeout(() => {
          this.flushTextBuffer()
        }, this.BUFFER_FLUSH_MS)
      }
    } else if (delta.type === 'thinking_delta') {
      // 思考增量
      this.sendToWebview({
        type: 'from-extension',
        message: {
          type: 'content_block_delta',
          index: -1,
          delta: { type: 'thinking_delta', thinking: (delta as any).thinking ?? '' },
          session_id: currentSessionId,
          message_id: this.currentAssistantMessageId,
        },
      })
    } else if (delta.type === 'input_json_delta') {
      // 工具输入增量（忽略，等完整 tool_result 时发送）
    }
  }

  /** content_block_stop — 流式内容块结束 */
  private handleContentBlockStop(msg: CliContentBlockStopMessage): void {
    // 刷新缓冲
    this.flushTextBuffer()

    if (msg.index === this.currentContentBlockIndex) {
      // 检查是否是 thinking 块结束
      // （content_block_stop 不提供块类型，需要根据之前的 start 推断）
    }
  }

  /** result — 消息完成 */
  private handleResult(msg: CliResultMessage): void {
    this.flushTextBuffer()

    this.sendToWebview({
      type: 'from-extension',
      message: {
        type: 'result',
        subtype: msg.subtype,
        session_id: currentSessionId,
        cost_usd: msg.cost_usd,
      },
    })

    // 重置状态
    this.currentAssistantMessageId = ''
    this.currentContentBlockIndex = -1

    // 更新状态
    const status: CclocalStatus = msg.subtype === 'success' ? 'connected' :
      msg.subtype === 'cancelled' ? 'stopped' : 'error'

    this.sendToWebview({ type: 'statusChange', status })

    if (msg.subtype === 'error') {
      this.sendToWebview({
        type: 'error',
        message: msg.error ?? msg.result ?? 'Unknown error',
      })
    }
  }

  /** control_request — 权限请求 */
  private handleControlRequest(msg: CliControlRequestMessage): void {
    if (msg.request.subtype === 'auto_approved') {
      // 自动批准的通知，无需用户交互
      this.outputChannel.debug(
        `Auto-approved: ${msg.request.tool_name} (${msg.request.reason ?? ''})`,
      )
      return
    }

    if (msg.request.subtype === 'interrupt') {
      // 中断确认
      this.sendToWebview({ type: 'statusChange', status: 'stopped' })
      return
    }

    // 工具权限请求 → 转发给 webview 显示对话框
    this.sendToWebview({
      type: 'from-extension',
      message: {
        type: 'control_request',
        request_id: msg.request_id,
        request: {
          subtype: 'tool_permission',
          tool_name: msg.request.tool_name ?? 'unknown',
          tool_input: msg.request.tool_input,
        },
        session_id: currentSessionId,
      },
    })
  }

  /** error — 错误消息 */
  private handleError(msg: { type: 'error'; error: string; error_code?: string }): void {
    this.sendToWebview({
      type: 'error',
      message: msg.error ?? 'Unknown error',
    })
  }

  /** system — 系统消息 */
  private handleSystemMessage(msg: { type: 'system'; subtype?: string; message: string }): void {
    this.outputChannel.info(`[System] ${msg.message}`)
  }

  /** proposed_diff — open diff editor with left/right VFS */
  private async handleDiff(msg: CliProposedDiffMessage): Promise<void> {
    try {
      // Use DiffManager to write content to virtual FS and open diff editor
      const diffId = await this.diffManager.proposeDiff(
        msg.file_path,
        msg.old_content,
        msg.new_content,
        msg.tool_use_id,
      )

      // Set context so Accept/Reject buttons appear in editor title
      void vscode.commands.executeCommand('setContext', 'cclocal.viewingProposedDiff', true)

      // Also notify webview that a diff is available
      this.sendToWebview({
        type: 'from-extension',
        message: {
          type: 'proposed_diff',
          file_path: msg.file_path,
          old_content: msg.old_content,
          new_content: msg.new_content,
          session_id: currentSessionId,
        },
      })

      this.outputChannel.info(`Opened proposed diff for ${msg.file_path} (id: ${diffId})`)
    } catch (error) {
      this.outputChannel.error(`Failed to open diff: ${error}`)
    }
  }

  /** usage_update — 使用成本通知 */
  private handleCost(msg: CliUsageUpdateMessage): void {
    this.sendToWebview({
      type: 'from-extension',
      message: {
        type: 'usage_update',
        cost_usd: msg.cost_usd,
        duration_ms: msg.duration_ms,
      },
    })
  }

  /** session_states_update — 会话状态更新 */
  private handleSessionUpdate(msg: CliSessionStatesUpdateMessage): void {
    // Forward session state updates; model changes come through usage_update or init
    const activeSession = msg.sessions?.find(s => s.session_id === currentSessionId)
    if (activeSession?.model) {
      this.sendToWebview({ type: 'modelChange', model: activeSession.model } as any)
    }
  }

  // ─── 辅助方法 ──────────────────────────────────────────────────────────────

  /** CLI 客户端连接成功 */
  private handleClientConnected(): void {
    this.sendToWebview({ type: 'statusChange', status: 'connected' })
    this.outputChannel.info('CLI connected to IdeServer')
  }

  /** CLI 客户端断开连接 */
  private handleClientDisconnected(): void {
    this.sendToWebview({ type: 'statusChange', status: 'connecting' })
    this.sendToWebview({ type: 'cliDisconnected' })
    this.outputChannel.warn('CLI disconnected from IdeServer')
  }

  /** CLI 进程意外退出 */
  private handleUnexpectedExit(code: number | null): void {
    this.sendToWebview({
      type: 'error',
      message: `CLI 进程意外退出 (code: ${code})，已达到最大重启次数`,
    })
    this.sendToWebview({ type: 'statusChange', status: 'error' })
  }

  /** 刷新文本缓冲到 webview */
  private flushTextBuffer(): void {
    if (this.blockBufferTimer) {
      clearTimeout(this.blockBufferTimer)
      this.blockBufferTimer = null
    }

    if (this.blockTextBuffer && this.currentAssistantMessageId) {
      this.sendToWebview({
        type: 'from-extension',
        message: {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: this.blockTextBuffer },
          session_id: currentSessionId,
          message_id: this.currentAssistantMessageId,
        },
      })
      this.blockTextBuffer = ''
    }
  }

  /** 打开文件 */
  private async openFile(filePath: string, line?: number): Promise<void> {
    try {
      const doc = await vscode.workspace.openTextDocument(filePath)
      const editor = await vscode.window.showTextDocument(doc, {
        preview: false,
        selection: line ? new vscode.Selection(line - 1, 0, line - 1, 0) : undefined,
      })
    } catch (error) {
      vscode.window.showErrorMessage(`无法打开文件: ${filePath}`)
    }
  }

  /** Open diff viewer using virtual FS (delegated to DiffManager) */
  private async openDiffViewer(filePath: string): Promise<void> {
    // Try to find an existing pending diff for this file
    const pending = this.diffManager.getPendingDiffs()
    const existing = pending.find(d => d.filePath === filePath)
    if (existing && existing.leftUri && existing.rightUri) {
      const fileName = path.basename(filePath)
      await vscode.commands.executeCommand(
        'vscode.diff',
        existing.leftUri,
        existing.rightUri,
        `${fileName} (Proposed Changes)`,
        { preview: true },
      )
    }
  }

  /** Accept diff: write right FS content to disk */
  private async acceptDiff(filePath: string, toolUseId?: string): Promise<void> {
    try {
      await this.diffManager.acceptActiveDiff()
      // acceptActiveDiff doesn't close the editor — close it ourselves
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor')

      // Clear context if no more pending diffs
      if (this.diffManager.getPendingDiffs().length === 0) {
        void vscode.commands.executeCommand('setContext', 'cclocal.viewingProposedDiff', false)
      }

      // Notify webview
      this.sendToWebview({
        type: 'from-extension',
        message: {
          type: 'file_updated',
          file_path: filePath,
          change_type: 'modified' as const,
        },
      })

      this.outputChannel.info(`Accepted proposed diff for ${filePath}`)
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to accept changes: ${error}`)
    }
  }

  /** Reject diff: discard virtual FS content */
  private async rejectDiff(filePath: string, toolUseId?: string): Promise<void> {
    try {
      // rejectActiveDiff already closes the diff editor
      await this.diffManager.rejectActiveDiff()

      // Clear context if no more pending diffs
      if (this.diffManager.getPendingDiffs().length === 0) {
        void vscode.commands.executeCommand('setContext', 'cclocal.viewingProposedDiff', false)
      }

      this.outputChannel.info(`Rejected proposed diff for ${filePath}`)
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to reject changes: ${error}`)
    }
  }

  /** 发送消息到 Webview */
  sendToWebview(message: ExtensionToWebviewMessage): void {
    this.view?.webview.postMessage(message)
    // Broadcast to editor panel and any other targets
    for (const target of this.broadcastTargets) {
      target.postMessage(message)
    }
  }

  /** Add a broadcast target (e.g. editor panel webview) */
  addBroadcastTarget(target: { postMessage: (msg: any) => Thenable<boolean> }): void {
    this.broadcastTargets.push(target)
  }

  /** 生成随机 ID */
  private generateId(): string {
    return crypto.randomBytes(8).toString('hex')
  }

  // ─── Event: View Resolved ───────────────────────────────────────────────────

  /** Register a callback for when the webview view is first resolved */
  onDidResolve(callback: (view: vscode.WebviewView) => void): void {
    if (this.view) {
      callback(this.view)
    } else {
      this.resolveCallbacks.push(callback)
    }
  }

  // ─── Webview HTML (React app from webview-dist/) ─────────────────────────────

  /** Load React webview from webview-dist/ built assets */
  private getWebviewHtml(webview: vscode.Webview): string {
    const nonce = crypto.randomBytes(16).toString('base64')

    // URI helper for loading webview-dist assets
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
