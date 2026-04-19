import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { DatabaseConnection, MCPManager, QueryEngine, SessionStore, toolRegistry } from '@cclocal/core'
import { Server } from './server.js'
import { AuthManager } from '../auth/AuthManager.js'
import { SessionManager } from '../sessions/SessionManager.js'
import { WebSocketManager } from '../ws/WebSocketManager.js'

function createTestServer(options?: { mcpManager?: MCPManager; sessionManager?: SessionManager }) {
  const tempDir = mkdtempSync(join(tmpdir(), 'cclocal-server-test-'))
  const connection = DatabaseConnection.create(join(tempDir, 'sessions.db'))
  const store = new SessionStore(connection)
  const authManager = new AuthManager({ apiKey: 'test-token' })
  const sessionManager = options?.sessionManager ?? new SessionManager({ store })
  const mcpManager = options?.mcpManager ?? new MCPManager()
  const wsManager = new WebSocketManager({ authManager, sessionManager })
  const server = new Server({
    port: 0,
    host: '127.0.0.1',
    authManager,
    sessionManager,
    wsManager,
    mcpManager,
  })

  return {
    tempDir,
    connection,
    store,
    authManager,
    sessionManager,
    mcpManager,
    server,
  }
}

async function dispatchRequest(
  server: Server,
  authManager: AuthManager,
  sessionManager: SessionManager,
  request: Request
): Promise<Response> {
  return await (server as any).handleRequest(
    request,
    new URL(request.url),
    authManager,
    sessionManager
  )
}

