import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { spawn } from 'child_process'
import type { AddressInfo } from 'net'

interface TestSession {
  id: string
  name: string
  cwd: string
  model: string
  createdAt: number
  updatedAt: number
  messages: Array<{
    id: string
    role: 'user' | 'assistant' | 'system'
    content: Array<{ type: string; text?: string }>
    timestamp: number
  }>
}

interface TestMcpServerRecord {
  name: string
  status: string
  config: Record<string, unknown>
  tools: Array<Record<string, unknown>>
  updatedAt: number
}

interface TestState {
  sessions: TestSession[]
  mcpServers: TestMcpServerRecord[]
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  if (chunks.length === 0) {
    return {}
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(body))
}

function createState(): TestState {
  return {
    sessions: [{
      id: 'session-1',
      name: 'Demo Session',
      cwd: '/tmp/project',
      model: 'demo-model',
      createdAt: 1710000000000,
      updatedAt: 1710000001000,
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: [{ type: 'text', text: 'hello' }],
          timestamp: 1710000000000,
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: [{ type: 'text', text: 'hi there' }],
          timestamp: 1710000001000,
        },
      ],
    }],
    mcpServers: [],
  }
}

async function startMockServer(state: TestState): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url || '/', `http://${request.headers.host}`)
    const method = request.method || 'GET'

    if (url.pathname === '/health') {
      writeJson(response, 200, { status: 'ok' })
      return
    }

    if (url.pathname === '/api/v1/sessions' && method === 'GET') {
      writeJson(response, 200, state.sessions)
      return
    }

    if (url.pathname === '/api/v1/sessions' && method === 'POST') {
      const body = await readJsonBody(request) as { name?: string; cwd?: string; model?: string }
      const now = Date.now()
      const session: TestSession = {
        id: `session-${state.sessions.length + 1}`,
        name: body.name || 'New Session',
        cwd: body.cwd || process.cwd(),
        model: body.model || 'default',
        createdAt: now,
        updatedAt: now,
        messages: [],
      }
      state.sessions.unshift(session)
      writeJson(response, 201, session)
      return
    }

    if (url.pathname.startsWith('/api/v1/sessions/')) {
      const parts = url.pathname.replace('/api/v1/sessions/', '').split('/')
      const sessionId = parts[0] || ''
      const action = parts[1]
      const session = state.sessions.find((item) => item.id === sessionId)

      if (!session) {
        writeJson(response, 404, { error: { message: 'Session not found' } })
        return
      }

      if (!action && method === 'GET') {
        writeJson(response, 200, session)
        return
      }

      if (action === 'messages' && method === 'GET') {
        const limit = Number.parseInt(url.searchParams.get('limit') || `${session.messages.length}`, 10)
        const offset = Number.parseInt(url.searchParams.get('offset') || '0', 10)
        writeJson(response, 200, session.messages.slice(offset, offset + limit))
        return
      }

      if (!action && method === 'PUT') {
        const body = await readJsonBody(request) as { name?: string; cwd?: string; model?: string }
        if (body.name !== undefined) {
          session.name = body.name
        }
        if (body.cwd !== undefined) {
          session.cwd = body.cwd
        }
        if (body.model !== undefined) {
          session.model = body.model
        }
        session.updatedAt = Date.now()
        writeJson(response, 200, session)
        return
      }

      if (!action && method === 'DELETE') {
        state.sessions = state.sessions.filter((item) => item.id !== sessionId)
        writeJson(response, 200, { success: true })
        return
      }
    }

    if (url.pathname === '/api/v1/mcp/servers' && method === 'GET') {
      writeJson(response, 200, state.mcpServers)
      return
    }

    if (url.pathname === '/api/v1/mcp/servers' && method === 'POST') {
      const body = await readJsonBody(request) as {
        name: string
        config: Record<string, unknown>
      }
      const record: TestMcpServerRecord = {
        name: body.name,
        status: 'registered',
        config: body.config,
        tools: [],
        updatedAt: Date.now(),
      }
      state.mcpServers.push(record)
      writeJson(response, 201, record)
      return
    }

    if (url.pathname.startsWith('/api/v1/mcp/servers/')) {
      const parts = url.pathname.replace('/api/v1/mcp/servers/', '').split('/')
      const serverName = decodeURIComponent(parts[0] || '')
      const action = parts[1]
      const record = state.mcpServers.find((item) => item.name === serverName)

      if (!record) {
        writeJson(response, 404, { error: { message: 'MCP server not found' } })
        return
      }

      if (!action && method === 'DELETE') {
        state.mcpServers = state.mcpServers.filter((item) => item.name !== serverName)
        writeJson(response, 200, { success: true })
        return
      }

      if (action === 'connect' && method === 'POST') {
        record.status = 'connected'
        record.tools = [{ name: 'read_file' }]
        record.updatedAt = Date.now()
        writeJson(response, 200, record)
        return
      }

      if (action === 'disconnect' && method === 'POST') {
        record.status = 'disconnected'
        record.tools = []
        record.updatedAt = Date.now()
        writeJson(response, 200, record)
        return
      }
    }

    writeJson(response, 404, { error: { message: 'Not found' } })
  })

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve())
  })

  const address = server.address() as AddressInfo
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }
          resolve()
        })
      })
    },
  }
}

