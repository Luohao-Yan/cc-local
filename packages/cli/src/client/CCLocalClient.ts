/**
 * CCLocal CLI 客户端
 * 负责与服务端通信
 */

import { randomUUID } from 'crypto'
import type { ClientConfig, StreamEvent, MessageOptions, Message, Session } from '@cclocal/shared'

interface CreateSessionOptions {
  name?: string
  cwd?: string
  model?: string
}

interface UpdateSessionOptions {
  name?: string
  cwd?: string
  model?: string
  metadata?: Record<string, unknown>
}

interface MCPServerConfigInput {
  type: 'stdio' | 'sse' | 'http' | 'ws'
  command?: string
  args?: string[]
  cwd?: string
  url?: string
  env?: Record<string, string>
  headers?: Record<string, string>
  namespace?: string
  allowedTools?: string[]
  blockedTools?: string[]
  syncToolsToRegistry?: boolean
}

interface ModelInfo {
  id: string
  name: string
}

export class CCLocalClient {
  private config: ClientConfig
  private messageHandlers: ((event: StreamEvent) => void)[] = []
  private sessionId?: string

  constructor(config: ClientConfig) {
    this.config = config
  }

  async connect(): Promise<void> {
    const response = await fetch(`${this.getHttpBaseUrl()}/health`)
    if (!response.ok) {
      throw new Error(`Server health check failed with status ${response.status}`)
    }
  }

  disconnect(): void {
    // REST/SSE client has no persistent transport to close.
  }

  async createSession(options: CreateSessionOptions = {}): Promise<Session> {
    const response = await this.request('/api/v1/sessions', {
      method: 'POST',
      body: JSON.stringify({
        name: options.name,
        cwd: options.cwd,
        model: options.model,
      }),
    })

    const session = await this.parseJson<Session>(response)
    this.sessionId = session.id
    return session
  }

  setSessionId(sessionId: string): void {
    this.sessionId = sessionId
  }

  getSessionId(): string | undefined {
    return this.sessionId
  }

  async sendMessage(content: string, options?: MessageOptions): Promise<void> {
    const sessionId = await this.ensureSession(options)
    const response = await this.request(`/api/v1/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        options,
      }),
    })

    if (!response.body) {
      throw new Error('Server did not return a streaming response body')
    }

    await this.consumeSSE(response)
  }

  async cancelGeneration(): Promise<void> {
    if (!this.sessionId) return

    await this.request(`/api/v1/sessions/${this.sessionId}/cancel`, {
      method: 'POST',
    })
  }

  async listSessions(): Promise<Session[]> {
    const response = await this.request('/api/v1/sessions')
    return await this.parseJson<Session[]>(response)
  }

  async getSession(sessionId: string): Promise<Session> {
    const response = await this.request(`/api/v1/sessions/${encodeURIComponent(sessionId)}`)
    const session = await this.parseJson<Session>(response)
    this.sessionId = session.id
    return session
  }

  async getSessionMessages(
    sessionId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<Message[]> {
    const params = new URLSearchParams()
    if (options.limit !== undefined) {
      params.set('limit', String(options.limit))
    }
    if (options.offset !== undefined) {
      params.set('offset', String(options.offset))
    }

    const query = params.toString()
    const path = `/api/v1/sessions/${encodeURIComponent(sessionId)}/messages${query ? `?${query}` : ''}`
    const response = await this.request(path)
    return await this.parseJson<Message[]>(response)
  }

  async updateSession(sessionId: string, updates: UpdateSessionOptions): Promise<Session> {
    const response = await this.request(`/api/v1/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
    const session = await this.parseJson<Session>(response)
    this.sessionId = session.id
    return session
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.request(`/api/v1/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    })

    if (this.sessionId === sessionId) {
      this.sessionId = undefined
    }
  }

  async listMcpServers(): Promise<Array<Record<string, unknown>>> {
    const response = await this.request('/api/v1/mcp/servers')
    return await this.parseJson<Array<Record<string, unknown>>>(response)
  }

  async getMcpServer(name: string): Promise<Record<string, unknown>> {
    const response = await this.request(`/api/v1/mcp/servers/${encodeURIComponent(name)}`)
    return await this.parseJson<Record<string, unknown>>(response)
  }

  async addMcpServer(name: string, config: MCPServerConfigInput): Promise<Record<string, unknown>> {
    const response = await this.request('/api/v1/mcp/servers', {
      method: 'POST',
      body: JSON.stringify({ name, config }),
    })
    return await this.parseJson<Record<string, unknown>>(response)
  }

  async connectMcpServer(name: string): Promise<Record<string, unknown>> {
    const response = await this.request(`/api/v1/mcp/servers/${encodeURIComponent(name)}/connect`, {
      method: 'POST',
    })
    return await this.parseJson<Record<string, unknown>>(response)
  }

  async disconnectMcpServer(name: string): Promise<Record<string, unknown>> {
    const response = await this.request(`/api/v1/mcp/servers/${encodeURIComponent(name)}/disconnect`, {
      method: 'POST',
    })
    return await this.parseJson<Record<string, unknown>>(response)
  }

  async removeMcpServer(name: string): Promise<void> {
    await this.request(`/api/v1/mcp/servers/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    })
  }

