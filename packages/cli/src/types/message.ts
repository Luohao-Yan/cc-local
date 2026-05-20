import type { BetaContentBlock, BetaRawMessageStreamEvent, BetaToolUseBlock, BetaUsage } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { ContentBlockParam, ToolResultBlockParam, ToolUseBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'

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
  postTokens?: number
  preservedSegment?: {
    headUuid: string
    anchorUuid: string
    tailUuid: string
  }
  userContext?: string
  messagesSummarized?: number
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
  timestamp: string | number
  message: {
    role: 'user'
    content: string | ContentBlockParam[]
  }
  planContent?: string
  isMeta?: boolean
  isVisibleInTranscriptOnly?: boolean
  isVirtual?: boolean
  isCompactSummary?: boolean
  toolUseResult?: ToolResultBlockParam
  mcpMeta?: Record<string, unknown>
  imagePasteIds?: string[]
  sourceToolAssistantUUID?: string
  sourceToolUseID?: string
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
  timestamp: string | number
  message: {
    id: string
    model: string
    role: 'assistant'
    content: BetaContentBlock[]
    usage?: BetaUsage
    stop_reason?: string | null
    stop_sequence?: string | null
    type?: string
    container?: unknown | null
    context_management?: unknown | null
  }
  requestId?: string
  apiError?: unknown
  error?: string | unknown
  errorDetails?: string
  isApiErrorMessage?: boolean
  isVirtual?: boolean
  advisorModel?: string
  isMeta?: boolean
}

export interface AttachmentMessage {
  type: 'attachment'
  uuid: string
  timestamp: string | number
  attachment: Record<string, unknown>
}

export type HookResultMessage = AttachmentMessage

export interface SystemInformationalMessage {
  type: 'system'
  subtype: 'informational'
  uuid: string
  timestamp: string | number
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
  timestamp: string | number
  content: string
  level: SystemMessageLevel
  compactMetadata: CompactMetadata
  logicalParentUuid?: string
  isMeta?: boolean
}

export interface SystemMicrocompactBoundaryMessage {
  type: 'system'
  subtype: 'microcompact_boundary'
  uuid: string
  timestamp: string | number
  content: string
  level: SystemMessageLevel
  microcompactMetadata: MicrocompactMetadata
  isMeta?: boolean
}

export interface SystemStopHookSummaryMessage {
  type: 'system'
  subtype: 'stop_hook_summary'
  uuid: string
  timestamp: string | number
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
  isMeta?: boolean
}

export interface SystemTurnDurationMessage {
  type: 'system'
  subtype: 'turn_duration'
  uuid: string
  timestamp: string | number
  content: string
  level: SystemMessageLevel
  durationMs: number
  budgetTokens?: number
  budgetLimit?: number
  budgetNudges?: number
  messageCount?: number
  isMeta?: boolean
}

export interface SystemMemorySavedMessage {
  type: 'system'
  subtype: 'memory_saved'
  uuid: string
  timestamp: string | number
  content: string
  level: SystemMessageLevel
  writtenPaths: string[]
  teamCount?: number
  isMeta?: boolean
  verb?: string
}

export interface SystemAPIErrorMessage {
  type: 'system'
  subtype: 'api_error'
  uuid: string
  timestamp: string | number
  content: string
  level: SystemMessageLevel
  error: unknown
  retryInMs: number
  retryAttempt: number
  maxRetries: number
  cause?: string | Error
  isMeta?: boolean
}

export interface SystemBridgeStatusMessage {
  type: 'system'
  subtype: 'bridge_status'
  uuid: string
  timestamp: string | number
  content: string
  level: SystemMessageLevel
  url: string
  upgradeNudge?: string | boolean
  isMeta?: boolean
}

export interface SystemAwaySummaryMessage {
  type: 'system'
  subtype: 'away_summary'
  uuid: string
  timestamp: string | number
  content: string
  level: SystemMessageLevel
  isMeta?: boolean
}

export interface SystemAgentsKilledMessage {
  type: 'system'
  subtype: 'agents_killed'
  uuid: string
  timestamp: string | number
  content: string
  level: SystemMessageLevel
  isMeta?: boolean
}

export interface SystemApiMetricsMessage {
  type: 'system'
  subtype: 'api_metrics'
  uuid: string
  timestamp: string | number
  content: string
  level: SystemMessageLevel
  ttftMs?: number
  otps?: number
  isP50?: boolean
  hookDurationMs?: number
  turnDurationMs?: number
  toolDurationMs?: number
  classifierDurationMs?: number
  toolCount?: number
  hookCount?: number
  classifierCount?: number
  configWriteCount?: number
  isMeta?: boolean
  [key: string]: unknown
}

export interface SystemLocalCommandMessage {
  type: 'system'
  subtype: 'local_command'
  uuid: string
  timestamp: string | number
  content: string
  level: SystemMessageLevel
  isMeta?: boolean
}

export interface SystemPermissionRetryMessage {
  type: 'system'
  subtype: 'permission_retry'
  uuid: string
  timestamp: string | number
  content: string
  level: SystemMessageLevel
  commands: string[]
  isMeta?: boolean
}

export interface SystemScheduledTaskFireMessage {
  type: 'system'
  subtype: 'scheduled_task_fire'
  uuid: string
  timestamp: string | number
  content: string
  level: SystemMessageLevel
  isMeta?: boolean
}

export interface SystemFileSnapshotMessage {
  type: 'system'
  subtype: 'file_snapshot'
  uuid: string
  timestamp: string | number
  content: string
  level: SystemMessageLevel
  snapshotFiles: Array<{ key: string; path: string; content: string }>
  isMeta?: boolean
}

export interface SystemThinkingMessage {
  type: 'system'
  subtype: 'thinking'
  uuid: string
  timestamp: string | number
  content: string
  level: SystemMessageLevel
  isMeta?: boolean
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
  timestamp: string | number
}

export interface StreamEvent {
  type: 'stream_event'
  event: BetaRawMessageStreamEvent
  ttftMs?: number
  uuid: string
  timestamp: string | number
}

export interface RequestStartEvent {
  type: 'stream_request_start'
  uuid: string
  timestamp: string | number
}

export interface TombstoneMessage {
  type: 'tombstone'
  message: AssistantMessage
  uuid: string
  timestamp: string | number
}

export interface ToolUseSummaryMessage {
  type: 'tool_use_summary'
  summary: string
  precedingToolUseIds: string[]
  uuid: string
  timestamp: string | number
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

export interface NormalizedUserMessage extends UserMessage {
  sourceToolUseID?: string
  message: {
    role: 'user'
    content: ContentBlockParam[]
  }
}

export interface NormalizedAssistantMessage<B extends BetaContentBlock = BetaContentBlock> {
  type: 'assistant'
  uuid: string
  timestamp: string | number
  message: AssistantMessage['message'] & {
    content: B[]
    context_management?: unknown | null
  }
  requestId?: string
  apiError?: unknown
  error?: string
  errorDetails?: string
  isApiErrorMessage?: boolean
  isVirtual?: boolean
  advisorModel?: string
  isMeta?: boolean
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
