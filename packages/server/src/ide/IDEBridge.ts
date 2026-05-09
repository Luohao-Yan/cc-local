/**
 * IDE Bridge
 *
 * 桥接 CLI 和 IDE 之间的通信，支持：
 * - 双向消息传递
 * - 文件编辑请求
 * - 终端输出转发
 * - 调试信息
 */

import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import type { WebSocket as WebSocketType } from 'ws'

export interface IDEInfo {
  name: string
  version: string
  workspaceFolders: string[]
  capabilities: IDECapabilities
}

export interface IDECapabilities {
  fileEdit: boolean
  fileRead: boolean
  terminal: boolean
  debug: boolean
  notifications: boolean
  diagnostics: boolean
}

export interface IDEMessage {
  id: string
  type: IDEMessageType
  payload: unknown
  timestamp: number
}

export type IDEMessageType =
  | 'file_edit_request'
  | 'file_edit_response'
  | 'file_read_request'
  | 'file_read_response'
  | 'terminal_output'
  | 'terminal_input'
  | 'debug_log'
  | 'debug_breakpoint'
  | 'notification'
  | 'diagnostic'
  | 'status_update'
  | 'error'

export interface FileEditRequest {
  path: string
  content: string
  editType: 'create' | 'modify' | 'delete'
  range?: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
}

export interface FileEditResponse {
  success: boolean
  error?: string
}

export interface TerminalOutput {
  type: 'stdout' | 'stderr'
  data: string
  timestamp: number
}

export interface DebugLog {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  category?: string
  data?: unknown
}

export interface IDEConnectionConfig {
  url?: string
  authToken?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  pingInterval?: number
  pongTimeout?: number
  /** Custom WebSocket factory for testing */
  webSocketFactory?: (url: string, options?: any) => WebSocketType
}

/**
 * IDE 桥接器
 */
export class IDEBridge extends EventEmitter {
  private ws: WebSocketType | null = null
  private config: IDEConnectionConfig
  private ideInfo: IDEInfo | null = null
  private connected = false
  private reconnectAttempts = 0
  private _intentionalDisconnect = false
  private reconnectTimer?: ReturnType<typeof setTimeout>
  private pingTimer?: ReturnType<typeof setInterval>
  private pongTimer?: ReturnType<typeof setTimeout>
  private pendingRequests = new Map<string, {
    resolve: (value: unknown) => void
    reject: (error: Error) => void
    timeout: ReturnType<typeof setTimeout>
  }>()

