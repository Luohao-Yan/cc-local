/**
 * cclocal-native — Packages-Native Entry Point
 *
 * This is a NEW entry point that does NOT modify existing code.
 * It provides:
 * - Local QueryEngine mode (default)
 * - Remote REST API mode (with --server)
 *
 * Usage:
 *   cclocal-native                    # Local engine mode
 *   cclocal-native --server URL       # Remote REST mode
 *   cclocal-native --local-engine     # Force local engine
 *   cclocal-native mcp list           # REST-backed commands
 */

import { parseArgs } from 'node:util'
import { NativeBridgeAdapter, createLocalBridgeAdapter, createRemoteBridgeAdapter } from '../bridge/nativeBridgeAdapter.js'
import { CCLocalClient } from '../client/CCLocalClient.js'
import { NATIVE_REST_COMMANDS, getFirstCommand, type NativeModeType } from '../runtime/nativeRouting.js'

/**
 * Command line arguments
 */
interface NativeArgs {
  mode: NativeModeType
  serverUrl?: string
  authToken?: string
  model?: string
  maxTurns?: number
  prompt?: string
  command?: string
  commandArgs: string[]
  cwd?: string
  sessionId?: string
}

/**
 * Parse command line arguments
 */
function parseNativeArgs(argv: string[]): NativeArgs {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      server: { type: 'string', short: 's' },
      token: { type: 'string', short: 't' },
      model: { type: 'string', short: 'm' },
      'max-turns': { type: 'string' },
      print: { type: 'string', short: 'p' },
      'local-engine': { type: 'boolean' },
      cwd: { type: 'string' },
      'session-id': { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
    strict: false,
    allowPositionals: true,
  })

  // Determine mode
  let mode: NativeModeType = 'local'
  if (values.server) {
    mode = 'rest'
  } else if (values['local-engine']) {
    mode = 'local-engine'
  } else {
    // Check if first positional is a REST-backed command
    const firstCommand = positionals[0]
    if (firstCommand && NATIVE_REST_COMMANDS.has(firstCommand)) {
      mode = 'rest'
    }
  }

  return {
    mode,
    serverUrl: values.server as string | undefined,
    authToken: values.token as string | undefined,
    model: values.model as string | undefined,
    maxTurns: values['max-turns'] ? parseInt(values['max-turns'] as string, 10) : undefined,
    prompt: values.print as string | undefined,
    command: positionals[0],
    commandArgs: positionals.slice(1),
    cwd: values.cwd as string | undefined,
    sessionId: values['session-id'] as string | undefined,
  }
}

/**
 * Run native mode
 */
async function runNative(): Promise<void> {
  const args = parseNativeArgs(process.argv.slice(2))

  // Show help
  if (args.command === 'help' || process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp()
    process.exit(0)
  }

  // Create adapter based on mode
  let adapter: NativeBridgeAdapter

  if (args.mode === 'rest' && args.serverUrl) {
    console.log(`📡 Connecting to server: ${args.serverUrl}`)
    adapter = createRemoteBridgeAdapter(args.serverUrl, {
      authToken: args.authToken,
      model: args.model,
      maxTurns: args.maxTurns,
    })
  } else {
    console.log('🖥️ Using local QueryEngine')
    adapter = createLocalBridgeAdapter({
      model: args.model,
      maxTurns: args.maxTurns,
    })
  }

  try {
    // Initialize
    await adapter.initialize()
    console.log('✅ Ready')

    // Handle single prompt mode
    if (args.prompt) {
      await runSinglePrompt(adapter, args.prompt, args)
      return
    }

    // Handle REST-backed commands
    if (args.command && NATIVE_REST_COMMANDS.has(args.command)) {
      await runRestCommand(adapter, args.command, args.commandArgs, args)
      return
    }

    // Interactive mode
    await runInteractiveMode(adapter, args)
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  } finally {
    await adapter.dispose()
  }
}

/**
 * Run single prompt mode
 */
async function runSinglePrompt(adapter: NativeBridgeAdapter, prompt: string, args: NativeArgs): Promise<void> {
  console.log(`\n> ${prompt}\n`)

  const messages = [{
    id: `user_${Date.now()}`,
    role: 'user' as const,
    content: [{ type: 'text' as const, text: prompt }],
    timestamp: Date.now(),
  }]

  let fullResponse = ''

  for await (const event of adapter.query({ messages })) {
    if (event.type === 'stream_event') {
      const e = event.event as Record<string, unknown>
      if (e.type === 'content_block_delta') {
        const delta = e.delta as Record<string, unknown>
        if (delta.type === 'text_delta') {
          process.stdout.write(delta.text as string)
          fullResponse += delta.text
        }
      }
    } else if (event.type === 'message') {
      // Final message
    }
  }

  console.log('\n')
}

/**
 * Run REST-backed command
 */
