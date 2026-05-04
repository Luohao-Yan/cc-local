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
import type { TokenBudgetStats, Task, TaskStatus, TaskType } from '../types/nativeAdapter.js'
import { randomUUID } from 'crypto'

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
export type NativeBridgeMode = 'local' | 'remote' | 'ssh'

/**
 * SSH configuration
 */
export interface SSHConfig {
  /** SSH host */
  host: string
  /** SSH port */
  port?: number
  /** SSH user */
  user?: string
  /** SSH private key path */
  privateKeyPath?: string
  /** Remote server URL (on the SSH host) */
  remoteServerUrl?: string
}

/**
 * Permission decision
 */
export type PermissionDecision = 'ask' | 'allow' | 'deny'

/**
 * Permission rule
 */
export interface PermissionRule {
  tool: string
  pattern?: string
  decision: PermissionDecision
  createdAt: number
}

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

  /** SSH configuration (for SSH mode) */
  sshConfig?: SSHConfig

  /** Local engine options (for local mode) */
  engineOptions?: Partial<QueryEngineOptions>

  /** Model to use */
  model?: string

  /** Max turns for queries */
  maxTurns?: number

  /** Enabled tools */
  enabledTools?: string[]

  /** Default token budget */
  tokenBudget?: number
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
 * Implements INativeAdapter interface for packages-native mode.
 */
export class NativeBridgeAdapter {
  private config: NativeBridgeConfig
  private client?: CCLocalClient
  private initialized = false

