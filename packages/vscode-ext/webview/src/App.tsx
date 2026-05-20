import { useEffect, useCallback, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from './store/hooks'
import {
  addMessage,
  clearMessages,
  startStreaming,
  finishStreaming,
  appendTextDelta,
  appendThinkingDelta,
  appendInputJsonDelta,
  finalizeContentBlock,
  addToolUse,
  addToolResult,
  updateCost,
} from './store/slices/messagesSlice'
import { updateAuthStatus } from './store/slices/authSlice'
import { setLoading, setError, showPermission, setBanner, hidePermission } from './store/slices/uiSlice'
import MessageList from './components/Message/MessageList'
import MessageInput from './components/Input/MessageInput'
import PermissionDialog from './components/Permission/PermissionDialog'
import Toast from './components/common/Toast'
import Banner from './components/common/Banner'
import Onboarding from './components/Onboarding/Onboarding'
import type { Message } from './store/slices/messagesSlice'
import './App.css'
import './components/Onboarding/Onboarding.css'

/**
 * Message protocol:
 *   Extension → Webview: { type: "from-extension", message: <CLI message> }
 *                or direct: { type: "statusChange" | "cliConnected" | ... }
 *   Webview → Extension: { type: "submit" | "stopGeneration" | ... }
 */

interface ExtMessage {
  type: string
  message?: CliMessage
  [key: string]: unknown
}

interface CliMessage {
  type: string
  [key: string]: unknown
}

let messageCounter = 0
function nextId() {
  return `msg-${Date.now()}-${++messageCounter}`
}

function App() {
  const dispatch = useAppDispatch()
  const { loading, error, showPermissionDialog, banner } = useAppSelector(s => s.ui)
  const messages = useAppSelector(s => s.messages.items)
  const authStatus = useAppSelector(s => s.auth.status)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── Handle CLI messages (from-extension wrapper) ──────────────────────

  const handleCliMessage = useCallback((cli: CliMessage) => {
    switch (cli.type) {
      // ─── Core streaming ───
      case 'content_block_start': {
        const index = cli.index as number
        const block = cli.content_block as { type: string; [k: string]: unknown } | undefined
        if (!block) break

        const mid = (cli.message_id as string) || nextId()
        if (!messages.find(m => m.id === mid)) {
          dispatch(startStreaming({ messageId: mid }))
        }

        if (block.type === 'tool_use') {
          dispatch(addToolUse({
            messageId: mid,
            toolUse: {
              id: (block as any).id || `tu-${index}`,
              name: (block as any).name || 'tool',
              input: (block as any).input ?? {},
            },
          }))
        }
        break
      }

      case 'content_block_delta': {
        const delta = cli.delta as { type: string; text?: string; thinking?: string; partial_json?: string } | undefined
        if (!delta) break

        const mid = (cli.message_id as string) || (messages.findLast(m => m.role === 'assistant')?.id ?? nextId())
        if (!messages.find(m => m.id === mid)) {
          dispatch(startStreaming({ messageId: mid }))
        }

        if (delta.type === 'text_delta' && delta.text) {
          dispatch(appendTextDelta({ messageId: mid, text: delta.text }))
        } else if (delta.type === 'thinking_delta' && delta.thinking) {
          dispatch(appendThinkingDelta({ messageId: mid, thinking: delta.thinking }))
        } else if (delta.type === 'input_json_delta' && delta.partial_json) {
          dispatch(appendInputJsonDelta({ messageId: mid, partialJson: delta.partial_json }))
        }
        break
      }

      case 'content_block_stop': {
        const idx = cli.index as number
        const mid = (cli.message_id as string) || ''
        if (mid) {
          dispatch(finalizeContentBlock({ messageId: mid, blockIndex: idx }))
        }
        break
      }

      case 'assistant': {
        // Complete assistant message (non-streaming or final)
        const msgData = cli.message as { content: Array<{ type: string; text?: string; id?: string; name?: string; input?: unknown }> } | undefined
        if (!msgData?.content) break

        const mid = nextId()
        dispatch(startStreaming({ messageId: mid }))

        for (const block of msgData.content) {
          if (block.type === 'text' && block.text) {
            dispatch(appendTextDelta({ messageId: mid, text: block.text }))
          } else if (block.type === 'tool_use') {
            dispatch(addToolUse({
              messageId: mid,
              toolUse: {
                id: block.id || `tu-${nextId()}`,
                name: block.name || 'tool',
                input: block.input ?? {},
              },
            }))
          }
        }

        dispatch(finishStreaming({ messageId: mid }))
        dispatch(setLoading(false))
        break
      }

      case 'result': {
        const mid = messages.findLast(m => m.role === 'assistant' && m.isStreaming)?.id
        if (mid) {
          dispatch(finishStreaming({
            messageId: mid,
            costUsd: cli.cost_usd as number | undefined,
          }))
        }
        dispatch(setLoading(false))
        break
      }

      case 'thinking': {
        const mid = (cli.message_id as string) || (messages.findLast(m => m.role === 'assistant')?.id ?? nextId())
        if (!messages.find(m => m.id === mid)) {
          dispatch(startStreaming({ messageId: mid }))
        }
        dispatch(appendThinkingDelta({ messageId: mid, thinking: cli.thinking as string }))
        break
      }

      case 'text': {
        const mid = (cli.message_id as string) || (messages.findLast(m => m.role === 'assistant')?.id ?? nextId())
        if (!messages.find(m => m.id === mid)) {
          dispatch(startStreaming({ messageId: mid }))
        }
        dispatch(appendTextDelta({ messageId: mid, text: cli.text as string }))
        break
      }

      case 'tool_use': {
        const mid = (cli.message_id as string) || (messages.findLast(m => m.role === 'assistant')?.id ?? nextId())
        if (!messages.find(m => m.id === mid)) {
          dispatch(startStreaming({ messageId: mid }))
        }
        dispatch(addToolUse({
          messageId: mid,
          toolUse: {
            id: cli.id as string || `tu-${nextId()}`,
            name: cli.name as string || 'tool',
            input: cli.input as Record<string, unknown> ?? {},
          },
        }))
        break
      }

      case 'tool_result': {
        const mid = messages.findLast(m => m.role === 'assistant')?.id
        if (mid) {
          dispatch(addToolResult({
            messageId: mid,
            toolUseId: cli.tool_use_id as string,
            content: typeof cli.content === 'string' ? cli.content : JSON.stringify(cli.content),
            isError: cli.is_error as boolean | undefined,
          }))
        }
        break
      }

      // ─── Control (permission) ───
      case 'control_request': {
        const request = cli.request as { subtype: string; tool_name?: string; tool_input?: unknown; mcp_server_name?: string }
        if (request?.subtype === 'tool_permission') {
          dispatch(showPermission({
            id: cli.request_id as string,
            type: 'tool',
            message: `Allow ${request.tool_name || 'tool'} to run?`,
            details: { toolName: request.tool_name, toolInput: request.tool_input, mcpServerName: request.mcp_server_name },
          }))
        }
        break
      }

      // ─── Auth ───
      case 'auth_url': {
        // Open OAuth URL in browser
        window.open(cli.url as string, '_blank')
        break
      }

      // ─── Diff / File ───
      case 'proposed_diff': {
        // Notify that diff is available — the extension handles opening the diff editor
        break
      }

      case 'file_updated': {
        // File was updated by the CLI — could show notification
        break
      }

      // ─── Usage ───
      case 'usage_update': {
        const mid = messages.findLast(m => m.role === 'assistant')?.id
        if (mid && cli.cost_usd != null) {
          dispatch(updateCost({ messageId: mid, costUsd: cli.cost_usd as number }))
        }
        break
      }

      // ─── Session ───
      case 'session_states_update': {
        // Channel/tab state update — handled by channel slice (future)
        break
      }

      // ─── MCP ───
      case 'mcp_status': {
        // MCP server status — handled by MCP slice (future)
        break
      }

      // ─── IDE Integration ───
      case 'selection_changed':
      case 'visibility_changed':
      case 'font_configuration_changed':
      case 'proactive_suggestions_update':
      case 'attribution-snapshot':
        // Future features — silently handled
        break

      // ─── System / Error ───
      case 'system': {
        // System message from CLI
        break
      }

      case 'error': {
        dispatch(setError(cli.error as string))
        dispatch(setLoading(false))
        break
      }

      default:
        // Unknown CLI message — ignore
        break
    }
  }, [dispatch, messages])

  // ─── Handle messages from Extension (outer layer) ────────────────────

  const handleExtMessage = useCallback((event: MessageEvent) => {
    const msg = event.data as ExtMessage
    if (!msg || typeof msg.type !== 'string') return

    switch (msg.type) {
      // ─── from-extension wrapper: CLI messages ───
      case 'from-extension': {
        const cliMsg = msg.message as CliMessage
        if (cliMsg) handleCliMessage(cliMsg)
        break
      }

      // ─── Direct Extension messages (non-CLI) ───
      case 'statusChange': {
        const status = msg.status as string
        if (status === 'connected') dispatch(setLoading(false))
        if (status === 'connecting') dispatch(setLoading(true))
        break
      }

      case 'cliConnected':
        dispatch(setLoading(false))
        dispatch(setBanner(null))
        dispatch(updateAuthStatus({ loggedIn: true, method: 'cclocal' }))
        break

      case 'cliDisconnected':
        dispatch(setBanner({ type: 'warning', message: 'CLI disconnected, reconnecting…', dismissible: true }))
        dispatch(setLoading(true))
        break

      case 'error':
        dispatch(setError(msg.message as unknown as string))
        dispatch(setLoading(false))
        break

      case 'authStatusChange':
        dispatch(updateAuthStatus(msg.status as any))
        break

      case 'sessionCleared':
        dispatch(clearMessages())
        break

      case 'showOnboarding':
        setShowOnboarding(true)
        break

      case 'channelUpdate':
      case 'activeChannelChange':
      case 'configSync':
      case 'modelChange':
      case 'fileSuggestionsResult':
      case 'sessionsList':
        // Future features — will be handled by dedicated slices
        break

      default:
        break
    }
  }, [dispatch, handleCliMessage])

  useEffect(() => {
    window.addEventListener('message', handleExtMessage)
    return () => window.removeEventListener('message', handleExtMessage)
  }, [handleExtMessage])

  // ─── Send messages to Extension ──────────────────────────────────────

  const postToExt = useCallback((type: string, data?: Record<string, unknown>) => {
    // Use acquireVsCodeApi if available (in VS Code webview)
    const vscodeApi = (window as any).__vscodeApi
    if (vscodeApi) {
      vscodeApi.postMessage({ type, ...data })
    } else {
      // Fallback: window.postMessage for development
      window.postMessage({ type, ...data }, '*')
    }
  }, [])

  const handleSubmit = useCallback((content: string) => {
    // Add user message locally
    const mid = nextId()
    dispatch(addMessage({
      id: mid,
      role: 'user',
      content,
      timestamp: Date.now(),
      contentBlocks: [{ type: 'text', text: content }],
    }))
    // Send to extension
    postToExt('submit', { text: content })
    dispatch(setLoading(true))
  }, [dispatch, postToExt])

  const handleInterrupt = useCallback(() => {
    postToExt('stopGeneration')
    dispatch(setLoading(false))
  }, [postToExt, dispatch])

  const handleNewConversation = useCallback(() => {
    postToExt('newSession')
    dispatch(clearMessages())
  }, [postToExt, dispatch])

  const handlePermissionResponse = useCallback((requestId: string, approved: boolean, always?: boolean) => {
    postToExt('permissionResponse', { requestId, approved, always })
    dispatch(hidePermission())
  }, [postToExt, dispatch])

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="app">
      {showOnboarding && (
        <Onboarding onDismiss={() => setShowOnboarding(false)} />
      )}

      {!showOnboarding && (
        <>
          {banner && <Banner />}

          <div className="app-content">
            <MessageList messages={messages} loading={loading} />
            <div ref={bottomRef} />
          </div>

          <MessageInput
            onSubmit={handleSubmit}
            onInterrupt={handleInterrupt}
            onNewConversation={handleNewConversation}
            loading={loading}
            disabled={!authStatus?.loggedIn}
          />

          {showPermissionDialog && (
            <PermissionDialog onRespond={handlePermissionResponse} />
          )}

          {error && <Toast message={error} type="error" />}
        </>
      )}
    </div>
  )
}

export default App