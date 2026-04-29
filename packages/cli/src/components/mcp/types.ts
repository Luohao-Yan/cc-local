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
  config: Record<string, unknown>
}

export interface ClaudeAIServerInfo {
  name: string
  client: unknown
  scope: unknown
  transport: 'claudeai-proxy'
  config: Record<string, unknown>
}
