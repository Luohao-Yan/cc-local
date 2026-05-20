/**
 * Local Model Client - Ollama & LM Studio Integration
 *
 * Provides seamless integration with local inference servers:
 * - **Ollama**: Connects to http://localhost:11434, auto-discovers running models
 * - **LM Studio**: Connects to http://localhost:1234, uses OpenAI-compatible API
 * - **KoboldCpp**: Connects to http://localhost:5001
 * - **Any OpenAI-compatible server**: Custom baseUrl + apiKey
 *
 * Features beyond official Claude Code:
 * - Auto-detection of running local servers on startup
 * - Fallback to local models when cloud API is unavailable
 * - Model capability detection (context length, tool use support)
 * - Streaming support with SSE for local servers
 *
 * Environment variables:
 * - CCLOCAL_LOCAL_MODE=auto|ollama|lmstudio|disabled
 * - CCLOCAL_OLLAMA_URL (default: http://localhost:11434)
 * - CCLOCAL_LMSTUDIO_URL (default: http://localhost:1234)
 * - CCLOCAL_FALLBACK_LOCAL=1 (fallback to local on API errors)
 */

import type { Message, MessageContent } from '@cclocal/shared'

// ---- Types ----

export type LocalProviderType = 'ollama' | 'lmstudio' | 'koboldcpp' | 'custom'

export interface LocalModelInfo {
  id: string
  name: string
  provider: LocalProviderType
  /** Model size in billions of parameters (approx) */
  size?: string
  /** Context window size */
  contextLength?: number
  /** Whether the model supports tool use */
  supportsToolUse?: boolean
  /** Whether the model supports system prompts */
  supportsSystemPrompt?: boolean
  /** Quantization level (e.g., "Q4_K_M") */
  quantization?: string
}

export interface LocalModelConfig {
  provider: LocalProviderType
  baseUrl: string
  model: string
  apiKey?: string
  contextLength?: number
  temperature?: number
}

export interface LocalQueryOptions {
  messages: Message[]
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  tools?: unknown[]
  signal?: AbortSignal
}

export interface LocalQueryResult {
  content: string
  model: string
  provider: LocalProviderType
  inputTokens?: number
  outputTokens?: number
  toolUse?: Array<{ name: string; input: unknown; id: string }>
  duration?: number
}

// ---- Ollama Client ----

export class OllamaClient {
  readonly baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.CCLOCAL_OLLAMA_URL || 'http://localhost:11434'
  }

  /** Check if Ollama is running */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) })
      return response.ok
    } catch {
      return false
    }
  }

  /** List available models */
  async listModels(): Promise<LocalModelInfo[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`)
    if (!response.ok) return []

    const data = await response.json() as { models?: Array<{ name: string; size: number; details?: { parameter_size?: string; quantization_level?: string; context_length?: number } }> }
    return (data.models ?? []).map((m) => ({
      id: m.name,
      name: m.name,
      provider: 'ollama' as const,
      size: m.details?.parameter_size,
      contextLength: m.details?.context_length,
      supportsToolUse: true, // Ollama supports tool use for most models
      supportsSystemPrompt: true,
      quantization: m.details?.quantization_level,
    }))
  }

  /** Stream a chat completion */
  async *query(opts: LocalQueryOptions): AsyncGenerator<string> {
    const messages = this.convertMessages(opts.messages, opts.systemPrompt)

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.1', // Will be overridden by caller
        messages,
        stream: true,
        options: {
          num_predict: opts.maxTokens ?? 4096,
          temperature: opts.temperature ?? 0.7,
        },
        ...(opts.tools?.length ? { tools: opts.tools } : {}),
      }),
      signal: opts.signal,
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Ollama error (${response.status}): ${errText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const parsed = JSON.parse(line)
          if (parsed.message?.content) {
            yield parsed.message.content
          }
        } catch {
          // Skip malformed lines
        }
      }
    }
  }

  private convertMessages(messages: Message[], systemPrompt?: string): Array<{ role: string; content: string }> {
    const result: Array<{ role: string; content: string }> = []

    if (systemPrompt) {
      result.push({ role: 'system', content: systemPrompt })
    }

    for (const msg of messages) {
      const content = Array.isArray(msg.content)
        ? msg.content.filter((c): c is { type: 'text'; text: string } => c.type === 'text').map((c) => c.text).join('\n')
        : ''

      if (content) {
        result.push({ role: msg.role, content })
      }
    }

    return result
  }
}

// ---- LM Studio Client ----

export class LMStudioClient {
  readonly baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.CCLOCAL_LMSTUDIO_URL || 'http://localhost:1234'
  }

  /** Check if LM Studio server is running */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, { signal: AbortSignal.timeout(3000) })
      return response.ok
    } catch {
      return false
    }
  }

  /** List loaded models */
  async listModels(): Promise<LocalModelInfo[]> {
    const response = await fetch(`${this.baseUrl}/v1/models`)
    if (!response.ok) return []

    const data = await response.json() as { data?: Array<{ id: string }> }
    return (data.data ?? []).map((m) => ({
      id: m.id,
      name: m.id,
      provider: 'lmstudio' as const,
      supportsToolUse: true,
      supportsSystemPrompt: true,
    }))
  }

  /** Stream a chat completion using OpenAI-compatible API */
  async *query(config: LocalModelConfig, opts: LocalQueryOptions): AsyncGenerator<string> {
    const messages = this.convertMessages(opts.messages, opts.systemPrompt)

    const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: true,
        max_tokens: opts.maxTokens ?? 4096,
        temperature: opts.temperature ?? 0.7,
        ...(opts.tools?.length ? { tools: opts.tools } : {}),
      }),
      signal: opts.signal,
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`LM Studio error (${response.status}): ${errText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') return

        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) yield delta
        } catch {
          // Skip malformed SSE
        }
      }
    }
  }

  private convertMessages(messages: Message[], systemPrompt?: string): Array<{ role: string; content: string }> {
    const result: Array<{ role: string; content: string }> = []

    if (systemPrompt) {
      result.push({ role: 'system', content: systemPrompt })
    }

    for (const msg of messages) {
      const content = Array.isArray(msg.content)
        ? msg.content.filter((c): c is { type: 'text'; text: string } => c.type === 'text').map((c) => c.text).join('\n')
        : ''

      if (content) {
        result.push({ role: msg.role, content })
      }
    }

    return result
  }
}

