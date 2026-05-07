/**
 * Session Storage for CCLocal VS Code Extension
 * Handles chat session persistence and restoration
 */

import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import type { ChatMessage, SessionMetadata, Session } from '@cclocal/shared'

const SESSIONS_DIR = 'sessions'
const MAX_SESSIONS = 50
const SESSION_EXPIRY_DAYS = 30

export class SessionStorage {
  private context: vscode.ExtensionContext
  private sessionsDir: string

  constructor(context: vscode.ExtensionContext) {
    this.context = context
    this.sessionsDir = this.getSessionsDirectory()
    this.ensureSessionsDirectory()
  }

  // ─── Session Management ──────────────────────────────────────────────────────

  /**
   * Save a session
   */
  async saveSession(sessionId: string, messages: ChatMessage[]): Promise<void> {
    const session: Session = {
      id: sessionId,
      messages,
      metadata: {
        id: sessionId,
        timestamp: Date.now(),
        workspace: this.getCurrentWorkspace(),
        messageCount: messages.length,
        title: this.generateTitle(messages),
      },
    }

    // Save to global state for quick access
    await this.context.globalState.update(`session.${sessionId}`, session)

    // Also save to file for persistence across sessions
    await this.saveSessionToFile(session)
  }

  /**
   * Load a session by ID
   */
  async loadSession(sessionId: string): Promise<ChatMessage[] | undefined> {
    // Try global state first
    const session = this.context.globalState.get<Session>(`session.${sessionId}`)
    if (session) {
      return session.messages
    }

    // Try file storage
    const fileSession = await this.loadSessionFromFile(sessionId)
    return fileSession?.messages
  }

  /**
   * Get session metadata
   */
  async getSessionMetadata(sessionId: string): Promise<SessionMetadata | undefined> {
    const session = this.context.globalState.get<Session>(`session.${sessionId}`)
    if (session) {
      return session.metadata
    }

    const fileSession = await this.loadSessionFromFile(sessionId)
    return fileSession?.metadata
  }

  /**
   * List all sessions
   */
  async listSessions(): Promise<SessionMetadata[]> {
    const sessions: SessionMetadata[] = []

    // From global state
    const keys = this.context.globalState.keys().filter((k) => k.startsWith('session.'))
    for (const key of keys) {
      const session = this.context.globalState.get<Session>(key)
      if (session?.metadata) {
        sessions.push(session.metadata)
      }
    }

    // From file storage
    const fileSessions = await this.listFileSessions()
    for (const fileSession of fileSessions) {
      if (!sessions.some((s) => s.id === fileSession.id)) {
        sessions.push(fileSession)
      }
    }

    // Sort by timestamp (newest first)
    sessions.sort((a, b) => b.timestamp - a.timestamp)

    return sessions.slice(0, MAX_SESSIONS)
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    // Remove from global state
    await this.context.globalState.update(`session.${sessionId}`, undefined)

    // Remove from file storage
    await this.deleteSessionFile(sessionId)
  }

  /**
   * Get the most recent session for the current workspace
   */
  async getRecentSession(): Promise<Session | undefined> {
    const currentWorkspace = this.getCurrentWorkspace()
    const sessions = await this.listSessions()

    // Find most recent session for current workspace
    const recentSession = sessions.find((s) => s.workspace === currentWorkspace)
    if (recentSession) {
      return this.loadSessionFromFile(recentSession.id)
    }

    return undefined
  }

  /**
   * Generate a new session ID
   */
  generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────────

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    const sessions = await this.listSessions()
    const expiryTime = Date.now() - SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000

    for (const session of sessions) {
      if (session.timestamp < expiryTime) {
        await this.deleteSession(session.id)
      }
    }
  }

  /**
   * Clear all sessions
   */
  async clearAllSessions(): Promise<void> {
    const keys = this.context.globalState.keys().filter((k) => k.startsWith('session.'))
    for (const key of keys) {
      await this.context.globalState.update(key, undefined)
    }

    // Clear file storage
    if (fs.existsSync(this.sessionsDir)) {
      const files = fs.readdirSync(this.sessionsDir)
      for (const file of files) {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(this.sessionsDir, file))
        }
      }
    }
  }

  // ─── File Storage ────────────────────────────────────────────────────────────

  private async saveSessionToFile(session: Session): Promise<void> {
    const filePath = this.getSessionFilePath(session.id)
    const content = JSON.stringify(session, null, 2)

    try {
      await fs.promises.writeFile(filePath, content, 'utf8')
    } catch (error) {
      console.error(`Failed to save session to file: ${error}`)
    }
  }

  private async loadSessionFromFile(sessionId: string): Promise<Session | undefined> {
    const filePath = this.getSessionFilePath(sessionId)

    try {
      const content = await fs.promises.readFile(filePath, 'utf8')
      return JSON.parse(content) as Session
    } catch {
      return undefined
    }
  }

  private async listFileSessions(): Promise<SessionMetadata[]> {
    const sessions: SessionMetadata[] = []

    try {
      const files = await fs.promises.readdir(this.sessionsDir)

      for (const file of files) {
        if (!file.endsWith('.json')) continue

        const filePath = path.join(this.sessionsDir, file)
        try {
          const content = await fs.promises.readFile(filePath, 'utf8')
          const session = JSON.parse(content) as Session
          sessions.push(session.metadata)
        } catch {
          // Skip invalid files
        }
      }
    } catch {
      // Directory doesn't exist
    }

    return sessions
  }

  private async deleteSessionFile(sessionId: string): Promise<void> {
    const filePath = this.getSessionFilePath(sessionId)

    try {
      await fs.promises.unlink(filePath)
    } catch {
      // File doesn't exist
    }
  }

  // ─── Helper Methods ──────────────────────────────────────────────────────────

  private getSessionsDirectory(): string {
    const globalStoragePath = this.context.globalStorageUri.fsPath
    return path.join(globalStoragePath, SESSIONS_DIR)
  }

  private getSessionFilePath(sessionId: string): string {
    return path.join(this.sessionsDir, `${sessionId}.json`)
  }

  private ensureSessionsDirectory(): void {
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true })
    }
  }

  private getCurrentWorkspace(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  }

  private generateTitle(messages: ChatMessage[]): string {
    // Use the first user message as the title
    const firstUserMessage = messages.find((m) => m.role === 'user')
    if (!firstUserMessage) {
      return 'New Conversation'
    }

    const textBlock = firstUserMessage.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return 'New Conversation'
    }

    // Truncate to 50 characters
    const text = textBlock.text.trim()
    if (text.length <= 50) {
      return text
    }

    return text.slice(0, 47) + '...'
  }
}
