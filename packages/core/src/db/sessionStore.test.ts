import { describe, expect, it, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { DatabaseConnection } from './connection.js'
import { SessionStore } from './sessionStore.js'
import type { Session } from '@cclocal/shared'

describe('SessionStore', () => {
  const tempDirs: string[] = []

  afterEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100))

    while (tempDirs.length > 0) {
      const dir = tempDirs.pop()
      if (dir) {
        try {
          rmSync(dir, { recursive: true, force: true })
        } catch {
          // Ignore cleanup errors on Windows
        }
      }
    }
  })

  function createStore(): { store: SessionStore; connection: DatabaseConnection } {
    const tempDir = mkdtempSync(join(tmpdir(), 'cclocal-session-'))
    tempDirs.push(tempDir)

    const dbPath = join(tempDir, 'test.db')
    const connection = new DatabaseConnection(dbPath)
    const store = new SessionStore(connection)

    return { store, connection }
  }

  function makeSession(id: string): Session {
    return {
      id,
      name: 'Test Session',
      cwd: '/tmp',
      model: 'default',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  it('handles corrupted metadata JSON gracefully', () => {
    const { store, connection } = createStore()

    const sessionId = 'test-corrupted-meta'
    store.createSession(makeSession(sessionId))

    // Directly corrupt the metadata in the database
    const db = connection.getDB()
    db.prepare('UPDATE sessions SET metadata = ? WHERE id = ?').run('{invalid json!!!', sessionId)

    // Should not throw — returns fallback empty object
    const session = store.getSession(sessionId)
    expect(session).toBeDefined()
    expect(session!.id).toBe(sessionId)
    expect(session!.metadata).toEqual({})
  })

  it('handles corrupted message content JSON gracefully', () => {
    const { store, connection } = createStore()

    const sessionId = 'test-corrupted-msg'
    store.createSession(makeSession(sessionId))

    // Add a message first
    store.addMessage({
      id: 'msg-1',
      role: 'user',
      content: [{ type: 'text', text: 'hello' }],
      timestamp: Date.now(),
    }, sessionId)

    // Corrupt the content in the database
    const db = connection.getDB()
    db.prepare('UPDATE messages SET content = ? WHERE id = ?').run('not valid json{', 'msg-1')

    // Should not throw — returns fallback empty array
    const messages = store.getMessages(sessionId)
    expect(messages).toHaveLength(1)
    expect(messages[0]!.content).toEqual([])
  })

  it('handles null metadata gracefully', () => {
    const { store, connection } = createStore()

    const sessionId = 'test-null-meta'
    store.createSession(makeSession(sessionId))

    // Set metadata to NULL
    const db = connection.getDB()
    db.prepare('UPDATE sessions SET metadata = NULL WHERE id = ?').run(sessionId)

    const session = store.getSession(sessionId)
    expect(session).toBeDefined()
    expect(session!.metadata).toEqual({})
  })

  it('creates and retrieves sessions correctly', () => {
    const { store } = createStore()

    store.createSession(makeSession('test-1'))

    const retrieved = store.getSession('test-1')
    expect(retrieved).toBeDefined()
    expect(retrieved!.name).toBe('Test Session')
    expect(retrieved!.messages).toEqual([])
  })
})
