import type { BetaContentBlock, BetaRawMessageStreamEvent, BetaToolUseBlock } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { ContentBlockParam, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'

export type SystemMessageLevel = 'info' | 'warning' | 'error'

export type PartialCompactDirection = 'from' | 'up_to'

export type MessageOrigin =
  | { kind: 'task-notification' }
  | { kind: 'coordinator' }
  | { kind: 'channel'; server: string }
  | { kind: 'human' }

export interface CompactMetadata {
  trigger: string
  preTokens: number
  preservedSegment?: {
    headUuid: string
    anchorUuid: string
    tailUuid: string
  }
}

export interface MicrocompactMetadata {
  trigger: string
  preTokens: number
  tokensSaved: number
  compactedToolIds: string[]
  clearedAttachmentUUIDs: string[]
}

export interface StopHookInfo {
  command: string
  promptText?: string
  durationMs?: number
}

export interface UserMessage {
  type: 'user'
  uuid: string
  timestamp: number
  message: {
    role: 'user'
    content: string | ContentBlockParam[]
  }
  isMeta?: boolean
  isVisibleInTranscriptOnly?: boolean
  isVirtual?: boolean
  isCompactSummary?: boolean
  toolUseResult?: ToolResultBlockParam
  mcpMeta?: Record<string, unknown>
  imagePasteIds?: string[]
  sourceToolAssistantUUID?: string
  permissionMode?: string
  summarizeMetadata?: {
    messagesSummarized: number
    userContext?: string
    direction?: PartialCompactDirection
  }
  origin?: MessageOrigin
}

export interface AssistantMessage {
  type: 'assistant'
  uuid: string
  timestamp: number
  message: {
    id: string
    model: string
    role: 'assistant'
    content: BetaContentBlock[]
    usage?: {
      input_tokens: number
      output_tokens: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
    stop_reason?: string | null
    type?: string
  }
  requestId?: string
  apiError?: unknown
  error?: string
  errorDetails?: string
  isApiErrorMessage?: boolean
  isVirtual?: boolean
  advisorModel?: string
}

export interface AttachmentMessage {
  type: 'attachment'
  uuid: string
  timestamp: number
  attachment: Record<string, unknown>
}

export type HookResultMessage = AttachmentMessage

export interface SystemInformationalMessage {
  type: 'system'
  subtype: 'informational'
  uuid: string
  timestamp: number
  content: string
  level: SystemMessageLevel
  toolUseID?: string
  preventContinuation?: boolean
  isMeta?: boolean
}

export interface SystemCompactBoundaryMessage {
  type: 'system'
  subtype: 'compact_boundary'
  uuid: string
  timestamp: number
  content: string
  level: SystemMessageLevel
  compactMetadata: CompactMetadata
  logicalParentUuid?: string
}

export interface SystemMicrocompactBoundaryMessage {
  type: 'system'
  subtype: 'microcompact_boundary'
  uuid: string
  timestamp: number
  content: string
  level: SystemMessageLevel
  microcompactMetadata: MicrocompactMetadata
}

export interface SystemStopHookSummaryMessage {
  type: 'system'
  subtype: 'stop_hook_summary'
  uuid: string
  timestamp: number
  content: string
  level: SystemMessageLevel
  hookCount: number
  hookInfos: StopHookInfo[]
  hookErrors: string[]
  preventedContinuation: boolean
  stopReason?: string
  hasOutput: boolean
  toolUseID?: string
  hookLabel?: string
  totalDurationMs?: number
}

export interface SystemTurnDurationMessage {
  type: 'system'
  subtype: 'turn_duration'
  uuid: string
  timestamp: number
  content: string
  level: SystemMessageLevel
  durationMs: number
}

export interface SystemMemorySavedMessage {
  type: 'system'
  subtype: 'memory_saved'
  uuid: string
  timestamp: number
  content: string
  level: SystemMessageLevel
  writtenPaths: string[]
  teamCount?: number
}

export interface SystemAPIErrorMessage {
  type: 'system'
  subtype: 'api_error'
  uuid: string
  timestamp: number
  content: string
  level: SystemMessageLevel
  error: unknown
  retryInMs: number
  retryAttempt: number
  maxRetries: number
  cause?: string
}

export interface SystemBridgeStatusMessage {
  type: 'system'
  subtype: 'bridge_status'
  uuid: string
  timestamp: number
  content: string
  level: SystemMessageLevel
  url: string
  upgradeNudge?: boolean
}

export interface SystemAwaySummaryMessage {
  type: 'system'
  subtype: 'away_summary'
  uuid: string
  timestamp: number
  content: string
  level: SystemMessageLevel
}

export interface SystemAgentsKilledMessage {
  type: 'system'
  subtype: 'agents_killed'
  uuid: string
  timestamp: number
  content: string
  level: SystemMessageLevel
}

export interface SystemApiMetricsMessage {
  type: 'system'
  subtype: 'api_metrics'
  uuid: string
  timestamp: number
  content: string
  level: SystemMessageLevel
  [key: string]: unknown
}

export interface SystemLocalCommandMessage {
  type: 'system'
  subtype: 'local_command'
  uuid: string
  timestamp: number
  content: string
  level: SystemMessageLevel
}

export interface SystemPermissionRetryMessage {
  type: 'system'
  subtype: 'permission_retry'
  uuid: string
  timestamp: number
  content: string
  level: SystemMessageLevel
  commands: string[]
}

export interface SystemScheduledTaskFireMessage {
  type: 'system'
  subtype: 'scheduled_task_fire'
  uuid: string
  timestamp: number
  content: string
  level: SystemMessageLevel
}

export interface SystemFileSnapshotMessage {
  type: 'system'
  subtype: 'file_snapshot'
  uuid: string
  timestamp: number
  content: string
  level: SystemMessageLevel
  snapshotFiles: Array<{ key: string; path: string; content: string }>
}

export interface SystemThinkingMessage {
  type: 'system'
  subtype: 'thinking'
  uuid: string
  timestamp: number
  content: string
  level: SystemMessageLevel
}

export type SystemMessage =
  | SystemInformationalMessage
  | SystemCompactBoundaryMessage
  | SystemMicrocompactBoundaryMessage
  | SystemStopHookSummaryMessage
  | SystemTurnDurationMessage
  | SystemMemorySavedMessage
  | SystemAPIErrorMessage
  | SystemBridgeStatusMessage
  | SystemAwaySummaryMessage
  | SystemAgentsKilledMessage
  | SystemApiMetricsMessage
  | SystemLocalCommandMessage
  | SystemPermissionRetryMessage
  | SystemScheduledTaskFireMessage
  | SystemFileSnapshotMessage
  | SystemThinkingMessage

export interface ProgressMessage<P = unknown> {
  type: 'progress'
  toolUseID: string
  parentToolUseID?: string
  data: P
  uuid: string
  timestamp: number
}

export interface StreamEvent {
  type: 'stream_event'
  event: BetaRawMessageStreamEvent
  ttftMs?: number
}

export interface RequestStartEvent {
  type: 'stream_request_start'
}

export interface TombstoneMessage {
  type: 'tombstone'
  message: AssistantMessage
}

export interface ToolUseSummaryMessage {
  type: 'tool_use_summary'
  summary: string
  precedingToolUseIds: string[]
  uuid: string
  timestamp: number
}

export type Message =
  | UserMessage
  | AssistantMessage
  | AttachmentMessage
  | SystemMessage
  | ProgressMessage
  | StreamEvent
  | RequestStartEvent
  | TombstoneMessage
  | ToolUseSummaryMessage

export interface NormalizedUserMessage extends UserMessage {}

export interface NormalizedAssistantMessage<B extends BetaContentBlock = BetaContentBlock> {
  type: 'assistant'
  uuid: string
  timestamp: number
  message: AssistantMessage['message'] & {
    content: B[]
  }
  requestId?: string
  apiError?: unknown
  error?: string
  errorDetails?: string
  isApiErrorMessage?: boolean
  isVirtual?: boolean
  advisorModel?: string
}

export type NormalizedMessage =
  | NormalizedUserMessage
  | NormalizedAssistantMessage
  | AttachmentMessage
  | SystemMessage
  | ProgressMessage

export interface GroupedToolUseMessage {
  type: 'grouped_tool_use'
  toolName: string
  messages: NormalizedAssistantMessage<BetaToolUseBlock>[]
  results: NormalizedUserMessage[]
  displayMessage: NormalizedAssistantMessage
  uuid: string
  timestamp: number
  messageId: string
}

export interface CollapsedReadSearchGroup {
  type: 'collapsed_read_search'
  searchCount: number
  readCount: number
  listCount: number
  replCount: number
  memorySearchCount: number
  memoryReadCount: number
  memoryWriteCount: number
  readFilePaths: string[]
  searchArgs: string[]
  latestDisplayHint?: string
  messages: CollapsibleMessage[]
  displayMessage: NormalizedAssistantMessage
  uuid: string
  timestamp: number
  mcpCallCount?: number
  mcpServerNames?: string[]
  bashCount?: number
  gitOpBashCount?: number
  hookTotalMs?: number
  hookCount?: number
  hookInfos?: StopHookInfo[]
  relevantMemories?: unknown[]
  commits?: string[]
  pushes?: string[]
  branches?: string[]
  prs?: string[]
}

export type CollapsibleMessage = NormalizedAssistantMessage | GroupedToolUseMessage | NormalizedUserMessage

export type RenderableMessage =
  | NormalizedUserMessage
  | NormalizedAssistantMessage
  | AttachmentMessage
  | SystemMessage
  | GroupedToolUseMessage
  | CollapsedReadSearchGroup
