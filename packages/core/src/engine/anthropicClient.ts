/**
 * Anthropic API 客户端封装
 * 提供简化的 Claude API 调用
 */

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { Message, MessageContent } from '@cclocal/shared'
import { isOpenAIThinkingEnabled, normalizeBaseUrl } from './thinkingUtils.js'

export interface AnthropicClientOptions {
  apiKey?: string
  baseUrl?: string
  model?: string
  maxRetries?: number
  timeout?: number
}

export class AnthropicClient {
  private client: Anthropic
  private model: string

  constructor(options: AnthropicClientOptions = {}) {
    this.client = new Anthropic({
      apiKey: options.apiKey || process.env.ANTHROPIC_API_KEY,
      baseURL: options.baseUrl,
      maxRetries: options.maxRetries ?? 3,
      timeout: options.timeout ?? 60000,
    })
    this.model = options.model || 'claude-3-5-sonnet-20241022'
  }

  /**
   * 流式查询 Claude API
   */
  async *streamQuery(
    messages: Message[],
    options: {
      systemPrompt?: string
      maxTokens?: number
      temperature?: number
      tools?: unknown[]
    } = {}
  ): AsyncGenerator<
    | { type: 'text'; text: string }
    | { type: 'thinking'; thinking: string }
    | { type: 'tool_use'; name: string; input: unknown; id: string }
    | { type: 'error'; error: string }
    | { type: 'usage'; inputTokens: number; outputTokens: number }
  > {
    try {
      // 转换消息格式
      const apiMessages = this.convertMessages(messages)

      const stream = await this.client.messages.create({
        model: this.model,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.7,
        system: options.systemPrompt,
        messages: apiMessages,
        tools: options.tools as Anthropic.Messages.Tool[],
        stream: true,
      })

      let inputTokens = 0
      let outputTokens = 0

      for await (const event of stream) {
        switch (event.type) {
          case 'message_start':
            inputTokens = event.message.usage?.input_tokens || 0
            break

          case 'content_block_start':
            if (event.content_block.type === 'tool_use') {
              yield {
                type: 'tool_use',
                name: event.content_block.name,
                input: event.content_block.input,
                id: event.content_block.id,
              }
            }
            if (event.content_block.type === 'thinking') {
              // Yield thinking block start with initial text if present
              if ('thinking' in event.content_block && event.content_block.thinking) {
                yield { type: 'thinking', thinking: event.content_block.thinking }
              }
            }
            break

          case 'content_block_delta':
            if (event.delta.type === 'text_delta') {
              yield { type: 'text', text: event.delta.text }
            }
            if (event.delta.type === 'thinking_delta') {
              yield { type: 'thinking', thinking: event.delta.thinking }
            }
            break

          case 'message_delta':
            if (event.usage) {
              outputTokens = event.usage.output_tokens
            }
            break

          case 'message_stop':
            yield { type: 'usage', inputTokens, outputTokens }
            break
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      yield { type: 'error', error: errorMessage }
    }
  }

  /**
   * 非流式查询（简单场景使用）
   */
  async query(
    messages: Message[],
    options: {
      systemPrompt?: string
      maxTokens?: number
      temperature?: number
    } = {}
  ): Promise<{
    content: MessageContent[]
    usage: { inputTokens: number; outputTokens: number }
  }> {
    const apiMessages = this.convertMessages(messages)

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.7,
      system: options.systemPrompt,
      messages: apiMessages,
    })

    const content: MessageContent[] = response.content.map((block) => {
      if (block.type === 'text') {
        return { type: 'text', text: block.text }
      }
      if (block.type === 'tool_use') {
        return {
          type: 'tool_use',
          name: block.name,
          input: block.input,
          id: block.id,
        }
      }
      return { type: 'text', text: '' }
    })

    return {
      content,
      usage: {
        inputTokens: response.usage?.input_tokens || 0,
        outputTokens: response.usage?.output_tokens || 0,
      },
    }
  }

