import type {
  McpServerConfigForProcessTransport as McpServerConfigForProcessTransportBase,
  McpServerStatus as McpServerStatusBase,
  McpToolInfo as McpToolInfoBase,
} from './coreTypes.generated.js'

export interface SDKControlRequest {
  type: 'control_request'
  request_id: string
  request: SDKControlRequestInner
}

export type SDKControlRequestInner =
  | SDKControlCanUseToolRequest
  | SDKControlInitializeRequest
  | SDKControlInterruptRequest
  | SDKControlEndSessionRequest
  | SDKControlSetPermissionModeRequest
  | SDKControlSetModelRequest
  | SDKControlSetMaxThinkingTokensRequest
  | SDKControlMcpStatusRequest
  | SDKControlGetContextUsageRequest
  | SDKControlMcpMessageRequest
  | SDKControlRewindFilesRequest
  | SDKControlCancelAsyncMessageRequest
  | SDKControlSeedReadStateRequest
  | SDKControlMcpSetServersRequest
  | SDKControlReloadPluginsRequest
  | SDKControlMcpReconnectRequest
  | SDKControlMcpToggleRequest
  | SDKControlChannelEnableRequest
  | SDKControlMcpAuthenticateRequest
  | SDKControlMcpOAuthCallbackUrlRequest
  | SDKControlClaudeAuthenticateRequest
  | SDKControlClaudeOAuthCallbackRequest
  | SDKControlClaudeOAuthWaitForCompletionRequest
  | SDKControlMcpClearAuthRequest
  | SDKControlApplyFlagSettingsRequest
  | SDKControlGetSettingsRequest
  | SDKControlStopTaskRequest
  | SDKControlGenerateSessionTitleRequest
  | SDKControlSideQuestionRequest
  | SDKControlSetProactiveRequest
  | SDKControlRemoteControlRequest
  | (Record<string, unknown> & { subtype: string })

export interface SDKControlCanUseToolRequest {
  subtype: 'can_use_tool'
  tool_name: string
  tool_input: Record<string, unknown>
}

export interface SDKControlInitializeRequest {
  subtype: 'initialize'
  [key: string]: unknown
}

export interface SDKControlInterruptRequest {
  subtype: 'interrupt'
}

export interface SDKControlEndSessionRequest {
  subtype: 'end_session'
  reason?: string
}

export interface SDKControlSetPermissionModeRequest {
  subtype: 'set_permission_mode'
  mode: string
  ultraplan?: boolean
}

export interface SDKControlSetModelRequest {
  subtype: 'set_model'
  model?: string
}

export interface SDKControlSetMaxThinkingTokensRequest {
  subtype: 'set_max_thinking_tokens'
  max_thinking_tokens: number | null
}

export interface SDKControlMcpStatusRequest {
  subtype: 'mcp_status'
}

export interface SDKControlGetContextUsageRequest {
  subtype: 'get_context_usage'
}

export interface SDKControlMcpMessageRequest {
  subtype: 'mcp_message'
  server_name: string
  message: unknown
}

export interface SDKControlRewindFilesRequest {
  subtype: 'rewind_files'
  user_message_id: string
  dry_run?: boolean
}

export interface SDKControlCancelAsyncMessageRequest {
  subtype: 'cancel_async_message'
  message_uuid: string
}

export interface SDKControlSeedReadStateRequest {
  subtype: 'seed_read_state'
  path: string
  mtime: number
}

export interface SDKControlMcpSetServersRequest {
  subtype: 'mcp_set_servers'
  servers: Record<string, McpServerConfigForProcessTransport>
}

export interface SDKControlReloadPluginsRequest {
  subtype: 'reload_plugins'
}

export interface SDKControlMcpReconnectRequest {
  subtype: 'mcp_reconnect'
  serverName: string
}

export interface SDKControlMcpToggleRequest {
  subtype: 'mcp_toggle'
  serverName: string
  enabled: boolean
}

export interface SDKControlChannelEnableRequest {
  subtype: 'channel_enable'
  serverName: string
}

export interface SDKControlMcpAuthenticateRequest {
  subtype: 'mcp_authenticate'
  serverName: string
}

