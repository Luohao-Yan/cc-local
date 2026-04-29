/** Shape persisted via secure storage (MCP OAuth, etc.). */

export interface SecureStorageData {
  mcpOAuth?: Record<
    string,
    {
      serverName?: string
      serverUrl?: string
      accessToken?: string
      expiresAt?: number
      stepUpScope?: unknown
      discoveryState?: {
        authorizationServerUrl?: string
        resourceMetadataUrl?: string
        [key: string]: unknown
      }
      [key: string]: unknown
    }
  >
  [key: string]: unknown
}
