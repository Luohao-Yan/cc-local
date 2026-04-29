#!/usr/bin/env bun
/**
 * CCLocal CLI 客户端入口
 */

const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy || process.env.HTTPS_PROXY || process.env.https_proxy
if (httpProxy && !process.env.CCLOCAL_NO_PROXY_SET) {
  const noProxy = process.env.NO_PROXY || process.env.no_proxy || ''
  if (!noProxy.includes('127.0.0.1') && !noProxy.includes('localhost')) {
    const result = Bun.spawnSync([process.execPath, process.argv[1], ...process.argv.slice(2)], {
      env: { ...process.env, NO_PROXY: '127.0.0.1,localhost', CCLOCAL_NO_PROXY_SET: '1' },
      stdio: ['inherit', 'inherit', 'inherit'],
    })
    process.exit(result.exitCode ?? 0)
  }
}

import { Command } from 'commander'
import { spawnSync } from 'child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { CCLocalClient } from './client/CCLocalClient.js'
import { clearStoredApiToken, getLocalConfigPath, readLocalConfig, writeLocalConfig } from './config/localConfig.js'
import {
  installLocalPlugin,
  listInstalledPlugins,
  listLocalPlugins,
  uninstallInstalledPlugin,
  updateInstalledPlugin,
  validatePluginTarget,
} from './plugins/localPlugins.js'
import {
  buildInteractiveLaunchContext,
  buildSinglePromptLaunchContext,
} from './runtime/launchContext.js'
import { buildEffectiveRootOptions } from './runtime/launchOptions.js'
import { renderInteractiveRepl } from './runtime/replRenderer.js'
import {
  commandUsesRestApi,
  hasExplicitServerArg,
  shouldAutoStartEmbeddedServer,
} from './runtime/routeContext.js'
import { delegateToLegacyUi, getUserArgs, shouldUseLegacyUi } from './ui/legacyAdapter.js'
import type { Message, MessageOptions, Session, StreamEvent } from '@cclocal/shared'

let embeddedServerProcess: any = null
let embeddedServerToken: string | undefined
let embeddedServerStarted = false

function killEmbeddedServer(): void {
  embeddedServerProcess?.kill()
  embeddedServerProcess = null
  embeddedServerToken = undefined
  embeddedServerStarted = false
}

async function stopEmbeddedServer(): Promise<void> {
  const child = embeddedServerProcess
  embeddedServerProcess = null
  embeddedServerToken = undefined
  embeddedServerStarted = false

  if (!child) {
    return
  }

  if (child.exitCode !== null || child.killed) {
    return
  }

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, 1500)
    child.once('exit', () => {
      clearTimeout(timeout)
      resolve()
    })
    child.kill()
  })
}

const PACKAGES_NATIVE_COMMANDS = new Set([
  'mcp',
  'models',
  'sessions',
  'doctor',
  'config',
  'context',
  'env',
  'stats',
  'cost',
  'permissions',
  'model',
  'auth',
  'setup-token',
  'plugin',
  'plugins',
  'agents',
  'completion',
  'export',
  'install',
  'log',
  'open',
  'server',
  'task',
  'assistant',
  'auto-mode',
  'error',
  'remote-control',
  'rollback',
  'ssh',
  'up',
  'update',
  'upgrade',
])

const LEGACY_TOP_LEVEL_COMMANDS = new Map([
  ['agents', 'List configured agents'],
  ['assistant', 'Launch the assistant flow'],
  ['auto-mode', 'Run auto-mode helpers'],
  ['completion', 'Generate shell completion scripts'],
  ['error', 'Inspect local error diagnostics'],
  ['export', 'Export conversation data'],
  ['install', 'Install shell integrations'],
  ['log', 'Inspect local logs'],
  ['open', 'Open local resources'],
  ['remote-control', 'Manage remote-control integrations'],
  ['rollback', 'Rollback file edits'],
  ['server', 'Run server helpers'],
  ['ssh', 'Run SSH helpers'],
  ['task', 'Manage task flows'],
  ['up', 'Start background services'],
])

function findRepoRoot(): string {
  let current = dirname(fileURLToPath(import.meta.url))
  for (let depth = 0; depth < 8; depth += 1) {
    if (
      existsSync(join(current, 'package.json')) &&
      existsSync(join(current, 'packages', 'server', 'src', 'index.ts'))
    ) {
      return current
    }
    current = dirname(current)
  }
  return process.cwd()
}

function findEmbeddedServerEntrypoint(): string {
  const repoServerPath = join(findRepoRoot(), 'packages', 'server', 'src', 'index.ts')
  if (existsSync(repoServerPath)) {
    return repoServerPath
  }

  return join(dirname(fileURLToPath(import.meta.url)), 'server.js')
}

function httpGetOk(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawnSync(
      'bun',
      ['-e', `const { get } = require('http'); get('${url}', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))`],
      {
        env: { ...process.env, NO_PROXY: '127.0.0.1,localhost' },
        stdio: 'pipe',
      },
    )
    resolve(child.status === 0)
  })
}

async function ensureEmbeddedServer(options: { server?: string; token?: string; serverEmbedded?: boolean }): Promise<void> {
  if (embeddedServerStarted) {
    if (!options.token && embeddedServerToken) {
      options.token = embeddedServerToken
    }
    return
  }

  const explicitServer = hasExplicitServerArg(rawUserArgs)
  let serverUrl = options.server || 'http://127.0.0.1:5678'
  let host = '127.0.0.1'
  let port = 5678

  if (explicitServer) {
    try {
      const parsed = new URL(serverUrl)
      host = parsed.hostname || host
      port = Number.parseInt(parsed.port || '5678', 10)
    } catch {
      // Keep defaults; the later health check will surface invalid URLs clearly.
    }

    try {
      if (await httpGetOk(`${serverUrl}/health`)) {
        embeddedServerStarted = true
        return
      }
    } catch {
      // No server is listening yet; start the embedded packages server below.
    }
  } else {
    port = await findAvailablePort()
    serverUrl = `http://${host}:${port}`
    options.server = serverUrl
  }

  console.log('🚀 Starting embedded server...')
  const { spawn } = await import('child_process')
  const serverPath = findEmbeddedServerEntrypoint()

  embeddedServerProcess = spawn('bun', [serverPath], {
    stdio: 'pipe',
    detached: false,
    env: {
      ...process.env,
      CCLOCAL_HOST: host,
      CCLOCAL_PORT: String(port),
    },
  })

  const captureToken = (data: Buffer) => {
    const tokenMatch = data.toString().match(/API token:\s*([a-f0-9]{64})/)
    if (tokenMatch && !embeddedServerToken) {
      embeddedServerToken = tokenMatch[1]
      if (!options.token) {
        options.token = embeddedServerToken
      }
    }
  }
  embeddedServerProcess.stdout?.on('data', captureToken)
  embeddedServerProcess.stderr?.on('data', captureToken)
  embeddedServerProcess.on('exit', (code: number) => {
    if (!embeddedServerStarted && code !== 0) {
      console.error(`\n❌ Embedded server exited with code ${code}`)
    }
  })
  process.once('exit', () => {
    killEmbeddedServer()
  })

  await new Promise<void>((resolve, reject) => {
    const startTime = Date.now()
    const timeout = 15000
    const checkInterval = 300

    const check = async () => {
      try {
        if ((await httpGetOk(`${serverUrl}/health`)) && embeddedServerToken) {
          await new Promise((ready) => setTimeout(ready, 500))
          embeddedServerStarted = true
          console.log('✅ Embedded server started')
          resolve()
          return
        }
      } catch {
        // Keep waiting until timeout.
      }

      if (Date.now() - startTime > timeout) {
        reject(new Error('Server start timeout'))
        return
      }

      setTimeout(check, checkInterval)
    }

    check()
  })

  if (!options.token && embeddedServerToken) {
    options.token = embeddedServerToken
  }
}

async function findAvailablePort(): Promise<number> {
  const { createServer } = await import('net')
  return await new Promise((resolve, reject) => {
    const server = createServer()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : undefined
      server.close(() => {
        if (port) {
          resolve(port)
        } else {
          reject(new Error('Unable to allocate an embedded server port'))
        }
      })
    })
  })
}

const rawUserArgs = getUserArgs(process.argv)
if (shouldUseLegacyUi(rawUserArgs)) {
  delegateToLegacyUi(rawUserArgs)
}

const program = new Command()