async function runRestCommand(
  adapter: NativeBridgeAdapter,
  command: string,
  commandArgs: string[],
  args: NativeArgs
): Promise<void> {
  const client = adapter.getClient()
  if (!client) {
    console.error('Error: REST commands require --server URL')
    process.exit(1)
  }

  switch (command) {
    case 'mcp': {
      await handleMcpCommand(client, commandArgs)
      break
    }
    case 'models': {
      await handleModelsCommand(client, commandArgs)
      break
    }
    case 'sessions': {
      await handleSessionsCommand(client, commandArgs, args)
      break
    }
    case 'doctor': {
      await handleDoctorCommand(client, commandArgs)
      break
    }
    case 'context': {
      await handleContextCommand(client, commandArgs)
      break
    }
    default:
      console.log(`Unknown command: ${command}`)
      console.log('Run with --help for usage information')
  }
}

/**
 * Handle MCP commands
 */
async function handleMcpCommand(client: CCLocalClient, args: string[]): Promise<void> {
  const subCommand = args[0]

  switch (subCommand) {
    case 'list': {
      const servers = await client.listMcpServers()
      if (servers.length === 0) {
        console.log('No MCP servers configured.')
      } else {
        console.log('NAME\tSTATUS\tTYPE')
        for (const server of servers) {
          const config = server.config as { type?: string } | undefined
          console.log(`${server.name}\t${server.status}\t${config?.type || 'unknown'}`)
        }
      }
      break
    }
    case 'add':
    case 'add-stdio': {
      const name = args[1]
      const commandPath = args[2]
      if (!name || !commandPath) {
        console.error('Usage: mcp add <name> <command> [args...]')
        process.exit(1)
      }
      await client.addMcpServer(name, {
        type: 'stdio',
        command: commandPath,
        args: args.slice(3),
      })
      console.log(`Added MCP server: ${name}`)
      break
    }
    case 'connect': {
      const name = args[1]
      if (!name) {
        console.error('Usage: mcp connect <name>')
        process.exit(1)
      }
      await client.connectMcpServer(name)
      console.log(`Connected: ${name}`)
      break
    }
    case 'disconnect': {
      const name = args[1]
      if (!name) {
        console.error('Usage: mcp disconnect <name>')
        process.exit(1)
      }
      await client.disconnectMcpServer(name)
      console.log(`Disconnected: ${name}`)
      break
    }
    case 'remove': {
      const name = args[1]
      if (!name) {
        console.error('Usage: mcp remove <name>')
        process.exit(1)
      }
      await client.removeMcpServer(name)
      console.log(`Removed: ${name}`)
      break
    }
    default:
      console.log(`Unknown mcp subcommand: ${subCommand}`)
      console.log('Available: list, add, connect, disconnect, remove')
  }
}

/**
 * Handle models commands
 */
async function handleModelsCommand(client: CCLocalClient, args: string[]): Promise<void> {
  const subCommand = args[0]

  switch (subCommand) {
    case 'list':
    case undefined: {
      const models = await client.listModels()
      if (models.length === 0) {
        console.log('No models available.')
      } else {
        console.log('ID\tNAME')
        for (const model of models) {
          console.log(`${model.id}\t${model.name}`)
        }
      }
      break
    }
    default:
      console.log(`Unknown models subcommand: ${subCommand}`)
  }
}

/**
 * Handle sessions commands
 */
