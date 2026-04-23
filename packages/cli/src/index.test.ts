import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { spawn } from 'child_process'
import type { AddressInfo } from 'net'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

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
  models: Array<{ id: string; name: string }>
  lastMessageOptions?: Record<string, unknown>
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
    models: [
      { id: 'claude-sonnet-4', name: 'Claude Sonnet 4' },
      { id: 'doubao', name: 'Doubao' },
    ],
    lastMessageOptions: undefined,
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
      const body = await readJsonBody(request) as { id?: string; name?: string; cwd?: string; model?: string }
      const now = Date.now()
      const session: TestSession = {
        id: body.id || `session-${state.sessions.length + 1}`,
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

      if (action === 'fork' && method === 'POST') {
        const body = await readJsonBody(request) as { name?: string; cwd?: string; model?: string }
        const now = Date.now()
        const clone: TestSession = {
          id: `session-${state.sessions.length + 1}`,
          name: body.name || `${session.name} (fork)`,
          cwd: body.cwd || session.cwd,
          model: body.model || session.model,
          createdAt: now,
          updatedAt: now,
          messages: session.messages.map((message, index) => ({
            ...message,
            id: `forked-msg-${index + 1}`,
          })),
        }
        state.sessions.unshift(clone)
        writeJson(response, 201, clone)
        return
      }

      if (action === 'messages' && method === 'POST') {
        const body = await readJsonBody(request) as {
          content?: string
          options?: { model?: string } & Record<string, unknown>
        }
        state.lastMessageOptions = body.options
        const now = Date.now()
        session.messages.push({
          id: `msg-${session.messages.length + 1}`,
          role: 'user',
          content: [{ type: 'text', text: body.content || '' }],
          timestamp: now,
        })
        session.messages.push({
          id: `msg-${session.messages.length + 1}`,
          role: 'assistant',
          content: [{ type: 'text', text: `echo:${body.content || ''}` }],
          timestamp: now + 1,
        })
        if (body.options?.model) {
          session.model = body.options.model
        }
        session.updatedAt = now + 1

        response.statusCode = 200
        response.setHeader('Content-Type', 'text/event-stream')
        response.end(
          [
            'event: stream_start',
            'data: {"messageId":"assistant-1"}',
            '',
            'event: delta',
            `data: ${JSON.stringify({ text: `echo:${body.content || ''}` })}`,
            '',
            'event: stream_end',
            'data: {}',
            '',
            '',
          ].join('\n')
        )
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

    if (url.pathname === '/api/v1/models' && method === 'GET') {
      writeJson(response, 200, state.models)
      return
    }

    if (url.pathname === '/api/v1/query' && method === 'POST') {
      const body = await readJsonBody(request) as { content?: string; options?: Record<string, unknown> }
      state.lastMessageOptions = body.options
      response.statusCode = 200
      response.setHeader('Content-Type', 'text/event-stream')
      response.end(
        [
          'event: stream_start',
          'data: {"messageId":"assistant-ephemeral"}',
          '',
          'event: delta',
          `data: ${JSON.stringify({ text: `echo:${body.content || ''}` })}`,
          '',
          'event: stream_end',
          'data: {}',
          '',
          '',
        ].join('\n')
      )
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

      if (!action && method === 'GET') {
        writeJson(response, 200, record)
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

async function runCli(
  baseUrl: string,
  args: string[],
  options: { includeToken?: boolean; env?: NodeJS.ProcessEnv } = {}
): Promise<{ code: number; stdout: string; stderr: string }> {
  return await new Promise((resolve, reject) => {
    const cliArgs = [
      'run',
      'packages/cli/src/index.ts',
      '--server',
      baseUrl,
      ...(options.includeToken === false ? [] : ['--token', 'test-token']),
      ...args,
    ]
    const child = spawn(
      'bun',
      cliArgs,
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          ...options.env,
        },
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

  it('supports session continue and fork through CLI commands', async () => {
    const continueResult = await runCli(server.baseUrl, [
      'sessions',
      'continue',
      '--cwd',
      '/tmp/project',
      '--print',
      'continue from command',
    ])
    expect(continueResult.code).toBe(0)
    expect(continueResult.stdout).toContain('echo:continue from command')

    const forkResult = await runCli(server.baseUrl, [
      'sessions',
      'fork',
      'session-1',
      'Forked From Command',
    ])
    expect(forkResult.code).toBe(0)
    expect(forkResult.stdout).toContain('Session: Forked From Command')
    expect(state.sessions[0]?.name).toBe('Forked From Command')
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

    const showResult = await runCli(server.baseUrl, ['mcp', 'show', 'filesystem'])
    expect(showResult.code).toBe(0)
    expect(showResult.stdout).toContain('Server: filesystem')
    expect(showResult.stdout).toContain('Status: connected')
    expect(showResult.stdout).toContain('Namespace: local_fs')
    expect(showResult.stdout).toContain('Tools:')
  })

  it('registers HTTP MCP servers through CLI commands', async () => {
    const addResult = await runCli(server.baseUrl, [
      'mcp',
      'add-http',
      'remote-docs',
      'http://127.0.0.1:8080/mcp',
      '--namespace',
      'docs_http',
      '--header',
      'Authorization: Bearer demo-token',
      '--allow-tools',
      'search_docs',
    ])
    expect(addResult.code).toBe(0)
    expect(addResult.stdout).toContain('"name": "remote-docs"')
    expect(addResult.stdout).toContain('"type": "http"')
    expect(addResult.stdout).toContain('"docs_http"')
    expect(addResult.stdout).toContain('"Authorization": "Bearer demo-token"')
  })

  it('lists models through CLI commands', async () => {
    const result = await runCli(server.baseUrl, ['models', 'list'])
    expect(result.code).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('claude-sonnet-4')
    expect(result.stdout).toContain('Doubao')
  })

  it('runs doctor diagnostics through CLI commands', async () => {
    const result = await runCli(server.baseUrl, ['doctor'])
    expect(result.code).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('Server: ok')
    expect(result.stdout).toContain('Models: 2')
    expect(result.stdout).toContain('Sessions: 1')
    expect(result.stdout).toContain('MCP: 0/0 connected')
  })

  it('shows config through CLI commands', async () => {
    const result = await runCli(server.baseUrl, ['--model', 'doubao', '--cwd', '/tmp/project', 'config'])
    expect(result.code).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('Config:')
    expect(result.stdout).toContain(`Server URL: ${server.baseUrl}`)
    expect(result.stdout).toContain('Auth token: configured')
    expect(result.stdout).toContain('Cwd: /tmp/project')
    expect(result.stdout).toContain('Model override: doubao')
  })

  it('shows context through CLI commands', async () => {
    const result = await runCli(server.baseUrl, ['--cwd', '/tmp/project', 'context'])
    expect(result.code).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('Context:')
    expect(result.stdout).toContain('Cwd: /tmp/project')
    expect(result.stdout).toContain('Available sessions: 1')
    expect(result.stdout).toContain('Active session: session-1')
    expect(result.stdout).toContain('Session name: Demo Session')
    expect(result.stdout).toContain('Recent messages loaded: 2')
    expect(result.stdout).toContain('MCP servers: 0/0 connected')
  })

  it('shows environment through CLI commands', async () => {
    const result = await runCli(server.baseUrl, ['--cwd', '/tmp/project', 'env'])
    expect(result.code).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('Environment:')
    expect(result.stdout).toContain('Runtime: bun')
    expect(result.stdout).toContain('Cwd: /tmp/project')
    expect(result.stdout).toContain(`Server URL: ${server.baseUrl}`)
  })

  it('shows lightweight stats through CLI commands', async () => {
    const result = await runCli(server.baseUrl, ['stats'])
    expect(result.code).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('Stats:')
    expect(result.stdout).toContain('Sessions: 1')
    expect(result.stdout).toContain('Messages (loaded summaries): 2')
    expect(result.stdout).toContain('Models: 2')
    expect(result.stdout).toContain('MCP servers: 0/0 connected')
  })

  it('shows lightweight cost through CLI commands', async () => {
    const result = await runCli(server.baseUrl, ['--cwd', '/tmp/project', 'cost'])
    expect(result.code).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('Cost:')
    expect(result.stdout).toContain('Session: Demo Session')
    expect(result.stdout).toContain('Session id: session-1')
    expect(result.stdout).toContain('Messages: 2')
    expect(result.stdout).toContain('Estimated tokens:')
  })

  it('shows permissions summary through CLI commands', async () => {
    const result = await runCli(server.baseUrl, ['permissions'])
    expect(result.code).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('Permissions:')
    expect(result.stdout).toContain('Mode: default')
    expect(result.stdout).toContain('Server-side auth: enabled')
    expect(result.stdout).toContain('Tool execution policy: enforced by QueryEngine')

    const acceptEditsResult = await runCli(server.baseUrl, [
      '--permission-mode',
      'acceptEdits',
      '--allowed-tools',
      'file_read,file_edit',
      '--disallowed-tools',
      'bash',
      'permissions',
    ])
    expect(acceptEditsResult.code).toBe(0)
    expect(acceptEditsResult.stdout).toContain('Mode: acceptEdits')
    expect(acceptEditsResult.stdout).toContain('Allowed tools: file_read, file_edit')
    expect(acceptEditsResult.stdout).toContain('Disallowed tools: bash')

    const bypassResult = await runCli(server.baseUrl, ['--dangerously-skip-permissions', 'permissions'])
    expect(bypassResult.code).toBe(0)
    expect(bypassResult.stdout).toContain('Mode: bypassPermissions')
    expect(bypassResult.stdout).toContain('Warning: bypassPermissions should only be used in trusted workspaces.')
  })

  it('manages model commands through CLI commands', async () => {
    const listResult = await runCli(server.baseUrl, ['model', 'list'])
    expect(listResult.code).toBe(0)
    expect(listResult.stdout).toContain('claude-sonnet-4')
    expect(listResult.stdout).toContain('Doubao')

    const currentResult = await runCli(server.baseUrl, ['--model', 'doubao', 'model', 'current'])
    expect(currentResult.code).toBe(0)
    expect(currentResult.stdout).toContain('Current model: doubao')

    const useResult = await runCli(server.baseUrl, ['model', 'use', 'doubao', '--print', 'hello model'])
    expect(useResult.code).toBe(0)
    expect(useResult.stdout).toContain('echo:hello model')
  })

  it('manages auth through CLI commands', async () => {
    const tempHome = mkdtempSync(join(tmpdir(), 'cclocal-auth-test-'))

    try {
      const loginResult = await runCli(server.baseUrl, ['auth', 'login', '--api-token', 'stored-token'], {
        includeToken: false,
        env: {
          HOME: tempHome,
          CLAUDE_CONFIG_DIR: join(tempHome, '.claude'),
        },
      })
      expect(loginResult.code).toBe(0)
      expect(loginResult.stdout).toContain('Stored local API token for packages/cli.')

      const statusResult = await runCli(server.baseUrl, ['auth', 'status'], {
        includeToken: false,
        env: {
          HOME: tempHome,
          CLAUDE_CONFIG_DIR: join(tempHome, '.claude'),
        },
      })
      expect(statusResult.code).toBe(0)
      expect(statusResult.stdout).toContain('Auth:')
      expect(statusResult.stdout).toContain('Token configured: yes')
      expect(statusResult.stdout).toContain('Token source: stored_config')

      const logoutResult = await runCli(server.baseUrl, ['auth', 'logout'], {
        includeToken: false,
        env: {
          HOME: tempHome,
          CLAUDE_CONFIG_DIR: join(tempHome, '.claude'),
        },
      })
      expect(logoutResult.code).toBe(0)
      expect(logoutResult.stdout).toContain('Cleared stored local API token.')
    } finally {
      rmSync(tempHome, { recursive: true, force: true })
    }
  })

  it('stores setup-token through CLI commands', async () => {
    const tempHome = mkdtempSync(join(tmpdir(), 'cclocal-setup-token-test-'))
    const configDir = join(tempHome, '.claude')

    try {
      const setupTokenResult = await runCli(server.baseUrl, ['setup-token', '--api-token', 'long-lived-token'], {
        includeToken: false,
        env: {
          HOME: tempHome,
          CLAUDE_CONFIG_DIR: configDir,
        },
      })
      expect(setupTokenResult.code).toBe(0)
      expect(setupTokenResult.stdout).toContain('Stored long-lived local API token for packages/cli.')
      expect(setupTokenResult.stdout).toContain(`Config path: ${join(configDir, 'cclocal.json')}`)
      expect(setupTokenResult.stdout).toContain('stores a local server token')

      const statusResult = await runCli(server.baseUrl, ['auth', 'status'], {
        includeToken: false,
        env: {
          HOME: tempHome,
          CLAUDE_CONFIG_DIR: configDir,
        },
      })
      expect(statusResult.code).toBe(0)
      expect(statusResult.stdout).toContain('Token configured: yes')
      expect(statusResult.stdout).toContain('Token source: stored_config')
    } finally {
      rmSync(tempHome, { recursive: true, force: true })
    }
  })

  it('manages plugin commands through CLI commands', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'cclocal-plugin-test-'))

    try {
      const pluginDir = join(tempDir, 'demo-plugin', '.claude-plugin')
      mkdirSync(pluginDir, { recursive: true })
      writeFileSync(
        join(pluginDir, 'plugin.json'),
        JSON.stringify({
          name: 'demo-plugin',
          version: '1.0.0',
          description: 'Demo plugin',
        }, null, 2)
      )

      const listResult = await runCli(server.baseUrl, ['plugin', 'list', '--path', tempDir], {
        includeToken: false,
      })
      expect(listResult.code).toBe(0)
      expect(listResult.stdout).toContain('plugin')
      expect(listResult.stdout).toContain('demo-plugin')
      expect(listResult.stdout).toContain('plugin.json')

      const validateResult = await runCli(server.baseUrl, ['plugin', 'validate', join(tempDir, 'demo-plugin')], {
        includeToken: false,
      })
      expect(validateResult.code).toBe(0)
      expect(validateResult.stdout).toContain('Plugin validation passed.')
      expect(validateResult.stdout).toContain('Type: plugin')
      expect(validateResult.stdout).toContain('Summary: plugin:demo-plugin')
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('manages plugin lifecycle through CLI commands', async () => {
    const tempHome = mkdtempSync(join(tmpdir(), 'cclocal-plugin-lifecycle-home-'))
    const tempDir = mkdtempSync(join(tmpdir(), 'cclocal-plugin-lifecycle-src-'))
    const configDir = join(tempHome, '.claude')
    const pluginDir = join(tempDir, 'demo-plugin', '.claude-plugin')
    const pluginManifestPath = join(pluginDir, 'plugin.json')

    try {
      mkdirSync(pluginDir, { recursive: true })
      writeFileSync(
        pluginManifestPath,
        JSON.stringify({
          name: 'demo-plugin',
          version: '1.0.0',
          description: 'Demo plugin',
        }, null, 2)
      )

      const env = {
        HOME: tempHome,
        CLAUDE_CONFIG_DIR: configDir,
      }

      const installResult = await runCli(server.baseUrl, ['plugin', 'install', join(tempDir, 'demo-plugin')], {
        includeToken: false,
        env,
      })
      expect(installResult.code).toBe(0)
      expect(installResult.stdout).toContain('Installed plugin "demo-plugin".')

      const installedListResult = await runCli(server.baseUrl, ['plugin', 'list', '--installed'], {
        includeToken: false,
        env,
      })
      expect(installedListResult.code).toBe(0)
      expect(installedListResult.stdout).toContain('installed')
      expect(installedListResult.stdout).toContain('demo-plugin')
      expect(installedListResult.stdout).toContain('1.0.0')

      writeFileSync(
        pluginManifestPath,
        JSON.stringify({
          name: 'demo-plugin',
          version: '1.1.0',
          description: 'Demo plugin updated',
        }, null, 2)
      )

      const updateResult = await runCli(server.baseUrl, ['plugin', 'update', 'demo-plugin'], {
        includeToken: false,
        env,
      })
      expect(updateResult.code).toBe(0)
      expect(updateResult.stdout).toContain('Updated plugin "demo-plugin".')

      const updatedListResult = await runCli(server.baseUrl, ['plugin', 'list', '--installed'], {
        includeToken: false,
        env,
      })
      expect(updatedListResult.code).toBe(0)
      expect(updatedListResult.stdout).toContain('1.1.0')

      const uninstallResult = await runCli(server.baseUrl, ['plugin', 'uninstall', 'demo-plugin'], {
        includeToken: false,
        env,
      })
      expect(uninstallResult.code).toBe(0)
      expect(uninstallResult.stdout).toContain('Uninstalled plugin "demo-plugin".')

      const emptyListResult = await runCli(server.baseUrl, ['plugin', 'list', '--installed'], {
        includeToken: false,
        env,
      })
      expect(emptyListResult.code).toBe(0)
      expect(emptyListResult.stdout).toContain('No installed plugins found.')
    } finally {
      rmSync(tempHome, { recursive: true, force: true })
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('shows update status through CLI commands', async () => {
    const updateResult = await runCli(server.baseUrl, ['update'], {
      includeToken: false,
    })
    expect(updateResult.code).toBe(0)
    expect(updateResult.stderr).toBe('')
    expect(updateResult.stdout).toContain('Update:')
    expect(updateResult.stdout).toContain('Current version: 1.0.0')
    expect(updateResult.stdout).toContain('Automatic install: disabled (pass --apply to run)')
    expect(updateResult.stdout).toContain('bun run build:all')

    const upgradeResult = await runCli(server.baseUrl, ['upgrade', '--json'], {
      includeToken: false,
    })
    expect(upgradeResult.code).toBe(0)
    expect(upgradeResult.stderr).toBe('')
    expect(upgradeResult.stdout).toContain('"automaticInstall": false')
    expect(upgradeResult.stdout).toContain('"git pull"')
  })

  it('keeps legacy Claude UI as the default help while native management commands stay available', async () => {
    const helpResult = await runCli(server.baseUrl, ['--help'], {
      includeToken: false,
    })
    expect(helpResult.code).toBe(0)
    expect(helpResult.stdout).toContain('Usage: claude')
    expect(helpResult.stdout).toContain('Claude Code - starts an interactive session by default')
    expect(helpResult.stdout).toContain('--worktree')
    expect(helpResult.stdout).not.toContain('CCLocal Interactive Mode')

    const explicitLegacyResult = await runCli(server.baseUrl, ['--legacy', '--help'], {
      includeToken: false,
    })
    expect(explicitLegacyResult.code).toBe(0)
    expect(explicitLegacyResult.stdout).toContain('--worktree')

    const nativeHelpResult = await runCli(server.baseUrl, ['models', '--help'], {
      includeToken: false,
    })
    expect(nativeHelpResult.code).toBe(0)
    expect(nativeHelpResult.stdout).toContain('Usage: cclocal models')
    expect(nativeHelpResult.stdout).toContain('List models available from the local server API')

    const nativeCommandResult = await runCli(server.baseUrl, ['agents', '--help'], {
      includeToken: false,
    })
    expect(nativeCommandResult.code).toBe(0)
    expect(nativeCommandResult.stdout).toContain('List configured local agents')

    const legacyOptionResult = await runCli(server.baseUrl, ['--worktree', '--help'], {
      includeToken: false,
    })
    expect(legacyOptionResult.code).toBe(0)
    expect(legacyOptionResult.stdout).toContain('--worktree')
  })

  it('supports compatibility resume and continue flows for single-prompt mode', async () => {
    const resumeResult = await runCli(server.baseUrl, ['--resume', 'session-1', '--print', 'hello again'])
    expect(resumeResult.code).toBe(0)
    expect(resumeResult.stdout).toContain('echo:hello again')

    const continueResult = await runCli(server.baseUrl, ['--continue', '--cwd', '/tmp/project', '--print', 'continue please'])
    expect(continueResult.code).toBe(0)
    expect(continueResult.stdout).toContain('echo:continue please')
  })

  it('supports json output for single-prompt mode', async () => {
    const result = await runCli(server.baseUrl, ['--resume', 'session-1', '--output-format', 'json', '--print', 'json please'])
    expect(result.code).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('"type": "result"')
    expect(result.stdout).toContain('"sessionId": "session-1"')
    expect(result.stdout).toContain('"text": "echo:json please"')
  })

  it('passes native system prompt compatibility options to REST messages', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'cclocal-system-prompt-test-'))
    const promptPath = join(tempDir, 'system.txt')
    const appendPath = join(tempDir, 'append.txt')

    try {
      writeFileSync(promptPath, 'You are the base prompt.')
      writeFileSync(appendPath, 'Always answer tersely.')

      const result = await runCli(server.baseUrl, [
        '--resume',
        'session-1',
        '--system-prompt-file',
        promptPath,
        '--append-system-prompt-file',
        appendPath,
        '--print',
        'prompted',
      ])

      expect(result.code).toBe(0)
      expect(result.stderr).toBe('')
      expect(state.lastMessageOptions?.systemPrompt).toBe('You are the base prompt.\n\nAlways answer tersely.')
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('supports native auth-token, named session-id, max turns, and MCP config startup options', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'cclocal-native-flags-test-'))
    const mcpConfigPath = join(tempDir, 'mcp.json')
    const explicitSessionId = '11111111-1111-4111-8111-111111111111'

    try {
      writeFileSync(
        mcpConfigPath,
        JSON.stringify({
          mcpServers: {
            local_echo: {
              type: 'stdio',
              command: 'node',
              args: ['echo-server.js'],
              namespace: 'echo',
              allowedTools: ['echo'],
            },
          },
        }, null, 2)
      )

      const result = await runCli(server.baseUrl, [
        '--auth-token',
        'test-token',
        '--session-id',
        explicitSessionId,
        '--name',
        'Named Native Session',
        '--max-turns',
        '3',
        '--max-thinking-tokens',
        '128',
        '--fallback-model',
        'fallback-model',
        '--mcp-config',
        mcpConfigPath,
        '--print',
        'native flags',
      ], {
        includeToken: false,
      })

      expect(result.code).toBe(0)
      expect(result.stderr).toBe('')
      expect(state.sessions[0]?.id).toBe(explicitSessionId)
      expect(state.sessions[0]?.name).toBe('Named Native Session')
      expect(state.lastMessageOptions?.maxTurns).toBe(3)
      expect(state.lastMessageOptions?.maxThinkingTokens).toBe(128)
      expect(state.lastMessageOptions?.fallbackModel).toBe('fallback-model')
      expect(state.mcpServers[0]?.name).toBe('local_echo')
      expect(state.mcpServers[0]?.config.namespace).toBe('echo')
      expect(state.mcpServers[0]?.status).toBe('connected')
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('supports native settings, tool selection, debug, json schema, and add-dir options', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'cclocal-settings-flags-test-'))
    const settingsPath = join(tempDir, 'settings.json')
    const schemaPath = join(tempDir, 'schema.json')

    try {
      writeFileSync(
        settingsPath,
        JSON.stringify({
          apiToken: 'test-token',
          model: 'settings-model',
          systemPrompt: 'System prompt from settings.',
          fallbackModel: 'settings-fallback',
        }, null, 2)
      )
      writeFileSync(
        schemaPath,
        JSON.stringify({
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
          },
        }, null, 2)
      )

      const result = await runCli(server.baseUrl, [
        '--settings',
        settingsPath,
        '--tools',
        'file_read,grep',
        '--add-dir',
        tempDir,
        '--input-format',
        'text',
        '--json-schema',
        schemaPath,
        '--include-hook-events',
        '--debug',
        '--debug-file',
        join(tempDir, 'debug.log'),
        '--debug-to-stderr',
        '--mcp-debug',
        '--verbose',
        '--print',
        'settings flags',
      ], {
        includeToken: false,
      })

      expect(result.code).toBe(0)
      expect(result.stderr).toBe('')
      expect(state.lastMessageOptions?.model).toBe('settings-model')
      expect(state.lastMessageOptions?.systemPrompt).toBe('System prompt from settings.')
      expect(state.lastMessageOptions?.fallbackModel).toBe('settings-fallback')
      expect(state.lastMessageOptions?.enabledTools).toEqual(['file_read', 'grep'])
      expect(state.lastMessageOptions?.additionalDirectories).toEqual([tempDir])
      expect(state.lastMessageOptions?.inputFormat).toBe('text')
      expect(state.lastMessageOptions?.includeHookEvents).toBe(true)
      expect(state.lastMessageOptions?.jsonSchema).toMatchObject({ type: 'object' })
      expect(state.lastMessageOptions?.debug).toMatchObject({
        enabled: true,
        toStderr: true,
        verbose: true,
        mcp: true,
      })
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('supports native workspace, worktree, plugin, prefill, thinking, and integration metadata flags', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'cclocal-integration-flags-test-'))
    const pluginDir = join(tempDir, 'plugins')

    try {
      mkdirSync(pluginDir, { recursive: true })
      const result = await runCli(server.baseUrl, [
        '--workspace',
        tempDir,
        '--worktree',
        'feature-branch',
        '--tmux',
        'classic',
        '--plugin-dir',
        pluginDir,
        '--prefill',
        'draft prompt',
        '--thinking',
        'enabled',
        '--ide',
        '--chrome',
        '--workload',
        'sdk-job',
        '--bare',
        '--disable-slash-commands',
        '--file',
        'file_abc:doc.txt',
        '--print',
        'integration flags',
      ])

      expect(result.code).toBe(0)
      expect(result.stderr).toBe('')
      expect(state.sessions[0]?.cwd).toBe(tempDir)
      expect(state.lastMessageOptions?.compatibility).toMatchObject({
        prefill: 'draft prompt',
        thinking: 'enabled',
        pluginDirectories: [pluginDir],
        workspace: tempDir,
        worktree: 'feature-branch',
        tmux: 'classic',
        ide: true,
        chrome: true,
        workload: 'sdk-job',
        bare: true,
        disableSlashCommands: true,
        files: ['file_abc:doc.txt'],
      })
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('supports native remote, sdk, agent, team, task, and channel metadata flags', async () => {
    const result = await runCli(server.baseUrl, [
      '--remote',
      'remote desk',
      '--remote-control',
      'handoff',
      '--rc',
      'alias-handoff',
      '--teleport',
      'teleport-session',
      '--sdk-url',
      'ws://127.0.0.1:8765/sdk',
      '--agent',
      'reviewer',
      '--agents',
      '{"reviewer":{"description":"Reviews code"}}',
      '--agent-id',
      'agent-1',
      '--agent-name',
      'Reviewer One',
      '--agent-color',
      'blue',
      '--agent-type',
      'code-reviewer',
      '--agent-teams',
      'alpha,beta',
      '--team-name',
      'Core Team',
      '--teammate-mode',
      'in-process',
      '--parent-session-id',
      'parent-123',
      '--plan-mode-required',
      '--tasks',
      'task-list-1',
      '--task-budget',
      '2048',
      '--channels',
      'server-a',
      '--channels',
      'server-b',
      '--print',
      'remote metadata',
    ])

    expect(result.code).toBe(0)
    expect(result.stderr).toBe('')
    expect(state.lastMessageOptions?.compatibility).toMatchObject({
      remote: 'remote desk',
      remoteControl: 'handoff',
      rc: 'alias-handoff',
      teleport: 'teleport-session',
      sdkUrl: 'ws://127.0.0.1:8765/sdk',
      agent: 'reviewer',
      agents: '{"reviewer":{"description":"Reviews code"}}',
      agentId: 'agent-1',
      agentName: 'Reviewer One',
      agentColor: 'blue',
      agentType: 'code-reviewer',
      agentTeams: 'alpha,beta',
      teamName: 'Core Team',
      teammateMode: 'in-process',
      parentSessionId: 'parent-123',
      planModeRequired: true,
      tasks: 'task-list-1',
      taskBudget: 2048,
      channels: ['server-a', 'server-b'],
    })
  })

  it('supports remaining legacy top-level flags as native compatibility metadata', async () => {
    const result = await runCli(server.baseUrl, [
      '--text',
      'text alias prompt',
      '--description',
      'desc',
      '--subject',
      'subject',
      '--scope',
      'repo',
      '--effort',
      'high',
      '--output',
      '/tmp/out.json',
      '--owner',
      'owner-1',
      '--email',
      'user@example.com',
      '--client-secret',
      'secret',
      '--permission-prompt-tool',
      'prompt_tool',
      '--messaging-socket-path',
      '/tmp/socket',
      '--resume-session-at',
      'msg-1',
      '--rewind-files',
      'msg-2',
      '--advisor',
      'claude-opus',
      '--deep-link-repo',
      'org/repo',
      '--host',
      '127.0.0.2',
      '--unix',
      '/tmp/cc.sock',
      '--port',
      '7777',
      '--idle-timeout',
      '9000',
      '--max-sessions',
      '12',
      '--max-budget-usd',
      '5.5',
      '--deep-link-last-fetch',
      '123456',
      '--setting-sources',
      'user',
      '--setting-sources',
      'local',
      '--betas',
      'beta-a',
      '--dangerously-load-development-channels',
      'dev-chan',
      '--from-pr',
      '42',
      '--afk',
      '--all',
      '--assistant',
      '--available',
      '--brief',
      '--claudeai',
      '--clear-owner',
      '--console',
      '--cowork',
      '--dangerously-skip-permissions-with-classifiers',
      '--deep-link-origin',
      '--delegate-permissions',
      '--dry-run',
      '--enable-auth-status',
      '--enable-auto-mode',
      '--force',
      '--hard-fail',
      '--init',
      '--init-only',
      '--keep-data',
      '--list',
      '--local',
      '--maintenance',
      '--pending',
      '--proactive',
      '--safe',
      '--sparse',
      '--sso',
      '--status',
    ])

    expect(result.code).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('echo:text alias prompt')
    expect(state.lastMessageOptions?.compatibility).toMatchObject({
      description: 'desc',
      subject: 'subject',
      scope: 'repo',
      effort: 'high',
      output: '/tmp/out.json',
      owner: 'owner-1',
      email: 'user@example.com',
      clientSecret: 'secret',
      permissionPromptTool: 'prompt_tool',
      messagingSocketPath: '/tmp/socket',
      resumeSessionAt: 'msg-1',
      rewindFiles: 'msg-2',
      advisor: 'claude-opus',
      deepLinkRepo: 'org/repo',
      host: '127.0.0.2',
      unix: '/tmp/cc.sock',
      port: 7777,
      idleTimeout: 9000,
      maxSessions: 12,
      maxBudgetUsd: 5.5,
      deepLinkLastFetch: 123456,
      settingSources: ['user', 'local'],
      betas: ['beta-a'],
      dangerouslyLoadDevelopmentChannels: ['dev-chan'],
      fromPr: '42',
      afk: true,
      all: true,
      assistant: true,
      available: true,
      brief: true,
      claudeai: true,
      clearOwner: true,
      console: true,
      cowork: true,
      dangerouslySkipPermissionsWithClassifiers: true,
      deepLinkOrigin: true,
      delegatePermissions: true,
      dryRun: true,
      enableAuthStatus: true,
      enableAutoMode: true,
      force: true,
      hardFail: true,
      init: true,
      initOnly: true,
      keepData: true,
      list: true,
      local: true,
      maintenance: true,
      pending: true,
      proactive: true,
      safe: true,
      sparse: true,
      sso: true,
      status: true,
      text: 'text alias prompt',
    })
  })

  it('supports minimal stream-json output with replayed user messages and partial deltas', async () => {
    const result = await runCli(server.baseUrl, [
      '--resume',
      'session-1',
      '--output-format',
      'stream-json',
      '--include-partial-messages',
      '--replay-user-messages',
      '--print',
      'stream please',
    ])
    expect(result.code).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('"type":"user"')
    expect(result.stdout).toContain('"isReplay":true')
    expect(result.stdout).toContain('"type":"stream_start"')
    expect(result.stdout).toContain('"type":"content_block_delta"')
    expect(result.stdout).toContain('"type":"result"')
    expect(result.stdout).toContain('"type":"stream_end"')
    expect(result.stdout).toContain('"text":"echo:stream please"')
  })

  it('fails clearly for unsupported compatibility flags', async () => {
    const streamJsonConstraint = await runCli(server.baseUrl, ['--include-partial-messages', '--print', 'hello'])
    expect(streamJsonConstraint.code).not.toBe(0)
    expect(streamJsonConstraint.stderr).toContain('--include-partial-messages only works with --output-format=stream-json')

    const forkSessionResult = await runCli(server.baseUrl, ['--fork-session', '--resume', 'session-1', '--print', 'hello'])
    expect(forkSessionResult.stderr).toBe('')
    expect(forkSessionResult.code).toBe(0)
  })

  it('supports fork-session and no-session-persistence compatibility flows', async () => {
    const forkResult = await runCli(server.baseUrl, [
      '--fork-session',
      '--resume',
      'session-1',
      '--output-format',
      'json',
      '--print',
      'forked prompt',
    ])
    expect(forkResult.code).toBe(0)
    expect(forkResult.stdout).toContain('"text": "echo:forked prompt"')
    expect(state.sessions).toHaveLength(2)
    expect(state.sessions[0]?.name).toBe('Demo Session (fork)')

    const sessionCountBeforeEphemeral = state.sessions.length
    const ephemeralResult = await runCli(server.baseUrl, [
      '--no-session-persistence',
      '--output-format',
      'json',
      '--print',
      'ephemeral prompt',
    ])
    expect(ephemeralResult.code).toBe(0)
    expect(ephemeralResult.stdout).toContain('"text": "echo:ephemeral prompt"')
    expect(state.sessions).toHaveLength(sessionCountBeforeEphemeral)
  })
})
