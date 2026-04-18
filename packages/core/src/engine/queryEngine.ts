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

export interface QueryEngineOptions {
  model: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  tools?: Tool[]
  onStream?: (event: StreamEvent) => void
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

  constructor(options: QueryEngineOptions) {
    this.options = options
  }

  async query(
    messages: Message[],
    options?: Partial<QueryEngineOptions>
  ): Promise<QueryResult> {
    const opts = { ...this.options, ...options }
    this.abortController = new AbortController()

    try {
      // 发送流开始事件
      const messageId = randomUUID()
      opts.onStream?.({
        type: 'stream_start',
        messageId,
      })

      // TODO: 实际调用 AI API
      // 这里使用 mock 实现展示架构
      const response = await this.mockQuery(messages, opts, messageId)

      // 发送流结束事件
      opts.onStream?.({
        type: 'stream_end',
        messageId,
      })

      return response
    } finally {
      this.abortController = undefined
    }
  }

  cancel(): void {
    this.abortController?.abort()
  }

  private async mockQuery(
    messages: Message[],
    options: QueryEngineOptions,
    messageId: string
  ): Promise<QueryResult> {
    // 获取最后一条用户消息
    const lastMessage = messages[messages.length - 1]
    const userContent = lastMessage?.content
      .filter((c) => c.type === 'text')
      .map((c) => ('text' in c ? c.text : ''))
      .join('') || ''

    // 模拟流式响应
    const response = `I received: "${userContent.substring(0, 50)}${userContent.length > 50 ? '...' : ''}"

This is a mock response from QueryEngine. In production, this would call the actual AI API (Claude, Doubao, etc.).

To integrate with real API:
1. Add API client configuration
2. Implement streaming response handler
3. Add tool calling support
4. Add error handling and retries`

    const words = response.split(' ')
    let fullResponse = ''

    for (const word of words) {
      if (this.abortController?.signal.aborted) {
        throw new Error('Query aborted')
      }

      fullResponse += word + ' '

      // 发送增量更新
      options.onStream?.({
        type: 'stream_delta',
        messageId,
        delta: {
          type: 'text',
          text: word + ' ',
        },
      })

      // 模拟延迟
      await new Promise((resolve) => setTimeout(resolve, 30))
    }

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
        inputTokens: 100,
        outputTokens: words.length,
      },
    }
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