  /**
   * 将内部消息格式转换为 Anthropic API 格式
   */
  private convertMessages(messages: Message[]): Anthropic.Messages.MessageParam[] {
    return messages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
          .filter((c): c is Exclude<MessageContent, { type: 'thinking'; thinking: string }> => c.type !== 'thinking')
          .map((c) => {
            if (c.type === 'text') {
              return { type: 'text' as const, text: c.text }
            }
            if (c.type === 'tool_use') {
              return {
                type: 'tool_use' as const,
                id: c.id,
                name: c.name,
                input: c.input,
              }
            }
            return {
              type: 'tool_result' as const,
              tool_use_id: c.tool_use_id,
              content: c.content,
              is_error: c.is_error,
            }
          }),
      }))
  }
}

// ===== OpenAI-compatible client =====

const openAIClientCache = new Map<string, OpenAI>()

function makeCacheKey(baseUrl: string, apiKey: string | null): string {
  return `${baseUrl}::${apiKey ?? ''}`
}

/** Clear cached OpenAI clients. */
export function clearOpenAIClientCache(): void {
  openAIClientCache.clear()
}

/**
 * OpenAI-Compatible API Client
 *
 * Implements the same streamQuery interface as AnthropicClient, but uses
 * the OpenAI SDK to communicate with OpenAI-compatible endpoints
 * (/v1/chat/completions). The SDK handles:
 * - SSE stream parsing (no manual line parsing)
 * - Typed errors (APIError, AuthenticationError, etc.)
 * - Automatic retry
 * - AbortSignal support
 * - Proxy via fetchOptions (when available from the CLI package)
 *
 * The proxy configuration is injected at the bridge layer
 * (queryEngineAdapter.ts) where the CLI's getProxyFetchOptions() is
 * accessible, and passed through via the `fetchOptions` constructor param.
 */
export class OpenAICompatibleClient {
  private client: OpenAI
  private model: string

  constructor(options: {
    baseUrl: string
    apiKey?: string | null
    headers?: Record<string, string>
    model?: string
    maxRetries?: number
    timeout?: number
    /** Proxy/TLS options injected from CLI layer via getProxyFetchOptions() */
    fetchOptions?: typeof OpenAI.prototype['fetchOptions']
    /** Custom fetch function (e.g., for usage tracking wrappers) */
    fetch?: typeof fetch
  }) {
    const key = makeCacheKey(options.baseUrl, options.apiKey ?? null)
    const cached = openAIClientCache.get(key)
    if (cached) {
      this.client = cached
    } else {
      const baseURL = normalizeBaseUrl(options.baseUrl)
      this.client = new OpenAI({
        apiKey: options.apiKey ?? '',
        ...(baseURL && { baseURL }),
        maxRetries: options.maxRetries ?? 0,
        timeout: options.timeout ?? 600_000,
        dangerouslyAllowBrowser: true,
        ...(options.headers && { defaultHeaders: options.headers }),
        ...(options.fetchOptions && { fetchOptions: options.fetchOptions }),
        ...(options.fetch && { fetch: options.fetch }),
      })
      openAIClientCache.set(key, this.client)
    }
    this.model = options.model || 'gpt-4o'
  }

