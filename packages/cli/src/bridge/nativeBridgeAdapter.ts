/**
 * Native Bridge Adapter
 *
 * Provides a unified interface for packages-native mode,
 * supporting both local QueryEngine and remote REST API.
 *
 * This is a NEW file that does NOT modify existing code.
 */

import type { Message, StreamEvent, Session, Tool, MessageContent } from '@cclocal/shared'
import { CCLocalClient } from '../client/CCLocalClient.js'
import { createQueryEngineAdapter, type LegacyQueryEvent } from './queryEngineAdapter.js'
import type { QueryEngineOptions } from '@cclocal/core'

/**
 * EventQueue - Bridges callback-based onStream to AsyncGenerator yield.
 *
 * This is the same pattern used in queryEngineAdapter.ts.
 * It allows real-time streaming from SSE callbacks to generator yields.
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
    return new Promise((resolve) => {
      this.waiting.push(resolve)
    })
  }
}

/**
 * Native bridge mode
 */
export type NativeBridgeMode = 'local' | 'remote'

/**
 * Configuration for native bridge adapter
 */
export interface NativeBridgeConfig {
  /** Bridge mode */
  mode: NativeBridgeMode

  /** Remote server URL (for remote mode) */
  serverUrl?: string

  /** Authentication token (for remote mode) */
  authToken?: string

  /** Local engine options (for local mode) */
  engineOptions?: Partial<QueryEngineOptions>

  /** Model to use */
  model?: string

  /** Max turns for queries */
  maxTurns?: number

  /** Enabled tools */
  enabledTools?: string[]
}

/**
 * Query options for the adapter
 */
export interface NativeQueryOptions {
  /** Messages to send */
  messages: Message[]

  /** System prompt */
  systemPrompt?: string

  /** Model override */
  model?: string

  /** Max turns override */
  maxTurns?: number

  /** Stream callback */
  onStream?: (event: StreamEvent) => void

  /** Abort signal */
  abortSignal?: AbortSignal

  /** Session ID (for remote mode) */
  sessionId?: string
}

/**
 * Query result from the adapter
 */
export interface NativeQueryResult {
  /** Final message */
  message: Message

  /** Usage statistics */
  usage: {
    inputTokens: number
    outputTokens: number
  }

  /** Whether the query was cancelled */
  cancelled?: boolean
}

/**
 * Native Bridge Adapter
 *
 * Unified interface for local and remote query execution.
 */
export class NativeBridgeAdapter {
  private config: NativeBridgeConfig
  private client?: CCLocalClient
  private initialized = false

  constructor(config: NativeBridgeConfig) {
    this.config = config
  }

  /**
   * Initialize the adapter
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    if (this.config.mode === 'remote') {
      if (!this.config.serverUrl) {
        throw new Error('serverUrl is required for remote mode')
      }

      this.client = new CCLocalClient({
        serverUrl: this.config.serverUrl,
        authToken: this.config.authToken,
        reconnectInterval: 1000,
        maxReconnectAttempts: 5,
      })

      await this.client.connect()
    }

    this.initialized = true
  }

  /**
   * Execute a query
   */
  async *query(options: NativeQueryOptions): AsyncGenerator<LegacyQueryEvent> {
    if (!this.initialized) {
      await this.initialize()
    }

    if (this.config.mode === 'remote' && this.client) {
      yield* this.queryRemote(options)
    } else {
      yield* this.queryLocal(options)
    }
  }

  /**
   * Execute a query using local QueryEngine
   */
  private async *queryLocal(options: NativeQueryOptions): AsyncGenerator<LegacyQueryEvent> {
    yield* createQueryEngineAdapter({
      messages: options.messages,
      systemPrompt: options.systemPrompt,
      model: options.model ?? this.config.model,
      maxTurns: options.maxTurns ?? this.config.maxTurns,
      enabledTools: this.config.enabledTools,
      onStream: options.onStream,
      abortSignal: options.abortSignal,
      apiKey: this.config.engineOptions?.apiKey,
      baseUrl: this.config.engineOptions?.baseUrl,
    })
  }

