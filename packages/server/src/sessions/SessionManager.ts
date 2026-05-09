/**
 * 会话管理器
 * 支持请求队列，串行处理同一会话的请求
 */

import { randomUUID } from 'crypto'
import { QueryEngine, getSessionStore, toolRegistry } from '@cclocal/core'
import { clearTodosForSession, clearTasksForSession } from '@cclocal/core'
import type { Session, Message, MessageOptions, StreamEvent } from '@cclocal/shared'
import type { SessionStore } from '@cclocal/core'

/**
 * 排队的请求
 */
interface QueuedRequest {
  id: string
  execute: () => Promise<void>
  resolve: (value: void) => void
  reject: (error: Error) => void
  abortController: AbortController
}

/**
 * 会话运行时状态
 */
interface SessionRuntime {
  abortController?: AbortController
  requestQueue: QueuedRequest[]
  isProcessing: boolean
}

interface SessionManagerOptions {
  store?: SessionStore
  createQueryEngine?: (options: ConstructorParameters<typeof QueryEngine>[0]) => QueryEngine
  now?: () => number
  /** API credentials forwarded to QueryEngine instances */
  apiKey?: string
  baseUrl?: string
  apiFormat?: 'anthropic' | 'openai'
  headers?: Record<string, string>
  fetchOptions?: Record<string, unknown>
  fetch?: typeof fetch
}

export class SessionManager {
  private runtime = new Map<string, SessionRuntime>()
  private readonly store: SessionStore
  private readonly createQueryEngine: (options: ConstructorParameters<typeof QueryEngine>[0]) => QueryEngine
  private readonly now: () => number
  private readonly apiKey?: string
  private readonly baseUrl?: string
  private readonly apiFormat?: 'anthropic' | 'openai'
  private readonly headers?: Record<string, string>
  private readonly fetchOptions?: Record<string, unknown>
  private readonly fetch?: typeof fetch

  constructor(options: SessionManagerOptions = {}) {
    this.store = options.store ?? getSessionStore()
    this.createQueryEngine = options.createQueryEngine ?? ((queryOptions) => new QueryEngine(queryOptions))
    this.now = options.now ?? (() => Date.now())
    this.apiKey = options.apiKey
    this.baseUrl = options.baseUrl
    this.apiFormat = options.apiFormat
    this.headers = options.headers
    this.fetchOptions = options.fetchOptions
    this.fetch = options.fetch
  }

