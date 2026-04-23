import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { DatabaseConnection, SessionStore } from '@cclocal/core'
import { SessionManager } from './SessionManager.js'

describe('SessionManager', () => {
  const tempDirs: string[] = []

  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop()
      if (dir) {
        rmSync(dir, { recursive: true, force: true })
      }
    }
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
