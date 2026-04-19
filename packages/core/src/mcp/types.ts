export type MCPTransportType = 'stdio' | 'sse' | 'http' | 'ws'

export interface MCPServerConfig {
  type: MCPTransportType
  command?: string
  args?: string[]
  cwd?: string
  url?: string
  env?: Record<string, string>
  headers?: Record<string, string>
  namespace?: string
  allowedTools?: string[]
  blockedTools?: string[]
  syncToolsToRegistry?: boolean
}

export type MCPServerStatus =
  | 'registered'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'

export interface MCPToolDefinition {
  name: string
  description: string
  inputSchema?: Record<string, unknown>
  registeredName?: string
}

export interface MCPServerRecord {
  name: string
  config: MCPServerConfig
  status: MCPServerStatus
  tools: MCPToolDefinition[]
  lastError?: string
  updatedAt: number
}

export interface MCPServerRegistration {
  name: string
  config: MCPServerConfig
  tools?: MCPToolDefinition[]
}
