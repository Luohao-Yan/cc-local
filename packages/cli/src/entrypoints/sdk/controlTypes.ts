export interface SDKControlRequest {
  type: 'control_request'
  request_id: string
  request: SDKControlRequestInner
}

export type SDKControlRequestInner = Record<string, unknown> & { subtype: string }

export interface SDKControlResponse {
  type: 'control_response'
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

export interface SDKControlInitializeRequest {
  type: 'control_request'
  request_id: string
  request: {
    subtype: 'initialize'
    [key: string]: unknown
  }
}

export interface SDKControlInitializeResponse {
  type: 'control_response'
  response: {
    subtype: 'initialize'
    success: boolean
    [key: string]: unknown
  }
}

export interface SDKControlMcpSetServersResponse {
  type: 'control_response'
  response: {
    subtype: 'mcp_set_servers'
    success: boolean
    [key: string]: unknown
  }
}

export interface SDKControlReloadPluginsResponse {
  type: 'control_response'
  response: {
    subtype: 'reload_plugins'
    success: boolean
    [key: string]: unknown
  }
}

export interface SDKPartialAssistantMessage {
  type: 'partial_assistant'
  [key: string]: unknown
}

export type StdoutMessage =
  | SDKControlResponse
  | SDKControlRequest
  | SDKControlCancelRequest
  | Record<string, unknown>

export type StdinMessage =
  | SDKControlRequest
  | SDKControlResponse
  | SDKControlCancelRequest
  | Record<string, unknown>
