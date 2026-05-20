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
  /** Auth token for IDE WebSocket connections (sent as header) */
  authToken?: string
  /** Whether the IDE is running on Windows (affects host IP detection) */
  ideRunningInWindows?: boolean
  /** OAuth client ID for MCP server authentication (CIMD/SEP-991) */
  oauthClientId?: string
  /** OAuth client secret (if required by the server) */
  oauthClientSecret?: string
  /** OAuth scopes to request */
  oauthScopes?: string[]
  /** Stored OAuth token set (access + refresh) */
  oauthTokens?: MCPOAuthTokenSet
}

/** OAuth token set for MCP server authentication */
export interface MCPOAuthTokenSet {
  accessToken: string
  refreshToken?: string
  expiresAt?: number // Unix timestamp in ms
  scope?: string
  tokenType?: string
}

/** OAuth metadata discovered from the server (RFC 9728) */
export interface MCPOAuthMetadata {
  issuer?: string
  authorizationEndpoint?: string
  tokenEndpoint?: string
  registrationEndpoint?: string
  revocationEndpoint?: string
  scopesSupported?: string[]
  codeChallengeMethodsSupported?: string[]
}

/** Dynamic Client Registration response */
export interface MCPDCRResponse {
  clientId: string
  clientSecret?: string
  clientIdIssuedAt?: number
  clientSecretExpiresAt?: number
  redirectUris?: string[]
  tokenEndpointAuthMethod?: string
  grantTypes?: string[]
  scope?: string
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

export interface MCPResourceDefinition {
  uri: string
  name?: string
  description?: string
  mimeType?: string
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
