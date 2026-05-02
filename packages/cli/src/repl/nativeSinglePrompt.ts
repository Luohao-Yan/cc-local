/**
 * Native single-prompt handler — 直接使用 QueryEngine + SessionStore
 *
 * 当 --print 使用时（无显式 --server），默认走此路径，
 * 绕过 CCLocalClient REST/SSE，在进程内完成单次查询。
 *
 * stream-json 输出格式与 CCLocalClient SSE 事件对齐：
 *   - message_start, content_block_start, content_block_delta,
 *     content_block_stop, message_stop (Anthropic 兼容)
 *   - result (最终聚合结果)
 *   - stream_end
 */

import { randomUUID } from 'crypto'
import type { Message, StreamEvent, PermissionPolicy, Tool } from '@cclocal/shared'
import { QueryEngine, type QueryResult } from '@cclocal/core'
import { getSessionStore } from '@cclocal/core'
import { mcpManager } from '@cclocal/core'
import { toolRegistry } from '@cclocal/core'

interface NativeSinglePromptOptions {
  prompt: string
  model: string
  outputFormat: 'text' | 'json' | 'stream-json'
  cwd?: string
  systemPrompt?: string
  permissionPolicy?: PermissionPolicy
  maxTurns?: number
  maxThinkingTokens?: number
  sessionId?: string
  sessionName?: string
  noSessionPersistence?: boolean
  includePartialMessages?: boolean
  replayUserMessages?: boolean
  apiKey?: string
  baseUrl?: string
  ide?: boolean
  chrome?: boolean | undefined
}

