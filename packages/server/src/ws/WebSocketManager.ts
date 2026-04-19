/**
 * WebSocket 管理器
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
}

export class WebSocketManager {
  private clients = new Map<string, WSClient>()
  private authManager: AuthManager
  private sessionManager: SessionManager

  constructor(options: { authManager: AuthManager; sessionManager: SessionManager }) {
    this.authManager = options.authManager
    this.sessionManager = options.sessionManager
  }

  handleUpgrade(request: Request, server: BunServer): boolean {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')

    if (!token || !this.authManager.verifyToken(token)) {
      return false
    }

    const success = server.upgrade(request, {
      data: { token },
    })

    return success
  }

  onOpen(socket: ClientSocket): void {
    const clientId = this.generateClientId()
    const token = (socket.data as { token: string }).token

    const client: WSClient = {
      socket,
      token,
    }

    this.clients.set(clientId, client)

    console.log(`   WebSocket client connected: ${clientId}`)

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
      console.log(`   WebSocket client disconnected: ${clientId}`)
      this.clients.delete(clientId)
    }
  }

  private handleMessage(client: WSClient, data: { type: string; payload?: unknown }): void {
    switch (data.type) {
      case 'auth':
        this.handleAuth(client, data.payload as { clientType: 'cli' | 'vscode' })
        break

      case 'ping':
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

    // 获取会话
    const session = this.sessionManager.getSession(sessionId)
    if (!session) {
      this.sendToClient(client.socket, {
        type: 'error',
        payload: { message: 'Session not found' },
        timestamp: Date.now(),
      })
      return
    }

    // 发送流开始
    this.sendToClient(client.socket, {
      type: 'stream_start',
      payload: { sessionId, messageId: this.generateId() },
      timestamp: Date.now(),
    })

    // TODO: 实际调用 AI 生成回复
    // 这里模拟响应
    await this.mockStreamResponse(client, sessionId, content)
  }

  private async handleCancel(client: WSClient, payload: { sessionId: string }): Promise<void> {
    await this.sessionManager.cancelGeneration(payload.sessionId)
    this.sendToClient(client.socket, {
      type: 'cancelled',
      payload: { sessionId: payload.sessionId },
      timestamp: Date.now(),
    })
  }

  private async mockStreamResponse(client: WSClient, sessionId: string, content: string): Promise<void> {
    const response = `Received: ${content}\nThis is a mock response from CCLocal Server.`
    const words = response.split(' ')

    for (const word of words) {
      this.sendToClient(client.socket, {
        type: 'stream_delta',
        payload: {
          sessionId,
          delta: { type: 'text_delta', text: word + ' ' },
        },
        timestamp: Date.now(),
      })

      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    this.sendToClient(client.socket, {
      type: 'stream_end',
      payload: { sessionId },
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
    for (const client of this.clients.values()) {
      if (client.socket === socket) {
        return client
      }
    }
    return undefined
  }

  private findClientIdBySocket(socket: ClientSocket): string | undefined {
    for (const [id, client] of this.clients.entries()) {
      if (client.socket === socket) {
        return id
      }
    }
    return undefined
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
