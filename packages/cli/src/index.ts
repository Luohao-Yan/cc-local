#!/usr/bin/env bun
/**
 * CCLocal CLI 客户端入口
 */

import { Command } from 'commander'
import { CCLocalClient } from './client/CCLocalClient.js'
import { launchRepl } from './repl/simpleRepl.js'
import type { Message, Session, StreamEvent } from '@cclocal/shared'

const program = new Command()

program
  .name('cclocal')
  .description('CCLocal - AI-powered development assistant')
  .version('1.0.0')
  .option('-s, --server <url>', 'Server URL', 'http://127.0.0.1:5678')
  .option('-t, --token <token>', 'Authentication token', process.env.CCLOCAL_API_KEY)
  .option('--print <prompt>', 'Single prompt mode (non-interactive)')
  .option('--model <model>', 'Model to use')
  .option('--cwd <cwd>', 'Working directory', process.cwd())
  .option('--session <id>', 'Reuse an existing session')
  .action(async (options) => {
    // 创建客户端
    const client = new CCLocalClient({
      serverUrl: options.server,
      authToken: options.token,
      reconnectInterval: 1000,
      maxReconnectAttempts: 5,
    })

    try {
      // 连接到服务端
      await client.connect()
      if (options.session) {
        client.setSessionId(options.session)
      }
      console.log('✅ Connected to CCLocal Server')

      if (options.print) {
        await handleSinglePrompt(client, options.print, options.model)
      } else {
        await launchRepl(client, { model: options.model })
      }
    } catch (error) {
      console.error('❌ Failed to connect:', error)
      process.exit(1)
    }
  })

const mcpCommand = program.command('mcp').description('Manage MCP servers through the local server API')
const modelsCommand = program.command('models').description('Inspect models exposed by the local server API')
const sessionsCommand = program.command('sessions').description('Manage chat sessions through the local server API')

mcpCommand
  .command('list')
  .description('List configured MCP servers')
  .action(async () => {
    const client = createClient(program.opts())
    await client.connect()
    const servers = await client.listMcpServers()
    if (servers.length === 0) {
      console.log('No MCP servers configured.')
      return
    }
    for (const server of servers) {
      const name = String(server.name || '')
      const status = String(server.status || '')
      const type = String((server.config as { type?: string } | undefined)?.type || '')
      console.log(`${name}\t${status}\t${type}`)
    }
  })

mcpCommand
  .command('add-stdio <name> <command> [args...]')
  .description('Register a stdio MCP server')
  .option('--cwd <cwd>', 'Working directory for the MCP subprocess')
  .option('--namespace <namespace>', 'Namespace used for dynamic tool registration')
  .option('--allow-tools <tools>', 'Comma-separated allowlist of tool names')
  .option('--block-tools <tools>', 'Comma-separated denylist of tool names')
  .option('--no-sync-tools', 'Do not sync tools into the model tool pool')
  .action(async (name, command, args, options) => {
    const client = createClient(program.opts())
    await client.connect()
    const result = await client.addMcpServer(name, {
      type: 'stdio',
      command,
      args,
      cwd: options.cwd,
      namespace: options.namespace,
      allowedTools: parseListOption(options.allowTools),
      blockedTools: parseListOption(options.blockTools),
      syncToolsToRegistry: options.syncTools,
    })
    console.log(JSON.stringify(result, null, 2))
  })

mcpCommand
  .command('add-sse <name> <url>')
  .description('Register an SSE MCP server')
  .option('--namespace <namespace>', 'Namespace used for dynamic tool registration')
  .option('--allow-tools <tools>', 'Comma-separated allowlist of tool names')
  .option('--block-tools <tools>', 'Comma-separated denylist of tool names')
  .option('--header <header...>', 'Additional headers in "Key: Value" format')
  .option('--no-sync-tools', 'Do not sync tools into the model tool pool')
  .action(async (name, url, options) => {
    const client = createClient(program.opts())
    await client.connect()
    const result = await client.addMcpServer(name, {
      type: 'sse',
      url,
      headers: parseHeaders(options.header),
      namespace: options.namespace,
      allowedTools: parseListOption(options.allowTools),
      blockedTools: parseListOption(options.blockTools),
      syncToolsToRegistry: options.syncTools,
    })
    console.log(JSON.stringify(result, null, 2))
  })

mcpCommand
  .command('connect <name>')
  .description('Connect an MCP server and sync its tools if enabled')
  .action(async (name) => {
    const client = createClient(program.opts())
    await client.connect()
    const result = await client.connectMcpServer(name)
    console.log(JSON.stringify(result, null, 2))
  })

mcpCommand
  .command('disconnect <name>')
  .description('Disconnect an MCP server')
  .action(async (name) => {
    const client = createClient(program.opts())
    await client.connect()
    const result = await client.disconnectMcpServer(name)
    console.log(JSON.stringify(result, null, 2))
  })

mcpCommand
  .command('remove <name>')
  .description('Remove an MCP server')
  .action(async (name) => {
    const client = createClient(program.opts())
    await client.connect()
    await client.removeMcpServer(name)
    console.log(`Removed MCP server "${name}".`)
  })

sessionsCommand
  .command('new [name]')
  .description('Create a new session')
  .option('--model <model>', 'Model to use for the new session')
  .option('--cwd <cwd>', 'Working directory for the new session')
  .action(async (name, options) => {
    const rootOptions = program.opts()
    const client = createClient(rootOptions)
    await client.connect()
    const session = await client.createSession({
      name,
      model: options.model || rootOptions.model,
      cwd: options.cwd || rootOptions.cwd,
    })
    console.log(formatSessionDetails(session))
  })