export async function handleNativeSinglePrompt(
  options: NativeSinglePromptOptions
): Promise<{ text: string; messageId?: string }> {
  const {
    prompt,
    model,
    outputFormat = 'text',
    cwd = process.cwd(),
    systemPrompt,
    permissionPolicy,
    maxTurns,
    sessionId,
    sessionName,
    noSessionPersistence = false,
    includePartialMessages = false,
    replayUserMessages = false,
    apiKey,
    baseUrl,
    ide: ideFlag = false,
    chrome: chromeFlag = undefined,
  } = options

  // ─── 同步 MCP 工具 ──────────────────────────────
  const mcpServers = mcpManager.listServers()
  for (const server of mcpServers) {
    if (server.status === 'connected' || server.status === 'disconnected') {
      try {
        await mcpManager.connectServer(server.name)
      } catch {
        // 连接失败不阻塞主流程
      }
    }
  }

  // ─── IDE 集成 ────────────────────────────────────
  let ideMetadataString = ''
  if (ideFlag) {
    const { detectAndConnectIDE } = await import('./ideIntegration.js')
    const ideResult = await detectAndConnectIDE(true, mcpManager)
    if (ideResult.ide) {
      ideMetadataString = ideResult.metadataString
    }
  }

  // ─── Chrome 集成 ──────────────────────────────────
  let chromeSystemPrompt = ''
  if (chromeFlag !== false) {
    try {
      const { setupChromeIntegration } = await import('./chromeIntegration.js')
      const chromeResult = await setupChromeIntegration(chromeFlag, mcpManager)
      if (chromeResult.enabled) {
        chromeSystemPrompt = chromeResult.systemPrompt
      }
    } catch (err) {
      if (chromeFlag === true) {
        console.error(`Chrome integration failed: ${err instanceof Error ? err.message : String(err)}`)
        process.exit(1)
      }
    }
  }

  // ─── 收集工具 ─────────────────────────────────────
  const allTools: Tool[] = toolRegistry.getAll()

  // ─── 创建 QueryEngine ─────────────────────────────────
  const effectiveSystemPrompt = [
    systemPrompt,
    ideMetadataString ? `\n<ide_context>\n${ideMetadataString}\n</ide_context>` : '',
    chromeSystemPrompt,
  ].filter(Boolean).join('\n') || undefined

  const engine = new QueryEngine({
    model,
    systemPrompt: effectiveSystemPrompt,
    maxTurns,
    tools: allTools,
    apiKey,
    baseUrl,
    permissionPolicy,
    // In non-interactive --print mode, auto-deny tools that need approval
    onPermissionCheck: async (_toolName, _input, _reason) => false,
  })

  // ─── 准备输出 ─────────────────────────────────────
  const messageId = randomUUID()
  let response = ''

  const emitJsonLine = (payload: Record<string, unknown>): void => {
    process.stdout.write(`${JSON.stringify(payload)}\n`)
  }

  // ─── 会话管理 ─────────────────────────────────────
  const store = noSessionPersistence ? null : getSessionStore()
  let currentSessionId = sessionId ?? ''

  if (store && !currentSessionId) {
    const id = randomUUID()
    store.createSession({
      id,
      name: sessionName || `Print ${new Date().toLocaleString()}`,
      cwd,
      model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    currentSessionId = id
  }

  // ─── 构建消息数组 ─────────────────────────────────
  let messages: Message[] = []

  if (store && currentSessionId) {
    const existing = store.getMessages(currentSessionId)
    if (replayUserMessages && outputFormat === 'stream-json') {
      for (const m of existing) {
        if (m.role === 'user') {
          emitJsonLine({
            type: 'user',
            sessionId: currentSessionId,
            message: { role: m.role, content: m.content },
            isReplay: true,
          })
        }
      }
    }
    messages = existing
  }

  // 添加用户消息
  const userMessage: Message = {
    id: randomUUID(),
    role: 'user',
    content: [{ type: 'text', text: prompt }],
    timestamp: Date.now(),
  }

  messages.push(userMessage)

  if (store && currentSessionId) {
    store.addMessage(userMessage, currentSessionId)
  }

  // ─── 流事件处理 ────────────────────────────────────
  let blockIndex = 0

  const onStream = (event: StreamEvent): void => {
    switch (event.type) {
      case 'stream_start':
        if (outputFormat === 'stream-json') {
          emitJsonLine({
            type: 'message_start',
            sessionId: currentSessionId,
            messageId: event.messageId ?? messageId,
          })
        }
        break

      case 'stream_delta':
        if (event.delta?.type === 'text' && event.delta.text) {
          response += event.delta.text
          if (outputFormat === 'text') {
            process.stdout.write(event.delta.text)
          } else if (outputFormat === 'stream-json' && includePartialMessages) {
            emitJsonLine({
              type: 'content_block_delta',
              index: blockIndex,
              delta: { type: 'text_delta', text: event.delta.text },
              sessionId: currentSessionId,
              messageId,
            })
          }
        } else if (event.delta?.type === 'thinking' && event.delta.thinking) {
          if (outputFormat === 'stream-json' && includePartialMessages) {
            emitJsonLine({
              type: 'content_block_delta',
              index: blockIndex,
              delta: { type: 'thinking_delta', thinking: event.delta.thinking },
              sessionId: currentSessionId,
              messageId,
            })
          }
        }
        break

      case 'tool_call':
        if (outputFormat === 'stream-json' && includePartialMessages) {
          emitJsonLine({
            type: 'content_block_start',
            index: ++blockIndex,
            content_block: {
              type: 'tool_use',
              id: event.toolCall?.id ?? randomUUID(),
              name: event.toolCall?.name,
            },
            sessionId: currentSessionId,
            messageId,
          })
        }
        break

      case 'stream_end':
        if (outputFormat === 'text') {
          console.log()
        } else if (outputFormat === 'stream-json') {
          emitJsonLine({
            type: 'result',
            sessionId: currentSessionId,
            messageId,
            text: response,
          })
          emitJsonLine({
            type: 'message_stop',
            sessionId: currentSessionId,
            messageId,
          })
        }
        break

      case 'error':
        if (outputFormat === 'stream-json') {
          emitJsonLine({
            type: 'error',
            sessionId: currentSessionId,
            messageId,
            error: event.error || 'Unknown error',
          })
        } else {
          console.error('Error:', event.error)
        }
        break
    }
  }

  // ─── 执行查询 ─────────────────────────────────────
  try {
    const result: QueryResult = await engine.query(messages, {
      onStream,
      permissionPolicy,
    })

    // 持久化助手消息
    if (store && currentSessionId) {
      store.addMessage(result.message, currentSessionId)
      store.updateSession(currentSessionId, { updatedAt: Date.now() })
    }

    return {
      text: result.message.content
        .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
        .map(c => c.text)
        .join(''),
      messageId,
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Query aborted') {
      return { text: '(Cancelled)', messageId }
    }
    throw error
  }
}
