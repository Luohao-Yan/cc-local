/**
 * Zustand store for chat state management
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ChatMessage,
  ContentBlock,
  CclocalStatus,
  PermissionRequest,
  TextBlock,
  ThinkingBlock,
  ToolUseBlock,
} from '../types'
import { vscode } from '../utils/vscode-api'

// ─── Store State ──────────────────────────────────────────────────────────────

interface ChatState {
  // Messages
  messages: ChatMessage[]
  messageBuffer: Map<string, string> // For streaming messages

  // Session
  sessionId: string | null
  status: CclocalStatus

  // Permission
  permissionRequest: PermissionRequest | null

  // Diff Preview
  pendingDiff: string | null

  // UI State
  inputValue: string
  isInputFocused: boolean
  autoScroll: boolean
}

// ─── Store Actions ────────────────────────────────────────────────────────────

interface ChatActions {
  // Message actions
  addMessage: (message: ChatMessage) => void
  updateMessageContent: (messageId: string, text: string, blockType?: 'text' | 'thinking') => void
  updateToolStatus: (messageId: string, status: ToolUseBlock['status'], result?: unknown, error?: string) => void
  finalizeMessage: (messageId: string) => void
  clearMessages: () => void

  // Session actions
  setSessionId: (id: string | null) => void
  setStatus: (status: CclocalStatus) => void

  // Permission actions
  setPermissionRequest: (request: PermissionRequest | null) => void
  handlePermissionResponse: (requestId: string, behavior: 'allow' | 'deny', always?: boolean) => void

  // Diff actions
  setPendingDiff: (diffId: string | null) => void

  // Communication actions
  sendMessage: (text: string) => void
  cancelGeneration: () => void

  // UI actions
  setInputValue: (value: string) => void
  setInputFocused: (focused: boolean) => void
  setAutoScroll: (autoScroll: boolean) => void

  // Persistence
  getMessagesForPersistence: () => ChatMessage[]
  restoreMessages: (messages: ChatMessage[]) => void
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function createTextBlock(text: string): TextBlock {
  return { type: 'text', text }
}

function createThinkingBlock(text: string, isExpanded: boolean = false): ThinkingBlock {
  return { type: 'thinking', text, isExpanded }
}

// ─── Store Implementation ────────────────────────────────────────────────────

export const useChatStore = create<ChatState & ChatActions>()(
  persist(
    (set, get) => ({
      // Initial state
      messages: [],
      messageBuffer: new Map(),
      sessionId: null,
      status: 'idle',
      permissionRequest: null,
      pendingDiff: null,
      inputValue: '',
      isInputFocused: false,
      autoScroll: true,

      // Message actions
      addMessage: (message) => {
        set((state) => ({
          messages: [...state.messages, message],
        }))
        // Auto scroll if enabled
        if (get().autoScroll) {
          requestAnimationFrame(() => {
            const container = document.querySelector('.message-list')
            if (container) {
              container.scrollTop = container.scrollHeight
            }
          })
        }
      },

      updateMessageContent: (messageId, text, blockType = 'text') => {
        set((state) => {
          const messages = state.messages.map((msg) => {
            if (msg.id !== messageId) return msg

            // Find or create the content block
            const content = [...msg.content]
            const lastBlock = content[content.length - 1]

            if (lastBlock && lastBlock.type === blockType) {
              // Append to existing block
              if (blockType === 'text') {
                (lastBlock as TextBlock).text += text
              } else if (blockType === 'thinking') {
                (lastBlock as ThinkingBlock).text += text
              }
            } else {
              // Create new block
              if (blockType === 'text') {
                content.push(createTextBlock(text))
              } else if (blockType === 'thinking') {
                content.push(createThinkingBlock(text))
              }
            }

            return { ...msg, content, status: 'streaming' as const }
          })

          return { messages }
        })
      },

      updateToolStatus: (messageId, status, result, error) => {
        set((state) => {
          const messages = state.messages.map((msg) => {
            if (msg.id !== messageId) return msg

            const content = msg.content.map((block) => {
              if (block.type === 'tool_use') {
                return {
                  ...block,
                  status,
                  result: result ?? block.result,
                  error: error ?? block.error,
                } as ToolUseBlock
              }
              return block
            })

            return { ...msg, content }
          })

          return { messages }
        })
      },

      finalizeMessage: (messageId) => {
        set((state) => {
          const messages = state.messages.map((msg) => {
            if (msg.id !== messageId) return msg
            return { ...msg, status: 'complete' as const }
          })

          return { messages }
        })
      },

      clearMessages: () => {
        set({ messages: [], messageBuffer: new Map() })
      },

      // Session actions
      setSessionId: (id) => set({ sessionId: id }),
      setStatus: (status) => set({ status }),

      // Permission actions
      setPermissionRequest: (request) => set({ permissionRequest: request }),

      handlePermissionResponse: (requestId, behavior, always) => {
        vscode.postMessage({
          type: 'permissionResponse',
          requestId,
          response: { behavior, always },
        })
        set({ permissionRequest: null })
      },

      // Diff actions
      setPendingDiff: (diffId) => set({ pendingDiff: diffId }),

      // Communication actions
      sendMessage: (text) => {
        if (!text.trim()) return

        const state = get()
        if (state.status === 'running') return

        vscode.postMessage({ type: 'sendMessage', text })
        set({ inputValue: '', status: 'running' })
      },

      cancelGeneration: () => {
        vscode.postMessage({ type: 'stopGeneration' })
        set({ status: 'idle' })
      },

      // UI actions
      setInputValue: (value) => set({ inputValue: value }),
      setInputFocused: (focused) => set({ isInputFocused: focused }),
      setAutoScroll: (autoScroll) => set({ autoScroll }),

      // Persistence
      getMessagesForPersistence: () => {
        return get().messages.filter((msg) => msg.status === 'complete')
      },

      restoreMessages: (messages) => {
        set({ messages })
      },
    }),
    {
      name: 'cclocal-chat',
      partialize: (state) => ({
        sessionId: state.sessionId,
        // Don't persist messages by default - extension handles this
      }),
    }
  )
)

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectMessages = (state: ChatState) => state.messages
export const selectStatus = (state: ChatState) => state.status
export const selectSessionId = (state: ChatState) => state.sessionId
export const selectIsRunning = (state: ChatState) => state.status === 'running'
export const selectCanSendMessage = (state: ChatState) =>
  state.status === 'idle' || state.status === 'connected'
