import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { DatabaseConnection, SessionStore } from '@cclocal/core'
import { SessionManager } from './SessionManager.js'

describe('SessionManager', () => {
  const tempDirs: string[] = []

  afterEach(async () => {
    // Give Windows time to release file locks
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

  describe('request queue', () => {
    it('processes requests sequentially for the same session', async () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'cclocal-session-queue-'))
      tempDirs.push(tempDir)

      const connection = DatabaseConnection.create(join(tempDir, 'sessions.db'))
      const store = new SessionStore(connection)

      const executionOrder: string[] = []
      let resolveQuery: () => void

      const manager = new SessionManager({
        store,
        createQueryEngine: () => ({
          async query(messages: Array<{ content: unknown }>, options?: { onStream?: (event: {
            type: 'stream_delta'
            messageId: string
            delta: { type: 'text'; text: string }
          }) => void }) {
            const userContent = messages[messages.length - 1]?.content
            const text = Array.isArray(userContent)
              ? (userContent[0] as { type: string; text: string })?.text
              : 'unknown'
            executionOrder.push(`start:${text}`)

            // Block until resolved
            await new Promise<void>((resolve) => {
              resolveQuery = resolve
            })

            executionOrder.push(`end:${text}`)
            options?.onStream?.({
              type: 'stream_delta',
              messageId: 'assistant-1',
              delta: { type: 'text', text: 'response' },
            })

            return {
              message: {
                id: 'assistant-1',
                role: 'assistant',
                content: [{ type: 'text', text: 'response' }],
                timestamp: Date.now(),
              },
              usage: { inputTokens: 1, outputTokens: 1 },
            }
          },
          cancel() {},
        }) as any,
      })

      const session = await manager.createSession({ name: 'Queue Test', cwd: tempDir })

      // Start multiple requests concurrently
      const request1 = manager.sendMessageStream(
        session.id,
        'msg1',
        {},
        { enqueue: () => {}, close: () => {} } as unknown as ReadableStreamDefaultController
      )
      const request2 = manager.sendMessageStream(
        session.id,
        'msg2',
        {},
        { enqueue: () => {}, close: () => {} } as unknown as ReadableStreamDefaultController
      )
      const request3 = manager.sendMessageStream(
        session.id,
        'msg3',
        {},
        { enqueue: () => {}, close: () => {} } as unknown as ReadableStreamDefaultController
      )

      // Wait a bit for queue to be set up
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Check queue status
      const status = manager.getQueueStatus(session.id)
      expect(status?.queueLength).toBe(2) // 2 requests queued, 1 processing
      expect(status?.isProcessing).toBe(true)

      // Resolve each request one at a time
      resolveQuery()
      await new Promise((resolve) => setTimeout(resolve, 10))
      resolveQuery()
      await new Promise((resolve) => setTimeout(resolve, 10))
      resolveQuery()

      await Promise.all([request1, request2, request3])

      // Verify sequential execution
      expect(executionOrder).toEqual([
        'start:msg1', 'end:msg1',
        'start:msg2', 'end:msg2',
        'start:msg3', 'end:msg3',
      ])

      connection.close()
    })

    it('processes requests in parallel for different sessions', async () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'cclocal-session-parallel-'))
      tempDirs.push(tempDir)

      const connection = DatabaseConnection.create(join(tempDir, 'sessions.db'))
      const store = new SessionStore(connection)

      const startTimes: number[] = []
      const executionOrder: string[] = []
      let parallelCount = 0
      let maxParallel = 0

      const manager = new SessionManager({
        store,
        createQueryEngine: () => ({
          async query(messages: Array<{ content: unknown }>, options?: { onStream?: () => void }) {
            parallelCount++
            maxParallel = Math.max(maxParallel, parallelCount)

            const sessionId = messages[0]?.content ? 'session' : 'unknown'
            startTimes.push(Date.now())
            executionOrder.push(`start:${sessionId}`)

            // Simulate some work
            await new Promise((resolve) => setTimeout(resolve, 50))

            parallelCount--
            executionOrder.push(`end:${sessionId}`)
            options?.onStream?.()

            return {
              message: {
                id: 'assistant-1',
                role: 'assistant',
                content: [{ type: 'text', text: 'response' }],
                timestamp: Date.now(),
              },
              usage: { inputTokens: 1, outputTokens: 1 },
            }
          },
          cancel() {},
        }) as any,
      })

      const session1 = await manager.createSession({ name: 'Session 1', cwd: tempDir })
      const session2 = await manager.createSession({ name: 'Session 2', cwd: tempDir })

      // Start requests for different sessions in parallel
      await Promise.all([
        manager.sendMessageStream(
          session1.id,
          'hello',
          {},
          { enqueue: () => {}, close: () => {} } as unknown as ReadableStreamDefaultController
        ),
        manager.sendMessageStream(
          session2.id,
          'hello',
          {},
          { enqueue: () => {}, close: () => {} } as unknown as ReadableStreamDefaultController
        ),
      ])

      // Both should have started almost simultaneously
      expect(Math.abs(startTimes[1]! - startTimes[0]!)).toBeLessThan(100)
      // Max parallel should be 2 (different sessions)
      expect(maxParallel).toBe(2)

      connection.close()
    })

    it('cancels queued requests when session is cancelled', async () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'cclocal-session-cancel-'))
      tempDirs.push(tempDir)

      const connection = DatabaseConnection.create(join(tempDir, 'sessions.db'))
      const store = new SessionStore(connection)

      let queryStarted = false

      const manager = new SessionManager({
        store,
        createQueryEngine: () => ({
          async query(_messages: Array<{ content: unknown }>, options?: { onStream?: () => void }) {
            queryStarted = true
            // Long-running query
            await new Promise((resolve) => setTimeout(resolve, 5000))
            options?.onStream?.()
            return {
              message: {
                id: 'assistant-1',
                role: 'assistant',
                content: [{ type: 'text', text: 'response' }],
                timestamp: Date.now(),
              },
              usage: { inputTokens: 1, outputTokens: 1 },
            }
          },
          cancel() {},
        }) as any,
      })

      const session = await manager.createSession({ name: 'Cancel Test', cwd: tempDir })

      // Start a request
      const request1Promise = manager.sendMessageStream(
        session.id,
        'msg1',
        {},
        { enqueue: () => {}, close: () => {} } as unknown as ReadableStreamDefaultController
      )

      // Queue a second request
      const request2Promise = manager.sendMessageStream(
        session.id,
        'msg2',
        {},
        { enqueue: () => {}, close: () => {} } as unknown as ReadableStreamDefaultController
      )

      // Wait for first request to start
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(queryStarted).toBe(true)

      // Check queue status
      const status = manager.getQueueStatus(session.id)
      expect(status?.queueLength).toBe(1) // Second request is queued

      // Cancel the session
      await manager.cancelGeneration(session.id)

      // Second request should be rejected
      await expect(request2Promise).rejects.toThrow('Session cancelled')

      connection.close()
    })

    it('cancels all queued requests when session is deleted', async () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'cclocal-session-delete-'))
      tempDirs.push(tempDir)

      const connection = DatabaseConnection.create(join(tempDir, 'sessions.db'))
      const store = new SessionStore(connection)

      let resolveQuery: () => void

      const manager = new SessionManager({
        store,
        createQueryEngine: () => ({
          async query(_messages, options) {
            // Simulate a running query that blocks until resolved
            options?.onStream?.({
              type: 'stream_delta',
              messageId: 'assistant-1',
              delta: { type: 'text', text: 'response' },
            })
            await new Promise<void>((resolve) => {
              resolveQuery = resolve
            })
            return {
              message: {
                id: 'assistant-1',
                role: 'assistant',
                content: [{ type: 'text', text: 'response' }],
                timestamp: Date.now(),
              },
              usage: { inputTokens: 1, outputTokens: 1 },
            }
          },
          cancel() {
            if (resolveQuery) resolveQuery()
          },
        }) as any,
      })

      const session = await manager.createSession({ name: 'Delete Test', cwd: tempDir })

      // Start first request (will block)
      void manager.sendMessageStream(
        session.id,
        'msg1',
        {},
        { enqueue: () => {}, close: () => {} } as unknown as ReadableStreamDefaultController
      )

      // Queue second request
      const request2 = manager.sendMessageStream(
        session.id,
        'msg2',
        {},
        { enqueue: () => {}, close: () => {} } as unknown as ReadableStreamDefaultController
      )

      // Wait for queue to be set up
      await new Promise((resolve) => setTimeout(resolve, 20))

      // Check queue status - second request should be queued
      const status = manager.getQueueStatus(session.id)
      expect(status?.queueLength).toBe(1)

      // Delete the session - should reject the queued request
      manager.deleteSession(session.id)

      // Queued request should be rejected
      await expect(request2).rejects.toThrow('Session deleted')

      connection.close()
    })

    it('returns undefined for non-existent session queue status', () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'cclocal-session-status-'))
      tempDirs.push(tempDir)

      const connection = DatabaseConnection.create(join(tempDir, 'sessions.db'))
      const store = new SessionStore(connection)
      const manager = new SessionManager({ store })

      const status = manager.getQueueStatus('non-existent-session')
      expect(status).toBeUndefined()

      connection.close()
    })

    it('handles cancel request for non-existent session', async () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'cclocal-session-cancel-ne-'))
      tempDirs.push(tempDir)

      const connection = DatabaseConnection.create(join(tempDir, 'sessions.db'))
      const store = new SessionStore(connection)
      const manager = new SessionManager({ store })

      const result = await manager.cancelRequest('non-existent-session', 'request-id')
      expect(result).toBe(false)

      connection.close()
    })
  })

  it('persists sessions and messages through the store', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'cclocal-session-manager-'))
    tempDirs.push(tempDir)

    const connection = DatabaseConnection.create(join(tempDir, 'sessions.db'))
    const store = new SessionStore(connection)

    const manager = new SessionManager({
      store,
      now: () => 123,
      createQueryEngine: () => ({
        async query(messages: Array<{ content: unknown }>, options?: { onStream?: (event: {
          type: 'stream_delta'
          messageId: string
          delta: { type: 'text'; text: string }
        }) => void }) {
          options?.onStream?.({
            type: 'stream_delta',
            messageId: 'assistant-1',
            delta: { type: 'text', text: 'hello back' },
          })

          return {
            message: {
              id: 'assistant-1',
              role: 'assistant',
              content: [{ type: 'text', text: 'hello back' }],
              timestamp: 124,
            },
            usage: {
              inputTokens: 1,
              outputTokens: 1,
            },
          }
        },
        cancel() {},
      }) as any,
    })

    const session = await manager.createSession({
      name: 'Persist Me',
      cwd: tempDir,
      model: 'test-model',
    })

    const chunks: string[] = []
    const decoder = new TextDecoder()
    await manager.sendMessageStream(
      session.id,
      'hello',
      {},
      {
        enqueue(chunk: Uint8Array<ArrayBufferLike>) {
          chunks.push(decoder.decode(chunk))
        },
        close() {},
      } as unknown as ReadableStreamDefaultController
    )

    const reloaded = new SessionManager({ store })
    const savedSession = reloaded.getSession(session.id)

    expect(savedSession?.name).toBe('Persist Me')
    expect(savedSession?.messages).toHaveLength(2)
    expect(savedSession?.messages[0]?.content).toEqual([{ type: 'text', text: 'hello' }])
    expect(savedSession?.messages[1]?.content).toEqual([{ type: 'text', text: 'hello back' }])
    expect(reloaded.getMessageHistory(session.id, 10, 0)).toHaveLength(2)
    expect(chunks.join('')).toContain('event: stream_start')
    expect(chunks.join('')).toContain('event: stream_end')

    connection.close()
  })

  it('clones sessions with copied message history', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'cclocal-session-clone-'))
    tempDirs.push(tempDir)

    const connection = DatabaseConnection.create(join(tempDir, 'sessions.db'))
    const store = new SessionStore(connection)
    const manager = new SessionManager({ store, now: () => 500 })

    const session = await manager.createSession({
      name: 'Original',
      cwd: tempDir,
      model: 'clone-model',
    })

    store.addMessage({
      id: 'msg-1',
      role: 'user',
      content: [{ type: 'text', text: 'hello' }],
      timestamp: 1,
    }, session.id)

    const clone = await manager.cloneSession(session.id)
    expect(clone.id).not.toBe(session.id)
    expect(clone.name).toBe('Original (fork)')
    expect(clone.messages).toHaveLength(1)
    expect(clone.messages[0]?.content).toEqual([{ type: 'text', text: 'hello' }])

    connection.close()
  })

  it('streams ephemeral queries without persisting messages', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'cclocal-session-ephemeral-'))
    tempDirs.push(tempDir)

    const connection = DatabaseConnection.create(join(tempDir, 'sessions.db'))
    const store = new SessionStore(connection)
    const manager = new SessionManager({
      store,
      createQueryEngine: () => ({
        async query(_messages: Array<{ content: unknown }>, options?: { onStream?: (event: {
          type: 'stream_delta'
          messageId: string
          delta: { type: 'text'; text: string }
        }) => void }) {
          options?.onStream?.({
            type: 'stream_delta',
            messageId: 'assistant-ephemeral',
            delta: { type: 'text', text: 'temporary' },
          })

          return {
            message: {
              id: 'assistant-ephemeral',
              role: 'assistant',
              content: [{ type: 'text', text: 'temporary' }],
              timestamp: 2,
            },
            usage: { inputTokens: 1, outputTokens: 1 },
          }
        },
        cancel() {},
      }) as any,
    })

    const chunks: string[] = []
    const decoder = new TextDecoder()

    await manager.sendEphemeralMessageStream(
      'hello',
      {},
      {
        enqueue(chunk: Uint8Array<ArrayBufferLike>) {
          chunks.push(decoder.decode(chunk))
        },
        close() {},
      } as unknown as ReadableStreamDefaultController,
      { cwd: tempDir, model: 'ephemeral-model' }
    )

    expect(store.listSessions()).toHaveLength(0)
    expect(chunks.join('')).toContain('event: stream_start')
    expect(chunks.join('')).toContain('temporary')
    expect(chunks.join('')).toContain('event: stream_end')

    connection.close()
  })

  it('passes permission policy into persistent and ephemeral query engines', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'cclocal-session-permissions-'))
    tempDirs.push(tempDir)

    const connection = DatabaseConnection.create(join(tempDir, 'sessions.db'))
    const store = new SessionStore(connection)
    const seenPolicies: unknown[] = []
    const manager = new SessionManager({
      store,
      createQueryEngine: (options) => {
        seenPolicies.push(options.permissionPolicy)
        return {
          async query() {
            return {
              message: {
                id: 'assistant-permission',
                role: 'assistant',
                content: [{ type: 'text', text: 'ok' }],
                timestamp: 2,
              },
              usage: { inputTokens: 1, outputTokens: 1 },
            }
          },
          cancel() {},
        } as any
      },
    })

    const session = await manager.createSession({
      name: 'Permissions',
      cwd: tempDir,
      model: 'permission-model',
    })

    const controller = {
      enqueue() {},
      close() {},
    } as unknown as ReadableStreamDefaultController

    await manager.sendMessageStream(
      session.id,
      'hello',
      {
        permissionPolicy: {
          mode: 'dontAsk',
          blockedTools: ['bash'],
        },
      },
      controller
    )

    await manager.sendEphemeralMessageStream(
      'hello',
      {
        permissionPolicy: {
          mode: 'acceptEdits',
          allowedTools: ['file_read'],
        },
      },
      controller,
      { cwd: tempDir }
    )

    expect(seenPolicies).toEqual([
      {
        mode: 'dontAsk',
        blockedTools: ['bash'],
      },
      {
        mode: 'acceptEdits',
        allowedTools: ['file_read'],
      },
    ])

    connection.close()
  })
})
