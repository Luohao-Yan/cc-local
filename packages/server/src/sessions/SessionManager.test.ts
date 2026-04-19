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
})
