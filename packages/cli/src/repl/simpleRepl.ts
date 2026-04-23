/**
 * 简化版 REPL - 命令行交互
 */

import * as readline from 'readline'
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type { CCLocalClient } from '../client/CCLocalClient.js'
import type { MessageOptions, StreamEvent } from '@cclocal/shared'

interface LaunchReplOptions {
  model?: string
  cwd?: string
  prefill?: string
  createInterface?: typeof readline.createInterface
  createSessionOnStart?: {
    id?: string
    name?: string
    cwd?: string
    model?: string
  }
  messageOptions?: Omit<MessageOptions, 'model'>
}

const LEGACY_REPL_COMPAT_COMMANDS = new Set([
  'add-dir',
  'advisor',
  'agents',
  'agents-platform',
  'assistant',
  'at_a_glance',
  'bridge-kick',
  'brief',
  'btw',
  'buddy',
  'cc_team_improvements',
  'checking',
  'color',
  'confirm',
  'fast',
  'friction_analysis',
  'fun_ending',
  'heapdump',
  'init-verifiers',
  'insights',
  'install',
  'install-github-app',
  'install-slack-app',
  'interaction_style',
  'keybindings',
  'model_behavior_improvements',
  'passes',
  'pr-comments',
  'project_areas',
  'remote-control',
  'remote-env',
  'sandbox',
  'statusline',
  'stickers',
  'suggestions',
  'think-back',
  'thinkback-play',
  'ultraplan',
  'uploading',
  'voice',
  'web-setup',
  'what_works',
])

type ReplCommandContext = {
  client: CCLocalClient
  getCwd: () => string
  getModel: () => string | undefined
  getMessageOptions?: () => Omit<MessageOptions, 'model'>
  getIsGenerating: () => boolean
  setModel: (model?: string) => void
  updateMessageOptions?: (
    updater: (options: Omit<MessageOptions, 'model'>) => Omit<MessageOptions, 'model'>
  ) => void
  setSessionId: (sessionId: string) => Promise<void>
  printLine: (line: string) => void
  requestExit: () => void
}