  async listModels(): Promise<ModelInfo[]> {
    const response = await this.request('/api/v1/models')
    return await this.parseJson<ModelInfo[]>(response)
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

  private async ensureSession(options?: MessageOptions): Promise<string> {
    if (this.sessionId) {
      return this.sessionId
    }

    const session = await this.createSession({
      cwd: process.cwd(),
      model: options?.model,
    })
    return session.id
  }

  private async consumeSSE(response: Response): Promise<void> {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Failed to create stream reader')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })

      let boundaryIndex = buffer.indexOf('\n\n')
      while (boundaryIndex !== -1) {
        const rawEvent = buffer.slice(0, boundaryIndex)
        buffer = buffer.slice(boundaryIndex + 2)
        this.handleSSEEvent(rawEvent)
        boundaryIndex = buffer.indexOf('\n\n')
      }
    }
  }

  private handleSSEEvent(rawEvent: string): void {
    const lines = rawEvent.split('\n')
    const eventName = lines.find((line) => line.startsWith('event:'))?.slice(6).trim()
    const dataLine = lines.find((line) => line.startsWith('data:'))?.slice(5).trim()
    const payload = dataLine ? JSON.parse(dataLine) : {}

    let event: StreamEvent

    switch (eventName) {
      case 'stream_start':
        event = {
          type: 'stream_start',
          messageId: (payload as { messageId?: string }).messageId || randomUUID(),
        }
        break
      case 'delta':
        event = {
          type: 'stream_delta',
          messageId: '',
          delta: {
            type: 'text',
            text: (payload as { text?: string }).text || '',
          },
        }
        break
      case 'stream_end':
        event = {
          type: 'stream_end',
          messageId: '',
        }
        break
      case 'error':
        event = {
          type: 'error',
          messageId: '',
          error: (payload as { error?: string }).error || 'Unknown server error',
        }
        break
      default:
        return
    }

    for (const handler of this.messageHandlers) {
      handler(event)
    }
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers)
    if (this.config.authToken) {
      headers.set('Authorization', `Bearer ${this.config.authToken}`)
    }
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    const response = await fetch(`${this.getHttpBaseUrl()}${path}`, {
      ...init,
      headers,
    })

    if (!response.ok) {
      const message = await this.extractErrorMessage(response)
      throw new Error(message)
    }

    return response
  }

  private async parseJson<T>(response: Response): Promise<T> {
    return await response.json() as T
  }

  private async extractErrorMessage(response: Response): Promise<string> {
    try {
      const body = await response.json() as { error?: { message?: string } | string }
      if (typeof body.error === 'string') {
        return body.error
      }
      return body.error?.message || `Request failed with status ${response.status}`
    } catch {
      return `Request failed with status ${response.status}`
    }
  }

  private getHttpBaseUrl(): string {
    if (this.config.serverUrl.startsWith('ws://')) {
      return this.config.serverUrl.replace(/^ws:\/\//, 'http://')
    }
    if (this.config.serverUrl.startsWith('wss://')) {
      return this.config.serverUrl.replace(/^wss:\/\//, 'https://')
    }
    return this.config.serverUrl
  }
}