  /**
   * Execute a query using remote REST API
   *
   * Uses EventQueue pattern for real-time streaming from SSE callbacks.
   */
  private async *queryRemote(options: NativeQueryOptions): AsyncGenerator<LegacyQueryEvent> {
    if (!this.client) {
      throw new Error('Client not initialized')
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const eventQueue = new EventQueue<LegacyQueryEvent>()
    let streamEnded = false

    // Yield stream start immediately
    yield { type: 'stream_request_start' }

    // Register message handler BEFORE calling sendMessage
    // This ensures we don't miss any events
    const unsubscribe = this.client.onMessage((event: StreamEvent) => {
      const legacyEvent = this.convertToLegacyEvent(event, messageId)
      if (legacyEvent) {
        eventQueue.push(legacyEvent)
      }

      // Forward to caller's callback
      options.onStream?.(event)

      // Check for stream end
      if (event.type === 'stream_end' || event.type === 'error') {
        if (!streamEnded) {
          streamEnded = true
          eventQueue.close()
        }
      }
    })

    try {
      // Create or use existing session
      let sessionId = options.sessionId
      if (!sessionId) {
        const session = await this.client!.createSession({
          cwd: process.cwd(),
          model: options.model ?? this.config.model,
        })
        sessionId = session.id
      }

      // Send message - this triggers SSE consumption
      await this.client!.sendMessage(
        this.extractTextContent(options.messages),
        { model: options.model }
      )

      // Consume events from queue in real-time
      while (true) {
        const result = await eventQueue.next()
        if (result.done) break
        yield result.value
      }
    } catch (error) {
      // Push error event and close
      eventQueue.push({
        type: 'stream_event',
        event: {
          type: 'error',
          error: error instanceof Error ? error.message : String(error),
        },
      })
      eventQueue.close()

      // Yield remaining events
      while (true) {
        const result = await eventQueue.next()
        if (result.done) break
        yield result.value
      }
    } finally {
      // Clean up handler
      unsubscribe()
    }
  }

  /**
   * Extract text content from the last message
   */
  private extractTextContent(messages: Message[]): string {
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage) return ''

    const content = lastMessage.content
    if (typeof content === 'string') return content
    if (Array.isArray(content)) {
      const textBlock = content.find((b): b is { type: 'text'; text: string } =>
        b.type === 'text'
      )
      return textBlock?.text || ''
    }
    return ''
  }

  /**
   * Convert StreamEvent to LegacyQueryEvent
   */
  private convertToLegacyEvent(event: StreamEvent, messageId: string): LegacyQueryEvent | null {
    switch (event.type) {
      case 'stream_start':
        return {
          type: 'stream_event',
          event: { type: 'message_start', message: { id: messageId, role: 'assistant' } },
        }

      case 'stream_delta':
        return {
          type: 'stream_event',
          event: {
            type: 'content_block_delta',
            delta: event.delta,
          },
        }

      case 'tool_call':
        return {
          type: 'stream_event',
          event: {
            type: 'content_block_start',
            content_block: { type: 'tool_use', name: event.toolCall?.name, id: messageId },
          },
        }

      case 'stream_end':
        return {
          type: 'stream_event',
          event: { type: 'message_stop' },
        }

      case 'error':
        return {
          type: 'stream_event',
          event: { type: 'error', error: event.error },
        }

      default:
        return null
    }
  }

  /**
   * Cancel current query
   */
  cancel(): void {
    if (this.config.mode === 'remote' && this.client) {
      this.client.cancelGeneration()
    }
    // Local mode cancellation is handled via abortSignal
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    if (this.client) {
      this.client.disconnect()
      this.client = undefined
    }
    this.initialized = false
  }

  /**
   * Check if adapter is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get current mode
   */
  getMode(): NativeBridgeMode {
    return this.config.mode
  }

  /**
   * Get client (for testing)
   */
  getClient(): CCLocalClient | undefined {
    return this.client
  }
}

/**
 * Create a native bridge adapter for local mode
 */
export function createLocalBridgeAdapter(options?: Partial<NativeBridgeConfig>): NativeBridgeAdapter {
  return new NativeBridgeAdapter({
    mode: 'local',
    ...options,
  })
}

/**
 * Create a native bridge adapter for remote mode
 */
export function createRemoteBridgeAdapter(
  serverUrl: string,
  options?: Partial<NativeBridgeConfig>
): NativeBridgeAdapter {
  return new NativeBridgeAdapter({
    mode: 'remote',
    serverUrl,
    ...options,
  })
}
