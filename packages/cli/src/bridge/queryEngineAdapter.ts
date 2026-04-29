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
 * Limitations (initial version):
 * - No context compaction
 * - No token budget tracking / auto-continue
 * - No fallback model switching
 * - No hooks (pre/post tool execution)
 * - No cost tracking
 * - No agent/swarm support
 *
 * These will be added incrementally in Phase 6.
 */

import type { Message, StreamEvent, AssistantMessage } from '@cclocal/shared'
import { QueryEngine, type QueryEngineOptions, type QueryResult } from '@cclocal/core'

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
 * Create an AsyncGenerator that wraps QueryEngine.query() and yields
 * legacy-compatible events for the Ink UI to consume.
 */
export async function* createQueryEngineAdapter(
  params: LegacyQueryParams
): AsyncGenerator<LegacyQueryEvent> {
  const options: QueryEngineOptions = {
    model: params.model ?? 'claude-sonnet-4-20250514',
    systemPrompt: buildSystemPrompt(params),
    maxTurns: params.maxTurns ?? 10,
    enabledTools: params.enabledTools,
    apiKey: params.apiKey,
    baseUrl: params.baseUrl,
  }

  // Yield stream_request_start to match legacy protocol
  yield { type: 'stream_request_start' }

  const engine = new QueryEngine(options)
  const collectedMessages: Message[] = []

  try {
    const result: QueryResult = await engine.query(params.messages, {
      onStream: (event: StreamEvent) => {
        // Forward raw stream events through the generator
        // The legacy handler processes these as 'stream_event' type
        params.onStream?.(event)
      },
    })

    // Yield the final assistant message
    const assistantMessage: Message = {
      id: result.message.id,
      role: 'assistant',
      content: result.message.content,
      timestamp: result.message.timestamp ?? Date.now(),
    }

    collectedMessages.push(assistantMessage)
    yield { type: 'message', message: assistantMessage }
  } catch (error) {
    // Yield error as a stream event
    yield {
      type: 'stream_event',
      event: {
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      },
    }
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
