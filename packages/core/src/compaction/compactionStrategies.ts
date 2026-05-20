/**
 * Custom Compaction Strategy API
 *
 * Allows users to define their own compaction logic beyond the built-in
 * strategies. This is a feature beyond official Claude Code, which only
 * provides fixed compaction strategies.
 *
 * Built-in strategies:
 * - **default**: Balanced approach — summarize old context, keep recent
 * - **aggressive**: Maximize context savings — shorter summaries, more pruning
 * - **conservative**: Preserve detail — longer summaries, keep more context
 * - **code-focused**: Prioritize code blocks — preserve code, compress prose
 *
 * Custom strategies are registered via config:
 * ```json
 * {
 *   "compaction": {
 *     "strategy": "my-custom",
 *     "customStrategies": {
 *       "my-custom": {
 *         "module": "./my-compaction.js",
 *         "shouldCompact": "export function shouldCompact(ctx) { ... }",
 *         "compact": "export async function compact(ctx) { ... }"
 *       }
 *     }
 *   }
 * }
 * ```
 */

import type { Message } from '@cclocal/shared'

// ---- Types ----

export interface CompactionContext {
  /** Current messages in the conversation */
  messages: Message[]
  /** Current estimated token count */
  tokenCount: number
  /** Maximum context tokens for the model */
  maxTokens: number
  /** Number of turns since last compaction */
  turnsSinceLastCompact: number
  /** Model ID */
  model: string
  /** Whether this is a reactive compaction (triggered by 413) */
  isReactive: boolean
}

export interface CompactionResult {
  /** Compacted messages */
  messages: Message[]
  /** Summary of compacted context (shown to model) */
  summary: string
  /** Estimated tokens freed by compaction */
  tokensFreed: number
  /** Whether compaction actually occurred */
  didCompact: boolean
  /** Optional: custom instructions to merge into the compact prompt */
  customInstructions?: string
}

export interface CompactionStrategy {
  /** Unique strategy name */
  name: string
  /** Description for UI display */
  description: string
  /** Determine if compaction should occur */
  shouldCompact(ctx: CompactionContext): boolean
  /** Perform the compaction */
  compact(ctx: CompactionContext): Promise<CompactionResult>
}

// ---- Built-in Strategies ----

export const defaultStrategy: CompactionStrategy = {
  name: 'default',
  description: 'Balanced compaction — summarize old context, keep recent messages',
  shouldCompact(ctx) {
    return ctx.tokenCount > ctx.maxTokens * 0.85
  },
  async compact(ctx) {
    const preserveCount = Math.max(6, Math.ceil(ctx.messages.length * 0.15))
    const oldMessages = ctx.messages.slice(0, -preserveCount)
    const recentMessages = ctx.messages.slice(-preserveCount)

    if (oldMessages.length < 2) {
      return { messages: ctx.messages, summary: '', tokensFreed: 0, didCompact: false }
    }

    const summary = buildBasicSummary(oldMessages)
    const tokensFreed = estimateTokens(oldMessages) - estimateTokens([{ id: 's', role: 'system', content: [{ type: 'text', text: summary }], timestamp: Date.now() }])

    return {
      messages: [
        { id: `compact-summary-${Date.now()}`, role: 'system', content: [{ type: 'text', text: `[Context Summary]\n${summary}` }], timestamp: Date.now() },
        ...recentMessages,
      ],
      summary,
      tokensFreed: Math.max(0, tokensFreed),
      didCompact: true,
    }
  },
}

