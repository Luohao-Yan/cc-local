/**
 * Reactive Compact — triggered on 413/prompt-too-long errors.
 *
 * When the API rejects a request because the context exceeds the model's limit,
 * this module compacts the conversation in-place (using the existing
 * `compactConversation` logic) and returns the compacted messages so the query
 * loop can retry.
 *
 * Unlike the ANT-only gated version, this implementation is always available
 * and does not depend on GrowthBook / feature flags.
 */

import type { QuerySource } from '../../constants/querySource.js'
import type { ToolUseContext } from '../../Tool.js'
import type { Message } from '../../types/message.js'
import type { SystemPrompt } from '../../utils/systemPromptType.js'
import type { CompactionResult } from './compact.js'
import { compactConversation } from './compact.js'

export type ReactiveCompactArgs = {
  hasAttempted: boolean
  querySource: QuerySource
  aborted: boolean
  messages: Message[]
  cacheSafeParams: {
    systemPrompt: SystemPrompt
    userContext: { [k: string]: string }
    systemContext: { [k: string]: string }
    toolUseContext: ToolUseContext
    forkContextMessages: Message[]
  }
}

export type ReactiveCompactManualOptions = {
  customInstructions: string | undefined
  trigger: 'manual' | 'auto'
}

export type ReactiveCompactOnPromptOutcome =
  | { ok: true; result: CompactionResult }
  | {
      ok: false
      reason:
        | 'too_few_groups'
        | 'aborted'
        | 'exhausted'
        | 'error'
        | 'media_unstrippable'
    }

/**
 * Whether reactive compact is enabled.
 * Always true in cc-local — we don't gate behind GrowthBook.
 */
export function isReactiveCompactEnabled(): boolean {
  return true
}

/**
 * Whether to run in reactive-only mode (suppress proactive autocompact,
 * only compact on 413). Default false.
 */
export function isReactiveOnlyMode(): boolean {
  return false
}

/**
 * Check whether a withheld message (from the API's streaming response)
 * indicates the prompt is too long. The API sends a special error
 * message in-stream when context exceeds limits.
 *
 * Detection strategy:
 * 1. Check for explicit error_type in message content blocks
 * 2. Check for HTTP 413 status in the message
 * 3. Check for well-known error strings from the Anthropic API
 */
export function isWithheldPromptTooLong(
  message: Message | undefined,
): boolean {
  if (!message) return false

  // Check content blocks for error indicators
  if (Array.isArray((message as any).content)) {
    for (const block of (message as any).content) {
      if (block.type === 'text' && typeof (block as any).text === 'string') {
        const text = (block as any).text
        // Anthropic API returns these exact error patterns
        if (text.includes('prompt_is_too_long')) return true
        if (text.includes('prompt is too long')) return true
        if (text.includes('maximum context length')) return true
        if (text.includes('input is too long')) return true
        if (text.includes('too many tokens')) return true
        if (text.includes('request too large')) return true
        // 413 is the HTTP status for "Payload Too Large"
        if (text.includes('413')) return true
      }

      // Check for tool_result blocks with error content
      if (block.type === 'tool_result') {
        const content = (block as any).content
        if (typeof content === 'string') {
          if (content.includes('prompt_is_too_long')) return true
          if (content.includes('prompt is too long')) return true
          if (content.includes('413')) return true
        }
      }
    }
  }

  return false
}

/**
 * Check whether a withheld message indicates an unstrippable media
 * size error (images that can't be removed to shrink context).
 *
 * The API returns specific error messages when media exceeds size limits
 * or when there are too many images that can't be stripped by the server.
 */
