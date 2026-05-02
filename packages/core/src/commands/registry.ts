/**
 * CommandRegistry - 斜杠命令注册表
 *
 * 为 packages 架构提供与 UI 无关的命令注册和查找能力。
 * 支持 prompt 命令（展开为模型文本）和 local 命令（执行本地逻辑）。
 * JSX 渲染命令保留在 CLI 层，不进入 core。
 */

import type { ToolContext } from '@cclocal/shared'

// ─── 命令类型 ─────────────────────────────────────────────────

export type CommandAvailability = 'always' | 'project' | 'remote'

export interface CommandBase {
  name: string
  description: string
  aliases?: string[]
  argumentHint?: string
  availability?: CommandAvailability
  isHidden?: boolean
}

/** 展开为模型文本的命令 */
export interface PromptCommand extends CommandBase {
  type: 'prompt'
  getPrompt(args: string, context: CommandContext): Promise<CommandPromptResult>
}

/** 执行本地逻辑的命令 */
export interface LocalCommand extends CommandBase {
  type: 'local'
  execute(args: string, context: CommandContext): Promise<LocalCommandResult>
}

export type Command = PromptCommand | LocalCommand

export interface CommandContext {
  cwd: string
  sessionId: string
  abortSignal?: AbortSignal
  onProgress?: (message: string) => void
}

export interface CommandPromptResult {
  content: Array<{ type: 'text'; text: string }>
  preventModelInvocation?: boolean
}

export interface LocalCommandResult {
  text?: string
  preventModelInvocation?: boolean
}

// ─── 注册表 ──────────────────────────────────────────────────

export class CommandRegistry {
  private commands = new Map<string, Command>()

  register(command: Command): void {
    if (this.commands.has(command.name)) {
      throw new Error(`Command "/${command.name}" already registered`)
    }
    this.commands.set(command.name, command)
    for (const alias of command.aliases ?? []) {
      if (!this.commands.has(alias)) {
        this.commands.set(alias, command)
      }
    }
  }

  unregister(name: string): void {
    const command = this.commands.get(name)
    if (!command) return
    this.commands.delete(command.name)
    for (const alias of command.aliases ?? []) {
      if (this.commands.get(alias) === command) {
        this.commands.delete(alias)
      }
    }
  }

  get(name: string): Command | undefined {
    return this.commands.get(name)
  }

  getAll(): Command[] {
    const seen = new Set<string>()
    const unique: Command[] = []
    for (const cmd of this.commands.values()) {
      if (!seen.has(cmd.name)) {
        seen.add(cmd.name)
        unique.push(cmd)
      }
    }
    return unique
  }

  has(name: string): boolean {
    return this.commands.has(name)
  }

  clear(): void {
    this.commands.clear()
  }

