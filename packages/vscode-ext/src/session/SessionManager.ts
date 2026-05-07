/**
 * Session Manager for CCLocal VS Code Extension
 * Manages session lifecycle, persistence, search, forking, and title generation
 */

import * as vscode from 'vscode'
import * as crypto from 'crypto'
import type {
  Session,
  SessionMetadata,
  Message,
} from '@cclocal/shared'
import type {
  SessionListItem,
  SessionDetail,
  SessionStatus,
  SessionEventType,
  SessionEvent,
  SessionCreateOptions,
  SessionSearchQuery,
  SessionManagerStats,
} from './types'

// ─── Session Manager ────────────────────────────────────────────────────────────

export class SessionManager implements vscode.Disposable {
  private outputChannel: vscode.LogOutputChannel
  private context: vscode.ExtensionContext

  /** Active sessions in memory */
  private sessions: Map<string, Session>

  /** Current active session ID */
  private activeSessionId: string | null

  /** Session statuses */
  private statuses: Map<string, SessionStatus>

  /** Event emitter */
  private eventEmitter: vscode.EventEmitter<SessionEvent>

  /** Event for consumers */
  readonly onDidSessionEvent: vscode.Event<SessionEvent>

  constructor(
    context: vscode.ExtensionContext,
    outputChannel: vscode.LogOutputChannel
  ) {
    this.context = context
    this.outputChannel = outputChannel
    this.sessions = new Map()
    this.activeSessionId = null
    this.statuses = new Map()
    this.eventEmitter = new vscode.EventEmitter<SessionEvent>()
    this.onDidSessionEvent = this.eventEmitter.event

    // Load persisted session list
    this.loadSessionList()

    this.outputChannel.debug('SessionManager initialized')
  }

  // ─── Session CRUD ───────────────────────────────────────────────────────────

  /**
   * Create a new session
   */
  async create(options: SessionCreateOptions = {}): Promise<Session> {
    const id = crypto.randomUUID()
    const now = Date.now()
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd()

    const session: Session = {
      id,
      name: options.name || `Session ${this.sessions.size + 1}`,
      messages: [],
      cwd: options.cwd || workspaceRoot,
      model: options.model || '',
      createdAt: now,
      updatedAt: now,
      metadata: {
        tags: options.tags,
      },
    }

    // If resuming, copy messages from source
    if (options.resumeFromId) {
      const source = this.sessions.get(options.resumeFromId)
      if (source) {
        session.messages = [...source.messages]
        session.name = options.name || `Resumed: ${source.name}`
      }
    }

    // If forking, copy messages from source with fork metadata
    if (options.forkFromId) {
      const source = this.sessions.get(options.forkFromId)
      if (source) {
        session.messages = [...source.messages]
        session.name = options.name || `${source.name} (fork)`
        session.metadata = {
          ...source.metadata,
          tags: options.tags,
          forkSourceId: options.forkFromId,
        }
        this.emitEvent('session_forked', id, { sourceId: options.forkFromId })
      }
    }

    // Add system prompt if provided
    if (options.systemPrompt) {
      session.messages.push({
        id: crypto.randomUUID(),
        role: 'system',
        content: options.systemPrompt,
        timestamp: now,
      })
    }

    this.sessions.set(id, session)
    this.statuses.set(id, 'idle')
    this.activeSessionId = id

    await this.persistSessionList()
    this.emitEvent('session_created', id)
    this.emitEvent('active_session_changed', id)

    this.outputChannel.info(`Created session: ${id} (${session.name})`)
    return session
  }

  /**
   * Load an existing session
   */
  async load(id: string): Promise<Session | undefined> {
    let session = this.sessions.get(id)

    if (!session) {
      // Try to load from persisted data
      const stored = this.getStoredSession(id)
      if (stored) {
        session = stored
        this.sessions.set(id, session)
      }
    }

    if (session) {
      this.activeSessionId = id
      if (!this.statuses.has(id)) {
        this.statuses.set(id, 'idle')
      }
      this.emitEvent('session_loaded', id)
      this.emitEvent('active_session_changed', id)
    }

    return session
  }

  /**
   * Save a session
   */
  async save(id: string): Promise<boolean> {
    const session = this.sessions.get(id)
    if (!session) return false

    session.updatedAt = Date.now()
    await this.persistSessionList()
    this.emitEvent('session_updated', id)
    return true
  }

  /**
   * Delete a session
   */
  async delete(id: string): Promise<boolean> {
    if (!this.sessions.has(id)) return false

    this.sessions.delete(id)
    this.statuses.delete(id)

    if (this.activeSessionId === id) {
      this.activeSessionId = this.sessions.keys().next().value || null
      this.emitEvent('active_session_changed', this.activeSessionId || '')
    }

    await this.persistSessionList()
    this.emitEvent('session_deleted', id)
    this.outputChannel.info(`Deleted session: ${id}`)
    return true
  }

