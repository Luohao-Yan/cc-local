/**
 * 类型声明文件
 */

declare module '@cclocal/shared' {
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
}
