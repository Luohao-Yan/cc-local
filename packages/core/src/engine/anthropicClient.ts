/**
 * Anthropic API 客户端封装
 * 提供简化的 Claude API 调用
 */

import Anthropic from '@anthropic-ai/sdk'
import type { Message, MessageContent } from '@cclocal/shared'

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
            break

          case 'content_block_delta':
            if (event.delta.type === 'text_delta') {
              yield { type: 'text', text: event.delta.text }
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