async function runCli(baseUrl: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(
      'bun',
      ['run', 'packages/cli/src/index.ts', '--server', baseUrl, '--token', 'test-token', ...args],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      resolve({
        code: code ?? 0,
        stdout,
        stderr,
      })
    })
  })
}

describe('packages/cli command integration', () => {
  let state: TestState
  let server: { baseUrl: string; close: () => Promise<void> }

  beforeEach(async () => {
    state = createState()
    server = await startMockServer(state)
  })

  afterEach(async () => {
    await server.close()
  })

  it('manages sessions through CLI commands', async () => {
    const listResult = await runCli(server.baseUrl, ['sessions', 'list'])
    expect(listResult.code).toBe(0)
    expect(listResult.stderr).toBe('')
    expect(listResult.stdout).toContain('session-1')
    expect(listResult.stdout).toContain('Demo Session')

    const showResult = await runCli(server.baseUrl, ['sessions', 'show', 'session-1', '--messages', '2'])
    expect(showResult.code).toBe(0)
    expect(showResult.stdout).toContain('Session: Demo Session')
    expect(showResult.stdout).toContain('[user] hello')
    expect(showResult.stdout).toContain('[assistant] hi there')

    const renameResult = await runCli(server.baseUrl, ['sessions', 'rename', 'session-1', 'Renamed Session'])
    expect(renameResult.code).toBe(0)
    expect(renameResult.stdout).toContain('Renamed session "session-1" to "Renamed Session".')
    expect(state.sessions[0]?.name).toBe('Renamed Session')

    const deleteResult = await runCli(server.baseUrl, ['sessions', 'delete', 'session-1'])
    expect(deleteResult.code).toBe(0)
    expect(deleteResult.stdout).toContain('Deleted session "session-1".')
    expect(state.sessions).toHaveLength(0)
  })

  it('manages MCP servers through CLI commands', async () => {
    const addResult = await runCli(server.baseUrl, [
      'mcp',
      'add-stdio',
      'filesystem',
      'npx',
      '@modelcontextprotocol/server-filesystem',
      '.',
      '--namespace',
      'local_fs',
      '--allow-tools',
      'read_file,list_directory',
    ])
    expect(addResult.code).toBe(0)
    expect(addResult.stdout).toContain('"name": "filesystem"')
    expect(addResult.stdout).toContain('"type": "stdio"')

    const connectResult = await runCli(server.baseUrl, ['mcp', 'connect', 'filesystem'])
    expect(connectResult.code).toBe(0)
    expect(connectResult.stdout).toContain('"status": "connected"')

    const listResult = await runCli(server.baseUrl, ['mcp', 'list'])
    expect(listResult.code).toBe(0)
    expect(listResult.stdout).toContain('filesystem')
    expect(listResult.stdout).toContain('connected')
  })
})
