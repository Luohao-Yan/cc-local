/**
 * OpenAI-Compatible SDK Client (CLI Layer)
 *
 * Thin wrapper that creates OpenAI SDK client instances with CLI-specific
 * proxy injection via getProxyFetchOptions(). The core logic (URL normalization,
 * thinking detection) lives in @cclocal/core.
 *
 * This module re-exports the shared utilities and adds the CLI-specific
 * factory functions that inject proxy/mTLS configuration.
 */

import OpenAI from 'openai'
import { logForDebugging } from '../../utils/debug.js'
import { getProxyFetchOptions } from '../../utils/proxy.js'
import { isOpenAIThinkingEnabled, normalizeBaseUrl } from '@cclocal/core'

// Re-export shared utilities for convenience
export { isOpenAIThinkingEnabled, normalizeBaseUrl } from '@cclocal/core'

export interface OpenAIClientOptions {
  baseUrl: string
  apiKey: string | null
  headers?: Record<string, string>
  maxRetries?: number
  timeout?: number
}

// ===== Client caching =====

const clientCache = new Map<string, OpenAI>()

function makeCacheKey(baseUrl: string, apiKey: string | null): string {
  return `${baseUrl}::${apiKey ?? ''}`
}

/** Clear all cached clients (useful when env vars or config changes). */
export function clearOpenAIClientCache(): void {
  clientCache.clear()
}

// ===== Client factory =====

/**
 * Get or create an OpenAI SDK client for the given provider configuration.
 *
 * The client is cached on a (baseUrl, apiKey) tuple so that:
 * - Repeated calls for the same provider reuse the same client
 * - Multiple providers with different credentials each get their own client
 *
 * Injects CLI-specific proxy/mTLS configuration via getProxyFetchOptions().
 */
export function getOpenAIClient(options: OpenAIClientOptions): OpenAI {
  const key = makeCacheKey(options.baseUrl, options.apiKey)
  const cached = clientCache.get(key)
  if (cached) return cached

  const baseURL = normalizeBaseUrl(options.baseUrl)

  const client = new OpenAI({
    apiKey: options.apiKey ?? '',
    ...(baseURL && { baseURL }),
    maxRetries: options.maxRetries ?? 0,
    timeout: options.timeout ?? parseInt(process.env.API_TIMEOUT_MS || String(600 * 1000), 10),
    dangerouslyAllowBrowser: true,
    // Proxy/mTLS/unix-socket support — same infrastructure as Anthropic SDK client
    fetchOptions: getProxyFetchOptions({ forAnthropicAPI: false }) as typeof OpenAI.prototype['fetchOptions'],
    // Custom headers from provider config (e.g., volces, ark-specific headers)
    ...(options.headers && { defaultHeaders: options.headers }),
  })

  clientCache.set(key, client)
  return client
}

// ===== Non-streaming request =====

/**
 * Create a non-streaming chat completion request using the SDK.
 * Returns the typed response directly.
 */
export async function createOpenAIChatCompletion(
  params: OpenAI.ChatCompletionCreateParamsNonStreaming,
  options: OpenAIClientOptions,
  signal?: AbortSignal,
): Promise<OpenAI.ChatCompletion> {
  const client = getOpenAIClient(options)

  logForDebugging(
    `[openaiClient] POST ${options.baseUrl} (model=${params.model}, non-streaming)`,
    { level: 'debug' },
  )

  // Non-streaming request - no stream_options needed
  return client.chat.completions.create(params, { signal })
}

// ===== Streaming request =====

/**
 * Create a streaming chat completion request using the SDK.
 * Returns an async iterable of typed ChatCompletionChunk objects.
 *
 * The caller (openaiStreamAdapter) handles converting these chunks
 * into Anthropic-format stream events.
 */
export async function* createOpenAIChatCompletionStream(
  params: OpenAI.ChatCompletionCreateParamsStreaming,
  options: OpenAIClientOptions,
  signal?: AbortSignal,
): AsyncGenerator<OpenAI.ChatCompletionChunk> {
  const client = getOpenAIClient(options)

  // Inject DeepSeek thinking parameters if applicable
  const thinkingEnabled = isOpenAIThinkingEnabled(params.model)

  const requestParams: OpenAI.ChatCompletionCreateParamsStreaming = {
    ...params,
    stream: true,
    stream_options: { include_usage: true },
    // DeepSeek thinking: inject 3 known parameter formats simultaneously
    ...(thinkingEnabled ? {
      thinking: { type: 'enabled' as const },
      enable_thinking: true,
      chat_template_kwargs: { thinking: true },
    } : {}),
  }

  logForDebugging(
    `[openaiClient] POST ${options.baseUrl} (stream, model=${params.model}, thinking=${thinkingEnabled})`,
    { level: 'debug' },
  )

  const stream = await client.chat.completions.create(requestParams, { signal })

  for await (const chunk of stream) {
    yield chunk
  }
}
