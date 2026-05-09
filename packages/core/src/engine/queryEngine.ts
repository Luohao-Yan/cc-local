/**
 * QueryEngine - 核心查询引擎（无 UI 版本）
 * 处理 AI 模型调用和工具执行
 */

import { randomUUID } from 'crypto'
import type {
  Message,
  AssistantMessage,
  MessageContent,
  Tool,
  ToolContext,
  ToolResult,
  StreamEvent,
} from '@cclocal/shared'
import { AnthropicClient, OpenAICompatibleClient } from './anthropicClient.js'
import { toolRegistry } from '../tools/registry.js'
import {
  decideToolPermission,
  filterToolsByPermission,
  HIGH_RISK_TOOLS,
  EDIT_TOOLS,
  type PermissionPolicy,
} from '../permissions/permissionPolicy.js'

/**
 * 最大并行工具执行数
 * 默认 10，与原版 Claude Code 一致
 * 可通过环境变量 CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY 配置
 */
function getMaxToolUseConcurrency(): number {
  return parseInt(process.env.CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY || '', 10) || 10
}

/**
 * 只读工具集合 - 这些工具可以安全并发执行
 */
const READ_ONLY_TOOLS = new Set([
  'file_read',
  'grep',
  'glob',
  'list_directory',
  'web_search',
  'web_fetch',
  'query_progress',
  'view_project',
  'search_code',
])

/**
 * 检查工具是否并发安全
 * 只读工具可以并行执行，写入工具必须串行
 */
function isToolConcurrencySafe(toolName: string): boolean {
  return READ_ONLY_TOOLS.has(toolName.toLowerCase())
}

/**
 * 工具调用批次
 */
interface ToolBatch {
  tools: Array<{ name: string; input: unknown; id: string }>
  isConcurrencySafe: boolean
}

/**
 * 将工具调用分区为批次
 * 并发安全的工具可以合并到同一批次
 * 非并发安全的工具单独成批
 */
function partitionToolCalls(toolCalls: Array<{ name: string; input: unknown; id: string }>): ToolBatch[] {
  const batches: ToolBatch[] = []

  for (const toolCall of toolCalls) {
    const isSafe = isToolConcurrencySafe(toolCall.name)
    const lastBatch = batches[batches.length - 1]

    // 如果上一批次也是并发安全的，合并
    if (lastBatch && lastBatch.isConcurrencySafe && isSafe) {
      lastBatch.tools.push(toolCall)
    } else {
      // 否则创建新批次
      batches.push({
        tools: [toolCall],
        isConcurrencySafe: isSafe,
      })
    }
  }

  return batches
}

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
  /** Called when a tool needs user approval (default permission mode). Return true to allow, false to deny. */
  onPermissionCheck?: (toolName: string, input: unknown, reason?: string) => Promise<boolean>
  /** API format: 'anthropic' uses the Anthropic Messages API, 'openai' uses Chat Completions API */
  apiFormat?: 'anthropic' | 'openai'
  /** Custom headers to send with each request */
  headers?: Record<string, string>
  /** Proxy/TLS fetch options injected from CLI layer (getProxyFetchOptions) */
  fetchOptions?: Record<string, unknown>
  /** Custom fetch function (e.g., for usage tracking wrappers) */
  fetch?: typeof fetch
}

type QueryClient = Pick<AnthropicClient, 'streamQuery'>

export interface QueryResult {
  message: AssistantMessage
  usage: {
    inputTokens: number
    outputTokens: number
  }
  costUsd?: number
}

export class QueryEngine {
  private options: QueryEngineOptions
  private abortController?: AbortController
  private client: QueryClient

