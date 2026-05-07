import { useState, useEffect, useCallback } from 'react'
import { useChatStore } from './store/useChatStore'
import { MessageList } from './components/MessageList'
import { InputArea } from './components/InputArea'
import { StatusIndicator } from './components/StatusIndicator'
import { PermissionDialog } from './components/PermissionDialog'
import { vscode, type ExtensionToWebviewMessage } from './utils/vscode-api'
import './styles/index.css'

export function App() {
  const {
    messages,
    status,
    sessionId,
    permissionRequest,
    addMessage,
    updateMessageContent,
    finalizeMessage,
    setStatus,
    setSessionId,
    clearMessages,
    setPermissionRequest,
    sendMessage,
    cancelGeneration,
    handlePermissionResponse,
  } = useChatStore()

  // Handle messages from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      const msg = event.data
      switch (msg.type) {
        case 'userMessage':
          addMessage({
            id: msg.messageId,
            role: 'user',
            content: [{ type: 'text', text: msg.text }],
            status: 'complete',
            timestamp: Date.now(),
          })
          break

        case 'assistantChunk':
          updateMessageContent(msg.messageId, msg.text)
          break

        case 'assistantDone':
          finalizeMessage(msg.messageId)
          break

        case 'toolUse':
          addMessage({
            id: msg.messageId,
            role: 'assistant',
            content: [{
              type: 'tool_use',
              id: `tool_${msg.messageId}`,
              name: msg.name,
              input: msg.input,
              status: 'pending',
            }],
            status: 'streaming',
            timestamp: Date.now(),
          })
          break

        case 'toolResult':
          // Update tool_use block with result
          break

        case 'thinkingStart':
          addMessage({
            id: msg.messageId,
            role: 'assistant',
            content: [{ type: 'thinking', text: '', isExpanded: false }],
            status: 'streaming',
            timestamp: Date.now(),
          })
          break

        case 'thinkingChunk':
          updateMessageContent(msg.messageId, msg.text, 'thinking')
          break

        case 'thinkingEnd':
          finalizeMessage(msg.messageId)
          break

        case 'error':
          addMessage({
            id: `error_${Date.now()}`,
            role: 'assistant',
            content: [{ type: 'error', text: msg.message }],
            status: 'error',
            timestamp: Date.now(),
          })
          setStatus('error')
          break

        case 'statusChange':
          setStatus(msg.status)
          break

        case 'sessionCleared':
          clearMessages()
          setStatus('idle')
          break

        case 'sessionId':
          setSessionId(msg.sessionId)
          break

        case 'permissionRequest':
          setPermissionRequest(msg.request)
          break

        case 'diffPreview':
          // Handle diff preview request
          break

        case 'restoreSession':
          // Restore session from extension
          if (msg.messages) {
            clearMessages()
            msg.messages.forEach((m) => addMessage(m))
          }
          setSessionId(msg.sessionId)
          break

        case 'ready':
          // Extension is ready
          setStatus('connected')
          break
      }
    }

    vscode.onMessage(handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage as EventListener)
    }
  }, [
    addMessage,
    updateMessageContent,
    finalizeMessage,
    setStatus,
    setSessionId,
    clearMessages,
    setPermissionRequest,
  ])

  // Notify extension that webview is ready
  useEffect(() => {
    vscode.postMessage({ type: 'ready' })
  }, [])

  const handleSend = useCallback((text: string) => {
    if (!text.trim() || status === 'running') return
    sendMessage(text)
  }, [status, sendMessage])

  const handleCancel = useCallback(() => {
    cancelGeneration()
  }, [cancelGeneration])

  const handleNewSession = useCallback(() => {
    vscode.postMessage({ type: 'newSession' })
  }, [])

  const handlePermissionDecision = useCallback((behavior: 'allow' | 'deny', always?: boolean) => {
    if (permissionRequest) {
      handlePermissionResponse(permissionRequest.id, behavior, always)
      setPermissionRequest(null)
    }
  }, [permissionRequest, handlePermissionResponse, setPermissionRequest])

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <button
            className="new-session-btn"
            onClick={handleNewSession}
            title="New Session"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 2a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2H9v4a1 1 0 1 1-2 0V9H3a1 1 0 1 1 0-2h4V3a1 1 0 0 1 1-1z"/>
            </svg>
          </button>
          {sessionId && (
            <span className="session-id" title={`Session: ${sessionId}`}>
              Session: {sessionId.slice(0, 8)}
            </span>
          )}
        </div>
        <StatusIndicator status={status} />
      </header>

      <main className="app-main">
        <MessageList messages={messages} />
      </main>

      <footer className="app-footer">
        <InputArea
          onSend={handleSend}
          onCancel={handleCancel}
          disabled={status !== 'idle' && status !== 'connected'}
          isRunning={status === 'running'}
        />
      </footer>

      {permissionRequest && (
        <PermissionDialog
          request={permissionRequest}
          onDecision={handlePermissionDecision}
        />
      )}
    </div>
  )
}

export default App
