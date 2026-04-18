/**
 * 会话管理器
 */

import { randomUUID } from 'crypto'
import type { Session, Message, MessageOptions } from '@cclocal/shared'

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

      // 发送流开始事件
      controller.enqueue(
        new TextEncoder().encode(`event: stream_start\ndata: ${JSON.stringify({ messageId: randomUUID() })}\n\n`)
      )

      // TODO: 调用 AI 模型生成回复
      // 这里是占位实现，实际应该调用 QueryEngine
      await this.mockStreamResponse(controller, session.abortController.signal)

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

  private async mockStreamResponse(
    controller: ReadableStreamDefaultController,
    signal: AbortSignal
  ): Promise<void> {
    // 模拟流式响应
    const words = ['Hello', 'from', 'CCLocal', 'Server!', 'This', 'is', 'a', 'mock', 'response.']

    for (const word of words) {
      if (signal.aborted) {
        throw new Error('AbortError')
      }

      const data = JSON.stringify({
        type: 'text_delta',
        text: word + ' ',
      })

      controller.enqueue(
        new TextEncoder().encode(`event: delta\ndata: ${data}\n\n`)
      )

      // 模拟延迟
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    // 添加助手消息到会话
    const assistantMessage: Message = {
      id: randomUUID(),
      role: 'assistant',
      content: [{ type: 'text', text: words.join(' ') }],
      timestamp: Date.now(),
    }

    // 找到当前会话并添加消息
    for (const session of this.sessions.values()) {
      if (session.abortController) {
        session.messages.push(assistantMessage)
        break
      }
    }
  }
}
