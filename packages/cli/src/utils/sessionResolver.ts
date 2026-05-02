/**
 * Session resolver for native/bridge paths
 *
 * Resolves --resume, --continue, --fork-session, and --session-id flags
 * using SessionStore directly (no CCLocalClient REST needed).
 */

import { getSessionStore, type Session } from '@cclocal/core'

export interface ResolvedSession {
  sessionId: string
  /** The session to use (may be a fork) */
  session: Session
  /** Existing messages for resume/continue (empty for new sessions) */
  messages: import('@cclocal/shared').Message[]
  /** Whether a fork was created */
  forked: boolean
}

export interface SessionResolveOptions {
  /** Explicit session ID from --session-id */
  sessionId?: string
  /** --resume with explicit ID or bare flag */
  resume?: string | boolean
  /** --continue flag */
  continue?: boolean
  /** --fork-session flag (used with --resume or --continue) */
  forkSession?: boolean
  /** Working directory for matching */
  cwd?: string
  /** Model override for forked sessions */
  model?: string
  /** Optional store override for testing */
  store?: import('@cclocal/core').SessionStore
}

/**
 * Resolve session flags into a concrete session + messages.
 *
 * Priority:
 * 1. --session-id <id> → use that session directly
 * 2. --resume <id>     → use that session (optionally fork)
 * 3. --resume / --continue → find by cwd (optionally fork)
 * 4. default           → create new session
 */
export async function resolveSession(options: SessionResolveOptions): Promise<ResolvedSession> {
  const store = options.store ?? getSessionStore()
  const cwd = options.cwd ?? process.cwd()

  // Case 1: --session-id <id>
  if (options.sessionId && typeof options.sessionId === 'string') {
    const session = store.getSession(options.sessionId)
    if (!session) throw new Error(`Session ${options.sessionId} not found`)
    const messages = store.getMessages(options.sessionId)
    return { sessionId: options.sessionId, session, messages, forked: false }
  }

  // Case 2: --resume <id> (explicit session ID)
  if (options.resume && typeof options.resume === 'string') {
    if (options.forkSession) {
      const forked = store.forkSession(options.resume, { cwd, model: options.model })
      return { sessionId: forked.id, session: forked, messages: [], forked: true }
    }
    const session = store.getSession(options.resume)
    if (!session) throw new Error(`Session ${options.resume} not found`)
    const messages = store.getMessages(options.resume)
    return { sessionId: options.resume, session, messages, forked: false }
  }

  // Case 3: --resume (bare) or --continue → find by cwd
  if (options.resume || options.continue) {
    const match = store.findSessionByCwd(cwd) ?? store.listSessions(50)[0]
    if (!match) {
      throw new Error(
        `No resumable session found for "${cwd}". Use "sessions list" to inspect available sessions.`
      )
    }
    if (options.forkSession) {
      const forked = store.forkSession(match.id, { cwd, model: options.model })
      return { sessionId: forked.id, session: forked, messages: [], forked: true }
    }
    const messages = store.getMessages(match.id)
    return { sessionId: match.id, session: match, messages, forked: false }
  }

  // Case 4: new session
  const { randomUUID } = await import('crypto')
  const newId = randomUUID()
  const now = Date.now()
  const session: Session = {
    id: newId,
    name: `Session ${newId.slice(0, 8)}`,
    cwd,
    model: options.model ?? 'claude-sonnet-4-6',
    createdAt: now,
    updatedAt: now,
    messages: [],
  }
  store.createSession(session)
  return { sessionId: newId, session, messages: [], forked: false }
}
