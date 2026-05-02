/**
 * VSCode 扩展与 Webview 之间的消息类型定义，
 * 以及与 cclocal CLI WebSocket 通信的消息类型。
 */

/** Webview 发给 Extension 的消息 */
export type WebviewToExtensionMessage =
  | { type: 'sendMessage'; text: string }
  | { type: 'stopGeneration' }
  | { type: 'newSession' }
  | { type: 'clearChat' }
  | { type: 'ready' }

/** Extension 发给 Webview 的消息 */
export type ExtensionToWebviewMessage =
  | { type: 'assistantChunk'; text: string; messageId: string }
  | { type: 'assistantDone'; messageId: string }
  | { type: 'toolUse'; name: string; input: unknown; messageId: string }
  | { type: 'toolResult'; content: string; messageId: string }
  | { type: 'permissionRequest'; toolName: string; requestId: string; input: unknown }
  | { type: 'error'; message: string }
  | { type: 'statusChange'; status: CclocalStatus }
  | { type: 'sessionCleared' }
  | { type: 'userMessage'; text: string; messageId: string }
  | { type: 'cliConnected' }
  | { type: 'cliDisconnected' }

/** cclocal 进程/连接状态 */
export type CclocalStatus =
  | 'idle'        // 等待 CLI 连接
  | 'connecting'  // 等待 cclocal 进程连接 WebSocket
  | 'connected'   // CLI 已连接，就绪
  | 'running'     // 正在生成回复
  | 'stopped'
  | 'error'

/**
 * cclocal CLI 通过 WebSocket 发送的 StdoutMessage 格式。
 * 与 src/entrypoints/sdk/controlTypes.ts 中定义保持一致。
 */
export interface CliMessage {
  type: string
  subtype?: string
  uuid?: string
  /** assistant 消息中的内容块列表 */
  message?: {
    role?: string
    content?: CliContentBlock[]
  }
  /** tool_use 消息中的工具名和输入 */
  name?: string
  input?: unknown
  /** tool_result 消息 */
  content?: string | CliContentBlock[]
  /** 结果消息 */
  result?: string
  /** 错误信息 */
  error?: string
  /** 流式 delta */
  delta?: { type: string; text?: string }
  /** 权限请求（control_request） */
  request_id?: string
  request?: {
    subtype: string
    tool_name?: string
    tool_input?: unknown
  }
}

/** CLI 消息中的内容块 */
export interface CliContentBlock {
  type: string
  text?: string
  name?: string
  input?: unknown
  content?: string | CliContentBlock[]
  id?: string
}
