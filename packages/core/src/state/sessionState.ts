/**
 * 会话状态管理 - 无 React 依赖
 * 基于 EventEmitter 实现状态变更通知
 */

import { EventEmitter } from 'events'
import type { Message, Session, SessionState, Tool } from '@cclocal/shared'

export interface SessionStateData {
  session: Session
  status: 'idle' | 'running' | 'error'
  currentMessageId?: string
  pendingToolCalls: string[]
  contextWindow: number
  tokenCount: number
  error?: string
}

export class SessionStateManager extends EventEmitter {
  private sessions = new Map<string, SessionStateData>()
  private tools = new Map<string, Tool>()

  createSession(session: Session): SessionStateData {
    const state: SessionStateData = {
      session,
      status: 'idle',
      pendingToolCalls: [],
      contextWindow: 0,
      tokenCount: 0,
    }
    this.sessions.set(session.id, state)
    this.emit('sessionCreated', session.id, state)
    return state
  }

  getSession(sessionId: string): SessionStateData | undefined {
    return this.sessions.get(sessionId)
  }

  updateSession(sessionId: string, update: Partial<SessionStateData>): void {
    const state = this.sessions.get(sessionId)
    if (!state) return

    Object.assign(state, update)
    this.emit('stateUpdate', sessionId, state)
  }

  addMessage(sessionId: string, message: Message): void {
    const state = this.sessions.get(sessionId)
    if (!state) return

    state.session.messages.push(message)
    state.session.updatedAt = Date.now()
    this.emit('messageAdded', sessionId, message)
    this.emit('stateUpdate', sessionId, state)
  }

  setStatus(sessionId: string, status: SessionStateData['status']): void {
    this.updateSession(sessionId, { status })
  }

  setCurrentMessageId(sessionId: string, messageId: string | undefined): void {
    this.updateSession(sessionId, { currentMessageId: messageId })
  }

  addPendingToolCall(sessionId: string, toolCallId: string): void {
    const state = this.sessions.get(sessionId)
    if (!state) return

    state.pendingToolCalls.push(toolCallId)
    this.emit('stateUpdate', sessionId, state)
  }

  removePendingToolCall(sessionId: string, toolCallId: string): void {
    const state = this.sessions.get(sessionId)
    if (!state) return

    const index = state.pendingToolCalls.indexOf(toolCallId)
    if (index > -1) {
      state.pendingToolCalls.splice(index, 1)
      this.emit('stateUpdate', sessionId, state)
    }
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId)
    this.emit('sessionDeleted', sessionId)
  }

  getAllSessions(): SessionStateData[] {
    return Array.from(this.sessions.values())
  }

  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool)
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values())
  }
}

// 全局状态管理器实例
export const sessionManager = new SessionStateManager()
