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

/** Secure storage interface with read/update/delete methods. */
export interface SecureStorage {
  read(): SecureStorageData | null
  readAsync(): Promise<SecureStorageData | null>
  update(data: SecureStorageData): { success: boolean; warning?: string }
  delete(): boolean
}