sessionsCommand
  .command('list')
  .description('List recent sessions')
  .action(async () => {
    const client = createClient(program.opts())
    await client.connect()
    const sessions = await client.listSessions()
    if (sessions.length === 0) {
      console.log('No sessions found.')
      return
    }

    for (const session of sessions) {
      console.log(formatSessionSummary(session))
    }
  })

sessionsCommand
  .command('show <id>')
  .description('Show session details and recent messages')
  .option('--messages <count>', 'Number of messages to load', parseIntegerOption)
  .option('--offset <count>', 'Message offset for pagination', parseIntegerOption)
  .action(async (id, options) => {
    const client = createClient(program.opts())
    await client.connect()
    const session = await client.getSession(id)
    const messages = await client.getSessionMessages(id, {
      limit: options.messages,
      offset: options.offset,
    })

    console.log(formatSessionDetails(session))
    if (messages.length === 0) {
      console.log('\nNo messages found for this session.')
      return
    }

    console.log('\nMessages:')
    for (const message of messages) {
      console.log(formatMessageSummary(message))
    }
  })

sessionsCommand
  .command('use <id>')
  .description('Reuse an existing session in REPL or single-prompt mode')
  .option('--print <prompt>', 'Send a single prompt in the selected session')
  .action(async (id, options) => {
    const client = createClient(program.opts())
    await client.connect()
    await client.getSession(id)

    if (options.print) {
      await handleSinglePrompt(client, options.print)
      return
    }

    await launchRepl(client)
  })

sessionsCommand
  .command('rename <id> <name>')
  .description('Rename a session')
  .action(async (id, name) => {
    const client = createClient(program.opts())
    await client.connect()
    const session = await client.updateSession(id, { name })
    console.log(`Renamed session "${session.id}" to "${session.name}".`)
  })

sessionsCommand
  .command('delete <id>')
  .description('Delete a session')
  .action(async (id) => {
    const client = createClient(program.opts())
    await client.connect()
    await client.deleteSession(id)
    console.log(`Deleted session "${id}".`)
  })

async function handleSinglePrompt(
  client: CCLocalClient,
  prompt: string,
  model?: string
): Promise<void> {
  return await new Promise((resolve, reject) => {
    let response = ''

    const handler = (event: StreamEvent) => {
      switch (event.type) {
        case 'stream_start':
          // 开始接收响应
          break
        case 'stream_delta':
          if (event.delta?.type === 'text' && event.delta.text) {
            response += event.delta.text
            process.stdout.write(event.delta.text)
          }
          break
        case 'stream_end':
          console.log() // 换行
          client.removeMessageHandler(handler)
          resolve()
          break
        case 'error':
          client.removeMessageHandler(handler)
          reject(new Error(event.error || 'Unknown error'))
          break
      }
    }

    client.onMessage(handler)

    // 发送消息
    void client.sendMessage(prompt, { model }).catch((error) => {
      client.removeMessageHandler(handler)
      reject(error)
    })
  })
}

function createClient(options: {
  server?: string
  token?: string
  session?: string
} = {}): CCLocalClient {
  const client = new CCLocalClient({
    serverUrl: options.server || 'http://127.0.0.1:5678',
    authToken: options.token,
    reconnectInterval: 1000,
    maxReconnectAttempts: 5,
  })

  if (options.session) {
    client.setSessionId(options.session)
  }

  return client
}

function parseListOption(value?: string): string[] | undefined {
  if (!value) {
    return undefined
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseHeaders(values?: string[]): Record<string, string> | undefined {
  if (!values || values.length === 0) {
    return undefined
  }

  const headers: Record<string, string> = {}
  for (const value of values) {
    const separatorIndex = value.indexOf(':')
    if (separatorIndex === -1) {
      throw new Error(`Invalid header format: "${value}". Use "Key: Value".`)
    }

    const key = value.slice(0, separatorIndex).trim()
    const headerValue = value.slice(separatorIndex + 1).trim()
    if (!key || !headerValue) {
      throw new Error(`Invalid header format: "${value}". Use "Key: Value".`)
    }
    headers[key] = headerValue
  }

  return headers
}

function parseIntegerOption(value: string): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Expected a non-negative integer, received "${value}".`)
  }
  return parsed
}

function formatSessionSummary(session: Session): string {
  return [
    session.id,
    session.name,
    session.model,
    session.cwd,
    new Date(session.updatedAt).toLocaleString(),
  ].join('\t')
}

function formatSessionDetails(session: Session): string {
  return [
    `Session: ${session.name}`,
    `ID: ${session.id}`,
    `Model: ${session.model}`,
    `CWD: ${session.cwd}`,
    `Created: ${new Date(session.createdAt).toLocaleString()}`,
    `Updated: ${new Date(session.updatedAt).toLocaleString()}`,
  ].join('\n')
}

function formatMessageSummary(message: Message): string {
  const text = message.content
    .map((item) => {
      switch (item.type) {
        case 'text':
          return item.text
        case 'tool_use':
          return `[tool_use:${item.name}]`
        case 'tool_result':
          return `[tool_result:${item.tool_use_id}] ${item.content}`
        case 'thinking':
          return `[thinking] ${item.thinking}`
      }
    })
    .join(' ')
    .trim()

  return `${new Date(message.timestamp).toLocaleString()} [${message.role}] ${text || '(empty)'}`
}

program.parse()
