/**
 * CCLocal 共享类型定义
 * 所有包共享的核心类型
 */

// 消息类型
export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: MessageContent[]
  timestamp: number
}

export type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; name: string; input: unknown; id: string }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }
  | { type: 'thinking'; thinking: string }

// 会话类型
export interface Session {
  id: string
  name: string
  messages: Message[]
  cwd: string
  model: string
  createdAt: number
  updatedAt: number
  metadata?: SessionMetadata
}

export interface SessionMetadata {
  title?: string
  description?: string
  tags?: string[]
}

// 工具类型
export interface Tool {
  name: string
  description: string
  input_schema: ToolInputSchema
  execute: (input: unknown, context: ToolContext) => Promise<ToolResult>
}

export interface ToolInputSchema {
  type: 'object'
  properties?: Record<string, unknown>
  required?: string[]
}

export interface ToolContext {
  sessionId: string
  cwd: string
  abortSignal?: AbortSignal
  onProgress?: (progress: ToolProgress) => void
}

export interface ToolProgress {
  type: string
  message: string
  percent?: number
}

export interface ToolResult {
  content: string
  is_error?: boolean
}

// API 响应类型
export interface StreamEvent {
  type: 'stream_start' | 'stream_delta' | 'stream_end' | 'error' | 'tool_call'
  messageId: string
  delta?: MessageContent
  error?: string
  toolCall?: {
    name: string
    input: unknown
  }
}

// 服务端配置
export interface ServerConfig {
  port: number
  host: string
  authToken?: string
  maxSessions: number
  sessionTimeout: number
}

// 客户端配置
export interface ClientConfig {
  serverUrl: string
  authToken?: string
  reconnectInterval: number
  maxReconnectAttempts: number
}

// WebSocket 消息协议
export interface WSMessage {
  type: 'auth' | 'ping' | 'pong' | 'message' | 'cancel' | 'response' | 'error'
  payload?: unknown
  timestamp: number
}

export interface WSAuthPayload {
  token: string
  clientType: 'cli' | 'vscode'
}

export interface WSMessagePayload {
  sessionId: string
  content: string
  options?: MessageOptions
}

export interface MessageOptions {
  model?: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
}

// 状态更新
export interface StateUpdate {
  type: 'state_update'
  sessionId: string
  state: Partial<SessionState>
}

export interface SessionState {
  status: 'idle' | 'running' | 'error'
  currentMessageId?: string
  pendingToolCalls: string[]
  contextWindow: number
  tokenCount: number
}
