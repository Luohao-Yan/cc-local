import { describe, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { executeReplSlashCommand } from './simpleRepl.js'
import { launchRepl } from './simpleRepl.js'

function createContext(options: { cwd?: string } = {}) {
  let model: string | undefined = 'demo-model'
  let messageOptions: any = {
    permissionPolicy: {
      mode: 'acceptEdits',
      allowedTools: ['file_read'],
      blockedTools: ['bash'],
    },
    compatibility: {},
  }
  const lines: string[] = []
  const cwd = options.cwd || '/tmp/project'
  const client = {
    getSessionId: vi.fn(() => 'session-1'),
    listSessions: vi.fn(async () => [
      { id: 'session-1', name: 'Demo Session', model: 'demo-model', cwd: '/tmp/project' },
      { id: 'session-2', name: 'Second Session', model: 'other-model', cwd: '/tmp/project' },
    ]),
    listMcpServers: vi.fn(async () => [
      {
        name: 'filesystem',
        status: 'connected',
        config: { type: 'stdio' },
      },
    ]),
    listModels: vi.fn(async () => [
      { id: 'demo-model', name: 'Demo Model' },
      { id: 'other-model', name: 'Other Model' },
    ]),
    connectMcpServer: vi.fn(async (name: string) => ({
      name,
      status: 'connected',
    })),
    disconnectMcpServer: vi.fn(async (name: string) => ({
      name,
      status: 'disconnected',
    })),
    getSessionMessages: vi.fn(async () => [
      {
        id: 'msg-1',
        role: 'user',
        content: [{ type: 'text', text: 'hello' }],
        timestamp: 1,
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: [{ type: 'text', text: 'hi there' }],
        timestamp: 2,
      },
    ]),
    getSession: vi.fn(async (id: string) => ({
      id,
      name: id === 'session-1' ? 'Demo Session' : 'Loaded Session',
      model: id === 'session-1' ? 'demo-model' : 'other-model',
      cwd: '/tmp/project',
    })),
    createSession: vi.fn(async ({ name, model: nextModel }: { name?: string; model?: string }) => ({
      id: 'session-3',
      name: name || 'New Session',
      model: nextModel || 'default',
    })),
    forkSession: vi.fn(async (id: string, { name }: { name?: string }) => ({
      id: 'session-4',
      name: name || 'Demo Session (fork)',
      model: 'demo-model',
      sourceId: id,
    })),
    updateSession: vi.fn(async (_id: string, { name }: { name?: string }) => ({
      id: 'session-1',
      name: name || 'Updated Session',
      model: 'demo-model',
    })),
    deleteSession: vi.fn(async () => {}),
    clearSessionId: vi.fn(() => {}),
    cancelGeneration: vi.fn(async () => {}),
  }

  return {
    client: client as any,
    lines,
    context: {
      client: client as any,
      getCwd: () => cwd,
      getModel: () => model,
      getMessageOptions: () => messageOptions,
      getIsGenerating: () => false,
      setModel: (nextModel?: string) => {
        model = nextModel
      },
      updateMessageOptions: (updater: (options: any) => any) => {
        messageOptions = updater(messageOptions)
      },
      setSessionId: async (sessionId: string) => {
        await client.getSession(sessionId)
      },
      printLine: (line: string) => {
        lines.push(line)
      },
      requestExit: vi.fn(),
    },
    getMessageOptions: () => messageOptions,
  }
}

describe('executeReplSlashCommand', () => {
  it('shows help output', async () => {
    const { context, lines } = createContext()
    const handled = await executeReplSlashCommand('/help', context)
    expect(handled).toBe(true)
    expect(lines[0]).toBe('Available commands:')
    expect(lines.join('\n')).toContain('/resume <id>')
  })

  it('updates the model override', async () => {
    const { context, lines } = createContext()
    const handled = await executeReplSlashCommand('/model claude-sonnet-4', context)
    expect(handled).toBe(true)
    expect(context.getModel()).toBe('claude-sonnet-4')
    expect(lines).toContain('Model override set to: claude-sonnet-4')
  })

  it('clears the model override', async () => {
    const { context, lines } = createContext()
    const handled = await executeReplSlashCommand('/model reset', context)
    expect(handled).toBe(true)
    expect(context.getModel()).toBeUndefined()
    expect(lines).toContain('Model override cleared.')
  })

  it('lists available models', async () => {
    const { context, lines } = createContext()
    const handled = await executeReplSlashCommand('/models', context)
    expect(handled).toBe(true)
    expect(lines.join('\n')).toContain('Available models:')
    expect(lines.join('\n')).toContain('demo-model')
  })

  it('shows repl config', async () => {
    const { context, lines } = createContext()
    const handled = await executeReplSlashCommand('/config', context)
    expect(handled).toBe(true)
    expect(lines).toContain('Config:')
    expect(lines).toContain('Cwd: /tmp/project')
    expect(lines).toContain('Model override: demo-model')
    expect(lines).toContain('Session option: session-1')
    expect(lines).toContain('Permission mode: acceptEdits')
  })

  it('shows repl context summary', async () => {
    const { context, lines } = createContext()
    const handled = await executeReplSlashCommand('/context', context)
    expect(handled).toBe(true)
    expect(lines).toContain('Context:')
    expect(lines).toContain('Cwd: /tmp/project')
    expect(lines).toContain('Configured model override: demo-model')
    expect(lines).toContain('Available sessions: 2')
    expect(lines).toContain('Active session: session-1')
    expect(lines).toContain('Recent messages loaded: 2')
    expect(lines).toContain('MCP servers: 1/1 connected')
  })

  it('runs repl doctor diagnostics', async () => {
    const { context, lines } = createContext()
    const handled = await executeReplSlashCommand('/doctor', context)
    expect(handled).toBe(true)
    expect(lines).toContain('Doctor:')
    expect(lines).toContain('Server: ok')
    expect(lines).toContain('Models: 2')
    expect(lines).toContain('Sessions: 2')
    expect(lines).toContain('MCP: 1/1 connected')
  })

  it('shows repl environment summary', async () => {
    const { context, lines } = createContext()
    const handled = await executeReplSlashCommand('/env', context)
    expect(handled).toBe(true)
    expect(lines).toContain('Environment:')
    expect(lines).toContain('Runtime: bun')
    expect(lines).toContain('Cwd: /tmp/project')
  })

  it('shows repl version', async () => {
    const { context, lines } = createContext()
    const handled = await executeReplSlashCommand('/version', context)
    expect(handled).toBe(true)
    expect(lines).toContain('CCLocal packages CLI: 1.0.0')
    expect(lines).toContain('Runtime: packages/* native architecture')
  })

  it('shows repl permissions summary', async () => {
    const { context, lines } = createContext()
    const handled = await executeReplSlashCommand('/permissions', context)
    expect(handled).toBe(true)
    expect(lines).toContain('Permissions:')
    expect(lines).toContain('Mode: acceptEdits')
    expect(lines).toContain('Allowed tools: file_read')
    expect(lines).toContain('Disallowed tools: bash')
    expect(lines).toContain('Server-side auth: enabled')
  })

  it('updates repl permission mode for subsequent messages', async () => {
    const { context, lines, getMessageOptions } = createContext()
    const handled = await executeReplSlashCommand('/permissions dontAsk', context)
    expect(handled).toBe(true)
    expect(getMessageOptions().permissionPolicy.mode).toBe('dontAsk')
    expect(lines).toContain('Permission mode set to: dontAsk')
  })

  it('shows repl lightweight stats', async () => {
    const { context, lines } = createContext()
    const handled = await executeReplSlashCommand('/stats', context)
    expect(handled).toBe(true)
    expect(lines).toContain('Stats:')
    expect(lines).toContain('Sessions: 2')
    expect(lines).toContain('Messages (loaded summaries): 0')
    expect(lines).toContain('Models: 2')
    expect(lines).toContain('MCP servers: 1/1 connected')
  })

  it('shows repl lightweight cost summary', async () => {
    const { context, lines } = createContext()
    const handled = await executeReplSlashCommand('/cost', context)
    expect(handled).toBe(true)
    expect(lines).toContain('Cost:')
    expect(lines).toContain('Session: Demo Session')
    expect(lines).toContain('Session id: session-1')
    expect(lines).toContain('Messages: 2')
    expect(lines.join('\n')).toContain('Estimated tokens:')
  })

  it('shows repl status', async () => {
    const { context, lines } = createContext()
    const handled = await executeReplSlashCommand('/status', context)
    expect(handled).toBe(true)
    expect(lines).toContain('Session: session-1')
    expect(lines).toContain('Session name: Demo Session')
    expect(lines).toContain('Session cwd: /tmp/project')
    expect(lines).toContain('Session model: demo-model')
    expect(lines).toContain('Model override: demo-model')
    expect(lines).toContain('Generation: idle')
    expect(lines).toContain('MCP servers: 1/1 connected')
  })

  it('handles lightweight theme command', async () => {
    const { context, lines } = createContext()
    const handled = await executeReplSlashCommand('/theme solarized', context)
    expect(handled).toBe(true)
    expect(lines).toContain('Theme preference noted: solarized')
  })

  it('exports recent session messages', async () => {
    const { context, lines } = createContext()
    const handled = await executeReplSlashCommand('/export 2', context)
    expect(handled).toBe(true)
    const output = lines.join('\n')
    expect(output).toContain('"sessionId": "session-1"')
    expect(output).toContain('"text": "hello"')
  })

  it('creates and appends project memory', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'cclocal-repl-memory-'))
    try {
      const { context, lines } = createContext({ cwd })
      const initHandled = await executeReplSlashCommand('/init', context)
      expect(initHandled).toBe(true)
      expect(lines.join('\n')).toContain('Created')

      const memoryHandled = await executeReplSlashCommand('/memory Prefer bun test for packages.', context)
      expect(memoryHandled).toBe(true)
      expect(readFileSync(join(cwd, 'CLAUDE.md'), 'utf-8')).toContain('Prefer bun test for packages.')
    } finally {
      rmSync(cwd, { recursive: true, force: true })
    }
  })

  it('lists mcp servers', async () => {
    const { context, lines } = createContext()
    const handled = await executeReplSlashCommand('/mcp', context)
    expect(handled).toBe(true)
    expect(lines.join('\n')).toContain('MCP servers:')
    expect(lines.join('\n')).toContain('filesystem')
  })

  it('shows one mcp server', async () => {
    const { context, lines } = createContext()
    const handled = await executeReplSlashCommand('/mcp filesystem', context)
    expect(handled).toBe(true)
    expect(lines).toContain('MCP server: filesystem')
    expect(lines).toContain('Status: connected')
  })

  it('connects an mcp server from repl', async () => {
    const { context, client, lines } = createContext()
    const handled = await executeReplSlashCommand('/mcp connect filesystem', context)
    expect(handled).toBe(true)
    expect(client.connectMcpServer).toHaveBeenCalledWith('filesystem')
    expect(lines).toContain('Connected MCP server: filesystem (connected)')
  })

  it('disconnects an mcp server from repl', async () => {
    const { context, client, lines } = createContext()
    const handled = await executeReplSlashCommand('/mcp disconnect filesystem', context)
    expect(handled).toBe(true)
    expect(client.disconnectMcpServer).toHaveBeenCalledWith('filesystem')
    expect(lines).toContain('Disconnected MCP server: filesystem (disconnected)')
  })

  it('lists recent sessions', async () => {
    const { context, lines } = createContext()
    const handled = await executeReplSlashCommand('/sessions', context)
    expect(handled).toBe(true)
    expect(lines.join('\n')).toContain('Recent sessions:')
    expect(lines.join('\n')).toContain('* session-1')
  })

  it('supports a count for sessions listing', async () => {
    const { context, lines } = createContext()
    const handled = await executeReplSlashCommand('/sessions 1', context)
    expect(handled).toBe(true)
    const sessionLines = lines.filter((line) => line.startsWith('* ') || line.startsWith('- '))
    expect(sessionLines).toHaveLength(1)
    expect(sessionLines[0]).toContain('session-1')
  })

  it('switches session on resume', async () => {
    const { context, client, lines } = createContext()
    const handled = await executeReplSlashCommand('/resume session-2', context)
    expect(handled).toBe(true)
    expect(client.getSession).toHaveBeenCalledWith('session-2')
    expect(lines).toContain('Switched to session: session-2')
  })

  it('supports use as an alias for resume', async () => {
    const { context, client, lines } = createContext()
    const handled = await executeReplSlashCommand('/use session-2', context)
    expect(handled).toBe(true)
    expect(client.getSession).toHaveBeenCalledWith('session-2')
    expect(lines).toContain('Switched to session: session-2')
  })

  it('creates a new session', async () => {
    const { context, client, lines } = createContext()
    const handled = await executeReplSlashCommand('/new-session Scratch Pad', context)
    expect(handled).toBe(true)
    expect(client.createSession).toHaveBeenCalledWith({
      name: 'Scratch Pad',
      cwd: '/tmp/project',
      model: 'demo-model',
    })
    expect(lines.join('\n')).toContain('Created new session: session-3')
  })

  it('supports new as an alias for new-session', async () => {
    const { context, client, lines } = createContext()
    const handled = await executeReplSlashCommand('/new Scratch Pad', context)
    expect(handled).toBe(true)
    expect(client.createSession).toHaveBeenCalledWith({
      name: 'Scratch Pad',
      cwd: '/tmp/project',
      model: 'demo-model',
    })
    expect(lines.join('\n')).toContain('Created new session: session-3')
  })

  it('continues the latest session in cwd', async () => {
    const { context, client, lines } = createContext()
    const handled = await executeReplSlashCommand('/continue', context)
    expect(handled).toBe(true)
    expect(client.getSession).toHaveBeenCalledWith('session-1')
    expect(lines).toContain('Switched to latest session: session-1')
  })

  it('starts a fresh session with clear', async () => {
    const { context, client, lines } = createContext()
    const handled = await executeReplSlashCommand('/clear Scratch Reset', context)
    expect(handled).toBe(true)
    expect(client.createSession).toHaveBeenCalledWith({
      name: 'Scratch Reset',
      cwd: '/tmp/project',
      model: 'demo-model',
    })
    expect(lines.join('\n')).toContain('Started fresh session: session-3')
  })

  it('shows recent history for the active session', async () => {
    const { context, lines } = createContext()
    const handled = await executeReplSlashCommand('/history 2', context)
    expect(handled).toBe(true)
    expect(lines.join('\n')).toContain('Recent messages (2):')
    expect(lines.join('\n')).toContain('[user] hello')
    expect(lines.join('\n')).toContain('[assistant] hi there')
  })

  it('supports messages as an alias for history', async () => {
    const { context, lines } = createContext()
    const handled = await executeReplSlashCommand('/messages 2', context)
    expect(handled).toBe(true)
    expect(lines.join('\n')).toContain('Recent messages (2):')
  })

  it('shows detailed current session information', async () => {
    const { context, lines } = createContext()
    const handled = await executeReplSlashCommand('/session', context)
    expect(handled).toBe(true)
    expect(lines).toContain('Current session: session-1')
    expect(lines).toContain('Name: Demo Session')
    expect(lines).toContain('Model: demo-model')
    expect(lines).toContain('Cwd: /tmp/project')
  })

  it('forks the current session', async () => {
    const { context, client, lines } = createContext()
    const handled = await executeReplSlashCommand('/fork Scratch Fork', context)
    expect(handled).toBe(true)
    expect(client.forkSession).toHaveBeenCalledWith('session-1', {
      name: 'Scratch Fork',
      model: 'demo-model',
    })
    expect(lines.join('\n')).toContain('Forked session: session-4')
  })

  it('renames the current session', async () => {
    const { context, client, lines } = createContext()
    const handled = await executeReplSlashCommand('/rename-session Renamed Session', context)
    expect(handled).toBe(true)
    expect(client.updateSession).toHaveBeenCalledWith('session-1', {
      name: 'Renamed Session',
    })
    expect(lines).toContain('Renamed session to: Renamed Session')
  })

  it('supports rename as an alias for rename-session', async () => {
    const { context, client, lines } = createContext()
    const handled = await executeReplSlashCommand('/rename Aliased Session', context)
    expect(handled).toBe(true)
    expect(client.updateSession).toHaveBeenCalledWith('session-1', {
      name: 'Aliased Session',
    })
    expect(lines).toContain('Renamed session to: Aliased Session')
  })

  it('handles legacy compatibility slash commands', async () => {
    const { context, lines } = createContext()
    const handled = await executeReplSlashCommand('/assistant', context)
    expect(handled).toBe(true)
    expect(lines).toContain('/assistant is covered by packages compatibility mode.')
  })

  it('captures integration and UI runtime metadata', async () => {
    const { context, lines, getMessageOptions } = createContext()

    expect(await executeReplSlashCommand('/ide', context)).toBe(true)
    expect(await executeReplSlashCommand('/chrome off', context)).toBe(true)
    expect(await executeReplSlashCommand('/remote-control teammate-a', context)).toBe(true)
    expect(await executeReplSlashCommand('/vim insert', context)).toBe(true)
    expect(await executeReplSlashCommand('/rewind msg-1', context)).toBe(true)

    expect(getMessageOptions().compatibility).toMatchObject({
      ide: true,
      chrome: false,
      remoteControl: 'teammate-a',
      vimMode: 'insert',
      rewindRequested: 'msg-1',
    })
    expect(lines).toContain('IDE integration metadata: enabled')
    expect(lines).toContain('Chrome integration metadata: disabled')
    expect(lines).toContain('Remote-control metadata: teammate-a')
    expect(lines).toContain('Vim mode preference noted: insert')
    expect(lines).toContain('Rewind request captured: msg-1')
  })

  it('deletes the current session', async () => {
    const { context, client, lines } = createContext()
    const handled = await executeReplSlashCommand('/delete-session', context)
    expect(handled).toBe(true)
    expect(client.deleteSession).toHaveBeenCalledWith('session-1')
    expect(client.clearSessionId).toHaveBeenCalled()
    expect(lines).toContain('Deleted session: session-1')
  })

  it('requests cancellation', async () => {
    const { context, client, lines } = createContext()
    const handled = await executeReplSlashCommand('/cancel', context)
    expect(handled).toBe(true)
    expect(client.cancelGeneration).toHaveBeenCalled()
    expect(lines).toContain('Cancel requested.')
  })
})

