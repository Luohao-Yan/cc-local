/**
 * Hook Types and Interfaces for CCLocal VS Code Extension
 * Supports 20+ hook types matching official Claude Code extension 1:1
 *
 * Handler types (1:1 with official):
 *   - command: Shell command execution (bash/powershell)
 *   - http: HTTP POST requests
 *   - function: Registered function reference
 *   - agent: LLM-based agentic verifier (official extension exclusive)
 *   - prompt: LLM prompt evaluation (official extension exclusive)
 */

// ─── Hook Types ────────────────────────────────────────────────────────────────

export type HookType =
  // Tool execution hooks
  | 'PreToolUse'
  | 'PostToolUse'
  | 'ToolApproval'
  // Session lifecycle hooks
  | 'SessionStart'
  | 'SessionEnd'
  | 'SessionPause'
  | 'SessionResume'
  // File operation hooks
  | 'FileWrite'
  | 'FileEdit'
  | 'FileRead'
  | 'FileDelete'
  // Command execution hooks
  | 'BashExecution'
  | 'BashApproval'
  // Context hooks
  | 'PreCompact'
  | 'PostCompact'
  // Notification hooks
  | 'Notification'
  | 'Stop'
  | 'Interrupt'
  // State change hooks
  | 'ModelChange'
  | 'PermissionChange'
  | 'ThinkingLevelChange'
  // MCP hooks
  | 'MCPServerStart'
  | 'MCPServerStop'
  | 'MCPServerError'
  // Plugin hooks
  | 'PluginInstall'
  | 'PluginUninstall'
  | 'PluginError'
  // Error handling hooks
  | 'Error'
  | 'Warning'

// ─── Hook Handler Types ────────────────────────────────────────────────────────

export type HookHandlerType = 'command' | 'http' | 'function' | 'agent' | 'prompt'

export interface CommandHookHandler {
  type: 'command'
  /** Shell command to execute */
  command: string
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number
  /** Environment variables to set */
  env?: Record<string, string>
  /** Shell to use: bash (default) or powershell (Windows) */
  shell?: 'bash' | 'powershell'
  /** Execute asynchronously — don't block tool call (default: false) */
  async?: boolean
  /** Execute only once per session (default: false) */
  once?: boolean
  /** Status message to display while running */
  statusMessage?: string
}

export interface HttpHookHandler {
  type: 'http'
  /** HTTP URL to POST to */
  url: string
  /** HTTP method (default: POST) */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  /** HTTP request headers */
  headers?: Record<string, string>
  /** Timeout in milliseconds (default: 10000) */
  timeout?: number
  /** Execute asynchronously — don't block tool call (default: false) */
  async?: boolean
  /** Execute only once per session (default: false) */
  once?: boolean
  /** Status message to display while running */
  statusMessage?: string
  /** Environment variable names allowed in the request body */
  allowedEnvVars?: string[]
}

export interface FunctionHookHandler {
  type: 'function'
  /** Registered function name reference */
  handler: string
  /** Timeout in milliseconds (default: 5000) */
  timeout?: number
  /** Execute only once per session (default: false) */
  once?: boolean
  /** Status message to display while running */
  statusMessage?: string
}

export interface AgentHookHandler {
  type: 'agent'
  /** LLM prompt content for the agent to evaluate */
  prompt: string
  /** Model to use (default: claude-sonnet-4-20250514) */
  model?: string
  /** Timeout in milliseconds (default: 60000) */
  timeout?: number
  /** Execute only once per session (default: false) */
  once?: boolean
  /** Status message to display while running */
  statusMessage?: string
}

export interface PromptHookHandler {
  type: 'prompt'
  /** LLM prompt content to evaluate */
  prompt: string
  /** Model to use (optional, defaults to current session model) */
  model?: string
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number
  /** Execute only once per session (default: false) */
  once?: boolean
  /** Status message to display while running */
  statusMessage?: string
}

export type HookHandler =
  | CommandHookHandler
  | HttpHookHandler
  | FunctionHookHandler
  | AgentHookHandler
  | PromptHookHandler

// ─── Hook Definition ──────────────────────────────────────────────────────────

