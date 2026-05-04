/**
 * IDE Connection Manager
 *
 * 管理多个 IDE 连接，支持：
 * - 连接池管理
 * - 消息路由
 * - 状态同步
 */

import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import type { IDEBridge, IDEInfo, IDEMessage, IDEMessageType, FileEditRequest, FileEditResponse, TerminalOutput, DebugLog } from './IDEBridge.js'
import { IDEBridge } from './IDEBridge.js'

export interface IDEConnection {
  id: string
  bridge: IDEBridge
  info: IDEInfo | null
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  lastActivity: number
  createdAt: number
}

export interface IDEManagerConfig {
  maxConnections?: number
  idleTimeout?: number
  messageTimeout?: number
}

/**
 * IDE 连接管理器
 */
export class IDEManager extends EventEmitter {
  private connections = new Map<string, IDEConnection>()
  private config: IDEManagerConfig

  constructor(config: IDEManagerConfig = {}) {
    super()
    this.config = {
      maxConnections: 10,
      idleTimeout: 30 * 60 * 1000, // 30 minutes
      messageTimeout: 30000,
      ...config,
    }
  }

  /**
   * 创建新连接
   */
  async createConnection(url: string, authToken?: string): Promise<IDEConnection> {
    if (this.connections.size >= (this.config.maxConnections || 10)) {
      throw new Error('Maximum IDE connections reached')
    }

    const id = randomUUID()
    const bridge = new IDEBridge({ url, authToken })

    const connection: IDEConnection = {
      id,
      bridge,
      info: null,
      status: 'connecting',
      lastActivity: Date.now(),
      createdAt: Date.now(),
    }

    this.connections.set(id, connection)

    // 设置事件监听
    bridge.on('connected', () => {
      connection.status = 'connected'
      connection.lastActivity = Date.now()
      this.emit('connection_ready', connection)
    })

    bridge.on('disconnected', () => {
      connection.status = 'disconnected'
      this.emit('connection_closed', connection)
    })

    bridge.on('error', (error: Error) => {
      connection.status = 'error'
      this.emit('connection_error', connection, error)
    })

    bridge.on('message', (message: IDEMessage) => {
      connection.lastActivity = Date.now()
      this.routeMessage(connection, message)
    })

    bridge.on('ide_info', (info: IDEInfo) => {
      connection.info = info
      connection.lastActivity = Date.now()
      this.emit('ide_info', connection, info)
    })

    // 开始连接
    try {
      await bridge.connect(url)
      return connection
    } catch (error) {
      this.connections.delete(id)
      throw error
    }
  }

  /**
   * 关闭连接
   */
  async closeConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId)
    if (!connection) return

    await connection.bridge.disconnect()
    this.connections.delete(connectionId)
  }

  /**
   * 关闭所有连接
   */
  async closeAllConnections(): Promise<void> {
    const promises = Array.from(this.connections.keys()).map(id => this.closeConnection(id))
    await Promise.all(promises)
  }

  /**
   * 获取连接
   */
  getConnection(connectionId: string): IDEConnection | undefined {
    return this.connections.get(connectionId)
  }

  /**
   * 获取所有连接
   */
  listConnections(): IDEConnection[] {
    return Array.from(this.connections.values())
  }

  /**
   * 按工作区查找连接
   */
  findConnectionByWorkspace(workspaceFolder: string): IDEConnection | undefined {
    for (const connection of this.connections.values()) {
      if (connection.info?.workspaceFolders.some(f => f === workspaceFolder || f.includes(workspaceFolder))) {
        return connection
      }
    }
    return undefined
  }

  /**
   * 广播消息到所有连接
   */
  async broadcast(type: IDEMessageType, payload: unknown): Promise<void> {
    const promises = Array.from(this.connections.values())
      .filter(c => c.status === 'connected')
      .map(c => c.bridge.send(type, payload))

    await Promise.allSettled(promises)
  }

  /**
   * 发送消息到特定连接
   */
  async sendTo(connectionId: string, type: IDEMessageType, payload: unknown): Promise<void> {
    const connection = this.connections.get(connectionId)
    if (!connection || connection.status !== 'connected') {
      throw new Error('Connection not available')
    }

    await connection.bridge.send(type, payload)
  }

  /**
   * 请求文件编辑
   */
  async requestFileEdit(connectionId: string, request: FileEditRequest): Promise<FileEditResponse> {
    const connection = this.connections.get(connectionId)
    if (!connection || connection.status !== 'connected') {
      throw new Error('Connection not available')
    }

    if (!connection.info?.capabilities.fileEdit) {
      throw new Error('IDE does not support file editing')
    }

    return connection.bridge.requestFileEdit(request)
  }

  /**
   * 发送终端输出到所有连接
   */
  async broadcastTerminalOutput(output: TerminalOutput): Promise<void> {
    await this.broadcast('terminal_output', output)
  }

  /**
   * 发送调试日志到所有连接
   */
  async broadcastDebugLog(log: DebugLog): Promise<void> {
    await this.broadcast('debug_log', log)
  }

  /**
   * 发送通知到所有连接
   */
  async broadcastNotification(message: string, level: 'info' | 'warn' | 'error' = 'info'): Promise<void> {
    await this.broadcast('notification', { message, level })
  }

  /**
   * 清理空闲连接
   */
  cleanupIdleConnections(): void {
    const now = Date.now()
    const idleTimeout = this.config.idleTimeout || 30 * 60 * 1000

    for (const [id, connection] of this.connections) {
      if (now - connection.lastActivity > idleTimeout) {
        this.closeConnection(id).catch(() => {
          // Ignore cleanup errors
        })
      }
    }
  }

  /**
   * 路由消息
   */
  private routeMessage(connection: IDEConnection, message: IDEMessage): void {
    // 根据消息类型路由到不同的处理器
    switch (message.type) {
      case 'file_edit_response':
        this.emit('file_edit_response', connection, message.payload as FileEditResponse)
        break

      case 'terminal_input':
        this.emit('terminal_input', connection, message.payload)
        break

      case 'diagnostic':
        this.emit('diagnostic', connection, message.payload)
        break

      case 'debug_breakpoint':
        this.emit('debug_breakpoint', connection, message.payload)
        break

      default:
        this.emit('message', connection, message)
    }
  }
}

// 导出默认实例
export const ideManager = new IDEManager()
