import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

// ═══════════════════════════════════════════════════════════════════════════
// 消息 & 内容块类型（与 CLI stream-json 协议 1:1 对齐）
// ═══════════════════════════════════════════════════════════════════════════

export type ContentBlockType = 'text' | 'tool_use' | 'tool_result' | 'thinking' | 'image'

export interface TextBlock {
  type: 'text'
  text: string
}

export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
  /** 流式状态 */
  status: 'running' | 'completed' | 'error' | 'pending'
  /** 工具执行结果（完成后填充） */
  resultContent?: string
  isResultError?: boolean
}

export interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error?: boolean
}

export interface ThinkingBlock {
  type: 'thinking'
  thinking: string
  /** 是否已折叠 */
  collapsed: boolean
}

export interface ImageBlock {
  type: 'image'
  source: {
    type: 'base64'
    media_type: string
    data: string
  }
}

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock | ThinkingBlock | ImageBlock

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  /** 结构化内容块 */
  contentBlocks: ContentBlock[]
  /** 流式标记：当前消息是否仍在接收增量 */
  isStreaming?: boolean
  /** 消息成本 */
  costUsd?: number
}

// ═══════════════════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════════════════

interface MessagesState {
  items: Message[]
  /** 当前正在流式传输的消息 ID */
  streamingMessageId: string | null
  /** 当前流式内容块索引 */
  streamingBlockIndex: number
}

const initialState: MessagesState = {
  items: [],
  streamingMessageId: null,
  streamingBlockIndex: -1,
}

