/**
 * Channel Manager - CCLocal VS Code Extension
 * Manages all conversation channels
 */

import * as vscode from 'vscode'
import { Channel, type ChannelState, type ChannelStatus } from './Channel.js'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ChannelInfo {
  id: string
  status: ChannelStatus
  messageCount: number
  sessionId?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Channel Manager
// ─────────────────────────────────────────────────────────────────────────────

export class ChannelManager implements vscode.Disposable {
  private channels: Map<string, Channel> = new Map()
  private activeChannelId: string | null = null
  private readonly outputChannel: vscode.LogOutputChannel

  // 事件发射器
  private readonly _onDidChangeActiveChannel = new vscode.EventEmitter<Channel | null>()
  private readonly _onDidChangeChannels = new vscode.EventEmitter<ChannelInfo[]>()

  readonly onDidChangeActiveChannel = this._onDidChangeActiveChannel.event
  readonly onDidChangeChannels = this._onDidChangeChannels.event

  constructor(outputChannel: vscode.LogOutputChannel) {
    this.outputChannel = outputChannel
  }

  // ─── Channel Creation ─────────────────────────────────────────────────────

  createChannel(webview: vscode.Webview, id?: string): Channel {
    const channel = new Channel(webview, id)

    channel.setOnStateChange(ch => {
      this.handleChannelStateChange(ch)
    })

    this.channels.set(channel.id, channel)
    this.outputChannel.info(`Created channel: ${channel.id}`)

    // 如果没有活跃通道，设为活跃
    if (!this.activeChannelId) {
      this.setActiveChannel(channel.id)
    }

    this._onDidChangeChannels.fire(this.getChannelInfos())

    return channel
  }

  // ─── Channel Access ───────────────────────────────────────────────────────

  getChannel(id: string): Channel | undefined {
    return this.channels.get(id)
  }

  getActiveChannel(): Channel | undefined {
    if (!this.activeChannelId) return undefined
    return this.channels.get(this.activeChannelId)
  }

  getActiveChannelId(): string | null {
    return this.activeChannelId
  }

  setActiveChannel(id: string): void {
    if (!this.channels.has(id)) {
      this.outputChannel.warn(`Cannot set active channel: channel ${id} not found`)
      return
    }

    this.activeChannelId = id
    const channel = this.channels.get(id)
    this._onDidChangeActiveChannel.fire(channel ?? null)
    this.outputChannel.info(`Active channel set to: ${id}`)
  }

  // ─── Channel Listing ──────────────────────────────────────────────────────

  getChannels(): Channel[] {
    return Array.from(this.channels.values())
  }

  getChannelInfos(): ChannelInfo[] {
    return this.getChannels().map(ch => {
      const state = ch.getState()
      return {
        id: state.id,
        status: state.status,
        messageCount: state.messages.length,
        sessionId: state.sessionId,
      }
    })
  }

  // ─── Tab Rename (1:1 with official extension) ─────────────────────────────

  renameChannel(id: string, newName: string): boolean {
    const channel = this.channels.get(id)
    if (!channel) {
      this.outputChannel.warn(`Cannot rename channel: channel ${id} not found`)
      return false
    }

    // Channel name is stored in the ChannelState; update via the state
    const state = channel.getState()
    ;(state as any).name = newName
    channel.setState(state)

    this._onDidChangeChannels.fire(this.getChannelInfos())
    this.outputChannel.info(`Renamed channel ${id} to: ${newName}`)
    return true
  }

  // ─── Channel Removal ──────────────────────────────────────────────────────

  closeChannel(id: string): void {
    const channel = this.channels.get(id)
    if (!channel) return

    channel.dispose()
    this.channels.delete(id)
    this.outputChannel.info(`Closed channel: ${id}`)

    // 如果关闭的是活跃通道，选择另一个
    if (this.activeChannelId === id) {
      const remaining = Array.from(this.channels.keys())
      this.activeChannelId = remaining[0] ?? null
      this._onDidChangeActiveChannel.fire(this.getActiveChannel() ?? null)
    }

    this._onDidChangeChannels.fire(this.getChannelInfos())
  }

  closeAllChannels(): void {
    for (const channel of this.channels.values()) {
      channel.dispose()
    }
    this.channels.clear()
    this.activeChannelId = null
    this._onDidChangeActiveChannel.fire(null)
    this._onDidChangeChannels.fire([])
    this.outputChannel.info('All channels closed')
  }

  // ─── State Change Handler ─────────────────────────────────────────────────

  private handleChannelStateChange(channel: Channel): void {
    // 当通道状态改变时更新
    this._onDidChangeChannels.fire(this.getChannelInfos())

    // 如果是活跃通道，通知更新
    if (this.activeChannelId === channel.id) {
      this._onDidChangeActiveChannel.fire(channel)
    }
  }

  // ─── Utility ──────────────────────────────────────────────────────────────

  getStats(): { total: number; active: string | null; byStatus: Record<ChannelStatus, number> } {
    const byStatus: Record<ChannelStatus, number> = {
      idle: 0,
      running: 0,
      waiting: 0,
      error: 0,
    }

    for (const channel of this.channels.values()) {
      byStatus[channel.getStatus()]++
    }

    return {
      total: this.channels.size,
      active: this.activeChannelId,
      byStatus,
    }
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  dispose(): void {
    this.closeAllChannels()
    this._onDidChangeActiveChannel.dispose()
    this._onDidChangeChannels.dispose()
    this.outputChannel.debug('ChannelManager disposed')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Management
// ─────────────────────────────────────────────────────────────────────────────

let instance: ChannelManager | undefined

export function getChannelManager(outputChannel: vscode.LogOutputChannel): ChannelManager {
  if (!instance) {
    instance = new ChannelManager(outputChannel)
  }
  return instance
}

export function disposeChannelManager(): void {
  instance?.dispose()
  instance = undefined
}