export function isWithheldMediaSizeError(
  message: Message | undefined,
): boolean {
  if (!message) return false

  if (Array.isArray((message as any).content)) {
    for (const block of (message as any).content) {
      if (block.type === 'text' && typeof (block as any).text === 'string') {
        const text = (block as any).text
        // Media-specific error patterns from the Anthropic API
        if (text.includes('image is too large')) return true
        if (text.includes('media size exceeds')) return true
        if (text.includes('too many images')) return true
        if (text.includes('image_size_exceeded')) return true
        if (text.includes('media_unsupported')) return true
        if (text.includes('content block is too large')) return true
        if (text.includes('unsupported media type')) return true
        if (text.includes('request must be smaller')) return true
      }
    }
  }

  return false
}

/**
 * Attempt reactive compact when a prompt-too-long error is detected.
 * Returns a CompactionResult on success, or null if compaction cannot
 * proceed (e.g., already attempted, aborted, or too few messages).
 */
export async function tryReactiveCompact(
  args: ReactiveCompactArgs,
): Promise<CompactionResult | null> {
  if (args.hasAttempted) {
    // Don't retry — we already compacted once this turn
    return null
  }
  if (args.aborted) {
    return null
  }
  if (args.querySource === 'compact' || args.querySource === 'session_memory') {
    // Prevent recursion — compact and session_memory are forked agents
    return null
  }

  const { messages, cacheSafeParams } = args
  const { toolUseContext, systemPrompt, userContext, systemContext } =
    cacheSafeParams

  if (messages.length < 4) {
    // Too few messages to meaningfully compact
    return null
  }

  try {
    const recompactionInfo = {
      isRecompactionInChain: false,
      turnsSincePreviousCompact: -1,
      previousCompactTurnId: undefined as string | undefined,
      autoCompactThreshold: 0,
      querySource: args.querySource,
    }

    const result = await compactConversation(
      messages,
      toolUseContext,
      {
        systemPrompt,
        userContext,
        systemContext,
        toolUseContext: cacheSafeParams.toolUseContext,
        forkContextMessages: cacheSafeParams.forkContextMessages,
      },
      true, // suppress user questions during reactive compact
      undefined, // no custom instructions for reactive
      true, // isAutoCompact
      recompactionInfo,
    )

    return result
  } catch (error) {
    // Log but don't throw — the query loop handles the fallback
    return null
  }
}

/**
 * Reactive compact triggered explicitly from /compact command with
 * prompt-too-long recovery.
 */
export async function reactiveCompactOnPromptTooLong(
  messages: Message[],
  cacheSafeParams: unknown,
  options: ReactiveCompactManualOptions,
): Promise<ReactiveCompactOnPromptOutcome> {
  const params = cacheSafeParams as {
    systemPrompt: SystemPrompt
    userContext: { [k: string]: string }
    systemContext: { [k: string]: string }
    toolUseContext: ToolUseContext
    forkContextMessages: Message[]
  }

  if (messages.length < 4) {
    return { ok: false, reason: 'too_few_groups' }
  }

  try {
    const recompactionInfo = {
      isRecompactionInChain: false,
      turnsSincePreviousCompact: -1,
      previousCompactTurnId: undefined as string | undefined,
      autoCompactThreshold: 0,
      querySource: 'compact' as QuerySource,
    }

    const result = await compactConversation(
      messages,
      params.toolUseContext,
      {
        systemPrompt: params.systemPrompt,
        userContext: params.userContext,
        systemContext: params.systemContext,
        toolUseContext: params.toolUseContext,
        forkContextMessages: params.forkContextMessages,
      },
      true, // suppress user questions
      options.customInstructions,
      options.trigger === 'auto',
      recompactionInfo,
    )

    return { ok: true, result }
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : String(error)

    if (msg.includes('abort') || msg.includes('cancel')) {
      return { ok: false, reason: 'aborted' }
    }
    if (msg.includes('prompt') && msg.includes('long')) {
      return { ok: false, reason: 'exhausted' }
    }
    if (msg.includes('media') || msg.includes('image')) {
      return { ok: false, reason: 'media_unstrippable' }
    }
    return { ok: false, reason: 'error' }
  }
}