  /**
   * Stream query using OpenAI-compatible endpoint.
   * Yields events in the same format as AnthropicClient.streamQuery
   * so the QueryEngine can consume them uniformly.
   */
  async *streamQuery(
    messages: Message[],
    options: {
      systemPrompt?: string
      maxTokens?: number
      temperature?: number
      tools?: unknown[]
    } = {}
  ): AsyncGenerator<
    | { type: 'text'; text: string }
    | { type: 'thinking'; thinking: string }
    | { type: 'tool_use'; name: string; input: unknown; id: string }
    | { type: 'error'; error: string }
    | { type: 'usage'; inputTokens: number; outputTokens: number }
  > {
    try {
      // Build OpenAI-compatible messages
      const openaiMessages: OpenAI.ChatCompletionMessageParam[] = []

      if (options.systemPrompt) {
        openaiMessages.push({ role: 'system', content: options.systemPrompt })
      }

      for (const msg of messages) {
        if (msg.role === 'system') continue
        const textParts = msg.content
          .filter(c => c.type === 'text')
          .map(c => c.type === 'text' ? c.text : '')
          .join('\n')

        if (msg.role === 'assistant') {
          const toolUses = msg.content.filter(c => c.type === 'tool_use')
          if (toolUses.length > 0) {
            openaiMessages.push({
              role: 'assistant',
              content: textParts || null,
              tool_calls: toolUses.map(c => ({
                id: c.id,
                type: 'function' as const,
                function: { name: c.name, arguments: JSON.stringify(c.input) },
              })),
            })
          } else {
            openaiMessages.push({ role: 'assistant', content: textParts })
          }
        } else if (msg.role === 'user') {
          const toolResults = msg.content.filter(c => c.type === 'tool_result')
          if (toolResults.length > 0) {
            for (const tr of toolResults) {
              const isError = (tr as any).is_error === true
              let trContent = (tr.content as string) || ''
              if (typeof tr.content !== 'string' && Array.isArray(tr.content)) {
                trContent = (tr.content as any[]).filter(c => c.type === 'text').map(c => c.text as string).join('\n')
              }
              openaiMessages.push({
                role: 'tool',
                content: isError ? `[ERROR] ${trContent}` : trContent,
                tool_call_id: tr.tool_use_id,
              })
            }
          } else {
            openaiMessages.push({ role: 'user', content: textParts })
          }
        }
      }

      // Build request params
      const thinkingEnabled = isOpenAIThinkingEnabled(this.model)
      const requestParams: OpenAI.ChatCompletionCreateParamsStreaming = {
        model: this.model,
        messages: openaiMessages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.7,
        stream: true,
        stream_options: { include_usage: true },
        // DeepSeek thinking injection — 3 formats simultaneously
        ...(thinkingEnabled ? {
          thinking: { type: 'enabled' as const },
          enable_thinking: true,
          chat_template_kwargs: { thinking: true },
        } : {}),
      }

      // Convert tools if provided
      if (options.tools && Array.isArray(options.tools)) {
        const openaiTools: OpenAI.ChatCompletionTool[] = []
        for (const tool of options.tools as any[]) {
          if (tool.type === 'custom' || tool.input_schema) {
            openaiTools.push({
              type: 'function',
              function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.input_schema,
              },
            })
          }
        }
        if (openaiTools.length > 0) {
          requestParams.tools = openaiTools
        }
      }

      const stream = await this.client.chat.completions.create(requestParams)

      // Accumulate tool calls across chunks
      let inputTokens = 0
      let outputTokens = 0
      const toolCallBuffers = new Map<number, { id: string; name: string; arguments: string }>()

      for await (const chunk of stream) {
        // Update usage from final chunk
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens ?? inputTokens
          outputTokens = chunk.usage.completion_tokens ?? outputTokens
        }

        const choice = chunk.choices?.[0]
        if (!choice) continue

        const delta = choice.delta

        // Handle reasoning content (DeepSeek)
        const reasoningContent = (delta as any).reasoning_content as string | null | undefined
        if (reasoningContent != null && reasoningContent !== '') {
          yield { type: 'thinking', thinking: reasoningContent }
        }

        // Handle text content
        if (delta.content && typeof delta.content === 'string' && delta.content !== '') {
          yield { type: 'text', text: delta.content }
        }

        // Handle tool calls — accumulate and emit on finish
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.id) {
              // Start of new tool call
              toolCallBuffers.set(tc.index, {
                id: tc.id,
                name: tc.function?.name || '',
                arguments: tc.function?.arguments || '',
              })
            } else if (tc.function?.arguments) {
              // Continuation of existing tool call
              const existing = toolCallBuffers.get(tc.index)
              if (existing) {
                existing.arguments += tc.function.arguments
              }
            }
          }
        }

        // On finish_reason, yield all accumulated tool calls
        if (choice.finish_reason === 'tool_calls') {
          for (const [, tc] of toolCallBuffers) {
            let input: unknown = {}
            try {
              input = JSON.parse(tc.arguments)
            } catch { /* keep empty input */ }
            yield {
              type: 'tool_use',
              name: tc.name,
              input,
              id: tc.id,
            }
          }
          toolCallBuffers.clear()
        }

        // On any finish, emit usage
        if (choice.finish_reason) {
          yield { type: 'usage', inputTokens, outputTokens }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      yield { type: 'error', error: errorMessage }
    }
  }
}