import type { NormalizedMessage } from './message.js'

export interface BashProgress {
  type: 'bash_progress'
  output: string
  fullOutput: string
  elapsedTimeSeconds: number
  totalLines: number
  totalBytes: number
  taskId?: string
  timeoutMs?: number
}

export interface PowerShellProgress {
  type: 'powershell_progress'
  output: string
  fullOutput: string
  elapsedTimeSeconds: number
  totalLines: number
  totalBytes: number
  taskId?: string
  timeoutMs?: number
}

export type ShellProgress = BashProgress | PowerShellProgress

export interface MCPProgress {
  type: 'mcp_progress'
  status: 'started' | 'completed' | 'failed' | 'progress'
  serverName: string
  toolName: string
  elapsedTimeMs?: number
  progress?: unknown
  total?: unknown
  progressMessage?: unknown
}

export interface AgentToolProgress {
  type: 'agent_progress'
  message: NormalizedMessage
  prompt: string
  agentId: string
}

export interface SkillToolProgress {
  type: 'skill_progress'
  message: NormalizedMessage
  prompt: string
  agentId: string
}

export interface WebSearchProgress {
  type: 'query_update' | 'search_results_received'
  query: string
  resultCount?: number
}

export interface TaskOutputProgress {
  type: 'waiting_for_task'
  taskDescription: string
  taskType: string
}

export interface REPLToolProgress {
  type: 'repl_tool_call'
  phase: 'start' | 'end'
  toolName: string
  toolInput: unknown
}

export interface SdkWorkflowProgress {
  type: 'workflow_progress'
  index: number
  phaseIndex: number
  [key: string]: unknown
}

export interface SleepProgress {
  type: 'sleep_progress'
  [key: string]: unknown
}

export type ToolProgressData =
  | BashProgress
  | PowerShellProgress
  | MCPProgress
  | AgentToolProgress
  | SkillToolProgress
  | WebSearchProgress
  | TaskOutputProgress
  | REPLToolProgress
  | SdkWorkflowProgress
  | SleepProgress
