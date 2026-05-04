/**
 * WebSocket 管理器
 * 支持连接限制、心跳检测、空闲超时清理
 */

import type { AuthManager } from '../auth/AuthManager.js'
import type { SessionManager } from '../sessions/SessionManager.js'

type WebSocketData = { token: string }
type BunServer = Bun.Server<WebSocketData>
type ClientSocket = Bun.ServerWebSocket<WebSocketData>

interface WSClient {
  socket: ClientSocket
  token: string
  clientType?: 'cli' | 'vscode'
  sessionId?: string
  lastActivity: number
  id: string
}

export interface WebSocketManagerOptions {
  authManager: AuthManager
  sessionManager: SessionManager
  /** 最大连接数限制 */
  maxConnections?: number
  /** 空闲超时时间（毫秒），默认 5 分钟 */
  idleTimeout?: number
  /** 心跳检测间隔（毫秒），默认 1 分钟 */
  heartbeatInterval?: number
}

export interface WebSocketManagerStats {
  totalConnections: number
  activeConnections: number
  maxConnectionsLimit: number
  connectionsByType: { cli: number; vscode: number; unknown: number }
}

export class WebSocketManager {
  private clients = new Map<string, WSClient>()
  private readonly authManager: AuthManager
  private readonly sessionManager: SessionManager
  private readonly maxConnections: number
  private readonly idleTimeout: number
  private readonly heartbeatInterval: number
  private heartbeatTimer?: ReturnType<typeof setInterval>
  private closed = false

  // 反向映射：socket -> clientId，用于快速查找
  private socketToClientId = new Map<ClientSocket, string>()

  constructor(options: WebSocketManagerOptions) {
    this.authManager = options.authManager
    this.sessionManager = options.sessionManager
    this.maxConnections = options.maxConnections ?? 500
    this.idleTimeout = options.idleTimeout ?? 5 * 60 * 1000 // 默认 5 分钟
    this.heartbeatInterval = options.heartbeatInterval ?? 60 * 1000 // 默认 1 分钟

    // 启动心跳检测
    this.startHeartbeat()
  }

  /**
   * 关闭管理器，停止心跳检测
   */
  close(): void {
    this.closed = true
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
  }

  /**
   * 获取连接统计信息
   */
  getStats(): WebSocketManagerStats {
    let cli = 0
    let vscode = 0
    let unknown = 0

    for (const client of this.clients.values()) {
      if (client.clientType === 'cli') cli++
      else if (client.clientType === 'vscode') vscode++
      else unknown++
    }

    return {
      totalConnections: this.clients.size,
      activeConnections: this.clients.size,
      maxConnectionsLimit: this.maxConnections,
      connectionsByType: { cli, vscode, unknown },
    }
  }

  /**
   * 启动心跳检测定时器
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.checkIdleConnections()
    }, this.heartbeatInterval)
  }

  /**
   * 检查并关闭空闲连接
   */
  private checkIdleConnections(): void {
    if (this.closed) return

    const now = Date.now()
    const toClose: string[] = []

    for (const [clientId, client] of this.clients) {
      if (now - client.lastActivity > this.idleTimeout) {
        toClose.push(clientId)
      }
    }

    for (const clientId of toClose) {
      const client = this.clients.get(clientId)
      if (client) {
        console.log(`   WebSocket client idle timeout: ${clientId}`)
        try {
          client.socket.close(1001, 'Connection timeout')
        } catch {
          // Socket might already be closed
        }
        this.clients.delete(clientId)
        this.socketToClientId.delete(client.socket)
      }
    }
  }

  handleUpgrade(request: Request, server: BunServer): boolean {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')

    if (!token || !this.authManager.verifyToken(token)) {
      return false
    }

    // 检查连接数限制
    if (this.clients.size >= this.maxConnections) {
      // 发送服务器繁忙响应
      return false
    }

    const success = server.upgrade(request, {
      data: { token },
    })

    return success
  }

  onOpen(socket: ClientSocket): void {
    // 再次检查连接数限制（竞态条件）
    if (this.clients.size >= this.maxConnections) {
      socket.close(1013, 'Server busy')
      return
    }

    const clientId = this.generateClientId()
    const token = (socket.data as { token: string }).token

    const client: WSClient = {
      socket,
      token,
      id: clientId,
      lastActivity: Date.now(),
    }

    this.clients.set(clientId, client)
    this.socketToClientId.set(socket, clientId)

    console.log(`   WebSocket client connected: ${clientId} (${this.clients.size}/${this.maxConnections})`)

    // 发送连接成功消息
    this.sendToClient(clientId, {
      type: 'connected',
      payload: { clientId },
      timestamp: Date.now(),
    })
  }

  onMessage(socket: ClientSocket, message: string | Buffer): void {
    const client = this.findClientBySocket(socket)
    if (!client) return

    // 更新活动时间
    client.lastActivity = Date.now()

    try {
      const data = JSON.parse(message.toString())
      this.handleMessage(client, data)
    } catch (error) {
      console.error('Invalid WebSocket message:', error)
      this.sendToClient(client.socket, {
        type: 'error',
        payload: { message: 'Invalid message format' },
        timestamp: Date.now(),
      })
    }
  }