  /** 注册一批内置命令 */
  registerDefaults(): void {
    this.register({
      type: 'local',
      name: 'help',
      description: 'Show help and available commands',
      aliases: ['?'],
      async execute(_args, _context) {
        return {
          text: 'Use /help in the REPL for the full command list.',
        }
      },
    })

    this.register({
      type: 'local',
      name: 'clear',
      description: 'Clear the conversation and start fresh',
      aliases: ['reset', 'new'],
      async execute(_args, _context) {
        return { preventModelInvocation: true }
      },
    })

    this.register({
      type: 'local',
      name: 'exit',
      description: 'Exit the REPL',
      aliases: ['quit'],
      async execute(_args, _context) {
        return { preventModelInvocation: true }
      },
    })

    this.register({
      type: 'local',
      name: 'model',
      description: 'Show or set the active model',
      argumentHint: '<name|reset>',
      async execute(args, _context) {
        if (!args) {
          return { text: 'Current model: (set at startup)' }
        }
        return { text: `Model cannot be changed at runtime. Use --model flag.` }
      },
    })

    this.register({
      type: 'local',
      name: 'permissions',
      description: 'Show or set permission mode',
      argumentHint: '<mode>',
      aliases: ['permission'],
      async execute(args, _context) {
        if (!args) {
          return { text: 'Current permission mode: (set at startup)' }
        }
        const validModes = ['default', 'dontAsk', 'acceptEdits', 'bypassPermissions']
        if (validModes.includes(args)) {
          return { text: `Permission mode set to: ${args}` }
        }
        return { text: `Invalid mode. Use: ${validModes.join(', ')}` }
      },
    })

    this.register({
      type: 'local',
      name: 'tools',
      description: 'List available tools',
      async execute(_args, _context) {
        return { text: 'Use /tools in the REPL for the tool list.' }
      },
    })

    this.register({
      type: 'local',
      name: 'mcp',
      description: 'List MCP servers or show one',
      argumentHint: '[name|connect <name>|disconnect <name>]',
      async execute(args, _context) {
        if (!args) {
          return { text: 'Use /mcp in the REPL for MCP server management.' }
        }
        return { text: `MCP: ${args}` }
      },
    })

    this.register({
      type: 'local',
      name: 'session',
      description: 'Show current session info',
      async execute(_args, _context) {
        return { text: 'Use /session in the REPL for session details.' }
      },
    })

    this.register({
      type: 'local',
      name: 'history',
      description: 'Show recent messages',
      argumentHint: '[count]',
      async execute(args, _context) {
        const count = parseInt(args, 10) || 5
        return { text: `Showing last ${count} messages.` }
      },
    })

    this.register({
      type: 'local',
      name: 'cancel',
      description: 'Cancel current generation',
      async execute(_args, _context) {
        return { preventModelInvocation: true }
      },
    })

    this.register({
      type: 'prompt',
      name: 'compact',
      description: 'Compact the conversation context',
      async getPrompt(_args, _context) {
        return {
          content: [{ type: 'text', text: 'Please summarize the conversation so far in a concise way, preserving all key context, decisions, and code changes.' }],
        }
      },
    })

    this.register({
      type: 'prompt',
      name: 'doctor',
      description: 'Run system diagnostics',
      async getPrompt(_args, _context) {
        return {
          content: [{ type: 'text', text: 'Please check the system environment, configuration, and connection status. Report any issues found.' }],
        }
      },
    })

    // ── HIGH priority commands ──────────────────────────────────────

    this.register({
      type: 'local',
      name: 'config',
      description: 'Show or set configuration values',
      argumentHint: '[key[=value]]',
      aliases: ['setting', 'settings'],
      async execute(args, _context) {
        if (!args) {
          return { text: 'Current configuration:\n  (use /config <key>=<value> to set)' }
        }
        const eq = args.indexOf('=')
        if (eq > 0) {
          const key = args.slice(0, eq).trim()
          const value = args.slice(eq + 1).trim()
          return { text: `Set ${key} = ${value}` }
        }
        return { text: `Config: ${args}` }
      },
    })

    this.register({
      type: 'local',
      name: 'cost',
      description: 'Show session cost and usage stats',
      async execute(_args, _context) {
        return { text: 'Use /stats for detailed usage info.' }
      },
    })

    this.register({
      type: 'local',
      name: 'diff',
      description: 'Show recent file diffs',
      argumentHint: '[file_path]',
      async execute(args, _context) {
        if (!args) {
          return { text: 'Usage: /diff <file_path> — shows changes made to the file in this session.' }
        }
        return { text: `Diff for: ${args}` }
      },
    })

    this.register({
      type: 'local',
      name: 'resume',
      description: 'Resume a previous session',
      argumentHint: '[session_id]',
      aliases: ['continue'],
      async execute(args, _context) {
        if (!args) {
          return { text: 'Usage: /resume <session_id> — use /sessions to list available sessions.' }
        }
        return { text: `Resuming session: ${args}` }
      },
    })

    this.register({
      type: 'local',
      name: 'rewind',
      description: 'Undo the last message exchange',
      argumentHint: '[count]',
      async execute(args, _context) {
        const count = parseInt(args, 10) || 1
        return { text: `Rewinding ${count} message(s).` }
      },
    })

    this.register({
      type: 'local',
      name: 'stats',
      description: 'Show session statistics and cost',
      aliases: ['usage'],
      async execute(_args, _context) {
        return { text: 'Session stats:\n  (use /stats in native REPL for live data)' }
      },
    })

    this.register({
      type: 'local',
      name: 'agents',
      description: 'List available agent types',
      async execute(_args, _context) {
        return { text: 'Available agents: explore, plan (use /agents <type> to switch)' }
      },
    })

    this.register({
      type: 'prompt',
      name: 'plan',
      description: 'Switch to plan mode (read-only tools)',
      async getPrompt(_args, _context) {
        return {
          content: [{ type: 'text', text: 'You are now in plan mode. Only read-only tools are available. Analyze the codebase and create a detailed plan before making changes.' }],
        }
      },
    })

    this.register({
      type: 'prompt',
      name: 'commit',
      description: 'Generate a commit from recent changes',
      async getPrompt(_args, _context) {
        return {
          content: [{ type: 'text', text: 'Review the recent changes (file edits, new files) and generate an appropriate git commit. Stage the relevant files and create a meaningful commit message.' }],
        }
      },
    })

    this.register({
      type: 'prompt',
      name: 'review',
      description: 'Review recent code changes',
      argumentHint: '[file_path]',
      async getPrompt(args, _context) {
        const target = args || 'the recent changes'
        return {
          content: [{ type: 'text', text: `Please review ${target}. Focus on: correctness, potential bugs, security concerns, performance issues, and adherence to project conventions. Provide specific, actionable feedback.` }],
        }
      },
    })

    // ── MEDIUM priority commands ─────────────────────────────────────

    this.register({
      type: 'local',
      name: 'branch',
      description: 'Show or switch git branch',
      argumentHint: '[name]',
      async execute(args, _context) {
        if (!args) {
          return { text: 'Current branch: (checked via git)' }
        }
        return { text: `Switch to branch: ${args}` }
      },
    })

    this.register({
      type: 'local',
      name: 'context',
      description: 'Show context window usage',
      async execute(_args, _context) {
        return { text: 'Context: (use /stats for details)' }
      },
    })

    this.register({
      type: 'local',
      name: 'hooks',
      description: 'List or manage hooks',
      argumentHint: '[list|enable <name>|disable <name>]',
      async execute(args, _context) {
        if (!args || args === 'list') {
          return { text: 'Hooks: (none configured)' }
        }
        return { text: `Hooks: ${args}` }
      },
    })

    this.register({
      type: 'local',
      name: 'memory',
      description: 'Show or edit project memory',
      argumentHint: '[show|add <text>]',
      async execute(args, _context) {
        if (!args || args === 'show') {
          return { text: 'Memory: (check CLAUDE.md and .claude/ directory)' }
        }
        return { text: `Memory: ${args}` }
      },
    })

    this.register({
      type: 'local',
      name: 'plugin',
      description: 'List or manage plugins',
      argumentHint: '[list|add <dir>|remove <name>]',
      aliases: ['plugins'],
      async execute(args, _context) {
        if (!args || args === 'list') {
          return { text: 'Plugins: (none loaded)' }
        }
        return { text: `Plugin: ${args}` }
      },
    })

    this.register({
      type: 'local',
      name: 'sessions',
      description: 'List saved sessions',
      async execute(_args, _context) {
        return { text: 'Sessions: (use /resume <id> to continue)' }
      },
    })

    this.register({
      type: 'local',
      name: 'skills',
      description: 'List available skills',
      async execute(_args, _context) {
        return { text: 'Skills: (use /<skill-name> to invoke)' }
      },
    })

    this.register({
      type: 'local',
      name: 'vim',
      description: 'Toggle vim keybindings mode',
      async execute(_args, _context) {
        return { text: 'Vim mode: (toggle readline vim mode)' }
      },
    })

    this.register({
      type: 'prompt',
      name: 'init',
      description: 'Initialize a new project with CLAUDE.md',
      async getPrompt(_args, _context) {
        return {
          content: [{ type: 'text', text: 'Please create a CLAUDE.md file for this project. Analyze the codebase structure, identify key patterns, and document the project conventions, build commands, and architecture decisions.' }],
        }
      },
    })
  }
}

// ─── 单例 ────────────────────────────────────────────────────

export const commandRegistry = new CommandRegistry()
