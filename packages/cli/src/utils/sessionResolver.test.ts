/**
 * Tests for the session resolver and new SessionStore methods
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { SessionStore, DatabaseConnection } from '@cclocal/core'
import type { Message, Session } from '@cclocal/shared'

describe('sessionResolver', () => {
  let store: SessionStore
  let db: DatabaseConnection

  beforeEach(() => {
    db = DatabaseConnection.create(':memory:')
    db.initTables()
    store = new SessionStore(db)
  })

  afterEach(() => {
    db.close()
  })

  function createSession(id: string, cwd: string, model = 'test-model'): Session {
    const session: Session = {
      id,
      name: `Test ${id}`,
      cwd,
      model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    }
    store.createSession(session)
    return session
  }

  function addMessage(sessionId: string, role: 'user' | 'assistant', text: string): void {
    const msg: Message = {
      id: `msg-${sessionId}-${Math.random().toString(36).slice(2, 8)}`,
      role,
      content: [{ type: 'text', text }],
      timestamp: Date.now(),
    }
    store.addMessage(msg, sessionId)
  }

  describe('SessionStore.findSessionByCwd', () => {
    it('finds the most recently updated session for a cwd', () => {
      createSession('s1', '/project/a')
      createSession('s2', '/project/a')
      store.updateSession('s2', { name: 'Updated' })

      const found = store.findSessionByCwd('/project/a')
      expect(found).toBeDefined()
      expect(found!.id).toBe('s2')
    })

    it('returns undefined when no session matches cwd', () => {
      createSession('s1', '/project/a')
      const found = store.findSessionByCwd('/project/b')
      expect(found).toBeUndefined()
    })
  })

  describe('SessionStore.forkSession', () => {
    it('creates a new session with copied messages', () => {
      createSession('source', '/project/x')
      addMessage('source', 'user', 'Hello')
      addMessage('source', 'assistant', 'Hi there')

      const forked = store.forkSession('source')
      expect(forked.id).not.toBe('source')
      expect(forked.name).toContain('(fork)')
      expect(forked.cwd).toBe('/project/x')

      const forkedMessages = store.getMessages(forked.id)
      expect(forkedMessages.length).toBe(2)
      expect(forkedMessages[0].role).toBe('user')
      expect(forkedMessages[1].role).toBe('assistant')

      const sourceMessages = store.getMessages('source')
      expect(sourceMessages.length).toBe(2)
    })

    it('allows overriding cwd, model, and name on fork', () => {
      createSession('source', '/project/x', 'model-a')

      const forked = store.forkSession('source', {
        cwd: '/project/y',
        model: 'model-b',
        name: 'Custom fork',
      })
      expect(forked.cwd).toBe('/project/y')
      expect(forked.model).toBe('model-b')
      expect(forked.name).toBe('Custom fork')
    })

    it('throws if source session does not exist', () => {
      expect(() => store.forkSession('nonexistent')).toThrow('not found')
    })
  })

  describe('resolveSession', () => {
    it('creates new session when no flags given', async () => {
      const { resolveSession } = await import('./sessionResolver.js')
      const result = await resolveSession({ store })

      expect(result.sessionId).toBeDefined()
      expect(result.messages.length).toBe(0)
      expect(result.forked).toBe(false)

      const stored = store.getSession(result.sessionId)
      expect(stored).toBeDefined()
    })

    it('resolves --session-id directly', async () => {
      createSession('my-session', '/project/z')

      const { resolveSession } = await import('./sessionResolver.js')
      const result = await resolveSession({ sessionId: 'my-session', store })

      expect(result.sessionId).toBe('my-session')
      expect(result.forked).toBe(false)
    })

    it('resolves --resume with explicit ID', async () => {
      createSession('explicit-id', '/project/a')
      addMessage('explicit-id', 'user', 'Test message')

      const { resolveSession } = await import('./sessionResolver.js')
      const result = await resolveSession({ resume: 'explicit-id', store })

      expect(result.sessionId).toBe('explicit-id')
      expect(result.messages.length).toBe(1)
      expect(result.forked).toBe(false)
    })

    it('resolves --resume with explicit ID and --fork-session', async () => {
      createSession('fork-source', '/project/a')
      addMessage('fork-source', 'user', 'Message to copy')

      const { resolveSession } = await import('./sessionResolver.js')
      const result = await resolveSession({ resume: 'fork-source', forkSession: true, store })

      expect(result.sessionId).not.toBe('fork-source')
      expect(result.forked).toBe(true)
      expect(result.messages.length).toBe(0)
    })

    it('throws for --resume with nonexistent ID', async () => {
      const { resolveSession } = await import('./sessionResolver.js')
      await expect(resolveSession({ resume: 'nonexistent', store })).rejects.toThrow('not found')
    })

    it('resolves bare --resume by cwd match', async () => {
      createSession('cwd-match', '/test/cwd')
      addMessage('cwd-match', 'user', 'Previous context')

      const { resolveSession } = await import('./sessionResolver.js')
      const result = await resolveSession({ resume: true, cwd: '/test/cwd', store })

      expect(result.sessionId).toBe('cwd-match')
      expect(result.messages.length).toBe(1)
    })

    it('resolves --continue by cwd match', async () => {
      createSession('continue-match', '/test/continue')

      const { resolveSession } = await import('./sessionResolver.js')
      const result = await resolveSession({ continue: true, cwd: '/test/continue', store })

      expect(result.sessionId).toBe('continue-match')
    })

    it('throws for bare --resume when no sessions exist', async () => {
      const { resolveSession } = await import('./sessionResolver.js')
      await expect(resolveSession({ resume: true, store })).rejects.toThrow('No resumable session')
    })
  })
})
