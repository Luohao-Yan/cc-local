export interface AgentMcpServerInfo {
  name: string
  sourceAgents: string[]
  transport: 'stdio' | 'sse' | 'http' | 'ws'
  command?: string
  url?: string
  needsAuth: boolean
}

export interface StdioServerInfo {
  name: string
  client: unknown
  scope: unknown
  transport: 'stdio'
  config: Record<string, unknown>
}

export interface SSEServerInfo {
  name: string
  client: unknown
  scope: unknown
  transport: 'sse'
  isAuthenticated: boolean | undefined
  config: Record<string, unknown>
}

export interface HTTPServerInfo {
  name: string
  client: unknown
  scope: unknown
  transport: 'http'
  isAuthenticated: boolean | undefined
  config: Record<string, unknown>
}

export interface ClaudeAIServerInfo {
  name: string
  client: unknown
  scope: unknown
  transport: 'claudeai-proxy'
  isAuthenticated: boolean | undefined
  config: Record<string, unknown>
}

export type MCPViewState =
  | { mode: 'list' }
  | { mode: 'server-detail'; serverName: string }
  | { mode: 'add-server' }

export type ServerInfo = StdioServerInfo | SSEServerInfo | HTTPServerInfo | ClaudeAIServerInfo

export type RGBColor = [number, number, number]