describe('launchRepl', () => {
  it('sends repl messages with startup compatibility options and prefill', async () => {
    const write = vi.fn()
    const close = vi.fn()
    const on = vi.fn((_event: string, handler: () => void) => {
      if (_event === 'close') {
        setTimeout(handler, 0)
      }
      return undefined
    })

    const questions = ['/ide', 'hello from repl', 'quit']
    const question = vi.fn((_prompt: string, callback: (input: string) => void) => {
      const next = questions.shift()
      if (next !== undefined) {
        callback(next)
      }
    })

    const removeMessageHandler = vi.fn()
    let handler: ((event: any) => void) | undefined

    const client = {
      getSessionId: vi.fn(() => undefined),
      createSession: vi.fn(async ({ id, name, cwd, model }: any) => ({
        id: id || 'session-1',
        name: name || 'Startup Session',
        cwd,
        model,
      })),
      onMessage: vi.fn((nextHandler: (event: any) => void) => {
        handler = nextHandler
      }),
      removeMessageHandler,
      disconnect: vi.fn(),
      cancelGeneration: vi.fn(async () => {}),
      sendMessage: vi.fn(async (_content: string, _options: any) => {
        handler?.({
          type: 'stream_start',
          messageId: 'assistant-1',
        })
        handler?.({
          type: 'stream_delta',
          messageId: 'assistant-1',
          delta: { type: 'text', text: 'ok' },
        })
        handler?.({
          type: 'stream_end',
          messageId: 'assistant-1',
        })
      }),
    } as any

    await launchRepl(client, {
      model: 'demo-model',
      cwd: '/tmp/repl-project',
      prefill: 'draft prompt',
      createInterface: () => ({
        question,
        write,
        close,
        on,
      } as any),
      createSessionOnStart: {
        id: 'session-start',
        name: 'Startup Session',
        cwd: '/tmp/repl-project',
        model: 'demo-model',
      },
      messageOptions: {
        systemPrompt: 'System prompt',
        permissionPolicy: {
          mode: 'acceptEdits',
          allowedTools: ['file_read'],
        },
        compatibility: {
          thinking: 'enabled',
        },
      },
    })

    expect(client.createSession).toHaveBeenCalledWith({
      id: 'session-start',
      name: 'Startup Session',
      cwd: '/tmp/repl-project',
      model: 'demo-model',
    })
    expect(write).toHaveBeenCalledWith('draft prompt')
    expect(client.sendMessage).toHaveBeenCalledWith('hello from repl', expect.objectContaining({
      model: 'demo-model',
      systemPrompt: 'System prompt',
      permissionPolicy: {
        mode: 'acceptEdits',
        allowedTools: ['file_read'],
      },
      compatibility: {
        thinking: 'enabled',
        ide: true,
      },
    }))
    expect(removeMessageHandler).toHaveBeenCalled()
    expect(client.disconnect).toHaveBeenCalled()
  })
})