  constructor(options: QueryEngineOptions) {
    this.options = options
    if (options.apiFormat === 'openai') {
      this.client = new OpenAICompatibleClient({
        baseUrl: options.baseUrl ?? '',
        apiKey: options.apiKey,
        headers: options.headers,
        model: options.model,
        fetchOptions: options.fetchOptions as any,
        fetch: options.fetch,
      }) as unknown as QueryClient
    } else {
      this.client = options.client ?? new AnthropicClient({
        apiKey: options.apiKey,
        baseUrl: options.baseUrl,
        model: options.model,
      })
    }
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
    // Accumulate across ALL turns for the final returned message
    let fullResponse = ''
    let fullThinking = ''
    const allToolUseBlocks: MessageContent[] = []
    // Per-turn content blocks to preserve correct ordering in final message
    const turnContentBlocks: Array<{
      thinking?: string
      text?: string
      toolUses: MessageContent[]
    }> = []
    let inputTokens = 0
    let outputTokens = 0
    let maxIterations = Math.max(1, opts.maxTurns ?? 10) // 防止无限循环

    while (maxIterations-- > 0) {
      // Track per-turn text/thinking for the turn record,
      // but keep accumulating into fullResponse/fullThinking
      let turnText = ''
      let turnThinking = ''

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
            turnText += event.text
            opts.onStream?.({
              type: 'stream_delta',
              messageId,
              delta: {
                type: 'text',
                text: event.text,
              },
            })
            break

          case 'thinking':
            fullThinking += event.thinking
            turnThinking += event.thinking
            opts.onStream?.({
              type: 'stream_delta',
              messageId,
              delta: {
                type: 'thinking',
                thinking: event.thinking,
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

      // 如果没有工具调用，记录最后一轮的文本然后返回结果
      if (toolCalls.length === 0) {
        turnContentBlocks.push({
          thinking: turnThinking.trim() || undefined,
          text: turnText.trim() || undefined,
          toolUses: [],
        })
        break
      }

      // 分批执行工具调用
      // 并发安全的工具可以并行，非安全工具串行
      const batches = partitionToolCalls(toolCalls)
      const toolResultEntries: Array<{ toolCall: { name: string; input: unknown; id: string }; result: ToolResult }> = []

      for (const batch of batches) {
        // 检查是否被取消
        if (this.abortController?.signal.aborted) {
          throw new Error('Query aborted')
        }

        if (batch.isConcurrencySafe) {
          // 并发安全批次：并行执行，受最大并发数限制
          const maxConcurrency = getMaxToolUseConcurrency()
          const chunks = this.chunk(batch.tools, maxConcurrency)

          for (const chunk of chunks) {
            if (this.abortController?.signal.aborted) {
              throw new Error('Query aborted')
            }

            const chunkResults = await Promise.all(
              chunk.map(async (toolCall) => {
                return await this.executeToolCall(toolCall, opts, messageId)
              })
            )
            toolResultEntries.push(...chunkResults)
          }
        } else {
          // 非并发安全批次：串行执行
          for (const toolCall of batch.tools) {
            if (this.abortController?.signal.aborted) {
              throw new Error('Query aborted')
            }
            const result = await this.executeToolCall(toolCall, opts, messageId)
            toolResultEntries.push(result)
          }
        }
      }

      // Build assistant message for this turn (thinking + text + tool_use)
      // This MUST be appended to currentMessages BEFORE the tool_result user message
      // to maintain valid API message alternation: assistant(tool_use) → user(tool_result)
      // IMPORTANT: only use per-turn text/thinking for the API message, not accumulated
      const turnAssistantContent: MessageContent[] = []
      if (turnThinking.trim()) {
        turnAssistantContent.push({ type: 'thinking', thinking: turnThinking.trim() })
      }
      if (turnText.trim()) {
        turnAssistantContent.push({ type: 'text', text: turnText.trim() })
      }
      for (const toolCall of toolCalls) {
        turnAssistantContent.push({
          type: 'tool_use',
          name: toolCall.name,
          input: toolCall.input,
          id: toolCall.id,
        })
        allToolUseBlocks.push({
          type: 'tool_use',
          name: toolCall.name,
          input: toolCall.input,
          id: toolCall.id,
        })
      }

      // Record per-turn content for the final returned message
      // This preserves the correct ordering: thinking→text→tool_use per turn
      turnContentBlocks.push({
        thinking: turnThinking.trim() || undefined,
        text: turnText.trim() || undefined,
        toolUses: toolCalls.map(tc => ({
          type: 'tool_use' as const,
          name: tc.name,
          input: tc.input,
          id: tc.id,
        })),
      })

      const turnAssistantMessage: Message = {
        id: randomUUID(),
        role: 'assistant',
        content: turnAssistantContent,
        timestamp: Date.now(),
      }

      // Build tool_result user message
      const toolResultContents: Array<{ type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }> = []
      for (const { toolCall, result } of toolResultEntries) {
        const normalizedContent = typeof result.content === 'string'
          ? result.content
          : Array.isArray(result.content)
            ? result.content.map((c) => c.text ?? JSON.stringify(c)).join('\n')
            : String(result.content)

        toolResultContents.push({
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: normalizedContent,
          is_error: result.is_error,
        })
      }

      const toolResultUserMessage: Message = {
        id: randomUUID(),
        role: 'user',
        content: toolResultContents,
        timestamp: Date.now(),
      }

      // Append BOTH assistant and user messages to maintain valid API sequence:
      // ...previous → assistant(with tool_use) → user(with tool_result)
      currentMessages = [...currentMessages, turnAssistantMessage, toolResultUserMessage]
    }

    // Build the final assistant message for the return value.
    // Content is ordered by turn: each turn's thinking → text → tool_use blocks.
    // This ensures semantic consistency — text and tool_use from the same turn
    // appear together, not text from turn N mixed with tool_use from turn 1.
    const finalContentBlocks: MessageContent[] = []

    for (const turn of turnContentBlocks) {
      if (turn.thinking) {
        finalContentBlocks.push({ type: 'thinking', thinking: turn.thinking })
      }
      if (turn.text) {
        finalContentBlocks.push({ type: 'text', text: turn.text })
      }
      for (const toolUse of turn.toolUses) {
        finalContentBlocks.push(toolUse)
      }
    }

    // Fallback: if no content at all, add empty text
    if (finalContentBlocks.length === 0) {
      finalContentBlocks.push({ type: 'text', text: '' })
    }

    const assistantMessage: AssistantMessage = {
      id: messageId,
      role: 'assistant',
      content: finalContentBlocks,
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
  ): Promise<ToolResult> {
    try {
      return await tool.execute(input, context)
    } catch (error) {
      return {
        content: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
        is_error: true,
      }
    }
  }

  /**
   * 执行单个工具调用
   */
  private async executeToolCall(
    toolCall: { name: string; input: unknown; id: string },
    opts: QueryEngineOptions,
    messageId: string
  ): Promise<{ toolCall: { name: string; input: unknown; id: string }; result: ToolResult }> {
    const tool = opts.tools?.find((t: Tool) => t.name === toolCall.name)
    if (!tool) {
      return {
        toolCall,
        result: {
          content: `Tool "${toolCall.name}" not found`,
          is_error: true,
        } satisfies ToolResult,
      }
    }

    const decision = decideToolPermission(tool.name, opts.permissionPolicy)
    let allowed = decision.allowed

    // In default mode, high-risk tools need user confirmation via callback
    if (allowed && opts.onPermissionCheck && opts.permissionPolicy?.mode !== 'bypassPermissions') {
      const isHighRisk = HIGH_RISK_TOOLS.has(tool.name.toLowerCase()) ||
        EDIT_TOOLS.has(tool.name.toLowerCase())
      if (isHighRisk) {
        allowed = await opts.onPermissionCheck(tool.name, toolCall.input, decision.reason)
      }
    }

    if (!allowed) {
      return {
        toolCall,
        result: {
          content: decision.reason || `Tool "${toolCall.name}" denied by policy`,
          is_error: true,
        } satisfies ToolResult,
      }
    }

    // 执行工具
    const context: ToolContext = {
      sessionId: messageId,
      cwd: process.cwd(),
      abortSignal: this.abortController?.signal,
      onProgress: opts.onStream ? (progress) => {
        opts.onStream!({
          type: 'stream_delta',
          messageId,
          delta: {
            type: 'text',
            text: progress.message,
          },
        })
      } : undefined,
      model: opts.model,
      onStream: opts.onStream,
      apiKey: opts.apiKey,
      baseUrl: opts.baseUrl,
      apiFormat: opts.apiFormat,
      headers: opts.headers,
      fetchOptions: opts.fetchOptions,
      fetch: opts.fetch,
      permissionPolicy: opts.permissionPolicy,
      onPermissionCheck: opts.onPermissionCheck,
      tools: opts.tools,
    }

    const result = await this.executeTool(tool, toolCall.input, context)
    return { toolCall, result }
  }

  /**
   * 将数组分割成指定大小的块
   */
  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
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
