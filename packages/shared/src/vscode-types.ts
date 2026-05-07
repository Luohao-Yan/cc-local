/**
 * Shared types for VS Code extension and webview communication
 * This file is used by both the extension host and the webview
 */

// ─── Message Types ────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant'
export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error'
export type CclocalStatus = 'idle' | 'connecting' | 'connected' | 'running' | 'stopped' | 'error'

// ─── Content Blocks ────────────────────────────────────────────────────────────

export interface TextBlock {
  type: 'text'
  text: string
}

export interface ThinkingBlock {
  type: 'thinking'
  text: string
  isExpanded: boolean
}

export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: unknown
  status: 'pending' | 'running' | 'complete' | 'error'
  result?: unknown
  error?: string
}

export interface ToolResultBlock {
  type: 'tool_result'
  toolUseId: string
  content: string | unknown
  isError?: boolean
}

export interface ErrorBlock {
  type: 'error'
  text: string
}

export interface ImageBlock {
  type: 'image'
  source: {
    type: 'base64' | 'url'
    media_type: string
    data: string
  }
}

export type ContentBlock =
  | TextBlock
  | ThinkingBlock
  | ToolUseBlock
  | ToolResultBlock
  | ErrorBlock
  | ImageBlock

// ─── Chat Message ──────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  role: MessageRole
  content: ContentBlock[]
  status: MessageStatus
  timestamp: number
  parentId?: string
}

// ─── Permission Types ──────────────────────────────────────────────────────────

export type PermissionMode =
  | 'default'           // Ask for dangerous operations
  | 'acceptEdits'       // Auto-accept file edits, ask for commands
  | 'plan'              // Plan mode - no execution
  | 'bypassPermissions' // Auto-accept all (dangerous)

export interface PermissionRequest {
  id: string
  toolName: string
  toolInput: unknown
  description: string
  riskLevel: 'low' | 'medium' | 'high'
  timestamp: number
}

export interface PermissionResponse {
  behavior: 'allow' | 'deny'
  always?: boolean
}

// ─── Session Types ─────────────────────────────────────────────────────────────

export interface SessionMetadata {
  id: string
  timestamp: number
  workspace?: string
  messageCount: number
  title?: string
}

export interface Session {
  id: string
  messages: ChatMessage[]
  metadata: SessionMetadata
}

// ─── Diff Preview Types ────────────────────────────────────────────────────────

export interface DiffPreview {
  id: string
  filePath: string
  originalContent: string
  modifiedContent: string
  toolUseId: string
  timestamp: number
}

// ─── Webview to Extension Messages ─────────────────────────────────────────────

export type WebviewToExtensionMessage =
  | { type: 'ready' }
  | { type: 'sendMessage'; text: string }
  | { type: 'stopGeneration' }
  | { type: 'newSession' }
  | { type: 'clearChat' }
  | { type: 'restoreSession'; sessionId: string }
  | { type: 'permissionResponse'; requestId: string; response: PermissionResponse }
  | { type: 'diffDecision'; diffId: string; accepted: boolean }
  | { type: 'openSettings' }
  | { type: 'insertAtMention'; position?: number }
  | { type: 'getSelection' }
  | { type: 'focusInput' }
  | { type: 'toggleDictation' }

// ─── Extension to Webview Messages ─────────────────────────────────────────────

export type ExtensionToWebviewMessage =
  | { type: 'ready' }
  | { type: 'userMessage'; text: string; messageId: string }
  | { type: 'assistantChunk'; text: string; messageId: string }
  | { type: 'assistantDone'; messageId: string }
  | { type: 'toolUse'; name: string; input: unknown; messageId: string }
  | { type: 'toolResult'; toolUseId: string; result: unknown; messageId: string }
  | { type: 'thinkingStart'; messageId: string }
  | { type: 'thinkingChunk'; text: string; messageId: string }
  | { type: 'thinkingEnd'; messageId: string }
  | { type: 'error'; message: string }
  | { type: 'statusChange'; status: CclocalStatus }
  | { type: 'sessionCleared' }
  | { type: 'sessionId'; sessionId: string }
  | { type: 'permissionRequest'; request: PermissionRequest }
  | { type: 'diffPreview'; diff: DiffPreview }
  | { type: 'restoreSession'; sessionId: string; messages: ChatMessage[] }
  | { type: 'selectionChanged'; selection: { text: string; file: string; line: number } | null }
  | { type: 'configChanged'; config: Record<string, unknown> }

// ─── Tool Definitions ──────────────────────────────────────────────────────────

export interface ToolDefinition {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, {
      type: string
      description?: string
      enum?: string[]
    }>
    required?: string[]
  }
}

// ─── Configuration ─────────────────────────────────────────────────────────────

export interface ExtensionConfig {
  cclocalPath: string
  model: string
  mode: 'ide' | 'cli' | 'websocket'
  environmentVariables: Record<string, string>
  initialPermissionMode: PermissionMode
  useTerminal: boolean
  autosave: boolean
  useCtrlEnterToSend: boolean
  preferredLocation: 'sidebar' | 'panel'
  hideOnboarding: boolean
  showToolInput: boolean
  maxMessageHistory: number
  enableThinkingDisplay: boolean
  thinkingExpandedByDefault: boolean
}

// ─── CLI Message Types (stream-json format) ────────────────────────────────────

export interface StreamJsonMessage {
  type: string
  subtype?: string
  message?: {
    role?: string
    content?: ContentBlock[]
  }
  delta?: {
    type: string
    text?: string
    thinking?: string
  }
  name?: string
  input?: unknown
  result?: string
  error?: string
  is_error?: boolean
  id?: string
}

// ─── IDE Lock File Types ───────────────────────────────────────────────────────

export interface IdeLockfile {
  workspaceFolders: string[]
  pid: number
  ideName: string
  transport: 'ws'
  runningInWindows: boolean
  authToken: string
  mcpPort?: number
}

// ─── MCP Types ─────────────────────────────────────────────────────────────────

export interface MCPToolCall {
  name: string
  arguments: unknown
}

export interface MCPToolResult {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}