program
  .name('cclocal')
  .description('CCLocal - AI-powered development assistant')
  .version('1.0.0')
  .option('-s, --server <url>', 'Server URL', 'http://127.0.0.1:5678')
  .option('-t, --token <token>', 'Authentication token', process.env.CCLOCAL_API_KEY)
  .option('--auth-token <token>', 'Authentication token alias')
  .option('--print <prompt>', 'Single prompt mode (non-interactive)')
  .option('-r, --resume [id]', 'Resume an existing session by ID, or the most recent session in the current cwd')
  .option('-c, --continue', 'Continue the most recent session in the current cwd')
  .option('--fork-session', 'Create a new session from a resumed session', false)
  .option('--output-format <format>', 'Compatibility output format (text, json, stream-json)', 'text')
  .option('--include-partial-messages', 'Include stream-json partial message output', false)
  .option('--replay-user-messages', 'Replay user messages in stream-json output', false)
  .option('--no-session-persistence', 'Use an ephemeral session without persistence')
  .option('--permission-mode <mode>', 'Compatibility permission mode (dontAsk, acceptEdits, bypassPermissions)')
  .option('--dangerously-skip-permissions', 'Alias for --permission-mode=bypassPermissions in compatibility mode', false)
  .option('--allow-dangerously-skip-permissions', 'Allow bypassPermissions mode to be selected explicitly', false)
  .option('--allowedTools, --allowed-tools <tools>', 'Comma-separated compatibility allowlist of tool names')
  .option('--disallowedTools, --disallowed-tools <tools>', 'Comma-separated compatibility denylist of tool names')
  .option('--system-prompt <prompt>', 'System prompt to use for the session')
  .option('--system-prompt-file <file>', 'Read system prompt from a file')
  .option('--append-system-prompt <prompt>', 'Append a system prompt to the default prompt')
  .option('--append-system-prompt-file <file>', 'Read and append a system prompt from a file')
  .option('--mcp-config <config>', 'Load MCP servers from a JSON file or JSON string', collectOption, [])
  .option('--strict-mcp-config', 'Use only MCP servers from --mcp-config for this startup', false)
  .option('--settings <file-or-json>', 'Load compatibility settings from a JSON file or JSON string', collectOption, [])
  .option('--plugin-dir <path>', 'Load plugins from a directory for this session only', collectOption, [])
  .option('--add-dir <directory>', 'Additional directory to include in message context', collectOption, [])
  .option('--file <spec>', 'File resource spec to attach as compatibility metadata', collectOption, [])
  .option('--tools <tools>', 'Comma-separated list of model-visible tools; "" disables tools')
  .option('--input-format <format>', 'Compatibility input format (text or stream-json)', 'text')
  .option('--json-schema <schema>', 'JSON schema for structured output validation')
  .option('--include-hook-events', 'Include hook lifecycle events in stream-json compatibility output', false)
  .option('--disable-slash-commands', 'Disable slash-command/skill loading metadata for this session', false)
  .option('--debug', 'Enable local compatibility debug mode', false)
  .option('--debug-file <path>', 'Write debug metadata to a file')
  .option('--debug-to-stderr', 'Mirror debug metadata to stderr', false)
  .option('--mcp-debug', 'Enable MCP debug metadata', false)
  .option('--verbose', 'Enable verbose compatibility output', false)
  .option('--max-turns <turns>', 'Maximum tool-calling turns in non-interactive mode', parseIntegerOption)
  .option('--max-thinking-tokens <tokens>', 'Compatibility thinking-token budget hint', parseIntegerOption)
  .option('--thinking <mode>', 'Thinking mode hint (enabled, adaptive, disabled)')
  .option('--fallback-model <model>', 'Fallback model hint stored in message options')
  .option('--session-id <uuid>', 'Use or create a specific session id')
  .option('-n, --name <name>', 'Set the display name for a newly created session')
  .option('--prefill <text>', 'Pre-fill the prompt input metadata for interactive sessions')
  .option('--workspace <dir>', 'Default workspace directory for this session')
  .option('-w, --worktree [name]', 'Create or reference a worktree for this session')
  .option('--tmux [mode]', 'Request tmux integration metadata for worktree sessions')
  .option('--ide', 'Request IDE auto-connect metadata', false)
  .option('--chrome', 'Request Chrome integration metadata')
  .option('--no-chrome', 'Disable Chrome integration metadata')
  .option('--workload <tag>', 'Workload tag metadata')
  .option('--bare', 'Minimal compatibility mode metadata', false)
  .option('--remote [description]', 'Create remote-session compatibility metadata')
  .option('--remote-control [name]', 'Enable remote-control compatibility metadata')
  .option('--rc [name]', 'Alias for --remote-control compatibility metadata')
  .option('--teleport [session]', 'Resume teleport-session compatibility metadata')
  .option('--sdk-url <url>', 'Remote SDK URL compatibility metadata')
  .option('--agent <agent>', 'Agent override compatibility metadata')
  .option('--agents <json>', 'Custom agents JSON compatibility metadata')
  .option('--agent-id <id>', 'Teammate agent ID compatibility metadata')
  .option('--agent-name <name>', 'Teammate display name compatibility metadata')
  .option('--agent-color <color>', 'Teammate UI color compatibility metadata')
  .option('--agent-type <type>', 'Custom agent type compatibility metadata')
  .option('--agent-teams <teams>', 'Agent teams compatibility metadata')
  .option('--team-name <name>', 'Team name compatibility metadata')
  .option('--teammate-mode <mode>', 'Teammate mode compatibility metadata (auto, tmux, in-process)')
  .option('--parent-session-id <id>', 'Parent session ID compatibility metadata')
  .option('--plan-mode-required', 'Require plan-mode compatibility metadata', false)
  .option('--tasks [id]', 'Tasks mode compatibility metadata')
  .option('--task-budget <tokens>', 'Task budget compatibility metadata', parseIntegerOption)
  .option('--channels <server>', 'Channel server compatibility metadata', collectOption, [])
  .option('--model <model>', 'Model to use')
  .option('--cwd <cwd>', 'Working directory', process.cwd())
  .option('--session <id>', 'Reuse an existing session')
  .option('--server-embedded', 'Auto-start embedded server (default for bun run start)', false)
  .option('--legacy', 'Run the previous src/* CLI implementation directly', false)
  .option('--text <prompt>', 'Compatibility alias for --print prompt text')
  .option('--description <text>', 'Compatibility description metadata')
  .option('--subject <text>', 'Compatibility subject metadata')
  .option('--scope <text>', 'Compatibility scope metadata')
  .option('--effort <level>', 'Compatibility effort metadata')
  .option('--output <path>', 'Compatibility output path metadata')
  .option('--owner <value>', 'Compatibility owner metadata')
  .option('--email <value>', 'Compatibility email metadata')
  .option('--client-secret <value>', 'Compatibility client secret metadata')
  .option('--permission-prompt-tool <tool>', 'Compatibility permission-prompt tool metadata')
  .option('--messaging-socket-path <path>', 'Compatibility messaging socket path metadata')
  .option('--resume-session-at <messageId>', 'Compatibility resume anchor metadata')
  .option('--rewind-files <messageId>', 'Compatibility rewind-files metadata')
  .option('--advisor <model>', 'Compatibility advisor metadata')
  .option('--deep-link-repo <slug>', 'Compatibility deep-link repo metadata')
  .option('--host <value>', 'Compatibility host metadata')
  .option('--unix <path>', 'Compatibility unix-socket metadata')
  .option('--port <number>', 'Compatibility port metadata', parseIntegerOption)
  .option('--idle-timeout <ms>', 'Compatibility idle-timeout metadata', parseIntegerOption)
  .option('--max-sessions <count>', 'Compatibility max-sessions metadata', parseIntegerOption)
  .option('--max-budget-usd <amount>', 'Compatibility max budget metadata', parseFloatOption)
  .option('--deep-link-last-fetch <ms>', 'Compatibility deep-link fetch time metadata', parseIntegerOption)
  .option('--setting-sources <source>', 'Compatibility setting source metadata', collectOption, [])
  .option('--betas <beta>', 'Compatibility beta header metadata', collectOption, [])
  .option('--dangerously-load-development-channels <server>', 'Compatibility dev channel metadata', collectOption, [])
  .option('--from-pr [value]', 'Compatibility PR-resume metadata')
  .option('--afk', 'Compatibility AFK metadata', false)
  .option('--all', 'Compatibility all flag metadata', false)
  .option('--assistant', 'Compatibility assistant-mode metadata', false)
  .option('--available', 'Compatibility available flag metadata', false)
  .option('--brief', 'Compatibility brief-mode metadata', false)
  .option('--claudeai', 'Compatibility Claude.ai metadata', false)
  .option('--clear-owner', 'Compatibility clear-owner metadata', false)
  .option('--console', 'Compatibility console-mode metadata', false)
  .option('--cowork', 'Compatibility cowork metadata', false)
  .option('--dangerously-skip-permissions-with-classifiers', 'Compatibility deprecated permission metadata', false)
  .option('--deep-link-origin', 'Compatibility deep-link origin metadata', false)
  .option('--delegate-permissions', 'Compatibility delegate-permissions metadata', false)
  .option('--dry-run', 'Compatibility dry-run metadata', false)
  .option('--enable-auth-status', 'Compatibility auth-status metadata', false)
  .option('--enable-auto-mode', 'Compatibility auto-mode metadata', false)
  .option('--force', 'Compatibility force metadata', false)
  .option('--hard-fail', 'Compatibility hard-fail metadata', false)
  .option('--init', 'Compatibility init metadata', false)
  .option('--init-only', 'Compatibility init-only metadata', false)
  .option('--keep-data', 'Compatibility keep-data metadata', false)
  .option('--list', 'Compatibility list metadata', false)
  .option('--local', 'Compatibility local metadata', false)
  .option('--maintenance', 'Compatibility maintenance metadata', false)
  .option('--pending', 'Compatibility pending metadata', false)
  .option('--proactive', 'Compatibility proactive metadata', false)
  .option('--safe', 'Compatibility safe metadata', false)
  .option('--sparse', 'Compatibility sparse metadata', false)
  .option('--sso', 'Compatibility SSO metadata', false)
  .option('--status', 'Compatibility status metadata', false)
  .action(async (options) => {
    try {
      const effectiveOptions = buildEffectiveRootOptions(options, rawUserArgs)
      const localConfig = readLocalConfig()
      const client = new CCLocalClient({
        serverUrl: options.server,
        authToken: options.token || effectiveOptions.authToken || embeddedServerToken || localConfig.apiToken,
        reconnectInterval: 1000,
        maxReconnectAttempts: 5,
      })

      // 连接到服务端
      await client.connect()
      failOnUnsupportedCompatibilityOptions(effectiveOptions)
      normalizePermissionMode(effectiveOptions)
      await syncMcpConfigFromOptions(client, effectiveOptions)
      await applyLegacySessionOptions(client, effectiveOptions)
      if (!effectiveOptions.serverEmbedded && !effectiveOptions.print) {
        console.log('✅ Connected to CCLocal Server')
      }

      const singlePromptContext = buildSinglePromptLaunchContext(effectiveOptions)
      if (singlePromptContext) {
        const result = await handleSinglePrompt(
          client,
          singlePromptContext.prompt,
          singlePromptContext.model,
          singlePromptContext.outputFormat,
          singlePromptContext.cwd,
          singlePromptContext.includePartialMessages,
          singlePromptContext.replayUserMessages,
          singlePromptContext.ephemeral,
          buildPermissionPolicy(effectiveOptions),
          buildSystemPromptOption(effectiveOptions),
          buildMessageCompatibilityOptions(effectiveOptions)
        )
        if (singlePromptContext.shouldPrintJsonResult) {
          console.log(JSON.stringify({
            type: 'result',
            sessionId: client.getSessionId(),
            messageId: result.messageId,
            text: result.text,
          }, null, 2))
        }
      } else {
        const interactiveContext = buildInteractiveLaunchContext({
          createSessionIfNeeded: true,
        })
        await renderInteractiveRepl(client, buildLaunchReplOptions(effectiveOptions, interactiveContext))
      }
    } catch (error) {
      console.error('❌ Failed to connect:', error)
      await stopEmbeddedServer()
      process.exit(1)
    }
  })

program.hook('preAction', async (thisCommand, actionCommand) => {
  const options = thisCommand.opts()
  if (shouldAutoStartEmbeddedServer(rawUserArgs) && commandUsesRestApi(actionCommand)) {
    options.serverEmbedded = true
  }
  if (options.serverEmbedded && commandUsesRestApi(actionCommand)) {
    await ensureEmbeddedServer(options)
  }
})

program.hook('postAction', async () => {
  await stopEmbeddedServer()
})

registerLegacyCompatibilityCommands(program)

const mcpCommand = program.command('mcp').description('Manage MCP servers through the local server API')
const modelsCommand = program.command('models').description('Inspect models exposed by the local server API')
const sessionsCommand = program.command('sessions').description('Manage chat sessions through the local server API')
const doctorCommand = program.command('doctor').description('Run lightweight local diagnostics')
const configCommand = program.command('config').description('Show effective local CLI configuration')
const contextCommand = program.command('context').description('Show current session and runtime context summary')
const envCommand = program.command('env').description('Show local runtime environment summary')
const statsCommand = program.command('stats').description('Show lightweight usage statistics')
const costCommand = program.command('cost').description('Show the current session timeline summary')
const permissionsCommand = program.command('permissions').description('Show compatibility permission mode summary')
const modelCommand = program.command('model').description('Show or manage the active model')
const authCommand = program.command('auth').description('Manage local server authentication for packages/cli')
const setupTokenCommand = program.command('setup-token').description('Store a long-lived local server token for packages/cli')
const pluginCommand = program.command('plugin').description('Inspect and validate local plugins')
const agentsCommand = program.command('agents').description('List configured local agents')
const completionCommand = program.command('completion').description('Generate shell completion script')
const exportCommand = program.command('export').description('Export sessions and messages through the local server API')
const installCommand = program.command('install').description('Install the cclocal global command')
const logCommand = program.command('log').description('Show local packages/cli log and config locations')
const openCommand = program.command('open').description('Connect to a CCLocal server URL')
const serverCommand = program.command('server').description('Start the packages/server REST API')
const taskCommand = program.command('task').description('Manage lightweight local task records')
const assistantCommand = program.command('assistant').description('Attach to or inspect a packages session')
const autoModeCommand = program.command('auto-mode').description('Inspect packages auto-mode compatibility configuration')
const errorCommand = program.command('error').description('Show local packages error diagnostics')
const remoteControlCommand = program.command('remote-control').description('Manage packages remote-control compatibility settings')
const rollbackCommand = program.command('rollback').description('Show rollback guidance for this checkout')
const sshCommand = program.command('ssh').description('Run cclocal through an SSH/local compatibility flow')
const upCommand = program.command('up').description('Run project setup instructions from CLAUDE.md')
const updateCommand = program.command('update').alias('upgrade').description('Check packages/cli update status')