  onClose(socket: ClientSocket): void {
    const clientId = this.findClientIdBySocket(socket)
    if (clientId) {
      console.log(`   WebSocket client disconnected: ${clientId} (${this.clients.size - 1}/${this.maxConnections})`)
      this.clients.delete(clientId)
      this.socketToClientId.delete(socket)
    }
  }

  private handleMessage(client: WSClient, data: { type: string; payload?: unknown }): void {
    switch (data.type) {
      case 'auth':
        this.handleAuth(client, data.payload as { clientType: 'cli' | 'vscode' })
        break

      case 'ping':
        // 更新活动时间
        client.lastActivity = Date.now()
        this.sendToClient(client.socket, {
          type: 'pong',
          timestamp: Date.now(),
        })
        break

      case 'message':
        this.handleChatMessage(client, data.payload as { sessionId: string; content: string })
        break

      case 'cancel':
        this.handleCancel(client, data.payload as { sessionId: string })
        break

      default:
        this.sendToClient(client.socket, {
          type: 'error',
          payload: { message: `Unknown message type: ${data.type}` },
          timestamp: Date.now(),
        })
    }
  }

  private handleAuth(client: WSClient, payload: { clientType: 'cli' | 'vscode' }): void {
    client.clientType = payload.clientType
    this.sendToClient(client.socket, {
      type: 'auth_success',
      payload: { clientType: payload.clientType },
      timestamp: Date.now(),
    })
  }

  private async handleChatMessage(
    client: WSClient,
    payload: { sessionId: string; content: string }
  ): Promise<void> {
    const { sessionId, content } = payload
    client.sessionId = sessionId

    const session = this.sessionManager.getSession(sessionId)
    if (!session) {
      this.sendToClient(client.socket, {
        type: 'error',
        payload: { message: 'Session not found' },
        timestamp: Date.now(),
      })
      return
    }

    const messageId = this.generateId()
    this.sendToClient(client.socket, {
      type: 'stream_start',
      payload: { sessionId, messageId },
      timestamp: Date.now(),
    })

    // Create a SSE-format ReadableStream controller adapter that forwards
    // parsed text_delta events as WebSocket stream_delta messages
    const pendingDeltas: string[] = []
    let flushTimer: ReturnType<typeof setTimeout> | null = null

    const flushPending = () => {
      if (pendingDeltas.length > 0) {
        const combined = pendingDeltas.join('')
        pendingDeltas.length = 0
        this.sendToClient(client.socket, {
          type: 'stream_delta',
          payload: { sessionId, delta: { type: 'text_delta', text: combined } },
          timestamp: Date.now(),
        })
      }
      flushTimer = null
    }

    const sseController = {
      enqueue(chunk: Uint8Array) {
        const text = new TextDecoder().decode(chunk)
        for (const line of text.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'text_delta' && data.text) {
                pendingDeltas.push(data.text)
                if (!flushTimer) {
                  flushTimer = setTimeout(flushPending, 50)
                }
              }
            } catch {
              // Ignore non-JSON data lines
            }
          }
        }
      },
      close() {
        if (flushTimer) clearTimeout(flushTimer)
        flushPending()
        // stream_end is sent after sendMessageStream resolves below
      },
      error() {},
      desiredSize: 1,
    }

    await this.sessionManager.sendMessageStream(
      sessionId,
      content,
      {},
      sseController as any
    )

    this.sendToClient(client.socket, {
      type: 'stream_end',
      payload: { sessionId },
      timestamp: Date.now(),
    })
  }

  private async handleCancel(client: WSClient, payload: { sessionId: string }): Promise<void> {
    await this.sessionManager.cancelGeneration(payload.sessionId)
    this.sendToClient(client.socket, {
      type: 'cancelled',
      payload: { sessionId: payload.sessionId },
      timestamp: Date.now(),
    })
  }

  private sendToClient(
    clientIdOrSocket: string | ClientSocket,
    message: { type: string; payload?: unknown; timestamp: number }
  ): void {
    const socket =
      typeof clientIdOrSocket === 'string'
        ? this.clients.get(clientIdOrSocket)?.socket
        : clientIdOrSocket

    if (socket && socket.readyState === 1) {
      socket.send(JSON.stringify(message))
    }
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private findClientBySocket(socket: ClientSocket): WSClient | undefined {
    const clientId = this.socketToClientId.get(socket)
    if (clientId) {
      return this.clients.get(clientId)
    }
    return undefined
  }

  private findClientIdBySocket(socket: ClientSocket): string | undefined {
    return this.socketToClientId.get(socket)
  }

  // 广播消息到所有连接的客户端
  broadcast(message: { type: string; payload?: unknown; timestamp: number }): void {
    for (const client of this.clients.values()) {
      this.sendToClient(client.socket, message)
    }
  }

  // 广播到特定会话的所有客户端
  broadcastToSession(
    sessionId: string,
    message: { type: string; payload?: unknown; timestamp: number }
  ): void {
    for (const client of this.clients.values()) {
      if (client.sessionId === sessionId) {
        this.sendToClient(client.socket, message)
      }
    }
  }
}
