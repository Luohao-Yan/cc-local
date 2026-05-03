/**
 * Native REPL — 直接使用 @cclocal/core 的 QueryEngine + SessionStore
 *
 * 增强版：支持 Markdown 渲染、语法高亮、Diff 显示、多行输入、
 * Tab 补全、动态状态栏、Auto/Plan 模式切换、Escape 取消、
 * 增强权限弹窗（含 diff 预览和"不再询问"选项）。
 */

import * as readline from 'readline'
import { randomUUID } from 'crypto'
import chalk from 'chalk'
import type { Message, StreamEvent, PermissionPolicy, Tool } from '@cclocal/shared'
import { QueryEngine, type QueryEngineOptions, type QueryResult } from '@cclocal/core'
import { getSessionStore, mcpManager, toolRegistry, commandRegistry } from '@cclocal/core'
import { decideToolPermission, filterToolsByPermission, type PermissionMode } from '@cclocal/core'

import {
  renderMarkdown,
  renderStatusLine,
  renderPrompt,
  spinnerFrame,
} from './native/renderer.js'
import { renderToolUse, renderToolResult } from './native/toolRenderer.js'
import { enableBracketedPaste, disableBracketedPaste } from './native/multilineInput.js'
import { askPermissionEnhanced } from './native/permissionDialog.js'
import { createCompleter } from './native/completer.js'
import { createModeManager, type InteractionMode } from './native/modeManager.js'

// ─── Legacy 命令兼容列表 ──────────────────────────────────────────

const LEGACY_REPL_COMPAT_COMMANDS = new Set([
  'add-dir', 'advisor', 'agents', 'agents-platform', 'assistant',
  'at_a_glance', 'bridge-kick', 'brief', 'btw', 'buddy',
  'cc_team_improvements', 'checking', 'color', 'confirm', 'fast',
  'friction_analysis', 'fun_ending', 'heapdump', 'init-verifiers',
  'insights', 'install', 'install-github-app', 'install-slack-app',
  'interaction_style', 'keybindings', 'model_behavior_improvements',
  'passes', 'pr-comments', 'project_areas', 'remote-control',
  'remote-env', 'sandbox', 'statusline', 'stickers', 'suggestions',
  'think-back', 'thinkback-play', 'ultraplan', 'uploading', 'voice',
  'web-setup', 'what_works',
])

// ─── Options ────────────────────────────────────────────────────────

interface NativeReplOptions {
  model: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  maxTurns?: number
  enabledTools?: string[]
  cwd?: string
  prefill?: string
  apiKey?: string
  baseUrl?: string
  permissionMode?: PermissionMode
  sessionId?: string
  sessionName?: string
  ide?: boolean
  chrome?: boolean | undefined
  worktree?: string | boolean | undefined
  tmux?: boolean | string | undefined
  createInterface?: typeof readline.createInterface
}

// ─── Main entry ─────────────────────────────────────────────────────