  /** Token tracking */
  private tokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
  }

  /** Permission rules cache */
  private permissionRules: PermissionRule[] = []

  /** Background tasks */
  private tasks: Map<string, Task> = new Map()

  /** Current session ID */
  private currentSessionId?: string

  /** SSH tunnel process (for SSH mode) */
  private sshTunnelProcess?: { kill: () => void }

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
    } else if (this.config.mode === 'ssh') {
      await this.initializeSSH()
    }

    this.initialized = true
  }

  /**
   * Initialize SSH connection
   *
   * Creates an SSH tunnel to the remote server.
   */
  private async initializeSSH(): Promise<void> {
    const sshConfig = this.config.sshConfig
    if (!sshConfig) {
      throw new Error('sshConfig is required for SSH mode')
    }

    // For SSH mode, we create a local port forward and connect via REST
    // This is a simplified implementation - a full implementation would
    // use a proper SSH library like node-ssh or ssh2

    const { host, port = 22, user, privateKeyPath, remoteServerUrl = 'http://127.0.0.1:5678' } = sshConfig

    // Create SSH tunnel using spawn (simplified)
    // In production, use a proper SSH library
    try {
      // For now, we'll use the remote server URL directly via the tunnel
      // A proper implementation would establish an SSH tunnel
      console.log(`Connecting to ${user ? `${user}@` : ''}${host}:${port}...`)

      // Use the remote server URL (assuming tunnel is already established)
      const serverUrl = remoteServerUrl.startsWith('http')
        ? remoteServerUrl
        : `http://${remoteServerUrl}`

      this.client = new CCLocalClient({
        serverUrl,
        authToken: this.config.authToken,
        reconnectInterval: 1000,
        maxReconnectAttempts: 3,
      })

      await this.client.connect()
    } catch (error) {
      throw new Error(`Failed to establish SSH connection: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Execute a query
   */
  async *query(options: NativeQueryOptions): AsyncGenerator<LegacyQueryEvent> {
    if (!this.initialized) {
      await this.initialize()
    }

    if ((this.config.mode === 'remote' || this.config.mode === 'ssh') && this.client) {
      yield* this.queryRemote(options)
    } else {
      yield* this.queryLocal(options)
    }
  }

  /**
   * Execute a query using local QueryEngine
   */
  private async *queryLocal(options: NativeQueryOptions): AsyncGenerator<LegacyQueryEvent> {
    // Track token usage
    let inputTokens = 0
    let outputTokens = 0

    for await (const event of createQueryEngineAdapter({
      messages: options.messages,
      systemPrompt: options.systemPrompt,
      model: options.model ?? this.config.model,
      maxTurns: options.maxTurns ?? this.config.maxTurns,
      enabledTools: this.config.enabledTools,
      onStream: options.onStream,
      abortSignal: options.abortSignal,
      apiKey: this.config.engineOptions?.apiKey,
      baseUrl: this.config.engineOptions?.baseUrl,
    })) {
      // Track usage from message_stop events
      if (event.type === 'stream_event') {
        const e = event.event as Record<string, unknown>
        if (e.type === 'message_delta') {
          const usage = e.usage as { input_tokens?: number; output_tokens?: number } | undefined
          if (usage) {
            if (usage.input_tokens) inputTokens = usage.input_tokens
            if (usage.output_tokens) outputTokens = usage.output_tokens
          }
        }
      }
      yield event
    }

    // Update token usage after query completes
    this.updateTokenUsage(inputTokens, outputTokens)
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

    // Close SSH tunnel if exists
    if (this.sshTunnelProcess) {
      this.sshTunnelProcess.kill()
      this.sshTunnelProcess = undefined
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

  /**
   * Check permission for tool use
   *
   * Uses cached permission rules for fast lookup.
   * Falls back to default behavior if no rules match.
   */
  async checkPermission(tool: string, input: unknown): Promise<boolean> {
    // Find matching rule
    const rule = this.permissionRules.find(r => {
      if (r.tool !== tool && r.tool !== '*') return false
      if (r.pattern) {
        // Pattern matching (e.g., file paths)
        const inputStr = typeof input === 'string' ? input : JSON.stringify(input)
        return new RegExp(r.pattern).test(inputStr)
      }
      return true
    })

    if (rule) {
      return rule.decision === 'allow'
    }

    // Default: ask (return false to trigger prompt)
    return false
  }

  /**
   * Add permission rule
   */
  addPermissionRule(rule: Omit<PermissionRule, 'createdAt'>): void {
    this.permissionRules.push({
      ...rule,
      createdAt: Date.now(),
    })
  }

  /**
   * Clear permission rules
   */
  clearPermissionRules(): void {
    this.permissionRules = []
  }

  /**
   * Fork current session
   *
   * Creates a new session with the same message history.
   */
  async forkSession(sessionId: string, options?: { name?: string }): Promise<{ id: string }> {
    const forkId = randomUUID()

    if (this.config.mode === 'remote' && this.client) {
      // Use server-side fork
      const newSession = await this.client.forkSession(sessionId, options)
      return { id: newSession.id }
    }

    // Local mode: create a new session ID
    // In a full implementation, this would copy the session file
    this.currentSessionId = forkId
    return { id: forkId }
  }

  /**
   * Get token budget statistics
   */
  async getTokenBudget(sessionId?: string): Promise<TokenBudgetStats> {
    const budget = this.config.tokenBudget || 200000 // Default: 200k

    if (this.config.mode === 'remote' && this.client) {
      // Fetch from server if available
      try {
        const stats = await this.client.getTokenStats(sessionId)
        return stats
      } catch {
        // Fall through to local calculation
      }
    }

    // Local calculation
    return {
      inputTokens: this.tokenUsage.inputTokens,
      outputTokens: this.tokenUsage.outputTokens,
      total: this.tokenUsage.inputTokens + this.tokenUsage.outputTokens,
      budget,
      remaining: Math.max(0, budget - this.tokenUsage.inputTokens - this.tokenUsage.outputTokens),
    }
  }

  /**
   * Update token usage (called after each query)
   */
  private updateTokenUsage(input: number, output: number): void {
    this.tokenUsage.inputTokens += input
    this.tokenUsage.outputTokens += output
  }

  /**
   * Reset token usage
   */
  resetTokenUsage(): void {
    this.tokenUsage = { inputTokens: 0, outputTokens: 0 }
  }

  /**
   * Get background tasks
   */
  async getTasks(sessionId?: string): Promise<Task[]> {
    if (this.config.mode === 'remote' && this.client) {
      try {
        return await this.client.getTasks(sessionId)
      } catch {
        // Fall through to local
      }
    }

    // Local tasks
    const taskList = Array.from(this.tasks.values())
    if (sessionId) {
      return taskList.filter(t => t.sessionId === sessionId)
    }
    return taskList
  }

  /**
   * Register a new task
   */
  registerTask(task: Omit<Task, 'id' | 'createdAt' | 'status'>): Task {
    const id = randomUUID()
    const newTask: Task = {
      ...task,
      id,
      status: 'pending',
      createdAt: Date.now(),
    }
    this.tasks.set(id, newTask)
    return newTask
  }

  /**
   * Update task status
   */
  updateTaskStatus(taskId: string, status: TaskStatus, message?: string): void {
    const task = this.tasks.get(taskId)
    if (task) {
      task.status = status
      if (message) task.message = message
      if (status === 'running' && !task.startedAt) {
        task.startedAt = Date.now()
      }
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        task.completedAt = Date.now()
      }
    }
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (task) {
      task.status = 'cancelled'
      task.completedAt = Date.now()
    }

    if (this.config.mode === 'remote' && this.client) {
      try {
        await this.client.cancelTask(taskId)
      } catch {
        // Ignore errors
      }
    }
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | undefined {
    return this.currentSessionId
  }

  /**
   * Set current session ID
   */
  setCurrentSessionId(sessionId: string | undefined): void {
    this.currentSessionId = sessionId
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
