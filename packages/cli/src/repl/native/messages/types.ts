/**
 * Message Types for Native REPL
 *
 * Defines all message types that can be rendered in the terminal UI.
 * Based on the Ink UI message components.
 */

import type { Message as APIMessage } from '@anthropic-ai/sdk/resources/index.mjs'

/**
 * Base message type
 */
export interface BaseMessage {
  /** Unique message ID */
  id: string
  /** Message timestamp */
  timestamp: number
  /** Whether message is collapsed */
  collapsed?: boolean
  /** Whether message is hidden */
  hidden?: boolean
  /** Whether message is selected */
  selected?: boolean
}

/**
 * User text message
 */
export interface UserTextMessage extends BaseMessage {
  type: 'user_text'
  /** User input text */
  content: string
  /** Attached images */
  images?: Array<{ id: string; mediaType: string }>
}

/**
 * User command message (slash command)
 */
export interface UserCommandMessage extends BaseMessage {
  type: 'user_command'
  /** Command name (without /) */
  command: string
  /** Command arguments */
  args?: string
  /** Raw input */
  raw: string
}

/**
 * User tool result message
 */
export interface UserToolResultMessage extends BaseMessage {
  type: 'user_tool_result'
  /** Tool use ID being responded to */
  toolUseId: string
  /** Tool name */
  toolName: string
  /** Result content */
  content: string | Array<{ type: 'text'; text: string } | { type: 'image'; source: unknown }>
  /** Whether result is an error */
  isError?: boolean
  /** Whether tool was rejected */
  isRejected?: boolean
  /** Whether tool was canceled */
  isCanceled?: boolean
}

/**
 * Assistant text message
 */
export interface AssistantTextMessage extends BaseMessage {
  type: 'assistant_text'
  /** Assistant response text */
  content: string
  /** Whether streaming is in progress */
  isStreaming?: boolean
}

/**
 * Assistant tool use message
 */
export interface AssistantToolUseMessage extends BaseMessage {
  type: 'assistant_tool_use'
  /** Tool use ID */
  toolUseId: string
  /** Tool name */
  toolName: string
  /** Tool input */
  input: Record<string, unknown>
  /** Whether tool is currently executing */
  isExecuting?: boolean
  /** Execution duration in ms */
  duration?: number
}

/**
 * Assistant thinking message
 */
export interface AssistantThinkingMessage extends BaseMessage {
  type: 'assistant_thinking'
  /** Thinking content */
  content: string
  /** Whether streaming is in progress */
  isStreaming?: boolean
  /** Whether thinking is redacted */
  isRedacted?: boolean
}

/**
 * System message
 */
export interface SystemMessage extends BaseMessage {
  type: 'system'
  /** System message content */
  content: string
  /** Message subtype */
  subtype?: 'info' | 'warning' | 'error' | 'rate_limit' | 'api_error'
}

/**
 * Permission request message
 */
export interface PermissionRequestMessage extends BaseMessage {
  type: 'permission_request'
  /** Tool name */
  toolName: string
  /** Tool input */
  input: unknown
  /** Permission reason */
  reason?: string
  /** Whether request is pending */
  isPending?: boolean
}

/**
 * Hook progress message
 */
export interface HookProgressMessage extends BaseMessage {
  type: 'hook_progress'
  /** Hook name */
  hookName: string
  /** Progress message */
  message: string
  /** Progress percentage (0-100) */
  progress?: number
}

/**
 * Task assignment message
 */
export interface TaskAssignmentMessage extends BaseMessage {
  type: 'task_assignment'
  /** Task ID */
  taskId: string
  /** Task subject */
  subject: string
  /** Task status */
  status: 'pending' | 'in_progress' | 'completed'
}

/**
 * Grouped tool use content (collapsed multiple tools)
 */
export interface GroupedToolUseMessage extends BaseMessage {
  type: 'grouped_tool_use'
  /** Tool uses in group */
  tools: Array<{
    toolUseId: string
    toolName: string
    input: Record<string, unknown>
  }>
  /** Group label */
  label?: string
}

/**
 * Collapsed read/search content
 */
export interface CollapsedReadSearchMessage extends BaseMessage {
  type: 'collapsed_read_search'
  /** Operation type */
  operation: 'read' | 'search' | 'glob'
  /** Count of items */
  count: number
  /** Summary */
  summary?: string
}