export async function launchNativeRepl(
  options: NativeReplOptions
): Promise<void> {
  const {
    model,
    systemPrompt,
    temperature,
    maxTokens,
    maxTurns,
    enabledTools,
    cwd = process.cwd(),
    prefill,
    apiKey,
    baseUrl,
    permissionMode: initialPermissionMode = 'default',
    sessionId,
    sessionName,
    ide: ideFlag = false,
    chrome: chromeFlag = undefined,
    worktree: worktreeFlag = undefined,
    tmux: tmuxFlag = undefined,
    createInterface = readline.createInterface,
  } = options

  // ─── Worktree setup ──────────────────────────────────
  let effectiveCwd = cwd
  if (worktreeFlag !== undefined && worktreeFlag !== false) {
    const worktreeName = typeof worktreeFlag === 'string' ? worktreeFlag : undefined
    const tmuxEnabled = tmuxFlag !== undefined && tmuxFlag !== false
    const { setupWorktree } = await import('./worktreeIntegration.js')
    const wtResult = await setupWorktree(worktreeName, tmuxEnabled)
    if (wtResult.error) {
      console.error(`\n❌ ${wtResult.error}`)
      process.exit(1)
    }
    if (wtResult.created) {
      effectiveCwd = wtResult.effectiveCwd
    }
  }

  // ─── 初始化 SessionStore ──────────────────────────────
  const store = getSessionStore()
  let currentSessionId = sessionId ?? ''

  if (!currentSessionId) {
    const id = randomUUID()
    store.createSession({
      id,
      name: sessionName || `Session ${new Date().toLocaleString()}`,
      cwd: effectiveCwd,
      model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    currentSessionId = id
  }

  // ─── 会话消息历史 ──────────────────────────────────────
  let messages: Message[] = store.getMessages(currentSessionId)

  // ─── Mode manager ──────────────────────────────────────
  const modeManager = createModeManager(initialPermissionMode)

  // ─── 权限策略 ──────────────────────────────────────────
  const permissionPolicy: PermissionPolicy = {
    mode: initialPermissionMode,
    allowedTools: [],
    blockedTools: [],
  }

  // ─── 持久权限规则（"不再询问"） ──────────────────────────
  const persistentAllowed = new Map<string, Set<string>>() // toolName → Set<pattern>

  function isPersistentlyAllowed(toolName: string, input: Record<string, unknown>): boolean {
    const patterns = persistentAllowed.get(toolName)
    if (!patterns) return false
    const inputStr = JSON.stringify(input)
    for (const pattern of patterns) {
      if (inputStr.includes(pattern)) return true
    }
    return false
  }

  function addPersistentRule(toolName: string, input: Record<string, unknown>): void {
    if (!persistentAllowed.has(toolName)) {
      persistentAllowed.set(toolName, new Set())
    }
    // Extract primary identifier from input for the rule
    const primary = String(input.file_path ?? input.command ?? input.pattern ?? '')
    if (primary) {
      persistentAllowed.get(toolName)!.add(primary)
    }
  }

  // ─── 同步 MCP 工具 ────────────────────────────────────
  const mcpServers = mcpManager.listServers()
  for (const server of mcpServers) {
    if (server.status === 'connected') {
      try {
        await mcpManager.connectServer(server.name)
      } catch {
        // 已经连接或无法连接，跳过
      }
    }
  }

  // ─── IDE 集成 ────────────────────────────────────────
  let ideMetadataString = ''
  if (ideFlag) {
    const { detectAndConnectIDE } = await import('./ideIntegration.js')
    const ideResult = await detectAndConnectIDE(true, mcpManager)
    if (ideResult.ide) {
      ideMetadataString = ideResult.metadataString
    }
  }

  // ─── Chrome 集成 ──────────────────────────────────────
  let chromeSystemPrompt = ''
  let chromeEnabled = false
  if (chromeFlag !== false) {
    try {
      const { setupChromeIntegration } = await import('./chromeIntegration.js')
      const chromeResult = await setupChromeIntegration(chromeFlag, mcpManager)
      if (chromeResult.enabled) {
        chromeSystemPrompt = chromeResult.systemPrompt
        chromeEnabled = true
      }
    } catch (err) {
      if (chromeFlag === true) {
        console.error(`\n❌ Chrome integration failed: ${err instanceof Error ? err.message : String(err)}`)
        process.exit(1)
      }
    }
  }

  // ─── 注册默认命令 ─────────────────────────────────────
  commandRegistry.registerDefaults()

  // ─── 收集工具 ─────────────────────────────────────────
  const { ALL_TOOL_ADAPTERS } = await import('../bridge/toolAdapters.js')
  toolRegistry.registerBridgeAdapters(ALL_TOOL_ADAPTERS)
  const allTools: Tool[] = toolRegistry.getAll()

  // ─── 创建 QueryEngine ─────────────────────────────────
  const effectiveSystemPrompt = [
    systemPrompt,
    ideMetadataString ? `\n<ide_context>\n${ideMetadataString}\n</ide_context>` : '',
    chromeSystemPrompt,
  ].filter(Boolean).join('\n') || undefined

  const engine = new QueryEngine({
    model,
    systemPrompt: effectiveSystemPrompt,
    temperature,
    maxTokens,
    maxTurns,
    enabledTools,
    tools: allTools,
    apiKey,
    baseUrl,
    permissionPolicy,
    onPermissionCheck: async (toolName, input, reason) => {
      const inputObj = input as Record<string, unknown>
      // Check persistent rules first
      if (isPersistentlyAllowed(toolName, inputObj)) return true
      // In auto mode, auto-approve
      if (modeManager.getState().mode === 'auto') return true
      // In plan mode, deny non-read-only tools
      if (modeManager.getState().mode === 'plan') {
        const readOnlyTools = new Set(['file_read', 'glob', 'grep', 'web_fetch', 'web_search', 'ask_user_question'])
        if (!readOnlyTools.has(toolName)) return false
      }
      // Show enhanced dialog
      const choice = await askPermissionEnhanced(rl, toolName, inputObj, reason)
      if (choice.dontAskAgain && choice.allowed) {
        addPersistentRule(toolName, inputObj)
      }
      return choice.allowed
    },
  })

  // ─── 交互状态 ──────────────────────────────────────────
  let isGenerating = false
  let isExiting = false
  let spinnerTick = 0
  let spinnerTimer: ReturnType<typeof setInterval> | null = null

  // ─── 创建 readline ────────────────────────────────────
  const completer = createCompleter(commandRegistry, effectiveCwd)
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    completer,
  })

  // ─── Enable bracketed paste mode ──────────────────────
  enableBracketedPaste()

  // ─── Banner ──────────────────────────────────────────
  const bannerLines = [
    '',
    `${chalk.bold.cyan('CCLocal Native REPL')} ${chalk.dim('v1.0.0')}`,
    `${chalk.dim('Model:')} ${chalk.white(model)}`,
    `${chalk.dim('Session:')} ${currentSessionId.slice(0, 8)}...`,
    `${chalk.dim('Tools:')} ${allTools.length} available`,
  ]

  if (ideMetadataString) {
    const ideServer = mcpManager.getServer('ide')
    bannerLines.push(`${chalk.dim('IDE:')} connected (${ideServer?.status ?? 'unknown'})`)
  } else if (ideFlag) {
    bannerLines.push(`${chalk.dim('IDE:')} not detected`)
  }

  if (chromeEnabled) {
    const chromeServer = mcpManager.getServer('claude-in-chrome')
    bannerLines.push(`${chalk.dim('Chrome:')} connected (${chromeServer?.status ?? 'unknown'})`)
  }

  // Tmux
  try {
    const { getTmuxInfo } = await import('./tmuxIntegration.js')
    const tmuxInfo = getTmuxInfo()
    if (tmuxInfo) {
      const sessionPart = tmuxInfo.sessionName ? ` (${tmuxInfo.sessionName})` : ''
      const conflictPart = tmuxInfo.prefixConflicts ? ' [prefix conflicts]' : ''
      bannerLines.push(`${chalk.dim('tmux:')} active${sessionPart} prefix=${tmuxInfo.prefix}${conflictPart}`)
    }
  } catch {}

  bannerLines.push('')
  bannerLines.push(chalk.dim('Type your message and press Enter. /help for commands. Ctrl+C or Escape to cancel.\n'))

  console.log(bannerLines.join('\n'))

  // ─── Status line update ────────────────────────────────
  function updateStatusLine(): void {
    const state = modeManager.getState()
    const statusText = renderStatusLine({
      model,
      mode: state.mode,
      tokensUsed: state.tokensUsed,
      tokensLimit: state.tokensLimit,
      costUsd: state.costUsd,
      cwd: effectiveCwd,
    })
    // Write status line at bottom of terminal
    // Use ANSI escape to save position, move to bottom row, write, restore
    if (process.stdout.isTTY && process.stdout.rows) {
      process.stdout.write(`\x1b[s\x1b[${process.stdout.rows};1H\x1b[K${statusText}\x1b[u`)
    }
  }

  // ─── Spinner for in-progress tool calls ─────────────────
  function startSpinner(): void {
    if (spinnerTimer) return
    spinnerTick = 0
    spinnerTimer = setInterval(() => {
      spinnerTick++
      // Update spinner character in place
      process.stdout.write(`\r${spinnerFrame(spinnerTick)} Working...`)
    }, 80)
  }

  function stopSpinner(): void {
    if (spinnerTimer) {
      clearInterval(spinnerTimer)
      spinnerTimer = null
      process.stdout.write('\r\x1b[K') // Clear spinner line
    }
  }

  // ─── 流式输出处理 ──────────────────────────────────────
  let inToolCall = false
  let currentToolName = ''
  let currentToolInput: Record<string, unknown> = {}

  const handleStreamEvent = (event: StreamEvent): void => {
    switch (event.type) {
      case 'stream_start':
        isGenerating = true
        stopSpinner()
        process.stdout.write('\n🤖 ')
        break

      case 'stream_delta':
        if (event.delta?.type === 'text' && event.delta.text) {
          process.stdout.write(event.delta.text)
        } else if (event.delta?.type === 'thinking' && event.delta.thinking) {
          process.stdout.write(chalk.dim(`\n  💭 ${event.delta.thinking}`))
        }
        break

      case 'tool_call':
        if (event.toolCall) {
          currentToolName = event.toolCall.name
          currentToolInput = event.toolCall.input as Record<string, unknown>
          const line = renderToolUse(currentToolName, currentToolInput, false)
          process.stdout.write(`\n${line}`)
          inToolCall = true
          startSpinner()
        }
        break

      case 'stream_end':
        isGenerating = false
        inToolCall = false
        stopSpinner()
        // Render final assistant output as markdown
        process.stdout.write('\n\n')
        modeManager.incrementTurn()
        updateStatusLine()
        promptUser()
        break

      case 'error':
        isGenerating = false
        inToolCall = false
        stopSpinner()
        console.error(`\n${chalk.red('❌ Error:')} ${event.error}`)
        promptUser()
        break
    }
  }

  // ─── slash command 处理 ────────────────────────────────
  const handleSlashCommand = async (input: string): Promise<boolean> => {
    const trimmed = input.trim()
    if (!trimmed.startsWith('/')) return false

    const [commandName, ...args] = trimmed.slice(1).split(/\s+/)
    const joinedArgs = args.join(' ').trim()

    // Built-in commands that need direct REPL state access
    switch (commandName) {
      case 'clear': {
        const newId = randomUUID()
        store.createSession({
          id: newId,
          name: `Session ${new Date().toLocaleString()}`,
          cwd: effectiveCwd,
          model,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        currentSessionId = newId
        messages = []
        printLine(chalk.green(`New session: ${newId.slice(0, 8)}...`))
        return true
      }

      case 'cancel':
        if (isGenerating) {
          engine.cancel()
          printLine(chalk.yellow('Cancel requested.'))
        } else {
          printLine(chalk.dim('Not generating.'))
        }
        return true

      case 'exit':
      case 'quit':
        requestExit()
        return true

      case 'auto':
        modeManager.setMode('auto')
        permissionPolicy.mode = 'auto'
        printLine(chalk.green('⚡ Auto mode enabled — tools will be auto-approved.'))
        updateStatusLine()
        return true

      case 'plan':
        modeManager.setMode('plan')
        permissionPolicy.mode = 'plan'
        printLine(chalk.yellow('📋 Plan mode enabled — only read-only tools allowed.'))
        updateStatusLine()
        return true

      case 'default':
        modeManager.setMode('default')
        permissionPolicy.mode = initialPermissionMode
        printLine(chalk.white('Mode reset to default — tools require approval.'))
        updateStatusLine()
        return true

      case 'cost':
      case 'stats': {
        const state = modeManager.getState()
        printLine([
          `${chalk.bold('Session stats:')}`,
          `  Turns: ${state.turnCount}`,
          `  Tokens: ${state.tokensUsed.toLocaleString()} / ${state.tokensLimit.toLocaleString()}`,
          `  Cost: $${state.costUsd.toFixed(4)}`,
        ].join('\n'))
        return true
      }
    }

    // Delegate to CommandRegistry
    const cmd = commandRegistry.get(commandName)
    if (!cmd) {
      if (LEGACY_REPL_COMPAT_COMMANDS.has(commandName)) {
        printLine(chalk.dim(`/${commandName} is a legacy UI command not available in native REPL.`))
        return true
      }
      return false
    }

    const cmdContext = { cwd: effectiveCwd, sessionId: currentSessionId }

    if (cmd.type === 'local') {
      const result = await cmd.execute(joinedArgs, cmdContext)
      if (result.text) printLine(result.text)
      return !result.preventModelInvocation
    }

    if (cmd.type === 'prompt') {
      const result = await cmd.getPrompt(joinedArgs, cmdContext)
      const userMessage: Message = {
        id: randomUUID(),
        role: 'user',
        content: result.content,
        timestamp: Date.now(),
      }
      messages.push(userMessage)
      store.addMessage(userMessage, currentSessionId)
      return !result.preventModelInvocation
    }

    return true
  }

  // ─── 工具方法 ─────────────────────────────────────────
  const printLine = (line: string) => {
    process.stdout.write(`${line}\n`)
  }

  const requestExit = () => {
    isExiting = true
    disableBracketedPaste()
    printLine(`\n${chalk.bold('👋 Goodbye!')}`)
    rl.close()
  }

  // ─── 交互循环 ─────────────────────────────────────────
  const promptUser = () => {
    if (isGenerating) return
    if (isExiting) return
    const mode = modeManager.getState().mode
    const promptStr = renderPrompt(mode)
    rl.question(promptStr, async (input) => {
      const trimmed = input.trim()
      if (!trimmed) {
        promptUser()
        return
      }

      // 处理 slash commands
      const handled = await handleSlashCommand(trimmed)
      if (handled) {
        if (isGenerating || isExiting) return
        promptUser()
        return
      }

      // 构建用户消息
      const userMessage: Message = {
        id: randomUUID(),
        role: 'user',
        content: [{ type: 'text', text: trimmed }],
        timestamp: Date.now(),
      }

      // 添加到历史
      messages.push(userMessage)
      store.addMessage(userMessage, currentSessionId)

      // 发送查询
      try {
        const result: QueryResult = await engine.query(messages, {
          onStream: handleStreamEvent,
          permissionPolicy,
        })

        // Render assistant message as markdown
        const assistantText = typeof result.message.content === 'string'
          ? result.message.content
          : result.message.content
              .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
              .map(c => c.text)
              .join('\n')

        if (assistantText) {
          process.stdout.write(renderMarkdown(assistantText))
        }

        // 添加助手消息到历史
        messages.push(result.message)
        store.addMessage(result.message, currentSessionId)

        // 更新会话时间戳
        store.updateSession(currentSessionId, { updatedAt: Date.now() })

        // Update token usage if available
        if (result.usage) {
          modeManager.addTokens(result.usage.inputTokens + result.usage.outputTokens)
          if ((result as any).costUsd != null) {
            modeManager.addCost((result as any).costUsd)
          }
        }
      } catch (error) {
        isGenerating = false
        stopSpinner()
        if (error instanceof Error && error.message === 'Query aborted') {
          printLine(chalk.dim('\n(Cancelled)'))
        } else {
          printLine(`\n${chalk.red('❌ Error:')} ${error instanceof Error ? error.message : String(error)}`)
        }
        promptUser()
      }
    })
  }

  promptUser()
  updateStatusLine()

  if (prefill) {
    rl.write(prefill)
  }

  return new Promise((resolve) => {
    rl.on('SIGINT', () => {
      if (isGenerating) {
        engine.cancel()
        stopSpinner()
        printLine(chalk.yellow('\nCancel requested.'))
        return
      }
      requestExit()
    })

    // Handle Escape key for cancellation
    if (process.stdin.isTTY) {
      process.stdin.on('keypress', (_str: string, key: { name: string; sequence: string }) => {
        if (key.name === 'escape' && isGenerating) {
          engine.cancel()
          stopSpinner()
          printLine(chalk.yellow('\nCancel requested.'))
        }
      })
    }

    rl.on('close', () => {
      disableBracketedPaste()
      resolve()
    })
  })
}
