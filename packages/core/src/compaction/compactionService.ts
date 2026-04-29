/**
 * Context Compaction Service - Automatic context window management
 *
 * When the conversation approaches the model's context limit,
 * this service compacts the message history by summarizing
 * older messages while preserving recent context.
 */

import type { Message } from '@cclocal/shared'

export interface CompactionConfig {
  maxTokens: number
  preserveRecentCount: number
  compactSummaryPrompt: string
}

const DEFAULT_COMPACTION_CONFIG: CompactionConfig = {
  maxTokens: 180_000,
  preserveRecentCount: 6,
  compactSummaryPrompt:
    'Summarize the following conversation history concisely, preserving key decisions, code changes, and current task state. Omit implementation details that are no longer relevant.',
}

export class CompactionService {
  private config: CompactionConfig

  constructor(config?: Partial<CompactionConfig>) {
    this.config = { ...DEFAULT_COMPACTION_CONFIG, ...config }
  }

  /**
   * Estimate token count for a message list.
   * Rough heuristic: ~4 characters per token.
   */
  estimateTokens(messages: Message[]): number {
    let chars = 0
    for (const msg of messages) {
      for (const block of msg.content) {
        if (block.type === 'text') {
          chars += (block as { type: 'text'; text: string }).text.length
        } else if (block.type === 'tool_use') {
          chars += JSON.stringify((block as { type: 'tool_use'; input: unknown }).input).length
        } else if (block.type === 'tool_result') {
          const content = (block as { type: 'tool_result'; content: unknown }).content
          chars += typeof content === 'string' ? content.length : JSON.stringify(content).length
        }
      }
    }
    return Math.ceil(chars / 4)
  }

  /**
   * Check if compaction is needed based on estimated token count.
   */
  needsCompaction(messages: Message[]): boolean {
    return this.estimateTokens(messages) > this.config.maxTokens
  }

  /**
   * Compact messages by replacing older ones with a summary.
   * Preserves the most recent `preserveRecentCount` messages.
   * Returns the compacted message list.
   */
  compact(messages: Message[], summaryText: string): Message[] {
    if (messages.length <= this.config.preserveRecentCount) {
      return messages
    }

    const summaryMessage: Message = {
      id: `compaction-${Date.now()}`,
      role: 'user',
      content: [
        {
          type: 'text',
          text: `[Context Summary]\n\n${summaryText}`,
        },
      ],
      timestamp: Date.now(),
    }

    const recentMessages = messages.slice(-this.config.preserveRecentCount)

    return [summaryMessage, ...recentMessages]
  }

  /**
   * Get the compaction summary prompt for use with the LLM.
   */
  getSummaryPrompt(): string {
    return this.config.compactSummaryPrompt
  }
}
