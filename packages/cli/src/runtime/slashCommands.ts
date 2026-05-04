/**
 * Slash Commands for Packages-Native Mode
 *
 * Reuses existing command infrastructure where possible.
 */

import type { NativeBridgeAdapter } from '../bridge/nativeBridgeAdapter.js'
import type { CCLocalClient } from '../client/CCLocalClient.js'

export interface SlashCommandContext {
  adapter?: NativeBridgeAdapter
  client?: CCLocalClient
  sessionId?: string
  cwd: string
  model?: string
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export interface SlashCommandResult {
  type: 'help' | 'clear' | 'rename' | 'model' | 'cwd' | 'resume' | 'branch' | 'exit' | 'unknown' | 'none'
  message?: string
  newName?: string
  model?: string
  cwd?: string
  sessionId?: string
}

export interface SlashCommand {
  name: string
  aliases?: string[]
  description: string
  usage?: string
  action: (ctx: SlashCommandContext, args: string) => Promise<void>
}

/**
 * Available slash commands
 */
export const NATIVE_SLASH_COMMANDS: SlashCommand[] = [
  {
    name: 'help',
    aliases: ['?'],
    description: 'Show available commands',
    action: async () => {
      console.log('\n📚 Available Commands:\n')
      console.log('  /help, /?       - Show this help')
      console.log('  /clear          - Clear conversation history')
      console.log('  /rename <name>  - Rename current session')
      console.log('  /resume <id>    - Resume a previous session')
      console.log('  /branch [name]  - Fork current session')
      console.log('  /model <name>   - Change model')
      console.log('  /cwd <path>     - Change working directory')
      console.log('  /exit, /quit    - Exit the session')
      console.log('')
    },
  },

  {
    name: 'clear',
    description: 'Clear conversation history',
    action: async (ctx) => {
      if (ctx.messages) {
        ctx.messages.length = 0
      }
      console.log('Conversation cleared.')
    },
  },

  {
    name: 'rename',
    description: 'Rename current session',
    usage: '/rename <name>',
    action: async (ctx, args) => {
      const newName = args.trim()
      if (!newName) {
        console.log('Usage: /rename <name>')
        return
      }
      if (ctx.client && ctx.sessionId) {
        await ctx.client.updateSession(ctx.sessionId, { name: newName })
        console.log(`Session renamed to: ${newName}`)
      } else {
        console.log('No active session to rename.')
      }
    },
  },

  {
    name: 'resume',
    description: 'Resume a previous session',
    usage: '/resume <session-id>',
    action: async (ctx, args) => {
      const sessionId = args.trim()
      if (!sessionId) {
        console.log('Usage: /resume <session-id>')
        console.log('Use "sessions list" to see available sessions')
        return
      }
      if (!ctx.client) {
        console.log('Resume requires a server connection. Use --server flag.')
        return
      }
      try {
        const session = await ctx.client.getSession(sessionId)
        const messages = await ctx.client.getSessionMessages(sessionId)
        console.log(`Resumed session: ${session.name || session.id}`)
        console.log(`Messages: ${messages.length}`)
        ctx.sessionId = sessionId
      } catch (error) {
        console.log(`Session not found: ${sessionId}`)
      }
    },
  },

  {
    name: 'branch',
    description: 'Fork current session',
    usage: '/branch [name]',
    action: async (ctx, args) => {
      if (!ctx.client || !ctx.sessionId) {
        console.log('No active session to branch.')
        return
      }
      const name = args.trim() || undefined
      const newSession = await ctx.client.forkSession(ctx.sessionId, { name })
      console.log(`Created branch: ${newSession.id}`)
      ctx.sessionId = newSession.id
    },
  },

  {
    name: 'model',
    description: 'Change model',
    usage: '/model <model-name>',
    action: async (ctx, args) => {
      const model = args.trim()
      if (!model) {
        console.log('Usage: /model <model-name>')
        console.log('Common models: claude-3-5-sonnet, claude-3-opus, claude-3-haiku')
        return
      }
      // Update adapter config
      if (ctx.client && ctx.sessionId) {
        await ctx.client.updateSession(ctx.sessionId, { model })
      }
      ctx.model = model
      console.log(`Model changed to: ${model}`)
    },
  },

  {
    name: 'cwd',
    description: 'Change working directory',
    usage: '/cwd <path>',
    action: async (ctx, args) => {
      const path = args.trim()
      if (!path) {
        console.log('Usage: /cwd <path>')
        return
      }
      ctx.cwd = path
      console.log(`Working directory changed to: ${path}`)
    },
  },

  {
    name: 'exit',
    aliases: ['quit'],
    description: 'Exit the session',
    action: async () => {
      console.log('\n👋 Goodbye!')
      process.exit(0)
    },
  },
]

/**
 * Find a command by name or alias
 */
export function findCommand(input: string): SlashCommand | undefined {
  const name = input.toLowerCase().replace(/^\//, '')
  return NATIVE_SLASH_COMMANDS.find(
    (cmd) => cmd.name === name || cmd.aliases?.includes(name)
  )
}

/**
 * Check if input is a slash command
 */
export function isSlashCommand(input: string): boolean {
  return input.startsWith('/')
}

/**
 * Handle a slash command
 */
export async function handleSlashCommand(
  input: string,
  ctx: SlashCommandContext
): Promise<boolean> {
  if (!isSlashCommand(input)) {
    return false
  }

  const [cmdPart, ...args] = input.split(/\s+/)
  const command = findCommand(cmdPart)

  if (command) {
    await command.action(ctx, args.join(' '))
    return true
  }

  console.log(`Unknown command: ${cmdPart}`)
  console.log('Type /help for available commands')
  return true
}

/**
 * 简化版斜杠命令处理 - 返回结构化结果
 */
export async function handleSlashCommandSimple(
  input: string,
  ctx: { sessionId?: string; cwd: string; model?: string }
): Promise<SlashCommandResult> {
  const [cmdPart, ...args] = input.split(/\s+/)
  const cmd = cmdPart?.toLowerCase().replace(/^\//, '') || ''
  const arg = args.join(' ').trim()

  switch (cmd) {
    case 'help':
    case '?':
      return { type: 'help' }

    case 'clear':
      return { type: 'clear' }

    case 'rename':
      if (!arg) {
        return { type: 'none', message: 'Usage: /rename <name>' }
      }
      return { type: 'rename', newName: arg }

    case 'model':
      if (!arg) {
        return { type: 'model', model: ctx.model }
      }
      return { type: 'model', model: arg }

    case 'cwd':
      if (!arg) {
        return { type: 'cwd', cwd: ctx.cwd }
      }
      return { type: 'cwd', cwd: arg }

    case 'exit':
    case 'quit':
      return { type: 'exit' }

    default:
      return { type: 'unknown', message: `Unknown command: ${cmdPart}` }
  }
}