  async createSession(options: { id?: string; name?: string; cwd?: string; model?: string }): Promise<Session> {
    const timestamp = this.now()
    const session: Session = {
      id: options.id || randomUUID(),
      name: options.name || 'New Session',
      messages: [],
      cwd: options.cwd || process.cwd(),
      model: options.model || 'default',
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    this.store.createSession(session)
    return session
  }

  async cloneSession(
    sessionId: string,
    overrides: { name?: string; cwd?: string; model?: string } = {}
  ): Promise<Session> {
    const source = this.store.getSession(sessionId)
    if (!source) {
      throw new Error('Session not found')
    }

    const timestamp = this.now()
    const nextSession: Session = {
      id: randomUUID(),
      name: overrides.name || `${source.name} (fork)`,
      messages: [],
      cwd: overrides.cwd || source.cwd,
      model: overrides.model || source.model,
      createdAt: timestamp,
      updatedAt: timestamp,
      metadata: source.metadata,
    }

    this.store.createSession(nextSession)

    const clonedMessages = source.messages.map((message) => ({
      ...message,
      id: randomUUID(),
    }))

    if (clonedMessages.length > 0) {
      this.store.replaceMessages(nextSession.id, clonedMessages)
    }

    return this.store.getSession(nextSession.id) as Session
  }

  /**
   * 分叉会话
   * 创建一个新会话，复制原会话的所有消息
   */
  async forkSession(
    sessionId: string,
    options?: { name?: string }
  ): Promise<Session> {
    const original = this.store.getSession(sessionId)
    if (!original) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    // 获取原会话的所有消息
    const messages = this.store.getMessages(sessionId)

    // 创建新会话
    const forked = await this.createSession({
      name: options?.name || `${original.name}-fork`,
      cwd: original.cwd,
      model: original.model,
    })

    // 复制所有消息到新会话
    for (const msg of messages) {
      const clonedMsg = {
        ...msg,
        id: randomUUID(),
      }
      this.store.addMessage(clonedMsg, forked.id)
    }

    // 复制运行时状态
    const originalRuntime = this.runtime.get(sessionId)
    if (originalRuntime) {
      const forkedRuntime = this.getOrCreateRuntime(forked.id)
      forkedRuntime.abortController = new AbortController()
      // 注意：不复制请求队列，只复制基本状态
    }

    return forked
  }

  getSession(id: string): Session | undefined {
    return this.store.getSession(id)
  }

  getAllSessions(): Session[] {
    return this.store.listSessions()
  }

  deleteSession(id: string): void {
    const runtime = this.runtime.get(id)
    if (runtime) {
      // 取消当前正在处理的请求
      if (runtime.abortController) {
        runtime.abortController.abort()
      }
      // 取消所有队列中的请求
      for (const request of runtime.requestQueue) {
        request.abortController.abort()
        request.reject(new Error('Session deleted'))
      }
    }
    this.runtime.delete(id)
    // Clear in-memory maps for todo/task tools to prevent memory leaks
    clearTodosForSession(id)
    clearTasksForSession(id)
    this.store.deleteSession(id)
  }

  async sendMessageStream(
    sessionId: string,
    content: string,
    options: MessageOptions = {},
    controller: ReadableStreamDefaultController
  ): Promise<void> {
    const session = this.store.getSession(sessionId)
    if (!session) {
      controller.enqueue(new TextEncoder().encode('event: error\ndata: Session not found\n\n'))
      controller.close()
      return
    }

    // 获取或创建运行时状态
    const runtime = this.getOrCreateRuntime(sessionId)
    const abortController = new AbortController()

    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: randomUUID(),
        abortController,
        resolve,
        reject,
        execute: async () => {
          await this._executeMessageStream(
            sessionId,
            content,
            options,
            controller,
            abortController.signal
          )
        },
      }

      // 加入队列
      runtime.requestQueue.push(request)

      // 如果没有正在处理的请求，开始处理队列
      if (!runtime.isProcessing) {
        this._processQueue(sessionId)
      }
    })
  }

  /**
   * 执行消息流处理（内部方法，由队列调用）
   */
  private async _executeMessageStream(
    sessionId: string,
    content: string,
    options: MessageOptions,
    controller: ReadableStreamDefaultController,
    abortSignal: AbortSignal
  ): Promise<void> {
    const session = this.store.getSession(sessionId)
    if (!session) {
      controller.enqueue(new TextEncoder().encode('event: error\ndata: Session not found\n\n'))
      controller.close()
      return
    }

    const runtime = this.getOrCreateRuntime(sessionId)
    runtime.abortController = new AbortController()

    // 关联外部取消信号
    if (abortSignal.aborted) {
      runtime.abortController.abort()
    }
    const onAbort = () => runtime.abortController?.abort()
    abortSignal.addEventListener('abort', onAbort)

    try {
      // 添加用户消息
      const userMessage: Message = {
        id: randomUUID(),
        role: 'user',
        content: [{ type: 'text', text: content }],
        timestamp: this.now(),
      }
      this.store.addMessage(userMessage, sessionId)

      // Re-read session to get accurate message list (includes the user message just added)
      const freshSession = this.store.getSession(sessionId)
      if (!freshSession) {
        controller.enqueue(new TextEncoder().encode('event: error\ndata: Session not found\n\n'))
        controller.close()
        return
      }

      // 使用 QueryEngine 处理消息
      const queryEngine = this.createQueryEngine({
        model: options.model || session.model || 'default',
        systemPrompt: options.systemPrompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        maxTurns: options.maxTurns,
        enabledTools: options.enabledTools,
        tools: toolRegistry.getAll(),
        permissionPolicy: options.permissionPolicy,
        apiKey: this.apiKey,
        baseUrl: this.baseUrl,
        apiFormat: this.apiFormat,
        headers: this.headers,
        fetchOptions: this.fetchOptions,
        fetch: this.fetch,
      })

      // 发送流开始事件
      const messageId = randomUUID()
      controller.enqueue(
        new TextEncoder().encode(`event: stream_start\ndata: ${JSON.stringify({ messageId })}\n\n`)
      )

      // 调用 QueryEngine 获取流式响应 (use fresh session messages to avoid duplicate user message)
      const result = await queryEngine.query([...freshSession.messages], {
        onStream: (event: StreamEvent) => {
          if (runtime.abortController?.signal.aborted) {
            queryEngine.cancel()
            return
          }

          if (event.type === 'stream_delta' && event.delta?.type === 'text') {
            const data = JSON.stringify({
              type: 'text_delta',
              text: event.delta.text,
            })
            controller.enqueue(
              new TextEncoder().encode(`event: delta\ndata: ${data}\n\n`)
            )
          }
        },
      })

      // 添加助手消息到会话
      this.store.addMessage(result.message, sessionId)

      // 发送流结束事件
      controller.enqueue(
        new TextEncoder().encode(`event: stream_end\ndata: {}\n\n`)
      )

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        controller.enqueue(
          new TextEncoder().encode(`event: cancelled\ndata: {}\n\n`)
        )
      } else {
        controller.enqueue(
          new TextEncoder().encode(`event: error\ndata: ${JSON.stringify({ error: String(error) })}\n\n`)
        )
      }
    } finally {
      abortSignal.removeEventListener('abort', onAbort)
      runtime.abortController = undefined
      controller.close()
    }
  }

  async sendEphemeralMessageStream(
    content: string,
    options: MessageOptions = {},
    controller: ReadableStreamDefaultController,
    context: { cwd?: string; model?: string } = {}
  ): Promise<void> {
    try {
      const userMessage: Message = {
        id: randomUUID(),
        role: 'user',
        content: [{ type: 'text', text: content }],
        timestamp: this.now(),
      }

      const queryEngine = this.createQueryEngine({
        model: options.model || context.model || 'default',
        systemPrompt: options.systemPrompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        maxTurns: options.maxTurns,
        enabledTools: options.enabledTools,
        tools: toolRegistry.getAll(),
        permissionPolicy: options.permissionPolicy,
        apiKey: this.apiKey,
        baseUrl: this.baseUrl,
        apiFormat: this.apiFormat,
        headers: this.headers,
        fetchOptions: this.fetchOptions,
        fetch: this.fetch,
      })

      const messageId = randomUUID()
      controller.enqueue(
        new TextEncoder().encode(`event: stream_start\ndata: ${JSON.stringify({ messageId })}\n\n`)
      )

      await queryEngine.query([userMessage], {
        onStream: (event: StreamEvent) => {
          if (event.type === 'stream_delta' && event.delta?.type === 'text') {
            const data = JSON.stringify({
              type: 'text_delta',
              text: event.delta.text,
            })
            controller.enqueue(
              new TextEncoder().encode(`event: delta\ndata: ${data}\n\n`)
            )
          }
        },
      })

      controller.enqueue(
        new TextEncoder().encode(`event: stream_end\ndata: {}\n\n`)
      )
    } catch (error) {
      controller.enqueue(
        new TextEncoder().encode(`event: error\ndata: ${JSON.stringify({ error: String(error) })}\n\n`)
      )
    } finally {
      controller.close()
    }
  }

  async cancelGeneration(sessionId: string): Promise<void> {
    const runtime = this.runtime.get(sessionId)
    if (!runtime) return

    // 取消当前正在处理的请求
    if (runtime.abortController) {
      runtime.abortController.abort()
    }

    // 取消队列中所有等待的请求
    for (const request of runtime.requestQueue) {
      request.abortController.abort()
      request.reject(new Error('Session cancelled'))
    }
    runtime.requestQueue = []
  }

  /**
   * 取消特定请求
   * @param sessionId 会话ID
   * @param requestId 请求ID（可选，不提供则取消所有）
   */
  async cancelRequest(sessionId: string, requestId?: string): Promise<boolean> {
    const runtime = this.runtime.get(sessionId)
    if (!runtime) return false

    if (!requestId) {
      // 取消所有请求
      return this.cancelGeneration(sessionId).then(() => true)
    }

    // 查找并取消特定请求
    const index = runtime.requestQueue.findIndex((r) => r.id === requestId)
    if (index !== -1) {
      const request = runtime.requestQueue[index]!
      request.abortController.abort()
      request.reject(new Error('Request cancelled'))
      runtime.requestQueue.splice(index, 1)
      return true
    }

    // 检查是否是当前正在处理的请求
    // 当前请求无法从队列中移除，只能等待其完成
    return false
  }

  /**
   * 获取会话的请求队列状态
   */
  getQueueStatus(sessionId: string): { queueLength: number; isProcessing: boolean } | undefined {
    const runtime = this.runtime.get(sessionId)
    if (!runtime) return undefined
    return {
      queueLength: runtime.requestQueue.length,
      isProcessing: runtime.isProcessing,
    }
  }

  // 更新会话
  updateSession(sessionId: string, updates: Partial<Session>): Session {
    const session = this.store.getSession(sessionId)
    if (!session) {
      throw new Error('Session not found')
    }

    const nextSession: Session = {
      ...session,
      ...updates,
      updatedAt: this.now(),
    }

    this.store.updateSession(sessionId, {
      name: nextSession.name,
      cwd: nextSession.cwd,
      model: nextSession.model,
      metadata: nextSession.metadata,
      updatedAt: nextSession.updatedAt,
    })

    if (updates.messages !== undefined) {
      this.store.replaceMessages(sessionId, updates.messages)
    }

    return this.store.getSession(sessionId) as Session
  }

  // 获取消息历史
  getMessageHistory(sessionId: string, limit: number, offset: number): Message[] {
    if (!this.store.hasSession(sessionId)) {
      throw new Error('Session not found')
    }

    return this.store.getMessages(sessionId, { limit, offset })
  }

  // 执行工具
  async executeTool(
    toolName: string,
    input: unknown
  ): Promise<{ content: string; is_error?: boolean }> {
    const { toolRegistry } = await import('@cclocal/core')
    const tool = toolRegistry.get(toolName)

    if (!tool) {
      return {
        content: `Tool "${toolName}" not found`,
        is_error: true,
      }
    }

    const context = {
      sessionId: 'api-call',
      cwd: process.cwd(),
      abortSignal: undefined,
    }

    const result = await tool.execute(input, context)

    // Normalize content blocks to string for the API response
    if (typeof result.content === 'string') {
      return { content: result.content, is_error: result.is_error }
    }
    if (Array.isArray(result.content)) {
      const text = result.content.map((c: any) => c.text ?? JSON.stringify(c)).join('\n')
      return { content: text, is_error: result.is_error }
    }
    return { content: String(result.content), is_error: result.is_error }
  }

  private getOrCreateRuntime(sessionId: string): SessionRuntime {
    let runtime = this.runtime.get(sessionId)
    if (!runtime) {
      runtime = {
        requestQueue: [],
        isProcessing: false,
      }
      this.runtime.set(sessionId, runtime)
    }
    return runtime
  }

  /**
   * 处理会话的请求队列
   */
  private async _processQueue(sessionId: string): Promise<void> {
    const runtime = this.runtime.get(sessionId)
    if (!runtime) return

    runtime.isProcessing = true

    try {
      while (runtime.requestQueue.length > 0) {
        const request = runtime.requestQueue.shift()
        if (!request) break

        // 检查是否已取消
        if (request.abortController.signal.aborted) {
          request.reject(new Error('Request cancelled'))
          continue
        }

        try {
          await request.execute()
          request.resolve()
        } catch (error) {
          request.reject(error instanceof Error ? error : new Error(String(error)))
        }
      }
    } finally {
      runtime.isProcessing = false
    }
  }
}
