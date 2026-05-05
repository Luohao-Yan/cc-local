/**
 * Stream Event Translator
 *
 * Converts @cclocal/shared StreamEvent types into the legacy-compatible
 * Anthropic SSE protocol that the Ink UI's handleMessageFromStream expects:
 *
 *   message_start / message_stop          — lifecycle markers
 *   content_block_start / content_block_stop — block delimiters
 *   content_block_delta                    — incremental text, thinking, tool input
 *   message_delta                          — usage info at end of message
 *
 * Single source of truth — both queryEngineAdapter and nativeBridgeAdapter
 * should import from here instead of maintaining their own copies.
 */

import type { Message, StreamEvent } from '@cclocal/shared'

// Legacy event types that REPL.tsx's handleMessageFromStream expects
// (defined here to avoid circular imports)
export type LegacyQueryEvent =
  | { type: 'stream_request_start' }
  | { type: 'stream_event'; event: Record<string, unknown> }
  | { type: 'message'; message: Message }
  | { type: 'tombstone'; message: Message }
  | { type: 'tool_use_summary'; message: Message }

export function translateStreamEvent(event: StreamEvent): Record<string, unknown> | null {
  switch (event.type) {
    case 'stream_start':
      return { type: 'message_start' }

    case 'stream_delta':
      if (event.delta?.type === 'text') {
        return {
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: event.delta.text },
        }
      }
      if (event.delta?.type === 'thinking') {
        return {
          type: 'content_block_delta',
          delta: { type: 'thinking_delta', thinking: event.delta.thinking },
        }
      }
      if (event.delta?.type === 'tool_result') {
        return {
          type: 'content_block_delta',
          delta: {
            type: 'input_json_delta',
            partial_json: JSON.stringify({
              type: 'tool_result',
              tool_use_id: (event.delta as { tool_use_id?: string }).tool_use_id,
              content: (event.delta as { content?: string }).content,
              is_error: (event.delta as { is_error?: boolean }).is_error,
            }),
          },
        }
      }
      return null

    case 'tool_call':
      return {
        type: 'content_block_start',
        index: 0,
        content_block: {
          type: 'tool_use',
          id: event.messageId ?? `toolu_${Date.now()}`,
          name: event.toolCall?.name ?? 'unknown',
          input: {},
        },
      }

    case 'stream_end':
      return { type: 'message_stop' }

    case 'error':
      return { type: 'error', error: event.error }

    default:
      return null
  }
}

/**
 * Wrap a StreamEvent into a LegacyQueryEvent for the Ink UI pipeline.
 */
export function toLegacyStreamEvent(event: StreamEvent): LegacyQueryEvent | null {
  const translated = translateStreamEvent(event)
  if (!translated) return null
  return { type: 'stream_event', event: translated }
}
