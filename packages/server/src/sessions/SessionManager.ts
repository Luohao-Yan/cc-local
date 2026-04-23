/**
 * 会话管理器
 */

import { randomUUID } from 'crypto'
import { QueryEngine, getSessionStore, toolRegistry } from '@cclocal/core'
import type { Session, Message, MessageOptions, StreamEvent } from '@cclocal/shared'
import type { SessionStore } from '@cclocal/core'

interface SessionRuntime {
  abortController?: AbortController
}

interface SessionManagerOptions {
  store?: SessionStore
  createQueryEngine?: (options: ConstructorParameters<typeof QueryEngine>[0]) => QueryEngine
  now?: () => number
}

export class SessionManager {
  private runtime = new Map<string, SessionRuntime>()
  private readonly store: SessionStore
  private readonly createQueryEngine: (options: ConstructorParameters<typeof QueryEngine>[0]) => QueryEngine
  private readonly now: () => number

  constructor(options: SessionManagerOptions = {}) {
    this.store = options.store ?? getSessionStore()
    this.createQueryEngine = options.createQueryEngine ?? ((queryOptions) => new QueryEngine(queryOptions))
    this.now = options.now ?? (() => Date.now())
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

  getSession(id: string): Session | undefined {
    return this.store.getSession(id)
  }

  getAllSessions(): Session[] {
    return this.store.listSessions()
  }

  deleteSession(id: string): void {
    const runtime = this.runtime.get(id)
    if (runtime?.abortController) {
      runtime.abortController.abort()
    }
    this.runtime.delete(id)
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

    // 创建新的 AbortController
    const runtime = this.getOrCreateRuntime(sessionId)
    runtime.abortController = new AbortController()

    try {
      // 添加用户消息
      const userMessage: Message = {
        id: randomUUID(),
        role: 'user',
        content: [{ type: 'text', text: content }],
        timestamp: this.now(),
      }
      this.store.addMessage(userMessage, sessionId)

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
      })

      // 发送流开始事件
      const messageId = randomUUID()
      controller.enqueue(
        new TextEncoder().encode(`event: stream_start\ndata: ${JSON.stringify({ messageId })}\n\n`)
      )

      // 调用 QueryEngine 获取流式响应
      const result = await queryEngine.query([...session.messages, userMessage], {
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
    if (runtime?.abortController) {
      runtime.abortController.abort()
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

    return await tool.execute(input, context)
  }

  private getOrCreateRuntime(sessionId: string): SessionRuntime {
    let runtime = this.runtime.get(sessionId)
    if (!runtime) {
      runtime = {}
      this.runtime.set(sessionId, runtime)
    }
    return runtime
  }
}
