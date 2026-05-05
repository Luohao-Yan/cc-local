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
import { getSessionStore } from '@cclocal/core'
import { ALL_TOOL_ADAPTERS } from './toolAdapters.js'
import type { CanUseToolFn } from '../hooks/useCanUseTool.js'
import type { ToolUseContext, Tool as ToolType } from '../Tool.js'
import type { SystemPrompt } from '../utils/systemPromptType.js'

// Legacy event types that REPL.tsx's handleMessageFromStream expects
export type LegacyQueryEvent =
  | { type: 'stream_request_start' }
  | { type: 'stream_event'; event: Record<string, unknown> }
  | { type: 'message'; message: Message }
  | { type: 'tombstone'; message: Message }
  | { type: 'tool_use_summary'; message: Message }

/**
 * Params compatible with REPL.tsx's query() call signature.
 * This mirrors QueryParams from query.ts so the same call site works
 * for both legacy and bridge paths.
 */
export interface BridgeQueryParams {
  messages: Message[]
  systemPrompt: SystemPrompt
  userContext?: Record<string, string>
  systemContext?: Record<string, string>
  canUseTool?: CanUseToolFn
  toolUseContext?: ToolUseContext
  model?: string
  maxTurns?: number
  enabledTools?: string[]
  apiKey?: string
  baseUrl?: string
  onStream?: (event: StreamEvent) => void
  abortSignal?: AbortSignal
  /** Session ID for persistence and resume */
  sessionId?: string
  /** API format: 'anthropic' or 'openai' */
  apiFormat?: 'anthropic' | 'openai'
  /** Custom headers per provider */
  headers?: Record<string, string>
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
 *
 * This function has the same call signature as query() from query.ts,
 * so REPL.tsx can swap it in via:
 *   const query = shouldUseQueryEngine() ? createQueryEngineAdapter : legacyQuery
 */
export async function* createQueryEngineAdapter(
  params: BridgeQueryParams
): AsyncGenerator<LegacyQueryEvent> {
  // Register bridge tool adapters with the core registry
  const { toolRegistry } = await import('@cclocal/core')
  toolRegistry.registerBridgeAdapters(ALL_TOOL_ADAPTERS)

  // Load existing messages if sessionId provided and session exists
  let messages = params.messages
  if (params.sessionId) {
    const sessionStore = getSessionStore()
    if (sessionStore.hasSession(params.sessionId)) {
      const existingMessages = sessionStore.getMessages(params.sessionId)
      // Prepend existing messages, but avoid duplicates
      const existingIds = new Set(existingMessages.map(m => m.id))
      const newMessages = params.messages.filter(m => !existingIds.has(m.id))
      messages = [...existingMessages, ...newMessages]
    }
  }

  const options: QueryEngineOptions = {
    model: params.model ?? 'claude-sonnet-4-20250514',
    systemPrompt: buildSystemPrompt(params),
    maxTurns: params.maxTurns ?? 10,
    enabledTools: params.enabledTools,
    apiKey: params.apiKey,
    baseUrl: params.baseUrl,
    onPermissionCheck: params.canUseTool
      ? async (toolName: string, input: unknown, reason?: string) => {
          // Bridge to the Ink UI's canUseTool permission flow.
          // The canUseTool function handles UI dialog + user decision.
          try {
            const result = await params.canUseTool!(
              // Create a minimal Tool object for the permission check
              { name: toolName } as ToolType,
              input as Record<string, unknown>,
              params.toolUseContext ?? ({} as ToolUseContext),
              {} as any, // assistantMessage — not needed for permission check
              `bridge_${Date.now()}`, // toolUseID
            )
            // canUseTool returns a PermissionDecision; extract allowed boolean
            return result.behavior === 'allow'
          } catch {
            return false
          }
        }
      : undefined,
    apiFormat: params.apiFormat,
    headers: params.headers,
  }

  const eventQueue = new EventQueue<LegacyQueryEvent>()

  // Yield stream_request_start to match legacy protocol
  yield { type: 'stream_request_start' }

  const engine = new QueryEngine(options)

  // Start the query in the background; push stream events into the queue
  const queryPromise = engine.query(messages, {
    onStream: (event: StreamEvent) => {
      const legacyEvent = translateStreamEvent(event)
      if (legacyEvent) {
        eventQueue.push({ type: 'stream_event', event: legacyEvent })
      }
      // Also forward raw events to the caller's onStream if provided
      params.onStream?.(event)
    },
  })

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

      // Persist messages to session store
      if (params.sessionId) {
        const sessionStore = getSessionStore()
        for (const msg of params.messages) {
          if (msg.role === 'user') {
            sessionStore.addMessage(msg, params.sessionId)
          }
        }
        sessionStore.addMessage(assistantMessage, params.sessionId)
      }
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
 *
 * The Ink UI's handleMessageFromStream expects:
 * - message_start / message_stop — lifecycle markers
 * - content_block_start — with content_block.type = 'tool_use' | 'text' | 'thinking'
 * - content_block_delta — with delta.type = 'text_delta' | 'thinking_delta' | 'input_json_delta'
 * - message_delta — usage info at end of message
 *
 * These map directly to the Anthropic SSE streaming spec.
 * StreamEvent from @cclocal/shared only has: stream_start, stream_delta, stream_end, error, tool_call.
 * We translate those into the richer protocol the Ink UI expects.
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
        // Tool results come back as user content blocks.
        // The Ink UI handles these via the tool_use lifecycle
        // (content_block_start → input_json_delta → content_block_stop).
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

function buildSystemPrompt(params: BridgeQueryParams): string {
  const parts: string[] = []

  // SystemPrompt may be a string or a structured object
  const sp = params.systemPrompt
  if (typeof sp === 'string' && sp) {
    parts.push(sp)
  } else if (sp && typeof sp === 'object' && 'prompt' in sp) {
    parts.push((sp as { prompt: string }).prompt)
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
