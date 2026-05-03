/**
 * QueryEngine AsyncGenerator Adapter
 *
 * Wraps the new @cclocal/core QueryEngine to produce an AsyncGenerator
 * compatible with the legacy REPL's `for await (const event of query(...))`
 * consumption pattern.
 *
 * This adapter is enabled via CCLOCAL_USE_QUERY_ENGINE=1 or --query-engine.
 * Without it, the legacy query() function is used unchanged.
 *
 * Stream events are pushed from the onStream callback into the generator
 * via an async push queue, so the Ink UI receives fine-grained deltas
 * (text, thinking, tool calls) in real time.
 */

import type { Message, StreamEvent, Tool } from '@cclocal/shared'
import { QueryEngine, type QueryEngineOptions, type QueryResult } from '@cclocal/core'
import { ALL_TOOL_ADAPTERS } from './toolAdapters.js'

// Legacy event types that REPL.tsx's handleMessageFromStream expects
export type LegacyQueryEvent =
  | { type: 'stream_request_start' }
  | { type: 'stream_event'; event: Record<string, unknown> }
  | { type: 'message'; message: Message }
  | { type: 'tombstone'; message: Message }
  | { type: 'tool_use_summary'; message: Message }

export interface LegacyQueryParams {
  messages: Message[]
  systemPrompt?: string
  userContext?: Record<string, string>
  systemContext?: Record<string, string>
  model?: string
  maxTurns?: number
  enabledTools?: string[]
  apiKey?: string
  baseUrl?: string
  onStream?: (event: StreamEvent) => void
  abortSignal?: AbortSignal
}

/**
 * Async push queue — bridges callback-based onStream to generator yield.
 */
class EventQueue<T> {
  private queue: T[] = []
  private waiting: ((value: IteratorResult<T>) => void)[] = []
  private done = false

  push(item: T): void {
    if (this.done) return
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!
      resolve({ value: item, done: false })
    } else {
      this.queue.push(item)
    }
  }

  close(): void {
    this.done = true
    for (const resolve of this.waiting) {
      resolve({ value: undefined, done: true } as IteratorResult<T>)
    }
    this.waiting.length = 0
  }

  async next(): Promise<IteratorResult<T>> {
    if (this.queue.length > 0) {
      return { value: this.queue.shift()!, done: false }
    }
    if (this.done) {
      return { value: undefined, done: true } as IteratorResult<T>
    }
    return new Promise<IteratorResult<T>>((resolve) => {
      this.waiting.push(resolve)
    })
  }
}

/**
 * Create an AsyncGenerator that wraps QueryEngine.query() and yields
 * legacy-compatible events for the Ink UI to consume.
 */
export async function* createQueryEngineAdapter(
  params: LegacyQueryParams
): AsyncGenerator<LegacyQueryEvent> {
  // Register bridge tool adapters with the core registry
  const { toolRegistry } = await import('@cclocal/core')
  toolRegistry.registerBridgeAdapters(ALL_TOOL_ADAPTERS)

  const options: QueryEngineOptions = {
    model: params.model ?? 'claude-sonnet-4-20250514',
    systemPrompt: buildSystemPrompt(params),
    maxTurns: params.maxTurns ?? 10,
    enabledTools: params.enabledTools,
    apiKey: params.apiKey,
    baseUrl: params.baseUrl,
  }

  const eventQueue = new EventQueue<LegacyQueryEvent>()

  // Yield stream_request_start to match legacy protocol
  yield { type: 'stream_request_start' }

  const engine = new QueryEngine(options)

  // Start the query in the background; push stream events into the queue
  const queryPromise = engine.query(params.messages, {
    onStream: (event: StreamEvent) => {
      const legacyEvent = translateStreamEvent(event)
      if (legacyEvent) {
        eventQueue.push({ type: 'stream_event', event: legacyEvent })
      }
      // Also forward raw events to the caller's onStream if provided
      params.onStream?.(event)
    },
  })

  // Consume events from the queue while the query runs
  queryPromise.then(
    (result) => {
      // Yield final assistant message
      const assistantMessage: Message = {
        id: result.message.id,
        role: 'assistant',
        content: result.message.content,
        timestamp: result.message.timestamp ?? Date.now(),
      }
      eventQueue.push({ type: 'message', message: assistantMessage })
      eventQueue.close()
    },
    (error) => {
      eventQueue.push({
        type: 'stream_event',
        event: {
          type: 'error',
          error: error instanceof Error ? error.message : String(error),
        },
      })
      eventQueue.close()
    }
  )

  // Yield events from the queue as they arrive
  while (true) {
    const result = await eventQueue.next()
    if (result.done) break
    yield result.value
  }
}

/**
 * Translate new StreamEvent types into legacy-compatible events
 * for the Ink UI rendering pipeline.
 */
function translateStreamEvent(event: StreamEvent): Record<string, unknown> | null {
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
              tool_use_id: event.delta.tool_use_id,
              content: event.delta.content,
              is_error: event.delta.is_error,
            }),
          },
        }
      }
      return null

    case 'tool_call':
      return {
        type: 'content_block_start',
        content_block: { type: 'tool_use', name: event.toolCall?.name, id: event.messageId },
      }

    case 'stream_end':
      return { type: 'message_stop' }

    case 'error':
      return { type: 'error', error: event.error }

    default:
      return null
  }
}

function buildSystemPrompt(params: LegacyQueryParams): string {
  const parts: string[] = []

  if (params.systemPrompt) {
    parts.push(params.systemPrompt)
  }

  if (params.userContext && Object.keys(params.userContext).length > 0) {
    const contextEntries = Object.entries(params.userContext)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')
    parts.push(`User context:\n${contextEntries}`)
  }

  if (params.systemContext && Object.keys(params.systemContext).length > 0) {
    const sysEntries = Object.entries(params.systemContext)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')
    parts.push(`System context:\n${sysEntries}`)
  }

  return parts.join('\n\n')
}

/**
 * Check if the QueryEngine adapter should be used instead of the legacy query().
 */
export function shouldUseQueryEngine(): boolean {
  return (
    process.env.CCLOCAL_USE_QUERY_ENGINE === '1' ||
    process.argv.some((arg) => arg === '--query-engine')
  )
}