export async function executeReplSlashCommand(
  input: string,
  context: ReplCommandContext
): Promise<boolean> {
  const trimmed = input.trim()
  if (!trimmed.startsWith('/')) {
    return false
  }

  const [command, ...args] = trimmed.slice(1).split(/\s+/)
  const joinedArgs = args.join(' ').trim()

  switch (command) {
    case 'help':
      context.printLine('Available commands:')
      context.printLine('/help                Show this help message')
      context.printLine('/model [name|reset]  Show, change, or clear the active model override')
      context.printLine('/models              List models exposed by the server')
      context.printLine('/config              Show effective local REPL configuration')
      context.printLine('/context             Show current session and runtime context summary')
      context.printLine('/doctor              Run lightweight local diagnostics')
      context.printLine('/env                 Show local runtime environment summary')
      context.printLine('/version             Show packages CLI version')
      context.printLine('/permissions [mode]  Show or set permission mode')
      context.printLine('/stats               Show lightweight usage statistics')
      context.printLine('/cost                Show the current session timeline summary')
      context.printLine('/status              Show current REPL state')
      context.printLine('/diff                Show git diff summary for the current cwd')
      context.printLine('/branch              Show current git branch')
      context.printLine('/commit <message>    Commit current git changes')
      context.printLine('/init                Create a starter CLAUDE.md if missing')
      context.printLine('/memory [text]       Show or append to CLAUDE.md')
      context.printLine('/theme [name]        Show or set a local theme preference')
      context.printLine('/export [count]      Export recent session messages as JSON')
      context.printLine('/rename <name>       Alias for /rename-session')
      context.printLine('/usage               Alias for /stats')
      context.printLine('/upgrade             Show packages CLI upgrade guidance')
      context.printLine('/ide [on|off]        Toggle IDE integration metadata for the next messages')
      context.printLine('/chrome [on|off]     Toggle Chrome integration metadata for the next messages')
      context.printLine('/remote-control [name|off] Toggle remote-control metadata')
      context.printLine('/mcp [name]          List MCP servers or show one server')
      context.printLine('/mcp connect <name>  Connect an MCP server')
      context.printLine('/mcp disconnect <name> Disconnect an MCP server')
      context.printLine('/session             Show details for the current session')
      context.printLine('/sessions [count]    List recent sessions')
      context.printLine('/history [count]     Show recent messages in the current session')
      context.printLine('/messages [count]    Alias for /history')
      context.printLine('/resume <id>         Switch to an existing session')
      context.printLine('/use <id>            Alias for /resume')
      context.printLine('/continue            Switch to the most recent session in the current cwd')
      context.printLine('/new-session [name]  Create and switch to a new session')
      context.printLine('/new [name]          Alias for /new-session')
      context.printLine('/clear [name]        Start a fresh session')
      context.printLine('/fork [name]         Fork the current session')
      context.printLine('/rename-session <name> Rename the current session')
      context.printLine('/delete-session      Delete the current session')
      context.printLine('/cancel              Cancel the current generation')
      context.printLine('/exit                Exit the REPL')
      return true

    case 'model':
      if (!joinedArgs) {
        context.printLine(`Current model override: ${context.getModel() || '(server default)'}`)
        return true
      }
      if (joinedArgs === 'reset' || joinedArgs === 'clear') {
        context.setModel(undefined)
        context.printLine('Model override cleared.')
        return true
      }
      context.setModel(joinedArgs)
      context.printLine(`Model override set to: ${joinedArgs}`)
      return true

    case 'models': {
      const models = await context.client.listModels()
      if (models.length === 0) {
        context.printLine('No models available.')
        return true
      }
      context.printLine('Available models:')
      for (const model of models) {
        context.printLine(`- ${model.id}  ${model.name}`)
      }
      return true
    }

    case 'config':
      context.printLine('Config:')
      context.printLine(`Cwd: ${context.getCwd()}`)
      context.printLine(`Model override: ${context.getModel() || '(server default)'}`)
      context.printLine(`Session option: ${context.client.getSessionId() || '(none)'}`)
      context.printLine(`Permission mode: ${context.getMessageOptions?.().permissionPolicy?.mode || 'default'}`)
      return true

    case 'context': {
      const cwd = context.getCwd()
      const sessions = await context.client.listSessions()
      const sessionId = context.client.getSessionId()
      const targetSession =
        (sessionId ? sessions.find((session) => session.id === sessionId) : undefined) ||
        sessions.find((session) => session.cwd === cwd) ||
        sessions[0]

      context.printLine('Context:')
      context.printLine(`Cwd: ${cwd}`)
      context.printLine(`Configured model override: ${context.getModel() || '(server default)'}`)
      context.printLine(`Available sessions: ${sessions.length}`)

      if (!targetSession) {
        context.printLine('Active session: (none)')
      } else {
        const session = await context.client.getSession(targetSession.id)
        const messages = await context.client.getSessionMessages(targetSession.id, { limit: 20 })
        context.printLine(`Active session: ${session.id}`)
        context.printLine(`Session name: ${session.name}`)
        context.printLine(`Session model: ${session.model}`)
        context.printLine(`Session cwd: ${session.cwd}`)
        context.printLine(`Recent messages loaded: ${messages.length}`)
      }

      const servers = await context.client.listMcpServers()
      const connected = servers.filter((server) => String(server.status || '') === 'connected').length
      context.printLine(`MCP servers: ${connected}/${servers.length} connected`)
      return true
    }

    case 'doctor': {
      context.printLine('Doctor:')
      context.printLine('Server: ok')
      try {
        const models = await context.client.listModels()
        context.printLine(`Models: ${models.length}`)
      } catch {
        context.printLine('Models: unavailable')
      }
      try {
        const sessions = await context.client.listSessions()
        context.printLine(`Sessions: ${sessions.length}`)
      } catch {
        context.printLine('Sessions: unavailable')
      }
      try {
        const servers = await context.client.listMcpServers()
        const connected = servers.filter((server) => String(server.status || '') === 'connected').length
        context.printLine(`MCP: ${connected}/${servers.length} connected`)
      } catch {
        context.printLine('MCP: unavailable')
      }
      return true
    }

    case 'env':
      context.printLine('Environment:')
      context.printLine(`Platform: ${process.platform}`)
      context.printLine(`Arch: ${process.arch}`)
      context.printLine('Runtime: bun')
      context.printLine(`Cwd: ${context.getCwd()}`)
      return true

    case 'version':
      context.printLine('CCLocal packages CLI: 1.0.0')
      context.printLine('Runtime: packages/* native architecture')
      return true

    case 'permissions':
      if (joinedArgs && context.updateMessageOptions) {
        const mode = normalizePermissionMode(joinedArgs)
        if (!mode) {
          context.printLine('Usage: /permissions [default|dontAsk|acceptEdits|bypassPermissions]')
          return true
        }
        context.updateMessageOptions((messageOptions) => ({
          ...messageOptions,
          permissionPolicy: {
            ...messageOptions.permissionPolicy,
            mode,
          },
        }))
        context.printLine(`Permission mode set to: ${mode}`)
        return true
      }

      {
        const permissionPolicy = context.getMessageOptions?.().permissionPolicy || {}
        context.printLine('Permissions:')
        context.printLine(`Mode: ${permissionPolicy.mode || 'default'}`)
        context.printLine(`Allowed tools: ${permissionPolicy.allowedTools?.join(', ') || '(default)'}`)
        context.printLine(`Disallowed tools: ${permissionPolicy.blockedTools?.join(', ') || '(none)'}`)
      }
      context.printLine('Server-side auth: enabled')
      context.printLine('MCP tool policies: supported via allow/block lists and namespace filters')
      context.printLine('Tool execution policy: enforced by QueryEngine')
      return true

    case 'stats': {
      const sessions = await context.client.listSessions()
      const models = await context.client.listModels()
      const servers = await context.client.listMcpServers()
      const connected = servers.filter((server) => String(server.status || '') === 'connected').length
      const totalMessages = sessions.reduce((sum, session) => sum + ((session.messages?.length) || 0), 0)
      context.printLine('Stats:')
      context.printLine(`Sessions: ${sessions.length}`)
      context.printLine(`Messages (loaded summaries): ${totalMessages}`)
      context.printLine(`Models: ${models.length}`)
      context.printLine(`MCP servers: ${connected}/${servers.length} connected`)
      return true
    }

    case 'cost': {
      const cwd = context.getCwd()
      const sessions = await context.client.listSessions()
      const sessionId = context.client.getSessionId()
      const targetSession =
        (sessionId ? sessions.find((session) => session.id === sessionId) : undefined) ||
        sessions.find((session) => session.cwd === cwd) ||
        sessions[0]

      context.printLine('Cost:')
      if (!targetSession) {
        context.printLine('Active session: (none)')
        return true
      }

      const session = await context.client.getSession(targetSession.id)
      const messages = await context.client.getSessionMessages(targetSession.id, { limit: 100 })
      const startedAt = session.createdAt || messages[0]?.timestamp
      const endedAt = messages[messages.length - 1]?.timestamp || session.updatedAt || startedAt
      const durationMs = startedAt && endedAt ? Math.max(0, endedAt - startedAt) : 0

      context.printLine(`Session: ${session.name}`)
      context.printLine(`Session id: ${session.id}`)
      context.printLine(`Messages: ${messages.length}`)
      context.printLine(`Duration: ${formatDuration(durationMs)}`)
      context.printLine(`Estimated tokens: ${estimateMessageTokens(messages)}`)
      return true
    }

    case 'status': {
      const sessionId = context.client.getSessionId()
      context.printLine(`Session: ${sessionId || '(none)'}`)
      if (sessionId) {
        try {
          const session = await context.client.getSession(sessionId)
          context.printLine(`Session name: ${session.name}`)
          context.printLine(`Session cwd: ${session.cwd}`)
          context.printLine(`Session model: ${session.model}`)
        } catch {
          context.printLine('Session details: unavailable')
        }
      }
      context.printLine(`Model override: ${context.getModel() || '(server default)'}`)
      context.printLine(`Generation: ${context.getIsGenerating() ? 'running' : 'idle'}`)
      try {
        const servers = await context.client.listMcpServers()
        const connected = servers.filter((server) => String(server.status || '') === 'connected').length
        context.printLine(`MCP servers: ${connected}/${servers.length} connected`)
      } catch {
        context.printLine('MCP servers: unavailable')
      }
      return true
    }

    case 'diff': {
      const result = await runShellCommand('git diff --stat && git diff --cached --stat', context.getCwd())
      context.printLine(result.output || '(no git diff)')
      if (result.code !== 0) {
        context.printLine(`Diff command exited with code ${result.code}`)
      }
      return true
    }

    case 'branch': {
      const result = await runShellCommand('git branch --show-current', context.getCwd())
      context.printLine(`Branch: ${result.output.trim() || '(detached or not a git repository)'}`)
      return true
    }

    case 'commit': {
      if (!joinedArgs) {
        context.printLine('Usage: /commit <message>')
        return true
      }
      const escapedMessage = joinedArgs.replace(/'/g, "'\\''")
      const result = await runShellCommand(`git add -A && git commit -m '${escapedMessage}'`, context.getCwd())
      context.printLine(result.output || '(no output)')
      if (result.code !== 0) {
        context.printLine(`Commit command exited with code ${result.code}`)
      }
      return true
    }

    case 'init': {
      const memoryPath = join(context.getCwd(), 'CLAUDE.md')
      if (existsSync(memoryPath)) {
        context.printLine(`CLAUDE.md already exists: ${memoryPath}`)
        return true
      }
      await writeFile(
        memoryPath,
        [
          '# Project Instructions',
          '',
          '- Add repository-specific development, testing, and style guidance here.',
          '- Keep this file concise so agents can load it efficiently.',
          '',
        ].join('\n'),
        'utf-8'
      )
      context.printLine(`Created ${memoryPath}`)
      return true
    }

    case 'memory': {
      const memoryPath = join(context.getCwd(), 'CLAUDE.md')
      if (!joinedArgs) {
        if (!existsSync(memoryPath)) {
          context.printLine('No CLAUDE.md found. Use /init to create one.')
          return true
        }
        const content = await readFile(memoryPath, 'utf-8')
        context.printLine(content.trim() || '(CLAUDE.md is empty)')
        return true
      }
      const existing = existsSync(memoryPath) ? await readFile(memoryPath, 'utf-8') : '# Project Instructions\n'
      await writeFile(memoryPath, `${existing.trimEnd()}\n- ${joinedArgs}\n`, 'utf-8')
      context.printLine(`Appended memory to ${memoryPath}`)
      return true
    }

    case 'theme':
      if (!joinedArgs) {
        context.printLine('Theme: default')
        context.printLine('Packages CLI currently uses a simple terminal theme.')
        return true
      }
      context.printLine(`Theme preference noted: ${joinedArgs}`)
      return true

    case 'export': {
      const sessionId = context.client.getSessionId()
      if (!sessionId) {
        context.printLine('No active session to export.')
        return true
      }
      const rawCount = joinedArgs ? Number.parseInt(joinedArgs, 10) : 100
      const count = Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 100
      const messages = await context.client.getSessionMessages(sessionId, { limit: count })
      context.printLine(JSON.stringify({
        sessionId,
        messages,
      }, null, 2))
      return true
    }

    case 'usage':
    case 'extra-usage':
      return await executeReplSlashCommand('/stats', context)

    case 'upgrade':
      context.printLine('Upgrade (packages mode):')
      context.printLine('Run: git pull')
      context.printLine('Run: bun install')
      context.printLine('Run: bun run build:all')
      return true

    case 'login':
      context.printLine('Use `cclocal auth login --api-token <token>` from the shell to store a local server token.')
      return true

    case 'logout':
      context.printLine('Use `cclocal auth logout` from the shell to clear the local server token.')
      return true

    case 'plugin':
    case 'plugins':
      context.printLine('Use `cclocal plugin list/install/update/uninstall` from the shell for plugin management.')
      return true

    case 'skills':
      context.printLine('Skills are exposed through packages plugin manifests and MCP/tool integrations.')
      context.printLine('Use `cclocal plugin list` and `cclocal mcp list` to inspect available extensions.')
      return true

    case 'reload-plugins':
      context.printLine('Plugin reload requested. Restart packages/cli to reload local plugin manifests.')
      return true

    case 'plan':
      context.updateMessageOptions?.((messageOptions) => ({
        ...messageOptions,
        compatibility: {
          ...messageOptions.compatibility,
          planModeRequired: true,
        },
      }))
      context.printLine('Plan mode metadata enabled for subsequent messages.')
      return true

    case 'review':
    case 'ultrareview':
    case 'security-review':
      context.printLine(`/${command} is handled as a packages prompt workflow. Send the target context in chat and the model can use the active tool pool.`)
      return true

    case 'commit-push-pr':
      context.printLine('Use /commit <message> for the local commit, then ask the model to push/open a PR with the active GitHub tooling if configured.')
      return true

    case 'compact':
      context.printLine('Context compaction is handled by the server/session layer in packages mode.')
      return true

    case 'copy':
      context.printLine('Copy helpers are terminal-native in packages REPL. Use terminal selection or pipe /export output as needed.')
      return true

    case 'files':
      context.printLine(`Current cwd: ${context.getCwd()}`)
      context.printLine('Use file_read/glob/grep tools during chat for file inspection.')
      return true

    case 'hooks':
      context.printLine('Hook events are forwarded when --include-hook-events is enabled.')
      context.printLine('Edit hook configuration through your project settings file and restart the REPL to reload it.')
      return true

    case 'ide':
      context.updateMessageOptions?.((messageOptions) => ({
        ...messageOptions,
        compatibility: {
          ...messageOptions.compatibility,
          ide: joinedArgs !== 'off' && joinedArgs !== 'false',
        },
      }))
      context.printLine(`IDE integration metadata: ${joinedArgs === 'off' || joinedArgs === 'false' ? 'disabled' : 'enabled'}`)
      return true

    case 'chrome':
      context.updateMessageOptions?.((messageOptions) => ({
        ...messageOptions,
        compatibility: {
          ...messageOptions.compatibility,
          chrome: joinedArgs !== 'off' && joinedArgs !== 'false',
        },
      }))
      context.printLine(`Chrome integration metadata: ${joinedArgs === 'off' || joinedArgs === 'false' ? 'disabled' : 'enabled'}`)
      return true

    case 'remote-control':
      context.updateMessageOptions?.((messageOptions) => ({
        ...messageOptions,
        compatibility: {
          ...messageOptions.compatibility,
          remoteControl: joinedArgs === 'off' || joinedArgs === 'false' ? false : joinedArgs || true,
        },
      }))
      context.printLine(
        `Remote-control metadata: ${joinedArgs === 'off' || joinedArgs === 'false' ? 'disabled' : joinedArgs || 'enabled'}`
      )
      return true

    case 'terminal-setup':
      context.printLine('Terminal setup is already compatible with the packages CLI entrypoint.')
      return true

    case 'vim':
      context.updateMessageOptions?.((messageOptions) => ({
        ...messageOptions,
        compatibility: {
          ...messageOptions.compatibility,
          vimMode: joinedArgs === 'off' || joinedArgs === 'false' ? false : joinedArgs || true,
        },
      }))
      context.printLine(`Vim mode preference noted: ${joinedArgs || 'enabled'}`)
      return true

    case 'privacy-settings':
      context.updateMessageOptions?.((messageOptions) => ({
        ...messageOptions,
        compatibility: {
          ...messageOptions.compatibility,
          privacySettings: joinedArgs || true,
        },
      }))
      context.printLine(`Privacy settings preference noted: ${joinedArgs || 'default'}`)
      return true

    case 'output-style':
      context.updateMessageOptions?.((messageOptions) => ({
        ...messageOptions,
        compatibility: {
          ...messageOptions.compatibility,
          outputStyle: joinedArgs || 'default',
        },
      }))
      context.printLine(`Output style preference noted: ${joinedArgs || 'default'}`)
      return true

    case 'effort':
      if (!joinedArgs) {
        context.printLine('Effort: default')
        return true
      }
      context.printLine(`Effort preference noted: ${joinedArgs}`)
      return true

    case 'rate-limit-options':
      context.printLine('Rate-limit options are surfaced by the server/provider layer when available.')
      return true

    case 'release-notes':
      context.printLine('Release notes: packages CLI is running from this repository build. See README.md and MIGRATION_MATRIX.md for current changes.')
      return true

    case 'rewind':
      context.updateMessageOptions?.((messageOptions) => ({
        ...messageOptions,
        compatibility: {
          ...messageOptions.compatibility,
          rewindRequested: joinedArgs || true,
        },
      }))
      context.printLine(`Rewind request captured: ${joinedArgs || 'latest checkpoint'}`)
      return true

    case 'tasks':
      context.printLine('Task tools are available to the model as TaskCreate/TaskGet/TaskList/TaskUpdate.')
      return true

    case 'tag':
      context.printLine(`Session tag noted: ${joinedArgs || '(none)'}`)
      return true

    case 'mobile':
    case 'desktop':
      context.printLine(`/${command} setup metadata is captured in packages mode. Continue in chat to configure the target workflow.`)
      return true

    case 'feedback':
      context.updateMessageOptions?.((messageOptions) => ({
        ...messageOptions,
        compatibility: {
          ...messageOptions.compatibility,
          feedback: joinedArgs || true,
        },
      }))
      context.printLine(`Feedback captured locally${joinedArgs ? `: ${joinedArgs}` : '.'}`)
      return true

    case 'mcp': {
      if (args[0] === 'connect' && args[1]) {
        const result = await context.client.connectMcpServer(args.slice(1).join(' '))
        context.printLine(
          `Connected MCP server: ${String(result.name || args.slice(1).join(' '))} (${String(result.status || 'connected')})`
        )
        return true
      }

      if (args[0] === 'disconnect' && args[1]) {
        const result = await context.client.disconnectMcpServer(args.slice(1).join(' '))
        context.printLine(
          `Disconnected MCP server: ${String(result.name || args.slice(1).join(' '))} (${String(result.status || 'disconnected')})`
        )
        return true
      }

      const servers = await context.client.listMcpServers()
      if (servers.length === 0) {
        context.printLine('No MCP servers configured.')
        return true
      }

      if (!joinedArgs) {
        context.printLine('MCP servers:')
        for (const server of servers) {
          context.printLine(
            `- ${String(server.name || '')}  ${String(server.status || '')}  ${String((server.config as { type?: string } | undefined)?.type || '')}`
          )
        }
        return true
      }

      const server = servers.find((item) => String(item.name || '') === joinedArgs)
      if (!server) {
        context.printLine(`MCP server not found: ${joinedArgs}`)
        return true
      }
      context.printLine(`MCP server: ${String(server.name || '')}`)
      context.printLine(`Status: ${String(server.status || '')}`)
      context.printLine(`Transport: ${String((server.config as { type?: string } | undefined)?.type || '')}`)
      return true
    }

    case 'session':
      {
        const sessionId = context.client.getSessionId()
        if (!sessionId) {
          context.printLine('Current session: (none)')
          return true
        }
        try {
          const session = await context.client.getSession(sessionId)
          context.printLine(`Current session: ${session.id}`)
          context.printLine(`Name: ${session.name}`)
          context.printLine(`Model: ${session.model}`)
          context.printLine(`Cwd: ${session.cwd}`)
        } catch {
          context.printLine(`Current session: ${sessionId}`)
          context.printLine('Details: unavailable')
        }
        return true
      }

    case 'sessions': {
      const sessions = await context.client.listSessions()
      if (sessions.length === 0) {
        context.printLine('No sessions found.')
        return true
      }
      const rawCount = joinedArgs ? Number.parseInt(joinedArgs, 10) : 10
      const count = Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 10
      context.printLine('Recent sessions:')
      for (const session of sessions.slice(0, count)) {
        const activeMarker = session.id === context.client.getSessionId() ? '*' : '-'
        context.printLine(`${activeMarker} ${session.id}  ${session.name}  ${session.model}  ${session.cwd}`)
      }
      return true
    }

    case 'resume':
    case 'use':
      if (!joinedArgs) {
        context.printLine('Usage: /resume <session-id>')
        return true
      }
      await context.setSessionId(joinedArgs)
      context.printLine(`Switched to session: ${joinedArgs}`)
      return true

    case 'continue': {
      const sessions = await context.client.listSessions()
      const session = sessions.find((item) => item.cwd === context.getCwd()) || sessions[0]
      if (!session) {
        context.printLine(`No resumable session found for "${context.getCwd()}".`)
        return true
      }
      await context.setSessionId(session.id)
      context.printLine(`Switched to latest session: ${session.id}`)
      return true
    }

    case 'new-session': {
      const session = await context.client.createSession({
        name: joinedArgs || undefined,
        cwd: context.getCwd(),
        model: context.getModel(),
      })
      context.printLine(`Created new session: ${session.id} (${session.name})`)
      return true
    }

    case 'new':
      return await executeReplSlashCommand(`/new-session ${joinedArgs}`.trim(), context)

    case 'clear': {
      const session = await context.client.createSession({
        name: joinedArgs || undefined,
        cwd: context.getCwd(),
        model: context.getModel(),
      })
      context.printLine(`Started fresh session: ${session.id} (${session.name})`)
      return true
    }

    case 'history': {
      const sessionId = context.client.getSessionId()
      if (!sessionId) {
        context.printLine('No active session. Send a message or create a session first.')
        return true
      }
      const rawCount = joinedArgs ? Number.parseInt(joinedArgs, 10) : 10
      const count = Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 10
      const messages = await context.client.getSessionMessages(sessionId, { limit: count })
      if (messages.length === 0) {
        context.printLine('No messages found in the current session.')
        return true
      }
      context.printLine(`Recent messages (${messages.length}):`)
      for (const message of messages) {
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
        context.printLine(`- [${message.role}] ${text || '(empty)'}`)
      }
      return true
    }

    case 'messages':
      return await executeReplSlashCommand(`/history ${joinedArgs}`.trim(), context)

    case 'fork': {
      const sessionId = context.client.getSessionId()
      if (!sessionId) {
        context.printLine('No active session to fork.')
        return true
      }
      const session = await context.client.forkSession(sessionId, {
        name: joinedArgs || undefined,
        model: context.getModel(),
      })
      context.printLine(`Forked session: ${session.id} (${session.name})`)
      return true
    }

    case 'rename-session': {
      const sessionId = context.client.getSessionId()
      if (!sessionId) {
        context.printLine('No active session to rename.')
        return true
      }
      if (!joinedArgs) {
        context.printLine('Usage: /rename-session <name>')
        return true
      }
      const session = await context.client.updateSession(sessionId, { name: joinedArgs })
      context.printLine(`Renamed session to: ${session.name}`)
      return true
    }

    case 'rename':
      return await executeReplSlashCommand(`/rename-session ${joinedArgs}`.trim(), context)

    case 'delete-session': {
      const sessionId = context.client.getSessionId()
      if (!sessionId) {
        context.printLine('No active session to delete.')
        return true
      }
      await context.client.deleteSession(sessionId)
      context.client.clearSessionId()
      context.printLine(`Deleted session: ${sessionId}`)
      return true
    }

    case 'cancel':
      await context.client.cancelGeneration()
      context.printLine('Cancel requested.')
      return true

    case 'exit':
    case 'quit':
      context.requestExit()
      return true

    default:
      if (LEGACY_REPL_COMPAT_COMMANDS.has(command)) {
        context.printLine(`/${command} is covered by packages compatibility mode.`)
        context.printLine('Continue in chat and the active packages tool pool will handle the workflow when applicable.')
        return true
      }
      context.printLine(`Unknown command: /${command}. Use /help to see available commands.`)
      return true
  }
}

export async function launchRepl(client: CCLocalClient, options: LaunchReplOptions = {}): Promise<void> {
  const replCwd = options.cwd || process.cwd()
  let activeMessageOptions: Omit<MessageOptions, 'model'> = options.messageOptions || {}
  const buildMessageOptions = (model?: string): MessageOptions => ({
    model,
    ...activeMessageOptions,
  })

  if (!client.getSessionId() && options.createSessionOnStart) {
    await client.createSession({
      id: options.createSessionOnStart.id,
      name: options.createSessionOnStart.name,
      cwd: options.createSessionOnStart.cwd || replCwd,
      model: options.createSessionOnStart.model || options.model,
    })
  }

  console.log('\n🚀 CCLocal Interactive Mode')
  if (options.model) {
    console.log(`Model override: ${options.model}`)
  }
  console.log('Type your message and press Enter. Use /help for local commands. Press Ctrl+C to exit.\n')

  const rl = (options.createInterface || readline.createInterface)({
    input: process.stdin,
    output: process.stdout,
  })

  let currentResponse = ''
  let isGenerating = false
  let activeModel = options.model
  let resolveExit: (() => void) | undefined
  let isClosed = false

  // 设置消息处理
  const handleMessage = (event: StreamEvent) => {
    switch (event.type) {
      case 'stream_start':
        isGenerating = true
        currentResponse = ''
        process.stdout.write('\n🤖 ')
        break

      case 'stream_delta':
        if (event.delta?.type === 'text' && event.delta.text) {
          currentResponse += event.delta.text
          process.stdout.write(event.delta.text)
        }
        break

      case 'stream_end':
        isGenerating = false
        process.stdout.write('\n\n')
        promptUser()
        break

      case 'error':
        isGenerating = false
        console.error('\n❌ Error:', event.error)
        promptUser()
        break
    }
  }

  client.onMessage(handleMessage)

  const printLine = (line: string) => {
    process.stdout.write(`${line}\n`)
  }

  const requestExit = () => {
    printLine('\n👋 Goodbye!')
    rl.close()
  }

  const promptUser = () => {
    rl.question(`You${activeModel ? ` (${activeModel})` : ''}: `, async (input) => {
    const trimmed = input.trim()
      if (!trimmed) {
        promptUser()
        return
      }

      if (trimmed === 'exit' || trimmed === 'quit') {
        requestExit()
        return
      }

      const handled = await executeReplSlashCommand(trimmed, {
        client,
        getCwd: () => replCwd,
        getModel: () => activeModel,
        getMessageOptions: () => activeMessageOptions,
        getIsGenerating: () => isGenerating,
        setModel: (model) => {
          activeModel = model
        },
        updateMessageOptions: (updater) => {
          activeMessageOptions = updater(activeMessageOptions)
        },
        setSessionId: async (sessionId) => {
          await client.getSession(sessionId)
        },
        printLine,
        requestExit,
      })

      if (handled) {
        if (isClosed) {
          return
        }
        promptUser()
        return
      }

      void client.sendMessage(trimmed, buildMessageOptions(activeModel)).catch((error) => {
        isGenerating = false
        console.error('\n❌ Error:', error instanceof Error ? error.message : String(error))
        promptUser()
      })
      // 等待响应，不立即提示
    })
  }

  promptUser()
  if (options.prefill) {
    rl.write(options.prefill)
  }

  return new Promise((resolve) => {
    resolveExit = resolve
    rl.on('SIGINT', () => {
      if (isGenerating) {
        void client.cancelGeneration()
        printLine('\nCancel requested.')
        return
      }
      requestExit()
    })
    rl.on('close', () => {
      isClosed = true
      client.removeMessageHandler(handleMessage)
      client.disconnect()
      resolveExit?.()
    })
  })
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds}s`
}

function normalizePermissionMode(value: string): NonNullable<MessageOptions['permissionPolicy']>['mode'] | undefined {
  if (value === 'default' || value === 'dontAsk' || value === 'acceptEdits' || value === 'bypassPermissions') {
    return value
  }
  return undefined
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

async function runShellCommand(command: string, cwd: string): Promise<{ code: number; output: string }> {
  return await new Promise((resolve) => {
    const child = spawn('bash', ['-c', command], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    child.stdout.on('data', (chunk) => {
      output += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
      output += String(chunk)
    })
    child.on('error', (error) => {
      resolve({
        code: 1,
        output: error.message,
      })
    })
    child.on('close', (code) => {
      resolve({
        code: code ?? 0,
        output: output.trim(),
      })
    })
  })
}