// ═══════════════════════════════════════════════════════════════════════════
// Slice
// ═══════════════════════════════════════════════════════════════════════════

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      state.items.push(action.payload)
    },

    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.items = action.payload
    },

    clearMessages: state => {
      state.items = []
      state.streamingMessageId = null
      state.streamingBlockIndex = -1
    },

    // ─── 流式消息操作 ─────────────────────────────────────────────────────

    /** 开始一个新的流式助手消息 */
    startStreaming: (state, action: PayloadAction<{ messageId: string }>) => {
      const { messageId } = action.payload
      state.streamingMessageId = messageId
      state.streamingBlockIndex = 0
      // 确保消息存在
      if (!state.items.find(m => m.id === messageId)) {
        state.items.push({
          id: messageId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          contentBlocks: [],
          isStreaming: true,
        })
      } else {
        const msg = state.items.find(m => m.id === messageId)!
        msg.isStreaming = true
      }
    },

    /** 结束流式传输 */
    finishStreaming: (state, action: PayloadAction<{ messageId: string; costUsd?: number }>) => {
      const { messageId, costUsd } = action.payload
      const msg = state.items.find(m => m.id === messageId)
      if (msg) {
        msg.isStreaming = false
        if (costUsd != null) msg.costUsd = costUsd
      }
      if (state.streamingMessageId === messageId) {
        state.streamingMessageId = null
        state.streamingBlockIndex = -1
      }
    },

    /** 追加文本增量到当前流式块 */
    appendTextDelta: (state, action: PayloadAction<{ messageId: string; text: string }>) => {
      const { messageId, text } = action.payload
      const msg = state.items.find(m => m.id === messageId)
      if (!msg) return

      // 找最后一个 text 块，追加
      const lastBlock = msg.contentBlocks[msg.contentBlocks.length - 1]
      if (lastBlock && lastBlock.type === 'text') {
        lastBlock.text += text
      } else {
        // 创建新 text 块
        msg.contentBlocks.push({ type: 'text', text })
      }
    },

    /** 追加 thinking 增量 */
    appendThinkingDelta: (state, action: PayloadAction<{ messageId: string; thinking: string }>) => {
      const { messageId, thinking } = action.payload
      const msg = state.items.find(m => m.id === messageId)
      if (!msg) return

      const lastBlock = msg.contentBlocks[msg.contentBlocks.length - 1]
      if (lastBlock && lastBlock.type === 'thinking' && !lastBlock.collapsed) {
        lastBlock.thinking += thinking
      } else {
        msg.contentBlocks.push({ type: 'thinking', thinking, collapsed: false })
      }
    },

    /** 添加一个 tool_use 块 */
    addToolUse: (state, action: PayloadAction<{ messageId: string; toolUse: { id: string; name: string; input: Record<string, unknown> } }>) => {
      const { messageId, toolUse } = action.payload
      const msg = state.items.find(m => m.id === messageId)
      if (!msg) return

      msg.contentBlocks.push({
        type: 'tool_use',
        id: toolUse.id,
        name: toolUse.name,
        input: toolUse.input,
        status: 'running',
      })
    },

    /** Append input_json_delta to the last tool_use block (streaming) */
    appendInputJsonDelta: (state, action: PayloadAction<{ messageId: string; partialJson: string }>) => {
      const { messageId, partialJson } = action.payload
      const msg = state.items.find(m => m.id === messageId)
      if (!msg) return

      const lastBlock = msg.contentBlocks[msg.contentBlocks.length - 1]
      if (lastBlock && lastBlock.type === 'tool_use') {
        // Accumulate partial JSON — parse on content_block_stop
        if (!(lastBlock as any)._partialInputJson) {
          ;(lastBlock as any)._partialInputJson = ''
        }
        ;(lastBlock as any)._partialInputJson += partialJson
      }
    },

    /** Finalize streaming content block — parse accumulated input_json_delta */
    finalizeContentBlock: (state, action: PayloadAction<{ messageId: string; blockIndex: number }>) => {
      const { messageId, blockIndex } = action.payload
      const msg = state.items.find(m => m.id === messageId)
      if (!msg) return

      const block = msg.contentBlocks[blockIndex]
      if (block && block.type === 'tool_use' && (block as any)._partialInputJson) {
        try {
          block.input = JSON.parse((block as any)._partialInputJson)
        } catch {
          // If parse fails, keep the accumulated string as a raw input
          block.input = { raw: (block as any)._partialInputJson }
        }
        delete (block as any)._partialInputJson
      }
    },

    /** 更新 tool_use 状态和结果 */
    updateToolStatus: (state, action: PayloadAction<{
      messageId: string
      toolUseId: string
      status: 'running' | 'completed' | 'error' | 'pending'
      resultContent?: string
      isResultError?: boolean
    }>) => {
      const { messageId, toolUseId, status, resultContent, isResultError } = action.payload
      const msg = state.items.find(m => m.id === messageId)
      if (!msg) return

      const block = msg.contentBlocks.find(
        b => b.type === 'tool_use' && b.id === toolUseId
      ) as ToolUseBlock | undefined

      if (block) {
        block.status = status
        if (resultContent != null) block.resultContent = resultContent
        if (isResultError != null) block.isResultError = isResultError
      }
    },

    /** 切换 thinking 块的折叠状态 */
    toggleThinkingCollapsed: (state, action: PayloadAction<{ messageId: string; blockIndex: number }>) => {
      const { messageId, blockIndex } = action.payload
      const msg = state.items.find(m => m.id === messageId)
      if (!msg) return
      const block = msg.contentBlocks[blockIndex]
      if (block && block.type === 'thinking') {
        block.collapsed = !block.collapsed
      }
    },

    /** 切换 tool 卡片的展开状态 */
    toggleToolExpanded: (state, action: PayloadAction<{ messageId: string; blockIndex: number }>) => {
      const { messageId, blockIndex } = action.payload
      const msg = state.items.find(m => m.id === messageId)
      if (!msg) return
      const block = msg.contentBlocks[blockIndex]
      if (block && block.type === 'tool_use') {
        // 使用 input 属性来存储展开状态
        if (!(block as any)._expanded) {
          ;(block as any)._expanded = true
        } else {
          ;(block as any)._expanded = !(block as any)._expanded
        }
      }
    },

    /** 添加 tool_result 块 */
    addToolResult: (state, action: PayloadAction<{ messageId: string; toolUseId: string; content: string; isError?: boolean }>) => {
      const { messageId, toolUseId, content, isError } = action.payload
      const msg = state.items.find(m => m.id === messageId)
      if (!msg) return

      msg.contentBlocks.push({
        type: 'tool_result',
        tool_use_id: toolUseId,
        content,
        is_error: isError,
      })

      // 同时更新对应的 tool_use 块状态
      const toolBlock = msg.contentBlocks.find(
        b => b.type === 'tool_use' && b.id === toolUseId
      ) as ToolUseBlock | undefined
      if (toolBlock) {
        toolBlock.status = isError ? 'error' : 'completed'
        toolBlock.resultContent = content
        toolBlock.isResultError = isError
      }
    },

    /** 更新消息成本 */
    updateCost: (state, action: PayloadAction<{ messageId: string; costUsd: number }>) => {
      const { messageId, costUsd } = action.payload
      const msg = state.items.find(m => m.id === messageId)
      if (msg) msg.costUsd = costUsd
    },
  },
})

export const {
  addMessage,
  setMessages,
  clearMessages,
  startStreaming,
  finishStreaming,
  appendTextDelta,
  appendThinkingDelta,
  appendInputJsonDelta,
  finalizeContentBlock,
  addToolUse,
  updateToolStatus,
  toggleThinkingCollapsed,
  toggleToolExpanded,
  addToolResult,
  updateCost,
} = messagesSlice.actions
export default messagesSlice.reducer
