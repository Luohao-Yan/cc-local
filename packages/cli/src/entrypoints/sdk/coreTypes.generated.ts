export interface SDKMessage {
  type: string
  subtype?: string
  role?: string
  content?: unknown
  model?: string
  stop_reason?: string | null
  usage?: Record<string, unknown>
  [key: string]: unknown
}

export interface SDKUserMessage extends SDKMessage {
  type: 'human' | 'user'
  role: 'user'
  content: string | unknown[]
}

export interface SDKAssistantMessage extends SDKMessage {
  type: 'assistant'
  role: 'assistant'
  content: unknown[]
}

export interface SDKResult {
  type: 'result'
  subtype: string
  [key: string]: unknown
}

export interface SDKResultSuccess extends SDKResult {
  subtype: 'success'
  duration_ms?: number
  duration_api_ms?: number
  is_error?: boolean
  num_turns?: number
  session_id?: string
  total_cost_usd?: number
  usage?: Record<string, unknown>
}

export interface SDKResultError extends SDKResult {
  subtype: 'error'
  error: string
}

export type HookEvent = typeof HOOK_EVENTS_ARRAY[number]
const HOOK_EVENTS_ARRAY = [
  'PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'Notification',
  'UserPromptSubmit', 'SessionStart', 'SessionEnd', 'Stop', 'StopFailure',
  'SubagentStart', 'SubagentStop', 'PreCompact', 'PostCompact',
  'PermissionRequest', 'PermissionDenied', 'Setup', 'TeammateIdle',
  'TaskCreated', 'TaskCompleted', 'Elicitation', 'ElicitationResult',
  'ConfigChange', 'WorktreeCreate', 'WorktreeRemove', 'InstructionsLoaded',
  'CwdChanged', 'FileChanged',
] as const

export type ExitReason = 'clear' | 'resume' | 'logout' | 'prompt_input_exit' | 'other' | 'bypass_permissions_disabled'
