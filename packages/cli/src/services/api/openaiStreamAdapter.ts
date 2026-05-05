/**
 * OpenAI SDK Stream → Anthropic Stream Event Adapter
 *
 * Transforms OpenAI Chat Completions chunks (from the openai SDK's typed
 * ChatCompletionChunk) into Anthropic stream events that the downstream
 * pipeline consumes uniformly.
 *
 * Key contract: every content_block_start at index N must be paired with
 * a content_block_stop at the same index N. All indices are sequential
 * and monotonically increasing: 0, 1, 2, ...
 *
 * The input is an AsyncIterable<OpenAI.ChatCompletionChunk> from the SDK,
 * which has already parsed SSE lines into typed objects. We no longer
 * need to handle raw SSE parsing or JSON deserialization.
 */

import type OpenAI from 'openai'
import { logForDebugging } from '../../utils/debug.js'
import { OPENAI_STOP_REASON_MAP } from '../../utils/model/openAIThinking.js'

// ===== State tracking =====

interface ToolCallBuffer {
  id: string
  name: string
  arguments: string
  /** The contentBlockIndex that was assigned when this tool call's content_block_start was emitted */
  blockIndex: number
}

interface StreamState {
  messageId: string
  model: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  /** Next available content block index — incremented immediately when a block starts */
  nextBlockIndex: number
  /** Accumulated tool call buffers, keyed by OpenAI tcIndex */
  toolCallBuffers: Map<number, ToolCallBuffer>
  /** Whether a thinking block is currently open */
  thinkingBlockOpen: boolean
  /** The index of the currently open thinking block (-1 if none) */
  thinkingBlockIndex: number
  /** Whether a text block is currently open */
  textBlockOpen: boolean
  /** The index of the currently open text block (-1 if none) */
  textBlockIndex: number
}

function initState(chunk: OpenAI.ChatCompletionChunk, model: string): StreamState {
  return {
    messageId: chunk.id || `msg_${Date.now()}`,
    model: chunk.model || model,
    inputTokens: chunk.usage?.prompt_tokens ?? 0,
    outputTokens: chunk.usage?.completion_tokens ?? 0,
    cacheReadTokens: (chunk.usage as any)?.prompt_tokens_details?.cached_tokens ?? 0,
    nextBlockIndex: 0,
    toolCallBuffers: new Map(),
    thinkingBlockOpen: false,
    thinkingBlockIndex: -1,
    textBlockOpen: false,
    textBlockIndex: -1,
  }
}

// ===== Main adapter function =====

export async function* adaptOpenAIStreamToAnthropic(
  stream: AsyncIterable<OpenAI.ChatCompletionChunk>,
  model: string,
): AsyncGenerator<Record<string, unknown>> {
  let state: StreamState | null = null
  let messageStartEmitted = false

  for await (const chunk of stream) {
    const choice = chunk.choices?.[0]
    if (!choice) continue

    if (!state) {
      state = initState(chunk, model)
    }

    // Update token counts (including cached tokens from OpenAI providers)
    if (chunk.usage) {
      state.inputTokens = chunk.usage.prompt_tokens ?? state.inputTokens
      state.outputTokens = chunk.usage.completion_tokens ?? state.outputTokens
      // Map cached_tokens from prompt_tokens_details to Anthropic's cache_read_input_tokens
      const details = (chunk.usage as any).prompt_tokens_details
      if (details?.cached_tokens) {
        state.cacheReadTokens = details.cached_tokens
      }
    }

    const delta = choice.delta

    // Emit message_start on the first assistant role chunk OR first content chunk
    // (some providers like Ollama skip the role delta)
    if (!messageStartEmitted) {
      if (delta.role === 'assistant' || delta.content != null || delta.tool_calls || (delta as any).reasoning_content != null) {
        messageStartEmitted = true
        yield {
          type: 'message_start',
          message: {
            id: state.messageId,
            type: 'message',
            role: 'assistant',
            content: [],
            model: state.model,
            stop_reason: null,
            stop_sequence: null,
            usage: {
              input_tokens: state.inputTokens,
              output_tokens: 0,
              cache_read_input_tokens: state.cacheReadTokens,
              cache_creation_input_tokens: 0,
            },
          },
        } as Record<string, unknown>
      }
    }

    // Handle reasoning/thinking content (DeepSeek-R, Grok)
    // NOTE: reasoning_content can be an empty string "" which is a valid signal.
    // DeepSeek v4 sometimes returns reasoning_content: "" when the model answers
    // directly. The empty thinking block must round-trip back to the API in
    // subsequent requests, otherwise DeepSeek rejects with HTTP 400.
    const reasoningContent = (delta as any).reasoning_content as string | null | undefined
    if (reasoningContent != null) {
      yield* emitThinkingEvents(state, reasoningContent)
    }

    // Handle text content
    if (delta.content != null && typeof delta.content === 'string' && delta.content !== '') {
      yield* emitTextEvents(state, delta.content)
    }

    // Handle tool calls
    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        yield* emitToolCallEvents(state, tc)
      }
    }

    // Handle finish_reason
    if (choice.finish_reason) {
      yield* closeOpenBlocks(state)

      yield {
        type: 'message_delta',
        delta: { stop_reason: OPENAI_STOP_REASON_MAP[choice.finish_reason] ?? 'end_turn' },
        usage: { output_tokens: state.outputTokens || 1 },
      } as Record<string, unknown>

      yield { type: 'message_stop' } as Record<string, unknown>
    }
  }

  // Synthetic stop if stream ended without finish_reason
  if (state && messageStartEmitted) {
    yield* closeOpenBlocks(state)
    yield {
      type: 'message_delta',
      delta: { stop_reason: 'end_turn' },
      usage: { output_tokens: state.outputTokens || 1 },
    } as Record<string, unknown>
    yield { type: 'message_stop' } as Record<string, unknown>
  }
}