export const aggressiveStrategy: CompactionStrategy = {
  name: 'aggressive',
  description: 'Maximize context savings — shorter summaries, more aggressive pruning',
  shouldCompact(ctx) {
    return ctx.tokenCount > ctx.maxTokens * 0.7
  },
  async compact(ctx) {
    const preserveCount = Math.max(4, Math.ceil(ctx.messages.length * 0.1))
    const oldMessages = ctx.messages.slice(0, -preserveCount)
    const recentMessages = ctx.messages.slice(-preserveCount)

    if (oldMessages.length < 2) {
      return { messages: ctx.messages, summary: '', tokensFreed: 0, didCompact: false }
    }

    const summary = buildShortSummary(oldMessages)
    const tokensFreed = estimateTokens(oldMessages) - estimateTokens([{ id: 's', role: 'system', content: [{ type: 'text', text: summary }], timestamp: Date.now() }])

    return {
      messages: [
        { id: `compact-summary-${Date.now()}`, role: 'system', content: [{ type: 'text', text: `[Compact Summary — aggressive]\n${summary}` }], timestamp: Date.now() },
        ...recentMessages,
      ],
      summary,
      tokensFreed: Math.max(0, tokensFreed),
      didCompact: true,
    }
  },
}

export const conservativeStrategy: CompactionStrategy = {
  name: 'conservative',
  description: 'Preserve detail — longer summaries, keep more context before compacting',
  shouldCompact(ctx) {
    return ctx.tokenCount > ctx.maxTokens * 0.95
  },
  async compact(ctx) {
    const preserveCount = Math.max(10, Math.ceil(ctx.messages.length * 0.25))
    const oldMessages = ctx.messages.slice(0, -preserveCount)
    const recentMessages = ctx.messages.slice(-preserveCount)

    if (oldMessages.length < 2) {
      return { messages: ctx.messages, summary: '', tokensFreed: 0, didCompact: false }
    }

    const summary = buildDetailedSummary(oldMessages)
    const tokensFreed = estimateTokens(oldMessages) - estimateTokens([{ id: 's', role: 'system', content: [{ type: 'text', text: summary }], timestamp: Date.now() }])

    return {
      messages: [
        { id: `compact-summary-${Date.now()}`, role: 'system', content: [{ type: 'text', text: `[Context Summary — detailed]\n${summary}` }], timestamp: Date.now() },
        ...recentMessages,
      ],
      summary,
      tokensFreed: Math.max(0, tokensFreed),
      didCompact: true,
    }
  },
}

export const codeFocusedStrategy: CompactionStrategy = {
  name: 'code-focused',
  description: 'Prioritize code blocks — preserve code verbatim, compress prose descriptions',
  shouldCompact(ctx) {
    return ctx.tokenCount > ctx.maxTokens * 0.8
  },
  async compact(ctx) {
    const preserveCount = Math.max(6, Math.ceil(ctx.messages.length * 0.15))
    const oldMessages = ctx.messages.slice(0, -preserveCount)
    const recentMessages = ctx.messages.slice(-preserveCount)

    if (oldMessages.length < 2) {
      return { messages: ctx.messages, summary: '', tokensFreed: 0, didCompact: false }
    }

    const summary = buildCodeFocusedSummary(oldMessages)
    const tokensFreed = estimateTokens(oldMessages) - estimateTokens([{ id: 's', role: 'system', content: [{ type: 'text', text: summary }], timestamp: Date.now() }])

    return {
      messages: [
        { id: `compact-summary-${Date.now()}`, role: 'system', content: [{ type: 'text', text: `[Context Summary — code-focused]\n${summary}` }], timestamp: Date.now() },
        ...recentMessages,
      ],
      summary,
      tokensFreed: Math.max(0, tokensFreed),
      didCompact: true,
    }
  },
}

// ---- Strategy Registry ----

const strategies = new Map<string, CompactionStrategy>()

// Register built-in strategies
for (const s of [defaultStrategy, aggressiveStrategy, conservativeStrategy, codeFocusedStrategy]) {
  strategies.set(s.name, s)
}

/** Register a custom compaction strategy */
export function registerStrategy(strategy: CompactionStrategy): void {
  strategies.set(strategy.name, strategy)
}

/** Get a strategy by name */
export function getStrategy(name: string): CompactionStrategy | undefined {
  return strategies.get(name)
}

