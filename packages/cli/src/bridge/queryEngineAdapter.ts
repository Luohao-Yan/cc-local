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
import { EventQueue } from './eventQueue.js'
import { toLegacyStreamEvent, type LegacyQueryEvent } from './streamTranslator.js'
import { buildSystemPrompt } from './systemPromptBuilder.js'
import type { CanUseToolFn } from '../hooks/useCanUseTool.js'
import type { ToolUseContext, Tool as ToolType } from '../Tool.js'
import type { SystemPrompt } from '../utils/systemPromptType.js'
import { getProxyFetchOptions } from '../utils/proxy.js'

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
          try {
            const result = await params.canUseTool!(
              { name: toolName } as ToolType,
              input as Record<string, unknown>,
              params.toolUseContext ?? ({} as ToolUseContext),
              {} as any,
              `bridge_${Date.now()}`,
            )
            return result.behavior === 'allow'
          } catch {
            return false
          }
        }
      : undefined,
    apiFormat: params.apiFormat,
    headers: params.headers,
    // Inject proxy/mTLS/TLS config from CLI layer so the OpenAI SDK
    // can route through corporate proxies and respect NO_PROXY.
    fetchOptions: getProxyFetchOptions({ forAnthropicAPI: false }) as Record<string, unknown>,
  }

  const eventQueue = new EventQueue<LegacyQueryEvent>()

  // Yield stream_request_start to match legacy protocol
  yield { type: 'stream_request_start' }

  const engine = new QueryEngine(options)

  // Start the query in the background; push stream events into the queue
  const queryPromise = engine.query(messages, {
    onStream: (event: StreamEvent) => {
      const legacyEvent = toLegacyStreamEvent(event)
      if (legacyEvent) {
        eventQueue.push(legacyEvent)
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
 * Check if the QueryEngine adapter should be used instead of the legacy query().
 */
export function shouldUseQueryEngine(): boolean {
  return (
    process.env.CCLOCAL_USE_QUERY_ENGINE === '1' ||
    process.argv.some((arg) => arg === '--query-engine')
  )
}