// ===== Event emission helpers =====

function* emitThinkingEvents(state: StreamState, reasoning: string): Generator<Record<string, unknown>> {
  if (!state.thinkingBlockOpen) {
    // Close text block if open
    if (state.textBlockOpen) {
      yield {
        type: 'content_block_stop',
        index: state.textBlockIndex,
      } as Record<string, unknown>
      state.textBlockOpen = false
      state.textBlockIndex = -1
    }

    state.thinkingBlockOpen = true
    state.thinkingBlockIndex = state.nextBlockIndex++
    yield {
      type: 'content_block_start',
      index: state.thinkingBlockIndex,
      content_block: { type: 'thinking', thinking: '', signature: '' },
    } as Record<string, unknown>
  }

  // Only emit delta for non-empty reasoning content.
  // Empty string "" opens the block but no delta is needed (DeepSeek v4 compat).
  if (reasoning !== '') {
    yield {
      type: 'content_block_delta',
      index: state.thinkingBlockIndex,
      delta: { type: 'thinking_delta', thinking: reasoning },
    } as Record<string, unknown>
  }
}

function* emitTextEvents(state: StreamState, text: string): Generator<Record<string, unknown>> {
  // Close thinking block if it was open
  if (state.thinkingBlockOpen) {
    yield {
      type: 'content_block_stop',
      index: state.thinkingBlockIndex,
    } as Record<string, unknown>
    state.thinkingBlockOpen = false
    state.thinkingBlockIndex = -1
  }

  if (!state.textBlockOpen) {
    state.textBlockOpen = true
    state.textBlockIndex = state.nextBlockIndex++
    yield {
      type: 'content_block_start',
      index: state.textBlockIndex,
      content_block: { type: 'text', text: '' },
    } as Record<string, unknown>
  }

  yield {
    type: 'content_block_delta',
    index: state.textBlockIndex,
    delta: { type: 'text_delta', text },
  } as Record<string, unknown>
}

function* emitToolCallEvents(
  state: StreamState,
  tc: OpenAI.ChatCompletionChunk.Choice.Delta.ToolCall,
): Generator<Record<string, unknown>> {
  const tcIndex = tc.index

  // First chunk of a new tool call — start the block
  if (!state.toolCallBuffers.has(tcIndex)) {
    // Close text block if open
    if (state.textBlockOpen) {
      yield {
        type: 'content_block_stop',
        index: state.textBlockIndex,
      } as Record<string, unknown>
      state.textBlockOpen = false
      state.textBlockIndex = -1
    }

    // Close thinking block if open
    if (state.thinkingBlockOpen) {
      yield {
        type: 'content_block_stop',
        index: state.thinkingBlockIndex,
      } as Record<string, unknown>
      state.thinkingBlockOpen = false
      state.thinkingBlockIndex = -1
    }

    const id = tc.id || `toolu_${Date.now()}_${tcIndex}`
    const name = tc.function?.name || ''
    const blockIndex = state.nextBlockIndex++

    state.toolCallBuffers.set(tcIndex, { id, name, arguments: '', blockIndex })

    yield {
      type: 'content_block_start',
      index: blockIndex,
      content_block: {
        type: 'tool_use',
        id,
        name,
        input: {},
      },
    } as Record<string, unknown>
  }

  // Append arguments chunk — emit delta
  if (tc.function?.arguments) {
    const buf = state.toolCallBuffers.get(tcIndex)!
    buf.arguments += tc.function.arguments

    yield {
      type: 'content_block_delta',
      index: buf.blockIndex,
      delta: {
        type: 'input_json_delta',
        partial_json: tc.function.arguments,
      },
    } as Record<string, unknown>
  }
}

function* closeOpenBlocks(state: StreamState): Generator<Record<string, unknown>> {
  // Close thinking block if open
  if (state.thinkingBlockOpen) {
    yield {
      type: 'content_block_stop',
      index: state.thinkingBlockIndex,
    } as Record<string, unknown>
    state.thinkingBlockOpen = false
    state.thinkingBlockIndex = -1
  }

  // Close text block if open
  if (state.textBlockOpen) {
    yield {
      type: 'content_block_stop',
      index: state.textBlockIndex,
    } as Record<string, unknown>
    state.textBlockOpen = false
    state.textBlockIndex = -1
  }

  // Close each tool call block at the index where it was started
  // Sort by blockIndex to emit stops in correct order
  const sortedBuffers = [...state.toolCallBuffers.values()].sort(
    (a, b) => a.blockIndex - b.blockIndex,
  )
  for (const buf of sortedBuffers) {
    yield {
      type: 'content_block_stop',
      index: buf.blockIndex,
    } as Record<string, unknown>
  }
  state.toolCallBuffers.clear()
}