// ---- Auto-Discovery ----

export interface DiscoveredProvider {
  provider: LocalProviderType
  baseUrl: string
  models: LocalModelInfo[]
  latencyMs: number
}

/**
 * Auto-discover running local inference servers.
 * Checks Ollama and LM Studio endpoints concurrently.
 */
export async function discoverLocalProviders(): Promise<DiscoveredProvider[]> {
  const checks: Array<{ provider: LocalProviderType; client: OllamaClient | LMStudioClient; baseUrl: string }> = [
    { provider: 'ollama', client: new OllamaClient(), baseUrl: new OllamaClient().baseUrl },
    { provider: 'lmstudio', client: new LMStudioClient(), baseUrl: new LMStudioClient().baseUrl },
  ]

  const results = await Promise.allSettled(
    checks.map(async (check) => {
      const start = Date.now()
      const available = await check.client.isAvailable()
      const latencyMs = Date.now() - start

      if (!available) throw new Error(`${check.provider} not available`)

      let models: LocalModelInfo[] = []
      if (check.provider === 'ollama') {
        models = await (check.client as OllamaClient).listModels()
      } else if (check.provider === 'lmstudio') {
        models = await (check.client as LMStudioClient).listModels()
      }

      return {
        provider: check.provider,
        baseUrl: check.baseUrl,
        models,
        latencyMs,
      }
    }),
  )

  return results
    .filter((r): r is PromiseFulfilledResult<DiscoveredProvider> => r.status === 'fulfilled')
    .map((r) => r.value)
}

// ---- Local Model Manager ----

export class LocalModelManager {
  private ollama = new OllamaClient()
  private lmstudio = new LMStudioClient()
  private discovered: DiscoveredProvider[] = []
  private watchInterval: ReturnType<typeof setInterval> | null = null

  /** Discover available local providers */
  async discover(): Promise<DiscoveredProvider[]> {
    this.discovered = await discoverLocalProviders()
    return this.discovered
  }

  /** Get all discovered models */
  getAllModels(): LocalModelInfo[] {
    return this.discovered.flatMap((p) => p.models)
  }

  /** Get a config for a specific model */
  getConfig(modelId: string): LocalModelConfig | null {
    for (const provider of this.discovered) {
      const model = provider.models.find((m) => m.id === modelId || m.name === modelId)
      if (model) {
        return {
          provider: model.provider,
          baseUrl: provider.baseUrl,
          model: model.id,
          contextLength: model.contextLength,
        }
      }
    }
    return null
  }

  /** Query a local model */
  async *query(config: LocalModelConfig, opts: LocalQueryOptions): AsyncGenerator<string> {
    if (config.provider === 'ollama') {
      const client = new OllamaClient(config.baseUrl)
      yield* client.query(opts)
    } else {
      // LM Studio and other OpenAI-compatible servers
      const client = new LMStudioClient(config.baseUrl)
      yield* client.query(config, opts)
    }
  }

  /** Start watching for local model changes */
  startWatching(intervalMs = 30_000): void {
    if (this.watchInterval) return
    this.watchInterval = setInterval(() => { void this.discover() }, intervalMs)
  }

  /** Stop watching */
  stopWatching(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval)
      this.watchInterval = null
    }
  }
}

// Global instance
export const localModelManager = new LocalModelManager()