describe('Server REST API integration', () => {
  const cleanup: Array<() => void | Promise<void>> = []

  afterEach(async () => {
    while (cleanup.length > 0) {
      const dispose = cleanup.pop()
      if (dispose) {
        await dispose()
      }
    }
  })

  it('lists sessions via the REST API', async () => {
    const ctx = createTestServer()
    cleanup.push(() => {
      ctx.connection.close()
      rmSync(ctx.tempDir, { recursive: true, force: true })
    })

    await ctx.sessionManager.createSession({
      name: 'Session A',
      cwd: ctx.tempDir,
      model: 'model-a',
    })
    await ctx.sessionManager.createSession({
      name: 'Session B',
      cwd: ctx.tempDir,
      model: 'model-b',
    })

    const response = await dispatchRequest(
      ctx.server,
      ctx.authManager,
      ctx.sessionManager,
      new Request('http://localhost/api/v1/sessions', {
      headers: {
        Authorization: 'Bearer test-token',
      },
    }))

    expect(response.status).toBe(200)
    const sessions = await response.json() as Array<{ name: string }>
    expect(sessions).toHaveLength(2)
    expect(sessions.map((session) => session.name).sort()).toEqual(['Session A', 'Session B'])
  })

  it('returns paginated message history via the REST API', async () => {
    const ctx = createTestServer()
    cleanup.push(() => {
      ctx.connection.close()
      rmSync(ctx.tempDir, { recursive: true, force: true })
    })

    const session = await ctx.sessionManager.createSession({
      name: 'History Session',
      cwd: ctx.tempDir,
      model: 'history-model',
    })

    ctx.store.addMessage({
      id: 'msg-1',
      role: 'user',
      content: [{ type: 'text', text: 'first' }],
      timestamp: 1,
    }, session.id)
    ctx.store.addMessage({
      id: 'msg-2',
      role: 'assistant',
      content: [{ type: 'text', text: 'second' }],
      timestamp: 2,
    }, session.id)
    ctx.store.addMessage({
      id: 'msg-3',
      role: 'user',
      content: [{ type: 'text', text: 'third' }],
      timestamp: 3,
    }, session.id)

    const response = await dispatchRequest(
      ctx.server,
      ctx.authManager,
      ctx.sessionManager,
      new Request(`http://localhost/api/v1/sessions/${session.id}/messages?limit=2&offset=1`, {
      headers: {
        'X-API-Key': 'test-token',
      },
    }))

    expect(response.status).toBe(200)
    const messages = await response.json() as Array<{ id: string }>
    expect(messages.map((message) => message.id)).toEqual(['msg-2', 'msg-3'])
  })

  it('registers and lists MCP servers via the REST API', async () => {
    const ctx = createTestServer()
    cleanup.push(() => {
      ctx.connection.close()
      rmSync(ctx.tempDir, { recursive: true, force: true })
    })

    const registerResponse = await dispatchRequest(
      ctx.server,
      ctx.authManager,
      ctx.sessionManager,
      new Request('http://localhost/api/v1/mcp/servers', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'filesystem',
          config: {
            type: 'stdio',
            command: 'npx',
            args: ['@modelcontextprotocol/server-filesystem'],
          },
        }),
      })
    )

    expect(registerResponse.status).toBe(201)

    const listResponse = await dispatchRequest(
      ctx.server,
      ctx.authManager,
      ctx.sessionManager,
      new Request('http://localhost/api/v1/mcp/servers', {
        headers: {
          Authorization: 'Bearer test-token',
        },
      })
    )

    expect(listResponse.status).toBe(200)
    const servers = await listResponse.json() as Array<{ name: string; status: string }>
    expect(servers).toEqual([{
      name: 'filesystem',
      config: {
        type: 'stdio',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem'],
      },
      status: 'registered',
      tools: [],
      updatedAt: expect.any(Number),
    }])
  })

  it('connects and disconnects MCP servers via the REST API', async () => {
    const mcpManager = new MCPManager({
      connectionFactory: async () => ({
        async listTools() {
          return [{
            name: 'read_file',
            description: 'Read a file from disk',
          }]
        },
        async callTool(name) {
          return {
            content: `called:${name}`,
          }
        },
        async close() {},
      }),
    })
    const ctx = createTestServer({ mcpManager })
    cleanup.push(async () => {
      await ctx.mcpManager.removeServer('filesystem')
      ctx.connection.close()
      rmSync(ctx.tempDir, { recursive: true, force: true })
    })

    await dispatchRequest(
      ctx.server,
      ctx.authManager,
      ctx.sessionManager,
      new Request('http://localhost/api/v1/mcp/servers', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'filesystem',
          config: {
            type: 'stdio',
            command: 'npx',
          },
        }),
      })
    )

    const connectResponse = await dispatchRequest(
      ctx.server,
      ctx.authManager,
      ctx.sessionManager,
      new Request('http://localhost/api/v1/mcp/servers/filesystem/connect', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
        },
      })
    )

    expect(connectResponse.status).toBe(200)
    const connected = await connectResponse.json() as { status: string; tools: Array<{ name: string }> }
    expect(connected.status).toBe('connected')
    expect(connected.tools[0]?.name).toBe('read_file')

    const disconnectResponse = await dispatchRequest(
      ctx.server,
      ctx.authManager,
      ctx.sessionManager,
      new Request('http://localhost/api/v1/mcp/servers/filesystem/disconnect', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
        },
      })
    )

    expect(disconnectResponse.status).toBe(200)
    const disconnected = await disconnectResponse.json() as { status: string; tools: unknown[] }
    expect(disconnected.status).toBe('disconnected')
    expect(disconnected.tools).toEqual([])
  })

  it('streams a response that actually calls a connected MCP dynamic tool', async () => {
    const mcpToolCalls: Array<{ name: string; args: unknown }> = []
    const mcpManager = new MCPManager({
      toolRegistry,
      syncToolsToRegistry: true,
      connectionFactory: async () => ({
        async listTools() {
          return [{
            name: 'read_file',
            description: 'Read a file from disk',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string' },
              },
            },
          }]
        },
        async callTool(name, args) {
          mcpToolCalls.push({ name, args })
          return {
            content: `contents-for:${(args as { path: string }).path}`,
          }
        },
        async close() {},
      }),
    })

    let streamCallCount = 0
    const flowTempDir = mkdtempSync(join(tmpdir(), 'cclocal-session-flow-'))
    const flowConnection = DatabaseConnection.create(join(flowTempDir, 'sessions.db'))
    const flowStore = new SessionStore(flowConnection)
    const sessionManager = new SessionManager({
      store: flowStore,
      createQueryEngine: (queryOptions) => new QueryEngine({
        ...queryOptions,
        client: {
          async *streamQuery(_messages, options) {
            if (streamCallCount === 0) {
              streamCallCount += 1
              yield {
                type: 'tool_use' as const,
                name: 'mcp__filesystem__read_file',
                input: { path: '/tmp/demo.txt' },
                id: 'mcp-tool-1',
              }
              return
            }

            expect(((options?.tools ?? []) as Array<{ name: string }>).some((tool) => tool.name === 'mcp__filesystem__read_file')).toBe(true)
            yield {
              type: 'text' as const,
              text: 'MCP tool completed',
            }
            yield {
              type: 'usage' as const,
              inputTokens: 1,
              outputTokens: 1,
            }
          },
        },
      }),
    })

    const ctx = createTestServer({ mcpManager, sessionManager })
    cleanup.push(async () => {
      await ctx.mcpManager.removeServer('filesystem')
      flowConnection.close()
      rmSync(flowTempDir, { recursive: true, force: true })
      ctx.connection.close()
      rmSync(ctx.tempDir, { recursive: true, force: true })
    })

    await dispatchRequest(
      ctx.server,
      ctx.authManager,
      ctx.sessionManager,
      new Request('http://localhost/api/v1/mcp/servers', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'filesystem',
          config: {
            type: 'stdio',
            command: 'npx',
          },
        }),
      })
    )

    await dispatchRequest(
      ctx.server,
      ctx.authManager,
      ctx.sessionManager,
      new Request('http://localhost/api/v1/mcp/servers/filesystem/connect', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
        },
      })
    )

    const session = await ctx.sessionManager.createSession({
      name: 'MCP Flow',
      cwd: ctx.tempDir,
      model: 'test-model',
    })

    const response = await dispatchRequest(
      ctx.server,
      ctx.authManager,
      ctx.sessionManager,
      new Request(`http://localhost/api/v1/sessions/${session.id}/messages`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: 'please inspect the file',
        }),
      })
    )

    expect(response.status).toBe(200)
    const body = await response.text()
    expect(body).toContain('event: stream_start')
    expect(body).toContain('event: delta')
    expect(body).toContain('MCP tool completed')
    expect(body).toContain('event: stream_end')

    expect(mcpToolCalls).toEqual([{
      name: 'read_file',
      args: { path: '/tmp/demo.txt' },
    }])

    const savedSession = ctx.sessionManager.getSession(session.id)
    expect(savedSession?.messages).toHaveLength(2)
    expect(savedSession?.messages[1]?.content).toEqual([{ type: 'text', text: 'MCP tool completed' }])
  })
})
