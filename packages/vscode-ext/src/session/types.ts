/**
 * Session Types for CCLocal VS Code Extension
 * Extends shared Session types with VS Code-specific features
 */

import type { Session, SessionMetadata, Message } from '@cclocal/shared'

// ─── Re-exports ────────────────────────────────────────────────────────────────

export type { Session, SessionMetadata, Message }

// ─── Extended Types ─────────────────────────────────────────────────────────────

/**
 * Session status in the extension
 */
export type SessionStatus = 'idle' | 'running' | 'paused' | 'error' | 'loading'

/**
 * Session info for list display (no messages loaded)
 */
export interface SessionListItem {
  /** Session ID */
  id: string

  /** Session display name */
  name: string

  /** Working directory */
  cwd: string

  /** Model used */
  model: string

  /** Creation timestamp */
  createdAt: number

  /** Last update timestamp */
  updatedAt: number

  /** Current status */
  status: SessionStatus

  /** Message count */
  messageCount: number

  /** Last message preview */
  lastMessagePreview?: string

  /** Whether this is the active session */
  isActive: boolean

  /** Session tags */
  tags?: string[]

  /** Is this a fork of another session? */
  isFork?: boolean

  /** Source session ID (if fork) */
  forkSourceId?: string
}

/**
 * Full session with messages
 */
export interface SessionDetail {
  session: Session
  status: SessionStatus
  messageCount: number
  tokenCount: number
  contextWindow: number
}

/**
 * Session event types
 */
export type SessionEventType =
  | 'session_created'
  | 'session_loaded'
  | 'session_updated'
  | 'session_renamed'
  | 'session_deleted'
  | 'session_forked'
  | 'session_status_changed'
  | 'session_message_added'
  | 'session_teleported'
  | 'active_session_changed'

/**
 * Session event
 */
export interface SessionEvent {
  type: SessionEventType
  sessionId: string
  data?: unknown
}

/**
 * Session create options
 */
export interface SessionCreateOptions {
  /** Custom session name */
  name?: string

  /** Working directory override */
  cwd?: string

  /** Model override */
  model?: string

  /** Initial system prompt */
  systemPrompt?: string

  /** Tags */
  tags?: string[]

  /** Resume from existing session ID */
  resumeFromId?: string

  /** Fork from existing session ID */
  forkFromId?: string
}

/**
 * Session search query
 */
export interface SessionSearchQuery {
  /** Text search in name and messages */
  text?: string

  /** Filter by model */
  model?: string

  /** Filter by date range */
  fromDate?: number

  /** Filter by date range */
  toDate?: number

  /** Filter by tags */
  tags?: string[]

  /** Maximum results */
  limit?: number
}

/**
 * Session teleport options
 */
export interface SessionTeleportOptions {
  /** Target remote ID */
  remoteId: string

  /** Include full message history */
  includeHistory?: boolean
}

/**
 * Session stats
 */
export interface SessionManagerStats {
  totalSessions: number
  activeSessionId?: string
  byStatus: Record<SessionStatus, number>
  totalMessages: number
  oldestSession?: number
  newestSession?: number
}