function registerLegacyCompatibilityCommands(rootProgram: Command): void {
  for (const [commandName, description] of LEGACY_TOP_LEVEL_COMMANDS) {
    if (PACKAGES_NATIVE_COMMANDS.has(commandName)) {
      continue
    }
    rootProgram
      .command(commandName)
      .description(`${description} (previous src/* bridge)`)
      .allowUnknownOption(true)
      .allowExcessArguments(true)
      .argument('[args...]')
      .action(() => {
        delegateToLegacyUi(getUserArgs(process.argv))
      })
  }
}

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
  .command('add-http <name> <url>')
  .description('Register a streamable HTTP MCP server')
  .option('--namespace <namespace>', 'Namespace used for dynamic tool registration')
  .option('--allow-tools <tools>', 'Comma-separated allowlist of tool names')
  .option('--block-tools <tools>', 'Comma-separated denylist of tool names')
  .option('--header <header...>', 'Additional headers in "Key: Value" format')
  .option('--no-sync-tools', 'Do not sync tools into the model tool pool')
  .action(async (name, url, options) => {
    const client = createClient(program.opts())
    await client.connect()
    const result = await client.addMcpServer(name, {
      type: 'http',
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

mcpCommand
  .command('show <name>')
  .alias('inspect')
  .description('Show MCP server details and exposed tools')
  .action(async (name) => {
    const client = createClient(program.opts())
    await client.connect()
    const server = await client.getMcpServer(name)
    console.log(formatMcpServerDetails(server))
  })

modelsCommand
  .command('list')
  .description('List models available from the local server API')
  .action(async () => {
    const client = createClient(program.opts())
    await client.connect()
    const models = await client.listModels()
    if (models.length === 0) {
      console.log('No models available.')
      return
    }

    for (const model of models) {
      console.log(`${model.id}\t${model.name}`)
    }
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
  .option('--model <model>', 'Override the model while using this session')
  .action(async (id, options) => {
    const rootOptions = program.opts()
    const client = createClient(rootOptions)
    await client.connect()
    await client.getSession(id)

    if (options.print) {
      await handleSinglePrompt(client, options.print, options.model || rootOptions.model, rootOptions.outputFormat, rootOptions.cwd, false, false, false, buildPermissionPolicy(rootOptions), buildSystemPromptOption(rootOptions))
      return
    }

    await renderInteractiveRepl(client, buildLaunchReplOptions({
      ...rootOptions,
      model: options.model || rootOptions.model,
    }))
  })

sessionsCommand
  .command('continue')
  .description('Reuse the most recent session in the current cwd')
  .option('--print <prompt>', 'Send a single prompt in the selected session')
  .option('--model <model>', 'Override the model while using this session')
  .option('--cwd <cwd>', 'Working directory used to select the latest session')
  .action(async (...actionArgs) => {
    const rootOptions = program.opts()
    const command = actionArgs.at(-1)
    const options = typeof command?.opts === 'function' ? command.opts() : (command ?? {})
    const getRawOptionValue = (flag: '--print' | '--model' | '--cwd'): string | undefined => {
      const argv = process.argv
      const index = argv.lastIndexOf(flag)
      if (index === -1) {
        return undefined
      }
      const value = argv[index + 1]
      return value?.startsWith('--') ? undefined : value
    }
    const client = createClient(rootOptions)
    await client.connect()
    const cwd = options.cwd || getRawOptionValue('--cwd') || rootOptions.cwd
    const sessions = await client.listSessions()
    const session = sessions.find((item) => item.cwd === cwd) || sessions[0]

    if (!session) {
      throw new Error(`No resumable session found for "${cwd}".`)
    }

    await client.getSession(session.id)

    const singlePrompt = options.print || getRawOptionValue('--print')
    const model = options.model || getRawOptionValue('--model') || rootOptions.model

    if (singlePrompt) {
      await handleSinglePrompt(client, singlePrompt, model, program.opts().outputFormat, program.opts().cwd, false, false, false, buildPermissionPolicy(program.opts()), buildSystemPromptOption(program.opts()))
      return
    }

    await renderInteractiveRepl(client, buildLaunchReplOptions({
      ...program.opts(),
      model,
      cwd,
    }))
  })

sessionsCommand
  .command('fork <id> [name]')
  .description('Fork an existing session')
  .option('--model <model>', 'Override the model for the forked session')
  .option('--cwd <cwd>', 'Override the working directory for the forked session')
  .action(async (id, name, options) => {
    const rootOptions = program.opts()
    const client = createClient(rootOptions)
    await client.connect()
    const session = await client.forkSession(id, {
      name,
      model: options.model || rootOptions.model,
      cwd: options.cwd || rootOptions.cwd,
    })
    console.log(formatSessionDetails(session))
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

doctorCommand
  .action(async () => {
    const client = createClient(program.opts())
    const lines: string[] = []

    try {
      await client.connect()
      lines.push('Server: ok')
    } catch (error) {
      lines.push(`Server: failed (${error instanceof Error ? error.message : String(error)})`)
      console.log(lines.join('\n'))
      process.exitCode = 1
      return
    }

    try {
      const models = await client.listModels()
      lines.push(`Models: ${models.length}`)
    } catch {
      lines.push('Models: unavailable')
    }

    try {
      const sessions = await client.listSessions()
      lines.push(`Sessions: ${sessions.length}`)
    } catch {
      lines.push('Sessions: unavailable')
    }

    try {
      const servers = await client.listMcpServers()
      const connected = servers.filter((server) => String(server.status || '') === 'connected').length
      lines.push(`MCP: ${connected}/${servers.length} connected`)
    } catch {
      lines.push('MCP: unavailable')
    }

    console.log(lines.join('\n'))
  })

configCommand
  .action(async () => {
    const options = program.opts()
    const lines = [
      'Config:',
      `Server URL: ${options.server || 'http://127.0.0.1:5678'}`,
      `Auth token: ${options.token ? 'configured' : 'not set'}`,
      `Cwd: ${options.cwd || process.cwd()}`,
      `Model override: ${options.model || '(server default)'}`,
      `Permission mode: ${normalizePermissionMode(options)}`,
      `Allowed tools: ${parseListOption(options.allowedTools)?.join(', ') || '(default)'}`,
      `Disallowed tools: ${parseListOption(options.disallowedTools)?.join(', ') || '(none)'}`,
      `Session option: ${options.session || '(none)'}`,
      `Output format: ${options.outputFormat || 'text'}`,
      `Embedded server: ${options.serverEmbedded ? 'enabled' : 'disabled'}`,
    ]
    console.log(lines.join('\n'))
  })

contextCommand
  .option('--session <id>', 'Inspect a specific session instead of the current cwd match')
  .option('--cwd <cwd>', 'Working directory used to pick the latest session')
  .action(async (command) => {
    const rootOptions = program.opts()
    const options = typeof command?.opts === 'function' ? command.opts() : command
    const client = createClient(rootOptions)
    await client.connect()

    const cwd = options.cwd || rootOptions.cwd || process.cwd()
    const sessions = await client.listSessions()
    const targetSession =
      (options.session
        ? sessions.find((session) => session.id === options.session)
        : sessions.find((session) => session.cwd === cwd)) || sessions[0]

    const lines: string[] = ['Context:']
    lines.push(`Cwd: ${cwd}`)
    lines.push(`Configured model override: ${rootOptions.model || '(server default)'}`)
    lines.push(`Available sessions: ${sessions.length}`)

    if (!targetSession) {
      lines.push('Active session: (none)')
    } else {
      const session = await client.getSession(targetSession.id)
      const messages = await client.getSessionMessages(targetSession.id, { limit: 20 })
      lines.push(`Active session: ${session.id}`)
      lines.push(`Session name: ${session.name}`)
      lines.push(`Session model: ${session.model}`)
      lines.push(`Session cwd: ${session.cwd}`)
      lines.push(`Recent messages loaded: ${messages.length}`)
    }

    const servers = await client.listMcpServers()
    const connected = servers.filter((server) => String(server.status || '') === 'connected').length
    lines.push(`MCP servers: ${connected}/${servers.length} connected`)

    console.log(lines.join('\n'))
  })

envCommand
  .action(async () => {
    const options = program.opts()
    const lines = [
      'Environment:',
      `Platform: ${process.platform}`,
      `Arch: ${process.arch}`,
      `Runtime: bun`,
      `Cwd: ${options.cwd || process.cwd()}`,
      `Server URL: ${options.server || 'http://127.0.0.1:5678'}`,
      `Auth token: ${options.token ? 'configured' : 'not set'}`,
    ]
    console.log(lines.join('\n'))
  })

statsCommand
  .action(async () => {
    const client = createClient(program.opts())
    await client.connect()
    const sessions = await client.listSessions()
    const models = await client.listModels()
    const servers = await client.listMcpServers()
    const connected = servers.filter((server) => String(server.status || '') === 'connected').length
    const totalMessages = sessions.reduce((sum, session) => sum + ((session.messages?.length) || 0), 0)

    const lines = [
      'Stats:',
      `Sessions: ${sessions.length}`,
      `Messages (loaded summaries): ${totalMessages}`,
      `Models: ${models.length}`,
      `MCP servers: ${connected}/${servers.length} connected`,
    ]
    console.log(lines.join('\n'))
  })

costCommand
  .option('--session <id>', 'Inspect a specific session instead of the current cwd match')
  .option('--cwd <cwd>', 'Working directory used to pick the latest session')
  .action(async (command) => {
    const rootOptions = program.opts()
    const options = typeof command?.opts === 'function' ? command.opts() : command
    const client = createClient(rootOptions)
    await client.connect()
    const cwd = options.cwd || rootOptions.cwd || process.cwd()
    const sessions = await client.listSessions()
    const targetSession =
      (options.session
        ? sessions.find((session) => session.id === options.session)
        : sessions.find((session) => session.cwd === cwd)) || sessions[0]

    const lines = ['Cost:']
    if (!targetSession) {
      lines.push('Active session: (none)')
      console.log(lines.join('\n'))
      return
    }

    const session = await client.getSession(targetSession.id)
    const messages = await client.getSessionMessages(targetSession.id, { limit: 100 })
    const startedAt = session.createdAt || messages[0]?.timestamp
    const endedAt = messages[messages.length - 1]?.timestamp || session.updatedAt || startedAt
    const durationMs = startedAt && endedAt ? Math.max(0, endedAt - startedAt) : 0

    lines.push(`Session: ${session.name}`)
    lines.push(`Session id: ${session.id}`)
    lines.push(`Messages: ${messages.length}`)
    lines.push(`Duration: ${formatDuration(durationMs)}`)
    lines.push(`Estimated tokens: ${estimateMessageTokens(messages)}`)
    console.log(lines.join('\n'))
  })

permissionsCommand
  .action(async () => {
    const options = program.opts()
    const permissionPolicy = buildPermissionPolicy(options)
    const lines = [
      'Permissions:',
      `Mode: ${permissionPolicy.mode}`,
      `Allowed tools: ${permissionPolicy.allowedTools?.join(', ') || '(default)'}`,
      `Disallowed tools: ${permissionPolicy.blockedTools?.join(', ') || '(none)'}`,
      'Server-side auth: enabled',
      'MCP tool policies: supported via allow/block lists and namespace filters',
      'Tool execution policy: enforced by QueryEngine',
    ]
    if (permissionPolicy.mode === 'bypassPermissions') {
      lines.push('Warning: bypassPermissions should only be used in trusted workspaces.')
    }
    console.log(lines.join('\n'))
  })

modelCommand
  .command('list')
  .description('List models available from the local server API')
  .action(async () => {
    const client = createClient(program.opts())
    await client.connect()
    const models = await client.listModels()
    if (models.length === 0) {
      console.log('No models available.')
      return
    }

    for (const model of models) {
      console.log(`${model.id}\t${model.name}`)
    }
  })

modelCommand
  .command('current')
  .description('Show the current model override')
  .action(() => {
    const options = program.opts()
    console.log(`Current model: ${options.model || '(server default)'}`)
  })

modelCommand
  .command('use <name>')
  .description('Use a model in REPL or single-prompt mode')
  .option('--print <prompt>', 'Send a single prompt using the selected model')
  .option('--session <id>', 'Reuse an existing session')
  .action(async (name, ...actionArgs) => {
    const rootOptions = program.opts()
    const command = actionArgs.at(-1)
    const options = typeof command?.opts === 'function' ? command.opts() : command
    const getRawOptionValue = (flag: '--print' | '--session'): string | undefined => {
      const argv = process.argv
      const index = argv.lastIndexOf(flag)
      if (index === -1) {
        return undefined
      }
      const value = argv[index + 1]
      return value?.startsWith('--') ? undefined : value
    }
    const client = createClient(rootOptions)
    await client.connect()

    const sessionId = options.session || getRawOptionValue('--session') || rootOptions.session
    if (sessionId) {
      await client.getSession(sessionId)
    } else if (rootOptions.session) {
      await client.getSession(rootOptions.session)
    }

    const singlePrompt = options.print || getRawOptionValue('--print')
    if (singlePrompt) {
      await handleSinglePrompt(client, singlePrompt, name, rootOptions.outputFormat, rootOptions.cwd, false, false, false, buildPermissionPolicy(rootOptions), buildSystemPromptOption(rootOptions))
      return
    }

    await renderInteractiveRepl(client, buildLaunchReplOptions({
      ...rootOptions,
      model: name,
    }))
  })

authCommand
  .command('status')
  .description('Show the current local auth token source')
  .action(async () => {
    const options = program.opts()
    const storedConfig = readLocalConfig()
    const configuredToken = options.token || storedConfig.apiToken
    const tokenSource = options.token
      ? 'cli_or_env'
      : storedConfig.apiToken
        ? 'stored_config'
        : 'none'

    const lines = [
      'Auth:',
      `Token configured: ${configuredToken ? 'yes' : 'no'}`,
      `Token source: ${tokenSource}`,
    ]

    if (configuredToken) {
      try {
        const client = createClient(options)
        await client.connect()
        lines.push('Server reachability: ok')
      } catch (error) {
        lines.push(`Server reachability: failed (${error instanceof Error ? error.message : String(error)})`)
      }
    }

    console.log(lines.join('\n'))
  })

authCommand
  .command('login')
  .description('Store a local server token for packages/cli')
  .requiredOption('--api-token <token>', 'Token to store for future CLI use')
  .action((command) => {
    const options = typeof command?.opts === 'function' ? command.opts() : command
    writeLocalConfig({
      ...readLocalConfig(),
      apiToken: options.apiToken,
    })
    console.log('Stored local API token for packages/cli.')
  })

authCommand
  .command('logout')
  .description('Clear the stored local server token')
  .action(() => {
    const removed = clearStoredApiToken()
    if (removed) {
      console.log('Cleared stored local API token.')
      return
    }
    console.log('No stored local API token found.')
  })

setupTokenCommand
  .requiredOption('--api-token <token>', 'Token to store for future CLI use')
  .action((command) => {
    const options = typeof command?.opts === 'function' ? command.opts() : command
    writeLocalConfig({
      ...readLocalConfig(),
      apiToken: options.apiToken,
    })
    console.log('Stored long-lived local API token for packages/cli.')
    console.log(`Config path: ${getLocalConfigPath()}`)
    console.log('Note: this compatibility command stores a local server token, not an Anthropic OAuth token.')
  })

pluginCommand
  .command('list')
  .description('List local plugin or marketplace manifests under a directory')
  .option('--path <path>', 'Directory to scan', process.cwd())
  .option('--depth <count>', 'Maximum directory depth to scan', parseIntegerOption)
  .option('--installed', 'List plugins installed through packages/cli compatibility mode', false)
  .action((command) => {
    const options = typeof command?.opts === 'function' ? command.opts() : command
    if (options.installed) {
      const plugins = listInstalledPlugins()
      if (plugins.length === 0) {
        console.log('No installed plugins found.')
        return
      }

      for (const plugin of plugins) {
        console.log([
          'installed',
          plugin.name,
          plugin.version || '',
          plugin.installPath,
        ].join('\t'))
      }
      return
    }

    const plugins = listLocalPlugins(options.path || process.cwd(), options.depth ?? 3)
    if (plugins.length === 0) {
      console.log('No local plugins found.')
      return
    }

    for (const plugin of plugins) {
      console.log([
        plugin.type,
        plugin.name,
        plugin.version || '',
        plugin.manifestPath,
      ].join('\t'))
    }
  })

pluginCommand
  .command('install <path>')
  .alias('i')
  .description('Install a local plugin into packages/cli compatibility storage')
  .action((targetPath) => {
    try {
      const plugin = installLocalPlugin(targetPath)
      console.log(`Installed plugin "${plugin.name}".`)
      console.log(`Install path: ${plugin.installPath}`)
    } catch (error) {
      console.error(`Plugin install failed: ${error instanceof Error ? error.message : String(error)}`)
      process.exitCode = 1
    }
  })

pluginCommand
  .command('update <name>')
  .description('Refresh an installed local plugin from its source path')
  .option('--source <path>', 'Override source path for this update')
  .action((name, command) => {
    const options = typeof command?.opts === 'function' ? command.opts() : command
    try {
      const plugin = updateInstalledPlugin(name, options.source)
      console.log(`Updated plugin "${plugin.name}".`)
      console.log(`Install path: ${plugin.installPath}`)
    } catch (error) {
      console.error(`Plugin update failed: ${error instanceof Error ? error.message : String(error)}`)
      process.exitCode = 1
    }
  })

pluginCommand
  .command('uninstall <name>')
  .alias('remove')
  .alias('rm')
  .description('Uninstall a plugin from packages/cli compatibility storage')
  .action((name) => {
    try {
      const plugin = uninstallInstalledPlugin(name)
      console.log(`Uninstalled plugin "${plugin.name}".`)
    } catch (error) {
      console.error(`Plugin uninstall failed: ${error instanceof Error ? error.message : String(error)}`)
      process.exitCode = 1
    }
  })

pluginCommand
  .command('validate <path>')
  .description('Validate a local plugin or marketplace manifest')
  .action((targetPath) => {
    const result = validatePluginTarget(targetPath)
    if (!result.ok) {
      console.error(`Plugin validation failed: ${result.errors.join('; ')}`)
      process.exitCode = 1
      return
    }

    console.log('Plugin validation passed.')
    console.log(`Type: ${result.type}`)
    console.log(`Manifest: ${result.manifestPath}`)
    if (result.summary) {
      console.log(`Summary: ${result.summary}`)
    }
  })

agentsCommand
  .option('--setting-sources <sources>', 'Comma-separated setting sources to inspect', 'user,project,local')
  .action((command) => {
    const options = typeof command?.opts === 'function' ? command.opts() : command
    const agents = listLocalAgents(program.opts().cwd || process.cwd())
    if (agents.length === 0) {
      console.log(`No agents found. Searched sources: ${options.settingSources}`)
      return
    }

    for (const agent of agents) {
      console.log(`${agent.name}\t${agent.source}\t${agent.path}`)
    }
  })

completionCommand
  .argument('[shell]', 'Shell type (bash, zsh, or fish)', 'bash')
  .option('--output <file>', 'Write completion script directly to a file instead of stdout')
  .action((shell, command) => {
    const options = typeof command?.opts === 'function' ? command.opts() : command
    const script = generateCompletionScript(shell)
    if (options.output) {
      writeFileSync(options.output, script, 'utf-8')
      console.log(`Wrote completion script to ${options.output}`)
      return
    }
    console.log(script)
  })

exportCommand
  .option('--json', 'Output JSON', true)
  .option('--session <id>', 'Export a single session')
  .option('--messages <count>', 'Messages to include per session', parseIntegerOption)
  .action(async (command) => {
    const options = typeof command?.opts === 'function' ? command.opts() : command
    const client = createClient(program.opts())
    await client.connect()
    const sessions = options.session
      ? [await client.getSession(options.session)]
      : await client.listSessions()
    const payload = []
    for (const session of sessions) {
      payload.push({
        ...session,
        messages: await client.getSessionMessages(session.id, {
          limit: options.messages ?? 100,
        }),
      })
    }
    console.log(JSON.stringify({ sessions: payload }, null, 2))
  })

installCommand
  .argument('[target]', 'Install target/version label', 'current')
  .option('--force', 'Force installation even if already installed', false)
  .option('--dry-run', 'Print the install command without running it', false)
  .action((target, command) => {
    const options = typeof command?.opts === 'function' ? command.opts() : command
    const repoRoot = findRepoRoot()
    const installScript = join(repoRoot, 'scripts', 'install-global.sh')
    const commandText = `bash ${installScript}${options.force ? ' --force' : ''}`
    if (options.dryRun) {
      console.log(`Install target: ${target}`)
      console.log(commandText)
      return
    }
    const result = spawnSync('bash', [installScript, ...(options.force ? ['--force'] : [])], {
      cwd: repoRoot,
      stdio: 'inherit',
      env: process.env,
    })
    process.exit(result.status ?? 0)
  })

logCommand
  .option('--json', 'Output machine-readable locations', false)
  .action((command) => {
    const options = typeof command?.opts === 'function' ? command.opts() : command
    const configPath = getLocalConfigPath()
    const locations = {
      configPath,
      configDir: dirname(configPath),
      serverUrl: program.opts().server || 'http://127.0.0.1:5678',
    }
    if (options.json) {
      console.log(JSON.stringify(locations, null, 2))
      return
    }
    console.log('Local packages/cli locations:')
    console.log(`Config: ${locations.configPath}`)
    console.log(`Config dir: ${locations.configDir}`)
    console.log(`Server URL: ${locations.serverUrl}`)
  })

openCommand
  .argument('<cc-url>', 'CCLocal or HTTP URL to connect to')
  .option('-p, --print [prompt]', 'Print mode prompt')
  .option('--output-format <format>', 'Output format: text, json, stream-json', 'text')
  .action(async (ccUrl, command) => {
    const options = typeof command?.opts === 'function' ? command.opts() : command
    const parsed = parseOpenUrl(ccUrl)
    const client = createClient({
      ...program.opts(),
      server: parsed.server || program.opts().server,
      session: parsed.session || program.opts().session,
    })
    await client.connect()
    if (options.print) {
      await handleSinglePrompt(client, options.print === true ? '' : options.print, program.opts().model, options.outputFormat, program.opts().cwd, false, false, false, buildPermissionPolicy(program.opts()), buildSystemPromptOption(program.opts()))
      return
    }
    console.log(`Connected to ${parsed.server || program.opts().server}`)
    if (parsed.session) {
      console.log(`Session: ${parsed.session}`)
    }
  })

serverCommand
  .option('--port <number>', 'HTTP port', '5678')
  .option('--host <string>', 'Bind address', '127.0.0.1')
  .option('--auth-token <token>', 'Bearer token for auth')
  .option('--unix <path>', 'Listen on a unix domain socket (not supported by packages/server yet)')
  .option('--workspace <dir>', 'Default working directory for sessions')
  .option('--idle-timeout <ms>', 'Idle timeout for detached sessions in ms', '600000')
  .option('--max-sessions <n>', 'Maximum concurrent sessions', '32')
  .action((command) => {
    const options = typeof command?.opts === 'function' ? command.opts() : command
    if (options.unix) {
      console.error('--unix is not supported by packages/server yet. Use --host/--port for the packages server.')
      process.exit(1)
    }
    const repoRoot = findRepoRoot()
    const env = {
      ...process.env,
      CCLOCAL_PORT: String(options.port),
      CCLOCAL_HOST: String(options.host),
      ...(options.authToken ? { CCLOCAL_API_KEY: options.authToken } : {}),
      ...(options.workspace ? { CCLOCAL_WORKSPACE: options.workspace } : {}),
      CCLOCAL_IDLE_TIMEOUT: String(options.idleTimeout),
      CCLOCAL_MAX_SESSIONS: String(options.maxSessions),
    }
    const result = spawnSync('bun', ['run', 'packages/server/src/index.ts'], {
      cwd: repoRoot,
      stdio: 'inherit',
      env,
    })
    process.exit(result.status ?? 0)
  })

taskCommand
  .command('list')
  .description('List local package CLI tasks')
  .action(() => {
    const tasks = readCliTasks()
    if (tasks.length === 0) {
      console.log('No tasks found.')
      return
    }
    for (const task of tasks) {
      console.log(`${task.id}\t${task.status}\t${task.subject}`)
    }
  })

taskCommand
  .command('create <subject>')
  .description('Create a local package CLI task')
  .option('-d, --description <text>', 'Task description')
  .action((subject, command) => {
    const options = typeof command?.opts === 'function' ? command.opts() : command
    const tasks = readCliTasks()
    const task = {
      id: `task-${Date.now().toString(36)}`,
      subject,
      description: options.description,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    writeCliTasks([task, ...tasks])
    console.log(`Created task ${task.id}: ${task.subject}`)
  })

taskCommand
  .command('update <id>')
  .description('Update a local package CLI task')
  .option('-s, --status <status>', 'Task status')
  .option('--subject <text>', 'Task subject')
  .option('-d, --description <text>', 'Task description')
  .action((id, command) => {
    const options = typeof command?.opts === 'function' ? command.opts() : command
    const tasks = readCliTasks()
    const task = tasks.find((item) => item.id === id)
    if (!task) {
      console.error(`Task not found: ${id}`)
      process.exitCode = 1
      return
    }
    if (options.status) task.status = options.status
    if (options.subject) task.subject = options.subject
    if (options.description) task.description = options.description
    task.updatedAt = Date.now()
    writeCliTasks(tasks)
    console.log(`Updated task ${task.id}: ${task.status}`)
  })

assistantCommand
  .argument('[sessionId]', 'Session ID to attach to')
  .option('--print <prompt>', 'Send a single prompt to the session')
  .action(async (sessionId, command) => {
    const options = typeof command?.opts === 'function' ? command.opts() : command
    const client = createClient({
      ...program.opts(),
      session: sessionId || program.opts().session,
    })
    await client.connect()
    if (sessionId) {
      await client.getSession(sessionId)
    }
    if (options.print) {
      await handleSinglePrompt(client, options.print, program.opts().model, program.opts().outputFormat, program.opts().cwd, false, false, false, buildPermissionPolicy(program.opts()), buildSystemPromptOption(program.opts()))
      return
    }
    await renderInteractiveRepl(client, buildLaunchReplOptions(program.opts(), {
      createSessionIfNeeded: !client.getSessionId(),
    }))
  })

autoModeCommand
  .command('defaults')
  .description('Print default packages auto-mode rules as JSON')
  .action(() => {
    console.log(JSON.stringify(getAutoModeDefaults(), null, 2))
  })

autoModeCommand
  .command('config')
  .description('Print effective packages auto-mode config as JSON')
  .action(() => {
    console.log(JSON.stringify({
      ...getAutoModeDefaults(),
      source: 'packages/cli',
      enabled: false,
    }, null, 2))
  })

autoModeCommand
  .command('critique')
  .description('Print local feedback for custom auto mode rules')
  .option('--model <model>', 'Model to use for critique')
  .action((command) => {
    const options = typeof command?.opts === 'function' ? command.opts() : command
    console.log(JSON.stringify({
      model: options.model || program.opts().model || '(server default)',
      findings: [
        'Auto-mode classifiers are not enabled by default in packages/cli.',
        'Keep allow rules narrow and deny rules explicit before enabling autonomous execution.',
      ],
    }, null, 2))
  })

errorCommand
  .argument('[number]', 'Error index to display', '0')
  .option('--json', 'Output machine-readable diagnostics', false)
  .action((number, command) => {
    const options = typeof command?.opts === 'function' ? command.opts() : command
    const payload = {
      index: Number.parseInt(number, 10) || 0,
      diagnostics: collectLocalDiagnostics(program.opts()),
    }
    if (options.json) {
      console.log(JSON.stringify(payload, null, 2))
      return
    }
    console.log('Packages diagnostics:')
    for (const [key, value] of Object.entries(payload.diagnostics)) {
      console.log(`${key}: ${value}`)
    }
  })

remoteControlCommand
  .argument('[name]', 'Optional remote-control session name')
  .option('--enable', 'Enable remote-control preference', false)
  .option('--disable', 'Disable remote-control preference', false)
  .option('--status', 'Show status only', false)
  .action((name, command) => {
    const options = typeof command?.opts === 'function' ? command.opts() : command
    const config = readLocalConfig() as Record<string, unknown>
    if (options.enable || options.disable) {
      writeLocalConfig({
        ...config,
        remoteControl: {
          enabled: Boolean(options.enable),
          name: name || (config.remoteControl as { name?: string } | undefined)?.name,
        },
      })
    }
    const nextConfig = readLocalConfig() as Record<string, unknown>
    const remoteControl = (nextConfig.remoteControl as { enabled?: boolean; name?: string } | undefined) || {}
    console.log('Remote control:')
    console.log(`Enabled: ${remoteControl.enabled ? 'yes' : 'no'}`)
    console.log(`Name: ${remoteControl.name || name || '(none)'}`)
    console.log('Transport: packages REST/WebSocket API')
  })

rollbackCommand
  .argument('[target]', 'Version or relative target to roll back to')
  .option('-l, --list', 'List locally known rollback candidates', false)
  .option('--dry-run', 'Show what would be run without changing files', false)
  .option('--safe', 'Use safe rollback target if configured', false)
  .action((target, command) => {
    const options = typeof command?.opts === 'function' ? command.opts() : command
    const candidates = listRollbackCandidates()
    if (options.list) {
      if (candidates.length === 0) {
        console.log('No rollback candidates found in this checkout.')
        return
      }
      for (const candidate of candidates) {
        console.log(candidate)
      }
      return
    }
    const selected = options.safe ? candidates[0] : target
    const commandText = selected
      ? `git checkout ${selected}`
      : 'git log --oneline -n 5'
    if (options.dryRun || !selected) {
      console.log(`Rollback command: ${commandText}`)
      return
    }
    const result = spawnSync('git', ['checkout', selected], {
      cwd: findRepoRoot(),
      stdio: 'inherit',
      env: process.env,
    })
    process.exit(result.status ?? 0)
  })

sshCommand
  .argument('<host>', 'SSH host or local test host')
  .argument('[dir]', 'Remote working directory')
  .option('--permission-mode <mode>', 'Permission mode for the remote session')
  .option('--dangerously-skip-permissions', 'Skip permission prompts for the remote session', false)
  .option('--local', 'Run the SSH flow locally for tests', false)
  .action((host, dir, command) => {
    const options = typeof command?.opts === 'function' ? command.opts() : command
    if (options.local || host === 'local') {
      const args = [
        'run',
        'packages/cli/src/index.ts',
        ...(dir ? ['--cwd', dir] : []),
        ...(options.permissionMode ? ['--permission-mode', options.permissionMode] : []),
        ...(options.dangerouslySkipPermissions ? ['--dangerously-skip-permissions'] : []),
      ]
      const result = spawnSync('bun', args, {
        cwd: findRepoRoot(),
        stdio: 'inherit',
        env: process.env,
      })
      process.exit(result.status ?? 0)
    }

    const remoteDir = dir || '.'
    const remoteCommand = `cd ${shellQuote(remoteDir)} && cclocal`
    const result = spawnSync('ssh', [host, remoteCommand], {
      stdio: 'inherit',
      env: process.env,
    })
    process.exit(result.status ?? 0)
  })

upCommand
  .option('--dry-run', 'Print setup commands without running them', false)
  .action((command) => {
    const options = typeof command?.opts === 'function' ? command.opts() : command
    const commands = readClaudeUpCommands(program.opts().cwd || process.cwd())
    if (commands.length === 0) {
      console.log('No "# claude up" section found in CLAUDE.md.')
      return
    }
    for (const commandText of commands) {
      if (options.dryRun) {
        console.log(commandText)
        continue
      }
      const result = spawnSync('bash', ['-c', commandText], {
        cwd: program.opts().cwd || process.cwd(),
        stdio: 'inherit',
        env: process.env,
      })
      if ((result.status ?? 0) !== 0) {
        process.exit(result.status ?? 1)
      }
    }
  })

updateCommand
  .option('--json', 'Output machine-readable update status', false)
  .option('--apply', 'Run the recommended update commands in the current checkout', false)
  .action((command) => {
    const options = typeof command?.opts === 'function' ? command.opts() : command
    const cwd = program.opts().cwd || process.cwd()
    const status = {
      currentVersion: program.version(),
      mode: 'packages/cli native',
      automaticInstall: Boolean(options.apply),
      recommendedCommands: [
        'git pull',
        'bun install',
        'bun run build:all',
      ],
    }

    if (options.json) {
      console.log(JSON.stringify(status, null, 2))
      return
    }

    console.log('Update:')
    console.log(`Current version: ${status.currentVersion}`)
    console.log(`Mode: ${status.mode}`)
    console.log(`Automatic install: ${options.apply ? 'enabled' : 'disabled (pass --apply to run)'}`)
    console.log('Recommended refresh commands:')
    for (const commandText of status.recommendedCommands) {
      console.log(`  ${commandText}`)
    }
    if (!options.apply) {
      return
    }

    for (const commandText of status.recommendedCommands) {
      console.log(`\n$ ${commandText}`)
      const result = spawnSync('bash', ['-c', commandText], {
        cwd,
        stdio: 'inherit',
        env: process.env,
      })
      if ((result.status ?? 0) !== 0) {
        process.exit(result.status ?? 1)
      }
    }
  })

async function handleSinglePrompt(
  client: CCLocalClient,
  prompt: string,
  model?: string,
  outputFormat: 'text' | 'json' | 'stream-json' = 'text',
  cwd = process.cwd(),
  includePartialMessages = false,
  replayUserMessages = false,
  noSessionPersistence = false,
  permissionPolicy?: {
    mode?: 'default' | 'dontAsk' | 'acceptEdits' | 'bypassPermissions'
    allowedTools?: string[]
    blockedTools?: string[]
  },
  systemPrompt?: string,
  compatibilityOptions: {
    maxTurns?: number
    maxThinkingTokens?: number
    fallbackModel?: string
    sessionName?: string
    sessionId?: string
  } = {}
): Promise<{ text: string; messageId?: string }> {
  return await new Promise((resolve, reject) => {
    let response = ''
    let messageId: string | undefined

    const ensureSessionForOutput = async (): Promise<void> => {
      if (client.getSessionId()) {
        return
      }
      await client.createSession({
        id: compatibilityOptions.sessionId,
        name: compatibilityOptions.sessionName,
        cwd,
        model,
      })
    }

    const emitJsonLine = (payload: Record<string, unknown>): void => {
      process.stdout.write(`${JSON.stringify(payload)}\n`)
    }

    const handler = (event: StreamEvent) => {
      switch (event.type) {
        case 'stream_start':
          messageId = event.messageId
          if (outputFormat === 'stream-json') {
            emitJsonLine({
              type: 'stream_start',
              sessionId: client.getSessionId(),
              messageId,
            })
          }
          break
        case 'stream_delta':
          if (event.delta?.type === 'text' && event.delta.text) {
            response += event.delta.text
            if (outputFormat === 'text') {
              process.stdout.write(event.delta.text)
            } else if (outputFormat === 'stream-json' && includePartialMessages) {
              emitJsonLine({
                type: 'content_block_delta',
                sessionId: client.getSessionId(),
                messageId,
                delta: {
                  type: 'text_delta',
                  text: event.delta.text,
                },
              })
            }
          }
          break
        case 'tool_call':
          if (outputFormat === 'stream-json' && includePartialMessages) {
            emitJsonLine({
              type: 'tool_call',
              sessionId: client.getSessionId(),
              messageId,
              toolCall: event.toolCall,
            })
          }
          break
        case 'stream_end':
          if (outputFormat === 'text') {
            console.log()
          } else if (outputFormat === 'stream-json') {
            emitJsonLine({
              type: 'result',
              sessionId: client.getSessionId(),
              messageId,
              text: response,
            })
            emitJsonLine({
              type: 'stream_end',
              sessionId: client.getSessionId(),
              messageId,
            })
          }
          client.removeMessageHandler(handler)
          resolve({
            text: response,
            messageId,
          })
          break
        case 'error':
          if (outputFormat === 'stream-json') {
            emitJsonLine({
              type: 'error',
              sessionId: client.getSessionId(),
              messageId,
              error: event.error || 'Unknown error',
            })
          }
          client.removeMessageHandler(handler)
          reject(new Error(event.error || 'Unknown error'))
          break
      }
    }

    client.onMessage(handler)

    // 发送消息
    void (async () => {
      if (!noSessionPersistence) {
        await ensureSessionForOutput()
      }

      if (outputFormat === 'stream-json' && replayUserMessages) {
        emitJsonLine({
          type: 'user',
          sessionId: client.getSessionId(),
          message: {
            role: 'user',
            content: prompt,
          },
          isReplay: true,
        })
      }

      if (noSessionPersistence) {
        await client.sendEphemeralMessage(prompt, {
          model,
          permissionPolicy,
          systemPrompt,
          maxTurns: compatibilityOptions.maxTurns,
          ...buildRequestMessageOptions(compatibilityOptions),
        }, { cwd, model })
      } else {
        await client.sendMessage(prompt, {
          model,
          permissionPolicy,
          systemPrompt,
          ...buildRequestMessageOptions(compatibilityOptions),
        })
      }
    })().catch((error) => {
      client.removeMessageHandler(handler)
      reject(error)
    })
  })
}

function createClient(options: {
  server?: string
  token?: string
  authToken?: string
  session?: string
  sessionId?: string
} = {}): CCLocalClient {
  const localConfig = readLocalConfig()
  const client = new CCLocalClient({
    serverUrl: options.server || 'http://127.0.0.1:5678',
    authToken: options.token || options.authToken || localConfig.apiToken,
    reconnectInterval: 1000,
    maxReconnectAttempts: 5,
  })

  if (options.session || options.sessionId) {
    client.setSessionId(options.session || options.sessionId as string)
  }

  return client
}

async function applyLegacySessionOptions(
  client: CCLocalClient,
  options: {
    session?: string
    resume?: string | boolean
    continue?: boolean
    forkSession?: boolean
    model?: string
    cwd?: string
  } = {}
): Promise<void> {
  if (options.session) {
    client.setSessionId(options.session)
    return
  }

  if (options.resume && typeof options.resume === 'string') {
    if (options.forkSession) {
      await client.forkSession(options.resume, {
        cwd: options.cwd,
        model: options.model,
      })
      return
    }
    client.setSessionId(options.resume)
    return
  }

  if (options.resume || options.continue) {
    const targetCwd = options.cwd || process.cwd()
    const sessions = await client.listSessions()
    const match = sessions.find((session) => session.cwd === targetCwd) || sessions[0]
    if (!match) {
      throw new Error(
        `No resumable session found for "${targetCwd}". Use "sessions list" to inspect available sessions.`
      )
    }
    if (options.forkSession) {
      await client.forkSession(match.id, {
        cwd: options.cwd,
        model: options.model,
      })
      return
    }
    client.setSessionId(match.id)
  }
}

function failOnUnsupportedCompatibilityOptions(options: {
  forkSession?: boolean
  outputFormat?: string
  inputFormat?: string
  includePartialMessages?: boolean
  replayUserMessages?: boolean
  sessionPersistence?: boolean
  jsonSchema?: string
  thinking?: string
  teammateMode?: string
}): void {
  if (options.inputFormat && !['text', 'stream-json'].includes(options.inputFormat)) {
    throw new Error(`Unsupported input format "${options.inputFormat}". Expected text or stream-json.`)
  }

  if (options.inputFormat === 'stream-json' && options.outputFormat !== 'stream-json') {
    throw new Error('--input-format=stream-json requires --output-format=stream-json.')
  }

  if (options.includePartialMessages && options.outputFormat !== 'stream-json') {
    throw new Error(
      '--include-partial-messages only works with --output-format=stream-json.'
    )
  }

  if (options.replayUserMessages && options.outputFormat !== 'stream-json') {
    throw new Error(
      '--replay-user-messages only works with --output-format=stream-json.'
    )
  }

  if (options.outputFormat && !['text', 'json', 'stream-json'].includes(options.outputFormat)) {
    throw new Error(`Unsupported output format "${options.outputFormat}". Expected text, json, or stream-json.`)
  }

  if (options.jsonSchema) {
    parseJsonSchemaOption(options.jsonSchema)
  }

  if (options.thinking && !['enabled', 'adaptive', 'disabled'].includes(options.thinking)) {
    throw new Error(`Unsupported thinking mode "${options.thinking}". Expected enabled, adaptive, or disabled.`)
  }

  if (options.teammateMode && !['auto', 'tmux', 'in-process'].includes(options.teammateMode)) {
    throw new Error(`Unsupported teammate mode "${options.teammateMode}". Expected auto, tmux, or in-process.`)
  }
}

function normalizePermissionMode(options: {
  permissionMode?: string
  dangerouslySkipPermissions?: boolean
  allowDangerouslySkipPermissions?: boolean
} = {}): 'default' | 'dontAsk' | 'acceptEdits' | 'bypassPermissions' {
  const mode = options.dangerouslySkipPermissions
    ? 'bypassPermissions'
    : options.permissionMode || 'default'

  if (!['default', 'dontAsk', 'acceptEdits', 'bypassPermissions'].includes(mode)) {
    throw new Error(
      `Unsupported permission mode "${mode}". Expected dontAsk, acceptEdits, or bypassPermissions.`
    )
  }

  return mode as 'default' | 'dontAsk' | 'acceptEdits' | 'bypassPermissions'
}

function buildPermissionPolicy(options: {
  permissionMode?: string
  dangerouslySkipPermissions?: boolean
  allowDangerouslySkipPermissions?: boolean
  allowedTools?: string
  disallowedTools?: string
} = {}): {
  mode: 'default' | 'dontAsk' | 'acceptEdits' | 'bypassPermissions'
  allowedTools?: string[]
  blockedTools?: string[]
} {
  return {
    mode: normalizePermissionMode(options),
    allowedTools: parseListOption(options.allowedTools),
    blockedTools: parseListOption(options.disallowedTools),
  }
}

function buildSystemPromptOption(options: {
  systemPrompt?: string
  systemPromptFile?: string
  appendSystemPrompt?: string
  appendSystemPromptFile?: string
} = {}): string | undefined {
  if (options.systemPrompt && options.systemPromptFile) {
    throw new Error('Cannot use both --system-prompt and --system-prompt-file.')
  }
  if (options.appendSystemPrompt && options.appendSystemPromptFile) {
    throw new Error('Cannot use both --append-system-prompt and --append-system-prompt-file.')
  }

  const basePrompt = options.systemPromptFile
    ? readFileSync(options.systemPromptFile, 'utf-8')
    : options.systemPrompt
  const appendedPrompt = options.appendSystemPromptFile
    ? readFileSync(options.appendSystemPromptFile, 'utf-8')
    : options.appendSystemPrompt

  return [basePrompt, appendedPrompt]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim())
    .filter(Boolean)
    .join('\n\n') || undefined
}

function buildMessageCompatibilityOptions(options: {
  maxTurns?: number
  maxThinkingTokens?: number
  fallbackModel?: string
  name?: string
  sessionId?: string
  tools?: string
  jsonSchema?: string
  inputFormat?: 'text' | 'stream-json'
  includeHookEvents?: boolean
  addDir?: string[]
  debug?: boolean
  debugFile?: string
  debugToStderr?: boolean
  mcpDebug?: boolean
  verbose?: boolean
  prefill?: string
  pluginDir?: string[]
  workspace?: string
  worktree?: boolean | string
  tmux?: boolean | string
  ide?: boolean
  chrome?: boolean
  workload?: string
  thinking?: 'enabled' | 'adaptive' | 'disabled'
  bare?: boolean
  disableSlashCommands?: boolean
  file?: string[]
  remote?: boolean | string
  remoteControl?: boolean | string
  rc?: boolean | string
  teleport?: boolean | string
  sdkUrl?: string
  agent?: string
  agents?: string
  agentId?: string
  agentName?: string
  agentColor?: string
  agentType?: string
  agentTeams?: string
  teamName?: string
  teammateMode?: 'auto' | 'tmux' | 'in-process'
  parentSessionId?: string
  planModeRequired?: boolean
  tasks?: boolean | string
  taskBudget?: number
  channels?: string[]
  advisor?: string
  afk?: boolean
  all?: boolean
  assistant?: boolean
  available?: boolean
  betas?: string[]
  brief?: boolean
  claudeai?: boolean
  clearOwner?: boolean
  clientSecret?: string
  console?: boolean
  cowork?: boolean
  dangerouslyLoadDevelopmentChannels?: string[]
  dangerouslySkipPermissionsWithClassifiers?: boolean
  deepLinkLastFetch?: number
  deepLinkOrigin?: boolean
  deepLinkRepo?: string
  delegatePermissions?: boolean
  description?: string
  dryRun?: boolean
  effort?: string
  email?: string
  enableAuthStatus?: boolean
  enableAutoMode?: boolean
  force?: boolean
  fromPr?: boolean | string
  hardFail?: boolean
  host?: string
  idleTimeout?: number
  init?: boolean
  initOnly?: boolean
  keepData?: boolean
  list?: boolean
  local?: boolean
  maintenance?: boolean
  maxBudgetUsd?: number
  maxSessions?: number
  messagingSocketPath?: string
  output?: string
  owner?: string
  pending?: boolean
  permissionPromptTool?: string
  port?: number
  proactive?: boolean
  resumeSessionAt?: string
  rewindFiles?: string
  safe?: boolean
  scope?: string
  settingSources?: string[]
  sparse?: boolean
  sso?: boolean
  status?: boolean
  subject?: string
  text?: string
  unix?: string
} = {}): {
  maxTurns?: number
  maxThinkingTokens?: number
  fallbackModel?: string
  sessionName?: string
  sessionId?: string
  enabledTools?: string[]
  jsonSchema?: unknown
  inputFormat?: 'text' | 'stream-json'
  includeHookEvents?: boolean
  additionalDirectories?: string[]
  debug?: {
    enabled?: boolean
    file?: string
    toStderr?: boolean
    verbose?: boolean
    mcp?: boolean
  }
  compatibility?: {
    prefill?: string
    thinking?: 'enabled' | 'adaptive' | 'disabled'
    pluginDirectories?: string[]
    workspace?: string
    worktree?: boolean | string
    tmux?: boolean | string
    ide?: boolean
    chrome?: boolean
    workload?: string
    bare?: boolean
    disableSlashCommands?: boolean
    files?: string[]
    remote?: boolean | string
    remoteControl?: boolean | string
    rc?: boolean | string
    teleport?: boolean | string
    sdkUrl?: string
    agent?: string
    agents?: string
    agentId?: string
    agentName?: string
    agentColor?: string
    agentType?: string
    agentTeams?: string
    teamName?: string
    teammateMode?: 'auto' | 'tmux' | 'in-process'
    parentSessionId?: string
    planModeRequired?: boolean
    tasks?: boolean | string
    taskBudget?: number
    channels?: string[]
    advisor?: string
    afk?: boolean
    all?: boolean
    assistant?: boolean
    available?: boolean
    betas?: string[]
    brief?: boolean
    claudeai?: boolean
    clearOwner?: boolean
    clientSecret?: string
    console?: boolean
    cowork?: boolean
    dangerouslyLoadDevelopmentChannels?: string[]
    dangerouslySkipPermissionsWithClassifiers?: boolean
    deepLinkLastFetch?: number
    deepLinkOrigin?: boolean
    deepLinkRepo?: string
    delegatePermissions?: boolean
    description?: string
    dryRun?: boolean
    effort?: string
    email?: string
    enableAuthStatus?: boolean
    enableAutoMode?: boolean
    force?: boolean
    fromPr?: boolean | string
    hardFail?: boolean
    host?: string
    idleTimeout?: number
    init?: boolean
    initOnly?: boolean
    keepData?: boolean
    list?: boolean
    local?: boolean
    maintenance?: boolean
    maxBudgetUsd?: number
    maxSessions?: number
    messagingSocketPath?: string
    output?: string
    owner?: string
    pending?: boolean
    permissionPromptTool?: string
    port?: number
    proactive?: boolean
    resumeSessionAt?: string
    rewindFiles?: string
    safe?: boolean
    scope?: string
    settingSources?: string[]
    sparse?: boolean
    sso?: boolean
    status?: boolean
    subject?: string
    text?: string
    unix?: string
  }
} {
  return {
    maxTurns: options.maxTurns,
    maxThinkingTokens: options.maxThinkingTokens,
    fallbackModel: options.fallbackModel,
    sessionName: options.name,
    sessionId: options.sessionId,
    enabledTools: parseToolsOption(options.tools),
    jsonSchema: options.jsonSchema ? parseJsonSchemaOption(options.jsonSchema) : undefined,
    inputFormat: options.inputFormat,
    includeHookEvents: options.includeHookEvents,
    additionalDirectories: options.addDir,
    debug: (options.debug || options.debugFile || options.debugToStderr || options.mcpDebug || options.verbose)
      ? {
        enabled: options.debug,
        file: options.debugFile,
        toStderr: options.debugToStderr,
        verbose: options.verbose,
        mcp: options.mcpDebug,
      }
      : undefined,
    compatibility: buildCompatibilityMetadata(options),
  }
}

function buildRequestMessageOptions(options: ReturnType<typeof buildMessageCompatibilityOptions>): {
  maxTurns?: number
  maxThinkingTokens?: number
  fallbackModel?: string
  enabledTools?: string[]
  jsonSchema?: unknown
  inputFormat?: 'text' | 'stream-json'
  includeHookEvents?: boolean
  additionalDirectories?: string[]
  debug?: {
    enabled?: boolean
    file?: string
    toStderr?: boolean
    verbose?: boolean
    mcp?: boolean
  }
  compatibility?: ReturnType<typeof buildMessageCompatibilityOptions>['compatibility']
} {
  return {
    maxTurns: options.maxTurns,
    maxThinkingTokens: options.maxThinkingTokens,
    fallbackModel: options.fallbackModel,
    enabledTools: options.enabledTools,
    jsonSchema: options.jsonSchema,
    inputFormat: options.inputFormat,
    includeHookEvents: options.includeHookEvents,
    additionalDirectories: options.additionalDirectories,
    debug: options.debug,
    compatibility: options.compatibility,
  }
}

function buildLaunchReplOptions(
  options: Record<string, unknown>,
  config: {
    createSessionIfNeeded?: boolean
  } = {}
): {
  model?: string
  cwd?: string
  prefill?: string
  createSessionOnStart?: {
    id?: string
    name?: string
    cwd?: string
    model?: string
  }
  messageOptions?: Omit<MessageOptions, 'model'>
} {
  const compatibilityOptions = buildMessageCompatibilityOptions(options as {
    maxTurns?: number
    maxThinkingTokens?: number
    fallbackModel?: string
    name?: string
    sessionId?: string
    tools?: string
    jsonSchema?: string
    inputFormat?: 'text' | 'stream-json'
    includeHookEvents?: boolean
    addDir?: string[]
    debug?: boolean
    debugFile?: string
    debugToStderr?: boolean
    mcpDebug?: boolean
    verbose?: boolean
    prefill?: string
    pluginDir?: string[]
    workspace?: string
    worktree?: boolean | string
    tmux?: boolean | string
    ide?: boolean
    chrome?: boolean
    workload?: string
    thinking?: 'enabled' | 'adaptive' | 'disabled'
    bare?: boolean
    disableSlashCommands?: boolean
    file?: string[]
    remote?: boolean | string
    remoteControl?: boolean | string
    rc?: boolean | string
    teleport?: boolean | string
    sdkUrl?: string
    agent?: string
    agents?: string
    agentId?: string
    agentName?: string
    agentColor?: string
    agentType?: string
    agentTeams?: string
    teamName?: string
    teammateMode?: 'auto' | 'tmux' | 'in-process'
    parentSessionId?: string
    planModeRequired?: boolean
    tasks?: boolean | string
    taskBudget?: number
    channels?: string[]
    advisor?: string
    afk?: boolean
    all?: boolean
    assistant?: boolean
    available?: boolean
    betas?: string[]
    brief?: boolean
    claudeai?: boolean
    clearOwner?: boolean
    clientSecret?: string
    console?: boolean
    cowork?: boolean
    dangerouslyLoadDevelopmentChannels?: string[]
    dangerouslySkipPermissionsWithClassifiers?: boolean
    deepLinkLastFetch?: number
    deepLinkOrigin?: boolean
    deepLinkRepo?: string
    delegatePermissions?: boolean
    description?: string
    dryRun?: boolean
    effort?: string
    email?: string
    enableAuthStatus?: boolean
    enableAutoMode?: boolean
    force?: boolean
    fromPr?: boolean | string
    hardFail?: boolean
    host?: string
    idleTimeout?: number
    init?: boolean
    initOnly?: boolean
    keepData?: boolean
    list?: boolean
    local?: boolean
    maintenance?: boolean
    maxBudgetUsd?: number
    maxSessions?: number
    messagingSocketPath?: string
    output?: string
    owner?: string
    pending?: boolean
    permissionPromptTool?: string
    port?: number
    proactive?: boolean
    resumeSessionAt?: string
    rewindFiles?: string
    safe?: boolean
    scope?: string
    settingSources?: string[]
    sparse?: boolean
    sso?: boolean
    status?: boolean
    subject?: string
    text?: string
    unix?: string
  })

  return {
    model: typeof options.model === 'string' ? options.model : undefined,
    cwd: typeof options.cwd === 'string' ? options.cwd : undefined,
    prefill: typeof options.prefill === 'string' ? options.prefill : undefined,
    createSessionOnStart: config.createSessionIfNeeded ? {
      id: typeof options.sessionId === 'string' ? options.sessionId : undefined,
      name: typeof options.name === 'string' ? options.name : undefined,
      cwd: typeof options.cwd === 'string' ? options.cwd : undefined,
      model: typeof options.model === 'string' ? options.model : undefined,
    } : undefined,
    messageOptions: {
      permissionPolicy: buildPermissionPolicy(options as {
        permissionMode?: string
        dangerouslySkipPermissions?: boolean
        allowDangerouslySkipPermissions?: boolean
        allowedTools?: string
        disallowedTools?: string
      }),
      systemPrompt: buildSystemPromptOption(options as {
        systemPrompt?: string
        systemPromptFile?: string
        appendSystemPrompt?: string
        appendSystemPromptFile?: string
      }),
      ...buildRequestMessageOptions(compatibilityOptions),
    },
  }
}

function buildCompatibilityMetadata(options: {
  prefill?: string
  pluginDir?: string[]
  workspace?: string
  worktree?: boolean | string
  tmux?: boolean | string
  ide?: boolean
  chrome?: boolean
  workload?: string
  thinking?: 'enabled' | 'adaptive' | 'disabled'
  bare?: boolean
  disableSlashCommands?: boolean
  file?: string[]
  remote?: boolean | string
  remoteControl?: boolean | string
  rc?: boolean | string
  teleport?: boolean | string
  sdkUrl?: string
  agent?: string
  agents?: string
  agentId?: string
  agentName?: string
  agentColor?: string
  agentType?: string
  agentTeams?: string
  teamName?: string
  teammateMode?: 'auto' | 'tmux' | 'in-process'
  parentSessionId?: string
  planModeRequired?: boolean
  tasks?: boolean | string
  taskBudget?: number
  channels?: string[]
  advisor?: string
  afk?: boolean
  all?: boolean
  assistant?: boolean
  available?: boolean
  betas?: string[]
  brief?: boolean
  claudeai?: boolean
  clearOwner?: boolean
  clientSecret?: string
  console?: boolean
  cowork?: boolean
  dangerouslyLoadDevelopmentChannels?: string[]
  dangerouslySkipPermissionsWithClassifiers?: boolean
  deepLinkLastFetch?: number
  deepLinkOrigin?: boolean
  deepLinkRepo?: string
  delegatePermissions?: boolean
  description?: string
  dryRun?: boolean
  effort?: string
  email?: string
  enableAuthStatus?: boolean
  enableAutoMode?: boolean
  force?: boolean
  fromPr?: boolean | string
  hardFail?: boolean
  host?: string
  idleTimeout?: number
  init?: boolean
  initOnly?: boolean
  keepData?: boolean
  list?: boolean
  local?: boolean
  maintenance?: boolean
  maxBudgetUsd?: number
  maxSessions?: number
  messagingSocketPath?: string
  output?: string
  owner?: string
  pending?: boolean
  permissionPromptTool?: string
  port?: number
  proactive?: boolean
  resumeSessionAt?: string
  rewindFiles?: string
  safe?: boolean
  scope?: string
  settingSources?: string[]
  sparse?: boolean
  sso?: boolean
  status?: boolean
  subject?: string
  text?: string
  unix?: string
}): ReturnType<typeof buildMessageCompatibilityOptions>['compatibility'] | undefined {
  const metadata = {
    prefill: options.prefill,
    thinking: options.thinking,
    pluginDirectories: options.pluginDir,
    workspace: options.workspace,
    worktree: normalizeOptionalFlagValue(options.worktree),
    tmux: normalizeOptionalFlagValue(options.tmux),
    ide: options.ide,
    chrome: options.chrome,
    workload: options.workload,
    bare: options.bare,
    disableSlashCommands: options.disableSlashCommands,
    files: options.file,
    remote: normalizeOptionalFlagValue(options.remote),
    remoteControl: normalizeOptionalFlagValue(options.remoteControl),
    rc: normalizeOptionalFlagValue(options.rc),
    teleport: normalizeOptionalFlagValue(options.teleport),
    sdkUrl: options.sdkUrl,
    agent: options.agent,
    agents: options.agents,
    agentId: options.agentId,
    agentName: options.agentName,
    agentColor: options.agentColor,
    agentType: options.agentType,
    agentTeams: options.agentTeams,
    teamName: options.teamName,
    teammateMode: options.teammateMode,
    parentSessionId: options.parentSessionId,
    planModeRequired: options.planModeRequired,
    tasks: normalizeOptionalFlagValue(options.tasks),
    taskBudget: options.taskBudget,
    channels: options.channels,
    advisor: options.advisor,
    afk: options.afk,
    all: options.all,
    assistant: options.assistant,
    available: options.available,
    betas: options.betas,
    brief: options.brief,
    claudeai: options.claudeai,
    clearOwner: options.clearOwner,
    clientSecret: options.clientSecret,
    console: options.console,
    cowork: options.cowork,
    dangerouslyLoadDevelopmentChannels: options.dangerouslyLoadDevelopmentChannels,
    dangerouslySkipPermissionsWithClassifiers: options.dangerouslySkipPermissionsWithClassifiers,
    deepLinkLastFetch: options.deepLinkLastFetch,
    deepLinkOrigin: options.deepLinkOrigin,
    deepLinkRepo: options.deepLinkRepo,
    delegatePermissions: options.delegatePermissions,
    description: options.description,
    dryRun: options.dryRun,
    effort: options.effort,
    email: options.email,
    enableAuthStatus: options.enableAuthStatus,
    enableAutoMode: options.enableAutoMode,
    force: options.force,
    fromPr: normalizeOptionalFlagValue(options.fromPr),
    hardFail: options.hardFail,
    host: options.host,
    idleTimeout: options.idleTimeout,
    init: options.init,
    initOnly: options.initOnly,
    keepData: options.keepData,
    list: options.list,
    local: options.local,
    maintenance: options.maintenance,
    maxBudgetUsd: options.maxBudgetUsd,
    maxSessions: options.maxSessions,
    messagingSocketPath: options.messagingSocketPath,
    output: options.output,
    owner: options.owner,
    pending: options.pending,
    permissionPromptTool: options.permissionPromptTool,
    port: options.port,
    proactive: options.proactive,
    resumeSessionAt: options.resumeSessionAt,
    rewindFiles: options.rewindFiles,
    safe: options.safe,
    scope: options.scope,
    settingSources: options.settingSources,
    sparse: options.sparse,
    sso: options.sso,
    status: options.status,
    subject: options.subject,
    text: options.text,
    unix: options.unix,
  }
  return Object.values(metadata).some((value) => value !== undefined && value !== false)
    ? metadata
    : undefined
}

function normalizeOptionalFlagValue(value: boolean | string | undefined): boolean | string | undefined {
  if (value === undefined) {
    return undefined
  }
  return value
}

async function syncMcpConfigFromOptions(
  client: CCLocalClient,
  options: { mcpConfig?: string[]; strictMcpConfig?: boolean } = {}
): Promise<void> {
  const configs = options.mcpConfig || []
  if (configs.length === 0) {
    return
  }

  for (const configValue of configs) {
    const parsed = readMcpConfigValue(configValue)
    const servers = normalizeMcpConfigServers(parsed)
    for (const server of servers) {
      await client.addMcpServer(server.name, server.config)
      await client.connectMcpServer(server.name).catch(() => undefined)
    }
  }
}

function readMcpConfigValue(value: string): unknown {
  const raw = existsSync(value) ? readFileSync(value, 'utf-8') : value
  try {
    return JSON.parse(raw)
  } catch (error) {
    throw new Error(`Invalid --mcp-config value "${value}": ${error instanceof Error ? error.message : String(error)}`)
  }
}

function readJsonFileOrString(value: string, flagName: string): Record<string, unknown> {
  const raw = existsSync(value) ? readFileSync(value, 'utf-8') : value
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('expected a JSON object')
    }
    return parsed as Record<string, unknown>
  } catch (error) {
    throw new Error(`Invalid ${flagName} value "${value}": ${error instanceof Error ? error.message : String(error)}`)
  }
}

function normalizeMcpConfigServers(value: unknown): Array<{
  name: string
  config: {
    type: 'stdio' | 'sse' | 'http' | 'ws'
    command?: string
    args?: string[]
    cwd?: string
    url?: string
    env?: Record<string, string>
    headers?: Record<string, string>
    namespace?: string
    allowedTools?: string[]
    blockedTools?: string[]
    syncToolsToRegistry?: boolean
  }
}> {
  const record = value as Record<string, unknown>
  const rawServers = record.mcpServers || record.servers || value
  if (!rawServers || typeof rawServers !== 'object' || Array.isArray(rawServers)) {
    throw new Error('--mcp-config must be an object, or contain "mcpServers"/"servers".')
  }

  return Object.entries(rawServers as Record<string, unknown>).map(([name, rawConfig]) => {
    const config = rawConfig as Record<string, unknown>
    const url = typeof config.url === 'string' ? config.url : undefined
    const type = (typeof config.type === 'string'
      ? config.type
      : url
        ? 'http'
        : 'stdio') as 'stdio' | 'sse' | 'http' | 'ws'

    return {
      name,
      config: {
        type,
        command: typeof config.command === 'string' ? config.command : undefined,
        args: Array.isArray(config.args) ? config.args.map((item) => String(item)) : undefined,
        cwd: typeof config.cwd === 'string' ? config.cwd : undefined,
        url,
        env: normalizeStringRecord(config.env),
        headers: normalizeStringRecord(config.headers),
        namespace: typeof config.namespace === 'string' ? config.namespace : undefined,
        allowedTools: normalizeStringArray(config.allowedTools),
        blockedTools: normalizeStringArray(config.blockedTools),
        syncToolsToRegistry: typeof config.syncToolsToRegistry === 'boolean' ? config.syncToolsToRegistry : undefined,
      },
    }
  })
}

function normalizeStringRecord(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, String(entry)])
  )
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (typeof value === 'string') {
    return parseListOption(value)
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item))
  }
  return undefined
}

function parseToolsOption(value?: string): string[] | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value.trim() === '') {
    return []
  }
  return parseListOption(value)
}

