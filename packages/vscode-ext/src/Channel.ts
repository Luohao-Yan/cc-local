/**
 * Channel - CCLocal VS Code Extension
 * Manages a single conversation channel between extension and webview
 */

import * as vscode from 'vscode'
import type { Message, ContentBlock } from '../webview/src/store/slices/messagesSlice'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ChannelStatus = 'idle' | 'running' | 'waiting' | 'error'

export interface ChannelState {
  id: string
  status: ChannelStatus
  messages: Message[]
  sessionId?: string
  permissionMode: 'default' | 'acceptEdits' | 'plan' | 'bypassPermissions'
  model?: string
  usage?: {
    inputTokens: number
    outputTokens: number
    cacheReadTokens?: number
    cacheWriteTokens?: number
  }
}

export interface ExtensionMessage {
  type: string
  data?: unknown
}

// ─────────────────────────────────────────────────────────────────────────────
// Channel Class
// ─────────────────────────────────────────────────────────────────────────────

export class Channel {
  readonly id: string
  private webview: vscode.Webview
  private state: ChannelState
  private onStateChange?: (channel: Channel) => void

  constructor(webview: vscode.Webview, id?: string) {
    this.id = id ?? crypto.randomUUID()
    this.webview = webview
    this.state = {
      id: this.id,
      status: 'idle',
      messages: [],
      permissionMode: 'default',
    }

    // 监听来自 webview 的消息
    this.webview.onDidReceiveMessage(this.handleWebviewMessage.bind(this))
  }

  // ─── Getters ─────────────────────────────────────────────────────────────

  getStatus(): ChannelStatus {
    return this.state.status
  }

  getMessages(): Message[] {
    return this.state.messages
  }

  getSessionId(): string | undefined {
    return this.state.sessionId
  }

  getState(): ChannelState {
    return { ...this.state }
  }

  // ─── State Management ─────────────────────────────────────────────────────

  setOnStateChange(handler: (channel: Channel) => void): void {
    this.onStateChange = handler
  }

  private updateState(updates: Partial<ChannelState>): void {
    this.state = { ...this.state, ...updates }
    this.onStateChange?.(this)
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  async sendMessage(content: string): Promise<void> {
    const message: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: [{ type: 'text', text: content }],
      timestamp: Date.now(),
    }

    this.addMessage(message)
    this.updateState({ status: 'running' })

    // 通知扩展主机开始处理
    await this.postMessage({
      type: 'start_processing',
      data: { messageId: message.id, content },
    })
  }

  async interrupt(): Promise<void> {
    this.updateState({ status: 'idle' })
    await this.postMessage({ type: 'interrupt' })
  }

  setPermissionMode(mode: ChannelState['permissionMode']): void {
    this.updateState({ permissionMode: mode })
    this.postMessage({ type: 'permission_mode_changed', data: mode })
  }

  setModel(model: string): void {
    this.updateState({ model })
    this.postMessage({ type: 'model_changed', data: model })
  }

  addMessage(message: Message): void {
    this.state.messages.push(message)
    this.postMessage({ type: 'message', data: message })
    this.onStateChange?.(this)
  }

  updateMessage(id: string, updates: Partial<Message>): void {
    const index = this.state.messages.findIndex(m => m.id === id)
    if (index !== -1) {
      this.state.messages[index] = { ...this.state.messages[index], ...updates }
      this.postMessage({ type: 'message_updated', data: this.state.messages[index] })
      this.onStateChange?.(this)
    }
  }

  appendToMessage(id: string, content: ContentBlock): void {
    const message = this.state.messages.find(m => m.id === id)
    if (message) {
      message.content.push(content)
      this.postMessage({ type: 'message_appended', data: { id, content } })
      this.onStateChange?.(this)
    }
  }

  clearMessages(): void {
    this.state.messages = []
    this.postMessage({ type: 'clear' })
    this.onStateChange?.(this)
  }

  // ─── Webview Communication ────────────────────────────────────────────────

  async postMessage(message: ExtensionMessage): Promise<boolean> {
    return this.webview.postMessage(message)
  }

  async syncState(): Promise<void> {
    await this.postMessage({
      type: 'session_states_update',
      data: this.state,
    })
  }

  private async handleWebviewMessage(message: ExtensionMessage): Promise<void> {
    switch (message.type) {
      case 'ready':
        await this.syncState()
        break

      case 'send_message':
        if (message.data && typeof message.data === 'object') {
          const data = message.data as { content: string }
          await this.sendMessage(data.content)
        }
        break

      case 'interrupt':
        await this.interrupt()
        break

      case 'create_new_conversation':
        this.clearMessages()
        this.updateState({ sessionId: undefined, status: 'idle' })
        break

      case 'permission_response':
        // 处理权限响应
        break

      case 'set_permission_mode':
        if (message.data) {
          this.setPermissionMode(message.data as ChannelState['permissionMode'])
        }
        break
    }
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  dispose(): void {
    // 清理资源
    this.state.messages = []
  }
}
