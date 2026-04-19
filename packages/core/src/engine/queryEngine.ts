/**
 * QueryEngine - 核心查询引擎（无 UI 版本）
 * 处理 AI 模型调用和工具执行
 */

import { randomUUID } from 'crypto'
import type {
  Message,
  AssistantMessage,
  Tool,
  ToolContext,
  StreamEvent,
} from '@cclocal/shared'
import { AnthropicClient } from './anthropicClient.js'

export interface QueryEngineOptions {
  model: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  tools?: Tool[]
  onStream?: (event: StreamEvent) => void
  apiKey?: string
  baseUrl?: string
}

export interface QueryResult {
  message: AssistantMessage
  usage: {
    inputTokens: number
    outputTokens: number
  }
}

export class QueryEngine {
  private options: QueryEngineOptions
  private abortController?: AbortController
  private client: AnthropicClient

  constructor(options: QueryEngineOptions) {
    this.options = options
    this.client = new AnthropicClient({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      model: options.model,
    })
  }

  async query(
    messages: Message[],
    options?: Partial<QueryEngineOptions>
  ): Promise<QueryResult> {
    const opts = { ...this.options, ...options }
    this.abortController = new AbortController()

    const messageId = randomUUID()

    try {
      // 发送流开始事件
      opts.onStream?.({
        type: 'stream_start',
        messageId,
      })

      // 准备工具定义
      const tools = opts.tools?.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.input_schema,
      }))

      // 调用 Anthropic API 流式查询
      const stream = this.client.streamQuery(messages, {
        systemPrompt: opts.systemPrompt,
        maxTokens: opts.maxTokens,
        temperature: opts.temperature,
        tools,
      })

      let fullResponse = ''
      let inputTokens = 0
      let outputTokens = 0

      for await (const event of stream) {
        // 检查是否被取消
        if (this.abortController?.signal.aborted) {
          throw new Error('Query aborted')
        }

        switch (event.type) {
          case 'text':
            fullResponse += event.text
            opts.onStream?.({
              type: 'stream_delta',
              messageId,
              delta: {
                type: 'text',
                text: event.text,
              },
            })
            break

          case 'tool_use':
            opts.onStream?.({
              type: 'tool_call',
              messageId,
              toolCall: {
                name: event.name,
                input: event.input,
              },
            })
            break

          case 'usage':
            inputTokens = event.inputTokens
            outputTokens = event.outputTokens
            break

          case 'error':
            throw new Error(event.error)
        }
      }

      // 发送流结束事件
      opts.onStream?.({
        type: 'stream_end',
        messageId,
      })

      // 构建助手消息
      const assistantMessage: AssistantMessage = {
        id: messageId,
        role: 'assistant',
        content: [{ type: 'text', text: fullResponse.trim() }],
        timestamp: Date.now(),
      } as AssistantMessage

      return {
        message: assistantMessage,
        usage: {
          inputTokens,
          outputTokens,
        },
      }
    } catch (error) {
      // 发送错误事件
      opts.onStream?.({
        type: 'error',
        messageId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    } finally {
      this.abortController = undefined
    }
  }

  cancel(): void {
    this.abortController?.abort()
  }

  // 工具执行
  async executeTool(
    tool: Tool,
    input: unknown,
    context: ToolContext
  ): Promise<{ content: string; is_error?: boolean }> {
    try {
      const result = await tool.execute(input, context)
      return result
    } catch (error) {
      return {
        content: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
        is_error: true,
      }
    }
  }
}
