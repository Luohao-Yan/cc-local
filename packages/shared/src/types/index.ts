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

export interface AssistantMessage extends Message {
  role: 'assistant'
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
  maxTurns?: number
  maxThinkingTokens?: number
  fallbackModel?: string
  enabledTools?: string[]
  jsonSchema?: unknown
  inputFormat?: 'text' | 'stream-json'
  includeHookEvents?: boolean
  additionalDirectories?: string[]
  debug?: {
    enabled?: boolean
    file?: string
    toStderr?: boolean
    verbose?: boolean
    mcp?: boolean
  }
  compatibility?: {
    prefill?: string
    thinking?: 'enabled' | 'adaptive' | 'disabled'
    pluginDirectories?: string[]
    workspace?: string
    worktree?: boolean | string
    tmux?: boolean | string
    ide?: boolean
    chrome?: boolean
    workload?: string
    bare?: boolean
    disableSlashCommands?: boolean
    files?: string[]
    remote?: boolean | string
    remoteControl?: boolean | string
    rc?: boolean | string
    teleport?: boolean | string
    sdkUrl?: string
    agent?: string
    agents?: string
    agentId?: string
    agentName?: string
    agentColor?: string
    agentType?: string
    agentTeams?: string
    teamName?: string
    teammateMode?: 'auto' | 'tmux' | 'in-process'
    parentSessionId?: string
    planModeRequired?: boolean
    tasks?: boolean | string
    taskBudget?: number
    channels?: string[]
    advisor?: string
    afk?: boolean
    all?: boolean
    assistant?: boolean
    available?: boolean
    betas?: string[]
    brief?: boolean
    claudeai?: boolean
    clearOwner?: boolean
    clientSecret?: string
    console?: boolean
    cowork?: boolean
    dangerouslyLoadDevelopmentChannels?: string[]
    dangerouslySkipPermissionsWithClassifiers?: boolean
    deepLinkLastFetch?: number
    deepLinkOrigin?: boolean
    deepLinkRepo?: string
    delegatePermissions?: boolean
    description?: string
    dryRun?: boolean
    effort?: string
    email?: string
    enableAuthStatus?: boolean
    enableAutoMode?: boolean
    force?: boolean
    fromPr?: boolean | string
    hardFail?: boolean
    host?: string
    idleTimeout?: number
    init?: boolean
    initOnly?: boolean
    keepData?: boolean
    list?: boolean
    local?: boolean
    maintenance?: boolean
    maxBudgetUsd?: number
    maxSessions?: number
    messagingSocketPath?: string
    output?: string
    outputStyle?: string
    vimMode?: boolean | string
    owner?: string
    pending?: boolean
    permissionPromptTool?: string
    feedback?: boolean | string
    privacySettings?: boolean | string
    port?: number
    proactive?: boolean
    resumeSessionAt?: string
    rewindFiles?: string
    rewindRequested?: boolean | string
    safe?: boolean
    scope?: string
    settingSources?: string[]
    sparse?: boolean
    sso?: boolean
    status?: boolean
    subject?: string
    text?: string
    unix?: string
  }
  permissionPolicy?: {
    mode?: 'default' | 'dontAsk' | 'acceptEdits' | 'bypassPermissions'
    allowedTools?: string[]
    blockedTools?: string[]
  }
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