/**
 * Rate limit message
 */
export interface RateLimitMessage extends BaseMessage {
  type: 'rate_limit'
  /** Wait time in seconds */
  waitTime: number
  /** Limit type */
  limitType: 'requests' | 'tokens'
}

/**
 * Compact boundary message
 */
export interface CompactBoundaryMessage extends BaseMessage {
  type: 'compact_boundary'
  /** Number of messages compacted */
  messagesCompacted: number
  /** Tokens saved */
  tokensSaved?: number
}

/**
 * Union type of all message types
 */
export type NativeMessage =
  | UserTextMessage
  | UserCommandMessage
  | UserToolResultMessage
  | AssistantTextMessage
  | AssistantToolUseMessage
  | AssistantThinkingMessage
  | SystemMessage
  | PermissionRequestMessage
  | HookProgressMessage
  | TaskAssignmentMessage
  | GroupedToolUseMessage
  | CollapsedReadSearchMessage
  | RateLimitMessage
  | CompactBoundaryMessage

/**
 * Message type guard functions
 */
export function isUserTextMessage(msg: NativeMessage): msg is UserTextMessage {
  return msg.type === 'user_text'
}

export function isUserCommandMessage(msg: NativeMessage): msg is UserCommandMessage {
  return msg.type === 'user_command'
}

export function isUserToolResultMessage(msg: NativeMessage): msg is UserToolResultMessage {
  return msg.type === 'user_tool_result'
}

export function isAssistantTextMessage(msg: NativeMessage): msg is AssistantTextMessage {
  return msg.type === 'assistant_text'
}

export function isAssistantToolUseMessage(msg: NativeMessage): msg is AssistantToolUseMessage {
  return msg.type === 'assistant_tool_use'
}

export function isAssistantThinkingMessage(msg: NativeMessage): msg is AssistantThinkingMessage {
  return msg.type === 'assistant_thinking'
}

export function isSystemMessage(msg: NativeMessage): msg is SystemMessage {
  return msg.type === 'system'
}

export function isPermissionRequestMessage(msg: NativeMessage): msg is PermissionRequestMessage {
  return msg.type === 'permission_request'
}

/**
 * Convert API message to native message format
 */
export function fromAPIMessage(msg: APIMessage): NativeMessage[] {
  const results: NativeMessage[] = []
  const id = msg.id || crypto.randomUUID()
  const timestamp = Date.now()

  // Cast to handle both user and assistant message types
  const message = msg as unknown as {
    role: 'user' | 'assistant'
    content: string | Array<Record<string, unknown>>
  }

  // Handle user messages
  if (message.role === 'user') {
    if (typeof message.content === 'string') {
      results.push({
        type: 'user_text',
        id,
        timestamp,
        content: message.content,
      })
    } else if (Array.isArray(message.content)) {
      const textParts: string[] = []
      const images: Array<{ id: string; mediaType: string }> = []

      for (const block of message.content) {
        if (block.type === 'text') {
          textParts.push(block.text as string)
        } else if (block.type === 'image') {
          const source = block.source as { media_type: string }
          images.push({
            id: crypto.randomUUID(),
            mediaType: source.media_type,
          })
        }
      }

      if (textParts.length > 0 || images.length === 0) {
        results.push({
          type: 'user_text',
          id,
          timestamp,
          content: textParts.join('\n'),
          images: images.length > 0 ? images : undefined,
        })
      }
    }
  } else if (message.role === 'assistant') {
    if (typeof message.content === 'string') {
      results.push({
        type: 'assistant_text',
        id,
        timestamp,
        content: message.content,
      })
    } else if (Array.isArray(message.content)) {
      for (const block of message.content) {
        if (block.type === 'text') {
          results.push({
            type: 'assistant_text',
            id: `${id}-text`,
            timestamp,
            content: block.text as string,
          })
        } else if (block.type === 'tool_use') {
          results.push({
            type: 'assistant_tool_use',
            id: `${id}-tool-${block.id as string}`,
            timestamp,
            toolUseId: block.id as string,
            toolName: block.name as string,
            input: block.input as Record<string, unknown>,
          })
        } else if (block.type === 'thinking') {
          results.push({
            type: 'assistant_thinking',
            id: `${id}-thinking`,
            timestamp,
            content: block.thinking as string,
          })
        }
      }
    }
  }

  return results
}