export interface HookDefinition {
  /**
   * Regex pattern to match tool names or events
   * Example: "Bash|Edit|Write" matches any of these tools
   */
  matcher?: string

  /**
   * List of handlers to execute
   */
  hooks: HookHandler[]

  /**
   * Whether this hook is enabled
   */
  enabled?: boolean

  /**
   * Description of what this hook does
   */
  description?: string
}

// ─── Hook Context ───────────────────────────────────────────────────────────────

export interface HookContext {
  /** Type of hook being triggered */
  type: HookType
  /** Timestamp of hook execution */
  timestamp: number
  /** Session ID if applicable */
  sessionId?: string
  /** Tool name for tool-related hooks */
  toolName?: string
  /** Tool input for PreToolUse/PostToolUse */
  toolInput?: unknown
  /** Tool result for PostToolUse */
  toolResult?: unknown
  /** Tool error if any */
  toolError?: string
  /** File path for file-related hooks */
  filePath?: string
  /** File content for file operations */
  fileContent?: string
  /** Command for bash-related hooks */
  command?: string
  /** Exit code for bash execution */
  exitCode?: number
  /** Output from bash execution */
  output?: string
  /** Model name for model change */
  model?: string
  /** Previous model for model change */
  previousModel?: string
  /** Permission mode for permission change */
  permissionMode?: string
  /** MCP server name */
  mcpServerName?: string
  /** Plugin ID */
  pluginId?: string
  /** Error message for error hooks */
  errorMessage?: string
  /** Error stack trace */
  errorStack?: string
  /** Custom data */
  data?: Record<string, unknown>
}

// ─── Hook Result ───────────────────────────────────────────────────────────────

export interface HookResult {
  /** Hook ID */
  hookId: string
  /** Handler index in the hook definition */
  handlerIndex: number
  /** Whether the hook executed successfully */
  success: boolean
  /** Output from command or response from HTTP */
  output?: string
  /** Error message if failed */
  error?: string
  /** Execution duration in milliseconds */
  duration: number
  /** Whether to block the operation (for PreToolUse) */
  block?: boolean
  /** Modified input (for PreToolUse) */
  modifiedInput?: unknown
}

// ─── Hook Execution Options ────────────────────────────────────────────────────

export interface HookExecutionOptions {
  /** Timeout for the entire hook execution (default: 60000) */
  timeout?: number
  /** Whether to run hooks in parallel (default: false) */
  parallel?: boolean
  /** Whether to stop on first failure (default: true) */
  stopOnFailure?: boolean
  /** Whether to capture stdout (default: true) */
  captureOutput?: boolean
  /** Environment variables to pass */
  env?: Record<string, string>
}

// ─── Hooks Configuration ────────────────────────────────────────────────────────

export interface HooksConfiguration {
  [key in HookType]?: HookDefinition[]
}

// ─── Predefined Matcher Patterns ───────────────────────────────────────────────

export const PREDEFINED_MATCHERS = {
  // Tool matchers
  allTools: '.*',
  fileTools: 'Read|Write|Edit|MultiEdit',
  bashTools: 'Bash',
  webTools: 'WebFetch|WebSearch',
  agentTools: 'Agent',

  // Risk-based matchers
  dangerousTools: 'Bash|Agent',
  safeTools: 'Read|Glob|Grep|WebFetch|WebSearch',

  // File type matchers
  configFileEdit: '.*\\.(json|yaml|yml|toml|ini|env)$',
  sourceFileEdit: '.*\\.(ts|tsx|js|jsx|py|rs|go|java)$',
}

// ─── Default Timeouts ──────────────────────────────────────────────────────────

export const DEFAULT_TIMEOUTS = {
  command: 30000,  // 30 seconds for shell commands
  http: 10000,      // 10 seconds for HTTP requests
  function: 5000,   // 5 seconds for function calls
  agent: 60000,     // 60 seconds for agent evaluations
  prompt: 30000,   // 30 seconds for prompt evaluations
}

// ─── Hook Priority ─────────────────────────────────────────────────────────────

export type HookPriority = 'high' | 'normal' | 'low'

export interface PrioritizedHookDefinition extends HookDefinition {
  priority?: HookPriority
  order?: number
}
