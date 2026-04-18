/**
 * 会话管理器
 */

import { randomUUID } from 'crypto'
import { QueryEngine } from '@cclocal/core'
import type { Session, Message, MessageOptions, StreamEvent } from '@cclocal/shared'

interface SessionInternal extends Session {
  abortController?: AbortController
}

export class SessionManager {
  private sessions = new Map<string, SessionInternal>()

  async createSession(options: { name?: string; cwd?: string; model?: string }): Promise<Session> {
    const session: SessionInternal = {
      id: randomUUID(),
      name: options.name || 'New Session',
      messages: [],
      cwd: options.cwd || process.cwd(),
      model: options.model || 'default',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    this.sessions.set(session.id, session)
    return session
  }

  getSession(id: string): Session | undefined {
    return this.sessions.get(id)
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values())
  }

  deleteSession(id: string): void {
    const session = this.sessions.get(id)
    if (session?.abortController) {
      session.abortController.abort()
    }
    this.sessions.delete(id)
  }

  async sendMessageStream(
    sessionId: string,
    content: string,
    options: MessageOptions,
    controller: ReadableStreamDefaultController
  ): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      controller.enqueue(new TextEncoder().encode('event: error\ndata: Session not found\n\n'))
      controller.close()
      return
    }

    // 创建新的 AbortController
    session.abortController = new AbortController()

    try {
      // 添加用户消息
      const userMessage: Message = {
        id: randomUUID(),
        role: 'user',
        content: [{ type: 'text', text: content }],
        timestamp: Date.now(),
      }
      session.messages.push(userMessage)

      // 使用 QueryEngine 处理消息
      const queryEngine = new QueryEngine({
        model: options.model || session.model || 'default',
        systemPrompt: options.systemPrompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      })

      // 发送流开始事件
      const messageId = randomUUID()
      controller.enqueue(
        new TextEncoder().encode(`event: stream_start\ndata: ${JSON.stringify({ messageId })}\n\n`)
      )

      // 调用 QueryEngine 获取流式响应
      const result = await queryEngine.query(session.messages, {
        onStream: (event: StreamEvent) => {
          if (session.abortController?.signal.aborted) {
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
      session.messages.push(result.message)

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
      session.abortController = undefined
      session.updatedAt = Date.now()
      controller.close()
    }
  }

  async cancelGeneration(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session?.abortController) {
      session.abortController.abort()
    }
  }

  // 保留的空方法，后续可添加其他辅助功能
}
