/**
 * CCLocal CLI 客户端
 * 负责与服务端通信
 */

import { WebSocket } from 'ws'
import { randomUUID } from 'crypto'
import type { ClientConfig, StreamEvent, MessageOptions } from '@cclocal/shared'

export class CCLocalClient {
  private ws?: WebSocket
  private config: ClientConfig
  private messageHandlers: ((event: StreamEvent) => void)[] = []
  private reconnectAttempts = 0
  private sessionId?: string

  constructor(config: ClientConfig) {
    this.config = config
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.serverUrl.replace('http://', 'ws://').replace('https://', 'wss://')
      const url = `${wsUrl}/ws?token=${this.config.authToken || ''}`

      this.ws = new WebSocket(url)

      this.ws.on('open', () => {
        console.log('   WebSocket connected')
        this.reconnectAttempts = 0

        // 发送认证信息
        this.send({
          type: 'auth',
          payload: { clientType: 'cli' },
          timestamp: Date.now(),
        })

        resolve()
      })

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          this.handleMessage(message)
        } catch (error) {
          console.error('Failed to parse message:', error)
        }
      })

      this.ws.on('close', () => {
        console.log('   WebSocket disconnected')
        this.attemptReconnect()
      })

      this.ws.on('error', (error) => {
        reject(error)
      })
    })
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = undefined
    }
  }

  sendMessage(content: string, options?: MessageOptions): void {
    if (!this.sessionId) {
      this.sessionId = randomUUID()
    }

    this.send({
      type: 'message',
      payload: {
        sessionId: this.sessionId,
        content,
        options,
      },
      timestamp: Date.now(),
    })
  }

  cancelGeneration(): void {
    if (!this.sessionId) return

    this.send({
      type: 'cancel',
      payload: { sessionId: this.sessionId },
      timestamp: Date.now(),
    })
  }

  onMessage(handler: (event: StreamEvent) => void): void {
    this.messageHandlers.push(handler)
  }

  removeMessageHandler(handler: (event: StreamEvent) => void): void {
    const index = this.messageHandlers.indexOf(handler)
    if (index > -1) {
      this.messageHandlers.splice(index, 1)
    }
  }

  private send(message: { type: string; payload?: unknown; timestamp: number }): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  private handleMessage(message: { type: string; payload?: unknown }): void {
    // 转换为 StreamEvent 格式
    const event: StreamEvent = {
      type: message.type as StreamEvent['type'],
      messageId: (message.payload as any)?.messageId || '',
      delta: (message.payload as any)?.delta,
      error: (message.payload as any)?.error,
    }

    // 通知所有处理器
    for (const handler of this.messageHandlers) {
      handler(event)
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    console.log(`   Reconnecting... (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`)

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error)
      })
    }, this.config.reconnectInterval)
  }
}