async function handleSessionsCommand(client: CCLocalClient, args: string[], nativeArgs: NativeArgs): Promise<void> {
  const subCommand = args[0]

  switch (subCommand) {
    case 'list':
    case undefined: {
      const sessions = await client.listSessions()
      if (sessions.length === 0) {
        console.log('No sessions found.')
      } else {
        console.log('ID\tNAME\tMODEL\tUPDATED')
        for (const session of sessions) {
          console.log(`${session.id}\t${session.name || '-'}\t${session.model}\t${new Date(session.updatedAt).toLocaleString()}`)
        }
      }
      break
    }
    case 'new': {
      const session = await client.createSession({
        name: args[1],
        model: nativeArgs.model,
        cwd: nativeArgs.cwd || process.cwd(),
      })
      console.log(`Created session: ${session.id}`)
      console.log(`Model: ${session.model}`)
      console.log(`CWD: ${session.cwd}`)
      break
    }
    case 'get': {
      const id = args[1]
      if (!id) {
        console.error('Usage: sessions get <id>')
        process.exit(1)
      }
      const session = await client.getSession(id)
      console.log(`Session: ${session.name || session.id}`)
      console.log(`Model: ${session.model}`)
      console.log(`CWD: ${session.cwd}`)
      console.log(`Created: ${new Date(session.createdAt).toLocaleString()}`)
      console.log(`Updated: ${new Date(session.updatedAt).toLocaleString()}`)
      break
    }
    case 'delete': {
      const id = args[1]
      if (!id) {
        console.error('Usage: sessions delete <id>')
        process.exit(1)
      }
      await client.deleteSession(id)
      console.log(`Deleted session: ${id}`)
      break
    }
    case 'resume': {
      const id = args[1]
      if (!id) {
        console.error('Usage: sessions resume <id>')
        process.exit(1)
      }
      const session = await client.getSession(id)
      const messages = await client.getSessionMessages(id)
      console.log(`Resumed session: ${session.name || session.id}`)
      console.log(`Messages: ${messages.length}`)
      console.log(`Model: ${session.model}`)
      console.log(`CWD: ${session.cwd}`)
      console.log('\nUse --session-id flag with interactive mode to continue this session')
      break
    }
    case 'fork': {
      const id = args[1]
      const name = args[2]
      if (!id) {
        console.error('Usage: sessions fork <id> [name]')
        process.exit(1)
      }
      const newSession = await client.forkSession(id, { name })
      console.log(`Forked session: ${newSession.id}`)
      console.log(`From: ${id}`)
      if (name) {
        console.log(`Name: ${name}`)
      }
      break
    }
    case 'rename': {
      const id = args[1]
      const newName = args[2]
      if (!id || !newName) {
        console.error('Usage: sessions rename <id> <name>')
        process.exit(1)
      }
      await client.updateSession(id, { name: newName })
      console.log(`Renamed session ${id} to: ${newName}`)
      break
    }
    default:
      console.log(`Unknown sessions subcommand: ${subCommand}`)
      console.log('Available: list, new, get, delete, resume, fork, rename')
  }
}

/**
 * Handle doctor command
 */
async function handleDoctorCommand(client: CCLocalClient, args: string[]): Promise<void> {
  console.log('Running diagnostics...\n')

  // Check server connection
  try {
    const start = Date.now()
    await client.connect()
    const latency = Date.now() - start
    console.log(`✅ Server connection: OK (${latency}ms)`)
  } catch (error) {
    console.log(`❌ Server connection: FAILED`)
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`)
    return
  }

  // Check models
  try {
    const models = await client.listModels()
    console.log(`✅ Models available: ${models.length}`)
  } catch (error) {
    console.log(`❌ Models check: FAILED`)
  }

  // Check MCP servers
  try {
    const servers = await client.listMcpServers()
    console.log(`✅ MCP servers: ${servers.length} configured`)
    for (const server of servers) {
      console.log(`   - ${server.name}: ${server.status}`)
    }
  } catch (error) {
    console.log(`❌ MCP check: FAILED`)
  }

  console.log('\nDiagnostics complete.')
}

/**
 * Handle context command
 */
async function handleContextCommand(client: CCLocalClient, args: string[]): Promise<void> {
  const sessions = await client.listSessions()
  const recentSession = sessions[0]

  console.log('Current Context:')
  console.log(`  Server: ${client['config']?.serverUrl || 'connected'}`)
  console.log(`  Recent sessions: ${sessions.length}`)
  if (recentSession) {
    console.log(`  Last session: ${recentSession.name || recentSession.id}`)
    console.log(`  Model: ${recentSession.model}`)
    console.log(`  CWD: ${recentSession.cwd}`)
  }
}


/**
 * Run interactive mode - Uses complete Legacy UI with native backend
 *
 * This approach reuses the full REPL.tsx component (with history,
 * autocomplete, slash commands, etc.) but connects to the native backend.
 */
async function runInteractiveMode(adapter: NativeBridgeAdapter, args: NativeArgs): Promise<void> {
  // Use the independent Native REPL
  const { runNativeREPL } = await import('../runtime/nativeREPL.js')

  await runNativeREPL({
    adapter,
    model: args.model,
    cwd: args.cwd,
    sessionId: args.sessionId,
    maxTurns: args.maxTurns,
  })
}
function printHelp(): void {
  console.log(`
cclocal-native — Packages-Native Entry Point

Usage:
  cclocal-native [options] [command]

Options:
  -s, --server <url>     Connect to remote server
  -t, --token <token>   Authentication token
  -m, --model <model>   Model to use
  --max-turns <n>       Maximum tool-calling turns
  -p, --print <prompt>  Single prompt mode
  --local-engine        Force local engine mode
  -h, --help            Show this help

Commands:
  mcp                   MCP server management
  models                List available models
  sessions              Session management
  doctor                Diagnostics
  config                Configuration
  context               Context information

Examples:
  cclocal-native                          # Local engine mode
  cclocal-native --server http://...     # Remote REST mode
  cclocal-native -p "What is 2+2?"       # Single prompt
  cclocal-native mcp list                # REST command
`)
}

// Run - only when executed directly, not when imported
if (import.meta.main) {
  runNative().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

// Export for programmatic use
export { runNative }