  constructor(config: IDEConnectionConfig = {}) {
    super()
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      pingInterval: 30000,
      pongTimeout: 10000,
      ...config,
    }
  }

  /**
   * 连接到 IDE
   */
  async connect(url?: string): Promise<void> {
    const connectionUrl = url || this.config.url
    if (!connectionUrl) {
      throw new Error('No IDE URL provided')
    }

    return new Promise((resolve, reject) => {
      try {
        const connectWebSocket = async () => {
          let WebSocketClass: typeof WebSocketType

          if (this.config.webSocketFactory) {
            // Use custom factory (for testing)
            this.ws = this.config.webSocketFactory(connectionUrl, {
              headers: this.config.authToken
                ? { Authorization: `Bearer ${this.config.authToken}` }
                : undefined,
            })
            this.setupWebSocketHandlers(resolve, reject)
          } else {
            // Dynamic import for runtime
            const { WebSocket } = await import('ws')
            this.ws = new WebSocket(connectionUrl, {
              headers: this.config.authToken
                ? { Authorization: `Bearer ${this.config.authToken}` }
                : undefined,
            })
            this.setupWebSocketHandlers(resolve, reject)
          }
        }

        connectWebSocket().catch(reject)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 设置 WebSocket 事件处理
   */
  private setupWebSocketHandlers(
    resolve: () => void,
    reject: (error: Error) => void
  ): void {
    if (!this.ws) return

    this.ws.on('open', () => {
      this.connected = true
      this.reconnectAttempts = 0
      this.startPing()
      this.emit('connected')
      resolve()
    })

    this.ws.on('message', (data: Buffer) => {
      this.handleMessage(data)
    })

    this.ws.on('close', () => {
      this.handleDisconnect()
    })

    this.ws.on('error', (error: Error) => {
      this.emit('error', error)
      if (!this.connected) {
        reject(error)
      }
    })
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    this.stopPing()
    this._intentionalDisconnect = true
    this.clearReconnectTimer()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.connected = false

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout)
      pending.reject(new Error('Connection closed'))
      this.pendingRequests.delete(id)
    }

    this.emit('disconnected')
  }

  /**
   * 发送消息
   */
  async send(type: IDEMessageType, payload: unknown): Promise<string> {
    const id = randomUUID()
    const message: IDEMessage = {
      id,
      type,
      payload,
      timestamp: Date.now(),
    }

    return new Promise((resolve, reject) => {
      if (!this.ws || !this.connected) {
        reject(new Error('Not connected to IDE'))
        return
      }

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error('Message timeout'))
      }, 30000)

      // Store pending entry but do NOT resolve yet —
      // the response handler in handleMessage() will resolve it.
      this.pendingRequests.set(id, { resolve, reject, timeout })

      this.ws.send(JSON.stringify(message), (error) => {
        if (error) {
          clearTimeout(timeout)
          this.pendingRequests.delete(id)
          reject(error)
        }
        // On success, just let the pending entry stay —
        // it will be resolved by handleMessage() when the IDE responds.
      })
    })
  }

  /**
   * 发送请求并等待响应
   */
  async request<T = unknown>(type: IDEMessageType, payload: unknown): Promise<T> {
    // send() now returns a Promise that resolves with the IDE's response payload,
    // not just the message ID.
    const id = this.generateId()
    const message = { id, type, payload, timestamp: Date.now() }

    return new Promise((resolve, reject) => {
      if (!this.ws || !this.connected) {
        reject(new Error('Not connected to IDE'))
        return
      }

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error('Request timeout'))
      }, 30000)

      this.pendingRequests.set(id, { resolve: resolve as (value: unknown) => void, reject, timeout })

      this.ws!.send(JSON.stringify(message), (error) => {
        if (error) {
          clearTimeout(timeout)
          this.pendingRequests.delete(id)
          reject(error)
        }
      })
    }) as Promise<T>
  }

  /**
   * 请求文件编辑
   */
  async requestFileEdit(request: FileEditRequest): Promise<FileEditResponse> {
    return this.request<FileEditResponse>('file_edit_request', request)
  }

  /**
   * 发送终端输出
   */
  async sendTerminalOutput(output: TerminalOutput): Promise<void> {
    await this.send('terminal_output', output)
  }

  /**
   * 发送调试日志
   */
  async sendDebugLog(log: DebugLog): Promise<void> {
    await this.send('debug_log', log)
  }

  /**
   * 发送通知
   */
  async sendNotification(message: string, level: 'info' | 'warn' | 'error' = 'info'): Promise<void> {
    await this.send('notification', { message, level })
  }

  /**
   * 获取 IDE 信息
   */
  getIDEInfo(): IDEInfo | null {
    return this.ideInfo
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * 处理接收的消息
   */
  private handleMessage(data: Buffer): void {
    try {
      const message: IDEMessage = JSON.parse(data.toString())

      // Handle pong
      if (message.type === 'status_update' && (message.payload as { status?: string })?.status === 'pong') {
        this.handlePong()
        return
      }

      // Handle IDE info
      if (message.type === 'status_update' && (message.payload as { ide?: IDEInfo })?.ide) {
        this.ideInfo = (message.payload as { ide: IDEInfo }).ide
        this.emit('ide_info', this.ideInfo)
        return
      }

      // Handle response to pending request
      const pending = this.pendingRequests.get(message.id)
      if (pending) {
        clearTimeout(pending.timeout)
        this.pendingRequests.delete(message.id)

        if (message.type === 'error') {
          pending.reject(new Error((message.payload as { message?: string })?.message || 'Unknown error'))
        } else {
          pending.resolve(message.payload)
        }
        return
      }

      // Emit as event
      this.emit('message', message)
      this.emit(message.type, message.payload)

    } catch (error) {
      this.emit('error', error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * 处理断开连接
   */
  private handleDisconnect(): void {
    this.connected = false
    this.stopPing()
    this.emit('disconnected')

    // Do not reconnect if disconnect() was called intentionally
    if (this._intentionalDisconnect) {
      this._intentionalDisconnect = false
      return
    }

    // 尝试重连
    if (this.reconnectAttempts < (this.config.maxReconnectAttempts || 5)) {
      this.scheduleReconnect()
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++
    this.reconnectTimer = setTimeout(() => {
      this.emit('reconnecting', this.reconnectAttempts)
      this.connect().catch(() => {
        // Reconnect failed, will try again if attempts remaining
      })
    }, this.config.reconnectInterval)
  }

  /**
   * 清除重连定时器
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }
  }

  /**
   * 开始心跳
   */
  private startPing(): void {
    this.stopPing()

    this.pingTimer = setInterval(() => {
      if (this.ws && this.connected) {
        this.ws.send(JSON.stringify({
          id: randomUUID(),
          type: 'status_update',
          payload: { status: 'ping' },
          timestamp: Date.now(),
        }))

        // 设置 pong 超时
        this.pongTimer = setTimeout(() => {
          this.handleDisconnect()
        }, this.config.pongTimeout)
      }
    }, this.config.pingInterval)
  }

  /**
   * 停止心跳
   */
  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = undefined
    }
    if (this.pongTimer) {
      clearTimeout(this.pongTimer)
      this.pongTimer = undefined
    }
  }

  /**
   * 处理 pong 响应
   */
  private handlePong(): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer)
      this.pongTimer = undefined
    }
  }
}

// 导出默认实例
export const ideBridge = new IDEBridge()