/** List all registered strategies */
export function listStrategies(): Array<{ name: string; description: string }> {
  return Array.from(strategies.values()).map((s) => ({ name: s.name, description: s.description }))
}

/** Execute compaction using the specified strategy */
export async function compactWithStrategy(
  strategyName: string,
  ctx: CompactionContext,
): Promise<CompactionResult> {
  const strategy = strategies.get(strategyName)
  if (!strategy) {
    throw new Error(`Unknown compaction strategy: "${strategyName}". Available: ${Array.from(strategies.keys()).join(', ')}`)
  }
  return strategy.compact(ctx)
}

/** Check if compaction is needed using the specified strategy */
export function shouldCompactWithStrategy(strategyName: string, ctx: CompactionContext): boolean {
  const strategy = strategies.get(strategyName)
  if (!strategy) return false
  return strategy.shouldCompact(ctx)
}

// ---- Summary Builders ----

function buildBasicSummary(messages: Message[]): string {
  const parts: string[] = []
  let turnCount = 0

  for (const msg of messages) {
    if (msg.role === 'assistant') turnCount++
    const text = extractText(msg)
    if (text && text.length > 100) {
      parts.push(`[${msg.role}] ${text.slice(0, 200)}...`)
    } else if (text) {
      parts.push(`[${msg.role}] ${text}`)
    }
  }

  return `Previous conversation (${turnCount} assistant turns):\n${parts.join('\n')}`
}

function buildShortSummary(messages: Message[]): string {
  const topics = new Set<string>()
  for (const msg of messages) {
    if (msg.role === 'user') {
      const text = extractText(msg)
      if (text) {
        // Extract key terms (first few words of user messages)
        const words = text.split(/\s+/).slice(0, 5).join(' ')
        topics.add(words)
      }
    }
  }
  return `Topics discussed: ${Array.from(topics).join('; ')}`
}

function buildDetailedSummary(messages: Message[]): string {
  const parts: string[] = []
  for (const msg of messages) {
    const text = extractText(msg)
    if (text) {
      parts.push(`[${msg.role}] ${text.slice(0, 500)}${text.length > 500 ? '...' : ''}`)
    }
  }
  return `Detailed context:\n${parts.join('\n\n')}`
}

function buildCodeFocusedSummary(messages: Message[]): string {
  const codeParts: string[] = []
  const summaryParts: string[] = []

  for (const msg of messages) {
    const text = extractText(msg) ?? ''
    // Extract code blocks
    const codeBlocks = text.match(/```[\s\S]*?```/g)
    if (codeBlocks) {
      codeParts.push(...codeBlocks)
    }
    // Summarize non-code text
    const nonCode = text.replace(/```[\s\S]*?```/g, '').trim()
    if (nonCode) {
      summaryParts.push(`[${msg.role}] ${nonCode.slice(0, 150)}${nonCode.length > 150 ? '...' : ''}`)
    }
  }

  const codeSection = codeParts.length > 0
    ? `\n\nCode from previous context:\n${codeParts.join('\n\n')}`
    : ''

  return `Summary: ${summaryParts.join('\n')}${codeSection}`
}

function extractText(msg: Message): string | undefined {
  if (!Array.isArray(msg.content)) return undefined
  return msg.content
    .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
    .map((c) => c.text)
    .join('\n')
}

function estimateTokens(messages: Message[]): number {
  let chars = 0
  for (const msg of messages) {
    if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === 'text') chars += (block as { text: string }).text.length
        if (block.type === 'tool_use') chars += JSON.stringify((block as { input: unknown }).input ?? {}).length
        if (block.type === 'tool_result') {
          const content = (block as { content: unknown }).content
          chars += typeof content === 'string' ? content.length : JSON.stringify(content ?? '').length
        }
      }
    }
  }
  return Math.ceil(chars / 4)
}
