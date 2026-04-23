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
import { toolRegistry } from '../tools/registry.js'
import {
  decideToolPermission,
  filterToolsByPermission,
  type PermissionPolicy,
} from '../permissions/permissionPolicy.js'

export interface QueryEngineOptions {
  model: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  maxTurns?: number
  enabledTools?: string[]
  tools?: Tool[]
  onStream?: (event: StreamEvent) => void
  apiKey?: string
  baseUrl?: string
  client?: Pick<AnthropicClient, 'streamQuery'>
  permissionPolicy?: PermissionPolicy
}

type QueryClient = Pick<AnthropicClient, 'streamQuery'>

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
  private client: QueryClient

  constructor(options: QueryEngineOptions) {
    this.options = options
    this.client = options.client ?? new AnthropicClient({
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
      const allTools = filterToolsByName(opts.tools ?? toolRegistry.getAll(), opts.enabledTools)
      const availableTools = filterToolsByPermission(
        allTools,
        opts.permissionPolicy
      )

      // 发送流开始事件
      opts.onStream?.({
        type: 'stream_start',
        messageId,
      })

      // 准备工具定义
      const tools = availableTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.input_schema,
      }))

      // 执行查询（支持工具循环）
      const result = await this.executeWithTools(
        messages,
        tools,
        {
          ...opts,
          tools: allTools,
        },
        messageId
      )

      // 发送流结束事件
      opts.onStream?.({
        type: 'stream_end',
        messageId,
      })

      return result
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

  /**
   * 执行查询并处理工具调用循环
   */
  private async executeWithTools(
    messages: Message[],
    tools: Array<{ name: string; description: string; input_schema: unknown }> | undefined,
    opts: QueryEngineOptions,
    messageId: string
  ): Promise<QueryResult> {
    let currentMessages = [...messages]
    let fullResponse = ''
    let inputTokens = 0
    let outputTokens = 0
    let maxIterations = Math.max(1, opts.maxTurns ?? 10) // 防止无限循环

    while (maxIterations-- > 0) {
      // 调用 Anthropic API 流式查询
      const stream = this.client.streamQuery(currentMessages, {
        systemPrompt: opts.systemPrompt,
        maxTokens: opts.maxTokens,
        temperature: opts.temperature,
        tools,
      })

      const toolCalls: Array<{ name: string; input: unknown; id: string }> = []

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
            toolCalls.push({
              name: event.name,
              input: event.input,
              id: event.id,
            })
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
            inputTokens += event.inputTokens
            outputTokens += event.outputTokens
            break

          case 'error':
            throw new Error(event.error)
        }
      }

      // 如果没有工具调用，直接返回结果
      if (toolCalls.length === 0) {
        break
      }

      // 执行工具调用
      const toolResults: Message[] = []
      for (const toolCall of toolCalls) {
        const tool = opts.tools?.find((t) => t.name === toolCall.name)
        if (!tool) {
          toolResults.push({
            id: randomUUID(),
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: toolCall.id,
              content: `Tool "${toolCall.name}" not found`,
              is_error: true,
            }],
            timestamp: Date.now(),
          })
          continue
        }

        const decision = decideToolPermission(tool.name, opts.permissionPolicy)
        if (!decision.allowed) {
          toolResults.push({
            id: randomUUID(),
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: toolCall.id,
              content: decision.reason || `Tool "${toolCall.name}" denied by policy`,
              is_error: true,
            }],
            timestamp: Date.now(),
          })
          continue
        }

        // 执行工具
        const context: ToolContext = {
          sessionId: messageId,
          cwd: process.cwd(),
          abortSignal: this.abortController?.signal,
        }

        const result = await this.executeTool(tool, toolCall.input, context)

        toolResults.push({
          id: randomUUID(),
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: toolCall.id,
            content: result.content,
            is_error: result.is_error,
          }],
          timestamp: Date.now(),
        })
      }

      // 更新消息列表继续循环
      currentMessages = [...currentMessages, ...toolResults]
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
        inputTokens,
        outputTokens,
      },
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

function filterToolsByName(tools: Tool[], enabledTools?: string[]): Tool[] {
  if (!enabledTools) {
    return tools
  }
  if (enabledTools.length === 0) {
    return []
  }
  if (enabledTools.includes('default')) {
    return tools
  }
  const allowed = new Set(enabledTools)
  return tools.filter((tool) => allowed.has(tool.name))
}