function parseJsonSchemaOption(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch (error) {
    if (existsSync(value)) {
      return JSON.parse(readFileSync(value, 'utf-8'))
    }
    throw new Error(`Invalid --json-schema value: ${error instanceof Error ? error.message : String(error)}`)
  }
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

function parseFloatOption(value: string): number {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Expected a non-negative number, received "${value}".`)
  }
  return parsed
}

function collectOption(value: string, previous: string[] = []): string[] {
  return [...previous, value]
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds}s`
}

function estimateMessageTokens(messages: Array<{ content?: Array<Record<string, unknown>> }>): number {
  const text = messages
    .flatMap((message) => message.content || [])
    .map((item) => {
      if (typeof item.text === 'string') {
        return item.text
      }
      if (typeof item.content === 'string') {
        return item.content
      }
      if (typeof item.thinking === 'string') {
        return item.thinking
      }
      if (typeof item.name === 'string') {
        return item.name
      }
      return ''
    })
    .join('\n')

  return Math.max(0, Math.ceil(text.length / 4))
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

function formatMcpServerDetails(server: Record<string, unknown>): string {
  const config = (server.config as Record<string, unknown> | undefined) ?? {}
  const tools = Array.isArray(server.tools) ? server.tools as Array<Record<string, unknown>> : []

  const lines = [
    `Server: ${String(server.name || '')}`,
    `Status: ${String(server.status || '')}`,
    `Transport: ${String(config.type || '')}`,
  ]

  if (config.command) {
    lines.push(`Command: ${String(config.command)}`)
  }
  if (Array.isArray(config.args) && config.args.length > 0) {
    lines.push(`Args: ${config.args.map((value) => String(value)).join(' ')}`)
  }
  if (config.cwd) {
    lines.push(`CWD: ${String(config.cwd)}`)
  }
  if (config.url) {
    lines.push(`URL: ${String(config.url)}`)
  }
  if (config.namespace) {
    lines.push(`Namespace: ${String(config.namespace)}`)
  }
  if (Array.isArray(config.allowedTools) && config.allowedTools.length > 0) {
    lines.push(`Allowed Tools: ${config.allowedTools.map((value) => String(value)).join(', ')}`)
  }
  if (Array.isArray(config.blockedTools) && config.blockedTools.length > 0) {
    lines.push(`Blocked Tools: ${config.blockedTools.map((value) => String(value)).join(', ')}`)
  }
  if ('syncToolsToRegistry' in config) {
    lines.push(`Sync To Registry: ${String(Boolean(config.syncToolsToRegistry))}`)
  }
  if (server.lastError) {
    lines.push(`Last Error: ${String(server.lastError)}`)
  }
  if (server.updatedAt) {
    lines.push(`Updated: ${new Date(Number(server.updatedAt)).toLocaleString()}`)
  }

  if (tools.length === 0) {
    lines.push('Tools: (none)')
    return lines.join('\n')
  }

  lines.push('Tools:')
  for (const tool of tools) {
    const name = String(tool.name || '')
    const registeredName = tool.registeredName ? ` -> ${String(tool.registeredName)}` : ''
    const description = tool.description ? `: ${String(tool.description)}` : ''
    lines.push(`- ${name}${registeredName}${description}`)
  }

  return lines.join('\n')
}

interface CliTaskRecord {
  id: string
  subject: string
  description?: string
  status: string
  createdAt: number
  updatedAt: number
}

function listLocalAgents(cwd: string): Array<{ name: string; source: string; path: string }> {
  const home = process.env.HOME || process.cwd()
  const searchDirs = [
    { source: 'project', path: join(cwd, '.claude', 'agents') },
    { source: 'user', path: join(home, '.claude', 'agents') },
  ]
  const agents: Array<{ name: string; source: string; path: string }> = []
  for (const dir of searchDirs) {
    if (!existsSync(dir.path)) {
      continue
    }
    for (const entry of readdirSync(dir.path, { withFileTypes: true })) {
      if (!entry.isFile() || !/\.(md|json|yaml|yml)$/.test(entry.name)) {
        continue
      }
      const filePath = join(dir.path, entry.name)
      const raw = readFileSync(filePath, 'utf-8')
      const title = raw.match(/^#\s+(.+)$/m)?.[1]?.trim()
      agents.push({
        name: title || entry.name.replace(/\.(md|json|yaml|yml)$/, ''),
        source: dir.source,
        path: filePath,
      })
    }
  }
  return agents.sort((a, b) => a.name.localeCompare(b.name))
}

function generateCompletionScript(shell: string): string {
  const commands = program.commands.map((command) => command.name()).sort()
  const words = ['--help', '--version', '--print', '--model', '--resume', '--continue', ...commands].join(' ')
  if (shell === 'zsh') {
    return `#compdef cclocal\n_arguments '*:: :->cmds'\ncase $state in\n  cmds) _values 'cclocal commands' ${words.split(' ').map((word) => `'${word}'`).join(' ')} ;;\nesac`
  }
  if (shell === 'fish') {
    return words.split(' ').map((word) => `complete -c cclocal -a '${word}'`).join('\n')
  }
  return `# bash completion for cclocal\n_cclocal_complete() {\n  COMPREPLY=( $(compgen -W "${words}" -- "\${COMP_WORDS[COMP_CWORD]}") )\n}\ncomplete -F _cclocal_complete cclocal`
}

function parseOpenUrl(value: string): { server?: string; session?: string } {
  try {
    const url = new URL(value)
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return {
        server: `${url.protocol}//${url.host}`,
        session: url.searchParams.get('session') || undefined,
      }
    }
    if (url.protocol === 'cc:' || url.protocol === 'cclocal:') {
      return {
        server: url.searchParams.get('server') || undefined,
        session: url.searchParams.get('session') || url.hostname || undefined,
      }
    }
  } catch {
    // Treat a plain value as a session id.
  }
  return { session: value }
}

function getCliTasksPath(): string {
  const configPath = getLocalConfigPath()
  return join(dirname(configPath), 'tasks.json')
}

function readCliTasks(): CliTaskRecord[] {
  const tasksPath = getCliTasksPath()
  if (!existsSync(tasksPath)) {
    return []
  }
  try {
    const parsed = JSON.parse(readFileSync(tasksPath, 'utf-8')) as { tasks?: CliTaskRecord[] }
    return Array.isArray(parsed.tasks) ? parsed.tasks : []
  } catch {
    return []
  }
}

function writeCliTasks(tasks: CliTaskRecord[]): void {
  const tasksPath = getCliTasksPath()
  mkdirSync(dirname(tasksPath), { recursive: true })
  writeFileSync(tasksPath, `${JSON.stringify({ tasks }, null, 2)}\n`, 'utf-8')
}

function getAutoModeDefaults(): Record<string, unknown> {
  return {
    enabled: false,
    environment: {
      packagesCli: true,
      autonomousExecution: false,
    },
    allow: [
      'file_read',
      'glob',
      'grep',
    ],
    deny: [
      'bash',
      'file_write',
      'file_edit',
    ],
  }
}

function collectLocalDiagnostics(options: { server?: string; cwd?: string; model?: string }): Record<string, string> {
  return {
    cwd: options.cwd || process.cwd(),
    server: options.server || 'http://127.0.0.1:5678',
    model: options.model || '(server default)',
    configPath: getLocalConfigPath(),
    runtime: `bun ${Bun.version}`,
    platform: process.platform,
  }
}

function listRollbackCandidates(): string[] {
  const result = spawnSync('git', ['tag', '--sort=-creatordate'], {
    cwd: findRepoRoot(),
    encoding: 'utf-8',
  })
  if (result.status !== 0) {
    return []
  }
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 10)
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`
}

function readClaudeUpCommands(cwd: string): string[] {
  let current = cwd
  while (true) {
    const candidate = join(current, 'CLAUDE.md')
    if (existsSync(candidate)) {
      const content = readFileSync(candidate, 'utf-8')
      const lines = content.split('\n')
      const start = lines.findIndex((line) => /^#{1,6}\s+claude up\s*$/i.test(line.trim()))
      if (start === -1) {
        return []
      }
      const commands: string[] = []
      for (const line of lines.slice(start + 1)) {
        if (/^#{1,6}\s+/.test(line)) {
          break
        }
        const match = line.match(/^\s*(?:[-*]\s*)?`?([^`#].*?)`?\s*$/)
        if (match && match[1]?.trim()) {
          commands.push(match[1].trim())
        }
      }
      return commands.filter((line) => !line.startsWith('- ') && !line.startsWith('* '))
    }
    const parent = dirname(current)
    if (parent === current) {
      return []
    }
    current = parent
  }
}

await program.parseAsync()
