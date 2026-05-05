/**
 * OpenAI Reasoning Model Handler (CLI Layer)
 *
 * Re-exports shared utilities from @cclocal/core and adds CLI-specific
 * stream adapter helpers for processing reasoning content chunks into
 * Anthropic-format stream events.
 */

// Re-export shared detection functions (also imported as value for internal use)
export { isOpenAIThinkingEnabled } from '@cclocal/core'
import { isOpenAIThinkingEnabled } from '@cclocal/core'

import type { BetaRawMessageStreamEvent } from '@anthropic-ai/sdk/resources/beta/messages/index.js'

// ===== Shared constants =====

/**
 * Map from OpenAI finish_reason to Anthropic stop_reason.
 * Used by both openaiStreamAdapter and formatConverter.
 */
export const OPENAI_STOP_REASON_MAP: Record<string, string> = {
  stop: 'end_turn',
  tool_calls: 'tool_use',
  length: 'max_tokens',
  content_filter: 'end_turn',
}

/** Reasoning state for a single thinking block */
export interface ReasoningState {
  /** Whether we've emitted content_block_start for this thinking block */
  blockStarted: boolean
  /** Accumulated reasoning content */
  content: string
}

/**
 * Process a reasoning content chunk from an OpenAI-compatible endpoint.
 * Returns Anthropic-format stream events to emit.
 */
export function processReasoningChunk(
  reasoningContent: string,
  state: ReasoningState,
  blockIndex: number,
): BetaRawMessageStreamEvent[] {
  const events: BetaRawMessageStreamEvent[] = []

  if (!state.blockStarted) {
    state.blockStarted = true
    events.push({
      type: 'content_block_start',
      index: blockIndex,
      content_block: { type: 'thinking', thinking: '' },
    } as BetaRawMessageStreamEvent)
  }

  state.content += reasoningContent

  events.push({
    type: 'content_block_delta',
    index: blockIndex,
    delta: { type: 'thinking_delta', thinking: reasoningContent },
  } as BetaRawMessageStreamEvent)

  return events
}

/**
 * Close a reasoning block if it was started.
 */
export function closeReasoningBlock(
  state: ReasoningState,
  blockIndex: number,
): BetaRawMessageStreamEvent[] {
  if (!state.blockStarted) {
    return []
  }

  return [{
    type: 'content_block_stop',
    index: blockIndex,
  } as BetaRawMessageStreamEvent]
}

/**
 * Detect if a model name is a known reasoning model that emits
 * reasoning_content in SSE chunks.
 */
export function isReasoningModel(modelName: string): boolean {
  const lower = modelName.toLowerCase()
  if (lower.includes('deepseek-r')) return true
  if (lower.match(/\bo[1-9]\b/)) return true
  if (lower.includes('grok') && lower.includes('reasoning')) return true
  if (isOpenAIThinkingEnabled(modelName)) return true
  return false
}