  /**
   * Rename a session
   */
  async rename(id: string, newName: string): Promise<boolean> {
    const session = this.sessions.get(id)
    if (!session) return false

    session.name = newName
    session.updatedAt = Date.now()
    await this.persistSessionList()
    this.emitEvent('session_renamed', id, { name: newName })
    return true
  }

  // ─── Message Management ────────────────────────────────────────────────────

  /**
   * Add a message to a session
   */
  addMessage(sessionId: string, message: Message): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    session.messages.push(message)
    session.updatedAt = Date.now()
    this.emitEvent('session_message_added', sessionId, { messageId: message.id })
    return true
  }

  /**
   * Get messages for a session
   */
  getMessages(sessionId: string, options?: { limit?: number; offset?: number }): Message[] {
    const session = this.sessions.get(sessionId)
    if (!session) return []

    const limit = options?.limit
    const offset = options?.offset ?? 0

    if (limit === undefined) {
      return session.messages.slice(offset)
    }
    return session.messages.slice(offset, offset + limit)
  }

  /**
   * Replace all messages in a session
   */
  replaceMessages(sessionId: string, messages: Message[]): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    session.messages = messages
    session.updatedAt = Date.now()
    this.emitEvent('session_updated', sessionId)
    return true
  }

  // ─── Session Status ──────────────────────────────────────────────────────────

  /**
   * Get session status
   */
  getStatus(sessionId: string): SessionStatus {
    return this.statuses.get(sessionId) || 'idle'
  }

  /**
   * Set session status
   */
  setStatus(sessionId: string, status: SessionStatus): void {
    const prev = this.statuses.get(sessionId)
    if (prev === status) return

    this.statuses.set(sessionId, status)
    this.emitEvent('session_status_changed', sessionId, { status, previousStatus: prev })
  }

  // ─── Active Session ──────────────────────────────────────────────────────────

  /**
   * Get the active session ID
   */
  getActiveSessionId(): string | null {
    return this.activeSessionId
  }

  /**
   * Get the active session
   */
  getActiveSession(): Session | undefined {
    if (!this.activeSessionId) return undefined
    return this.sessions.get(this.activeSessionId)
  }

  /**
   * Switch the active session
   */
  async switchSession(id: string): Promise<boolean> {
    if (!this.sessions.has(id)) return false

    // Save current session first
    if (this.activeSessionId) {
      await this.save(this.activeSessionId)
    }

    this.activeSessionId = id
    this.emitEvent('active_session_changed', id)
    return true
  }

  // ─── Session List ────────────────────────────────────────────────────────────

  /**
   * List all sessions as list items (no messages)
   */
  listSessions(): SessionListItem[] {
    const items: SessionListItem[] = []
    const sortedSessions = Array.from(this.sessions.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)

    for (const session of sortedSessions) {
      const lastMsg = session.messages.length > 0
        ? session.messages[session.messages.length - 1]
        : undefined

      let preview: string | undefined
      if (lastMsg) {
        const content = lastMsg.content
        if (typeof content === 'string') {
          preview = content.slice(0, 80)
        } else if (Array.isArray(content)) {
          const textBlock = content.find(
            (b: any) => b.type === 'text' && typeof b.text === 'string'
          )
          if (textBlock) {
            preview = (textBlock as any).text.slice(0, 80)
          }
        }
      }

      items.push({
        id: session.id,
        name: session.name,
        cwd: session.cwd,
        model: session.model,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        status: this.statuses.get(session.id) || 'idle',
        messageCount: session.messages.length,
        lastMessagePreview: preview,
        isActive: session.id === this.activeSessionId,
        tags: session.metadata?.tags,
        isFork: !!session.metadata?.forkSourceId,
        forkSourceId: session.metadata?.forkSourceId,
      })
    }

    return items
  }

  /**
   * Get session detail (with messages)
   */
  getSessionDetail(id: string): SessionDetail | undefined {
    const session = this.sessions.get(id)
    if (!session) return undefined

    return {
      session,
      status: this.statuses.get(id) || 'idle',
      messageCount: session.messages.length,
      tokenCount: 0, // Estimated on the fly
      contextWindow: 0,
    }
  }

  // ─── Search ──────────────────────────────────────────────────────────────────

  /**
   * Search sessions
   */
  search(query: SessionSearchQuery): SessionListItem[] {
    let results = this.listSessions()

    if (query.text) {
      const q = query.text.toLowerCase()
      results = results.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.lastMessagePreview || '').toLowerCase().includes(q) ||
        (s.tags || []).some(t => t.toLowerCase().includes(q))
      )
    }

    if (query.model) {
      results = results.filter(s => s.model === query.model)
    }

    if (query.fromDate) {
      results = results.filter(s => s.updatedAt >= query.fromDate!)
    }

    if (query.toDate) {
      results = results.filter(s => s.updatedAt <= query.toDate!)
    }

    if (query.tags?.length) {
      results = results.filter(s =>
        query.tags!.some(t => (s.tags || []).includes(t))
      )
    }

    return results.slice(0, query.limit || 50)
  }

  // ─── Fork ──────────────────────────────────────────────────────────────────

  /**
   * Fork a session (create copy with new ID)
   */
  async fork(sourceId: string, options?: { name?: string; cwd?: string; model?: string }): Promise<Session> {
    const source = this.sessions.get(sourceId)
    if (!source) {
      throw new Error(`Session ${sourceId} not found`)
    }

    return this.create({
      name: options?.name || `${source.name} (fork)`,
      cwd: options?.cwd || source.cwd,
      model: options?.model || source.model,
      forkFromId: sourceId,
      tags: source.metadata?.tags,
    })
  }

  // ─── Title Generation ────────────────────────────────────────────────────────

  /**
   * Auto-generate a title for a session based on its first user message
   */
  async generateTitle(sessionId: string): Promise<string | null> {
    const session = this.sessions.get(sessionId)
    if (!session) return null

    // Find the first user message
    const firstUserMsg = session.messages.find(m => m.role === 'user')
    if (!firstUserMsg) return null

    let text = ''
    if (typeof firstUserMsg.content === 'string') {
      text = firstUserMsg.content
    } else if (Array.isArray(firstUserMsg.content)) {
      const textBlock = firstUserMsg.content.find(
        (b: any) => b.type === 'text' && typeof b.text === 'string'
      )
      if (textBlock) text = (textBlock as any).text
    }

    if (!text) return null

    // Simple title generation: take first line, truncate
    const firstLine = text.split('\n')[0].trim()
    const title = firstLine.length > 60
      ? firstLine.slice(0, 57) + '...'
      : firstLine

    await this.rename(sessionId, title)
    return title
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  /**
   * Get session manager statistics
   */
  getStats(): SessionManagerStats {
    const byStatus: Record<SessionStatus, number> = {
      idle: 0,
      running: 0,
      paused: 0,
      error: 0,
      loading: 0,
    }

    for (const status of this.statuses.values()) {
      byStatus[status]++
    }

    const sessions = Array.from(this.sessions.values())
    const totalMessages = sessions.reduce((sum, s) => sum + s.messages.length, 0)

    return {
      totalSessions: this.sessions.size,
      activeSessionId: this.activeSessionId || undefined,
      byStatus,
      totalMessages,
      oldestSession: sessions.length > 0
        ? Math.min(...sessions.map(s => s.createdAt))
        : undefined,
      newestSession: sessions.length > 0
        ? Math.max(...sessions.map(s => s.updatedAt))
        : undefined,
    }
  }

  // ─── Persistence ──────────────────────────────────────────────────────────

  private async persistSessionList(): Promise<void> {
    const list = this.listSessions().map(s => ({
      id: s.id,
      name: s.name,
      cwd: s.cwd,
      model: s.model,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      tags: s.tags,
      isFork: s.isFork,
      forkSourceId: s.forkSourceId,
    }))

    await this.context.globalState.update('cclocal.sessions', list)
  }

  private loadSessionList(): void {
    const stored = this.context.globalState.get<Array<{
      id: string
      name: string
      cwd: string
      model: string
      createdAt: number
      updatedAt: number
      tags?: string[]
      isFork?: boolean
      forkSourceId?: string
    }>>('cclocal.sessions')

    if (!stored) return

    for (const item of stored) {
      const session: Session = {
        id: item.id,
        name: item.name,
        messages: [], // Messages loaded on demand
        cwd: item.cwd,
        model: item.model,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        metadata: {
          tags: item.tags,
          forkSourceId: item.forkSourceId,
        },
      }

      this.sessions.set(item.id, session)
      this.statuses.set(item.id, 'idle')
    }

    this.outputChannel.debug(`Loaded ${stored.length} sessions from globalState`)
  }

  private getStoredSession(id: string): Session | undefined {
    // Full session with messages stored separately
    const stored = this.context.globalState.get<Record<string, Message[]>>(
      `cclocal.session_messages_${id}`
    )
    const session = this.sessions.get(id)
    if (!session) return undefined

    if (stored) {
      session.messages = Object.values(stored)
    }

    return session
  }

  // ─── Event Helpers ──────────────────────────────────────────────────────────

  private emitEvent(type: SessionEventType, sessionId: string, data?: unknown): void {
    this.eventEmitter.fire({ type, sessionId, data })
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  dispose(): void {
    this.eventEmitter.dispose()
    this.sessions.clear()
    this.statuses.clear()
    this.outputChannel.debug('SessionManager disposed')
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────────

let instance: SessionManager | null = null

export function getSessionManager(
  context?: vscode.ExtensionContext,
  outputChannel?: vscode.LogOutputChannel
): SessionManager {
  if (!instance && context && outputChannel) {
    instance = new SessionManager(context, outputChannel)
  }
  return instance!
}

export function disposeSessionManager(): void {
  if (instance) {
    instance.dispose()
    instance = null
  }
}