export interface SDKControlMcpOAuthCallbackUrlRequest {
  subtype: 'mcp_oauth_callback_url'
  serverName: string
  callbackUrl: string
}

export interface SDKControlClaudeAuthenticateRequest {
  subtype: 'claude_authenticate'
  loginWithClaudeAi?: boolean
}

export interface SDKControlClaudeOAuthCallbackRequest {
  subtype: 'claude_oauth_callback'
  authorizationCode: string
  state: string
}

export interface SDKControlClaudeOAuthWaitForCompletionRequest {
  subtype: 'claude_oauth_wait_for_completion'
}

export interface SDKControlMcpClearAuthRequest {
  subtype: 'mcp_clear_auth'
  serverName: string
}

export interface SDKControlApplyFlagSettingsRequest {
  subtype: 'apply_flag_settings'
  settings: Record<string, unknown>
}

export interface SDKControlGetSettingsRequest {
  subtype: 'get_settings'
}

export interface SDKControlStopTaskRequest {
  subtype: 'stop_task'
  task_id: string
}

export interface SDKControlGenerateSessionTitleRequest {
  subtype: 'generate_session_title'
  description: string
  persist?: boolean
}

export interface SDKControlSideQuestionRequest {
  subtype: 'side_question'
  question: string
}

export interface SDKControlSetProactiveRequest {
  subtype: 'set_proactive'
  enabled: boolean
}

export interface SDKControlRemoteControlRequest {
  subtype: 'remote_control'
  enabled: boolean
}

export interface SDKControlResponse {
  type: 'control_response'
  request_id?: string
  response: Record<string, unknown>
}

export interface SDKControlCancelRequest {
  type: 'control_cancel_request'
  request_id: string
}

export interface SDKControlPermissionRequest {
  type: 'control_request'
  request_id: string
  request: {
    subtype: 'can_use_tool'
    tool_name: string
    tool_input: Record<string, unknown>
  }
}

export interface SDKControlInitializeResponse {
  type: 'control_response'
  response: {
    subtype: 'initialize'
    success: boolean
    commands: Array<{ name: string; description: string; argumentHint: string }>
    agents: Array<{ name: string; description: string; model?: string }>
    output_style: string
    available_output_styles: string[]
    models: Array<{ name: string; provider?: string; contextWindow?: number }>
    account: {
      email?: string
      organization?: string
      subscriptionType?: string
      tokenSource?: string
      apiKeySource?: string
      apiProvider: string
    }
    pid: number
    fast_mode_state?: unknown
    [key: string]: unknown
  }
}

export interface SDKControlMcpSetServersResponse {
  type: 'control_response'
  response: {
    subtype: 'mcp_set_servers'
    success: boolean
    added: string[]
    removed: string[]
    errors: Record<string, string>
    [key: string]: unknown
  }
}

export interface SDKControlReloadPluginsResponse {
  type: 'control_response'
  response: {
    subtype: 'reload_plugins'
    success: boolean
    commands: Array<{ name: string; description: string; argumentHint: string }>
    agents: Array<{ name: string; description: string; model?: string }>
    plugins: Array<{ name: string; path: string; source: string }>
    mcpServers: McpServerStatus[]
    error_count: number
    [key: string]: unknown
  }
}

export type McpServerStatus = McpServerStatusBase
export type McpToolInfo = McpToolInfoBase
export type McpServerConfigForProcessTransport = McpServerConfigForProcessTransportBase

export interface SDKPartialAssistantMessage {
  type: 'partial_assistant'
  [key: string]: unknown
}

// Catch-all for unrecognized stdout messages.
// Must have a `type` field that doesn't overlap with the known discriminants
// so that TypeScript can narrow the union correctly.
export interface UnknownStdoutMessage {
  type: Exclude<string, 'control_request' | 'control_response' | 'control_cancel_request' | 'partial_assistant'>
  [key: string]: unknown
}

export type StdoutMessage =
  | SDKControlResponse
  | SDKControlRequest
  | SDKControlCancelRequest
  | SDKPartialAssistantMessage
  | UnknownStdoutMessage

export type StdinMessage =
  | SDKControlRequest
  | SDKControlResponse
  | SDKControlCancelRequest
  | UnknownStdoutMessage
