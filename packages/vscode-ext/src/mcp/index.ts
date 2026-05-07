/**
 * MCP Module - CCLocal VS Code Extension
 * Complete MCP server discovery, approval, authentication, and management
 */

// Types
export type {
  MCPServerInfo,
  MCPApprovalState,
  MCPAuthState,
  MCPConfigSource,
  MCPConfigFile,
  MCPStateChangeEvent,
  MCPManagerOptions,
  MCPStats,
  MCPApprovalRequest,
  MCPApprovalResponse,
  MCPServerConfig,
  MCPServerStatus,
  MCPToolDefinition,
} from './types'

// Manager
export {
  MCPManager,
  getMCPManager,
  disposeMCPManager,
} from './MCPManager'

// Panel
export { MCPPanelProvider } from './MCPPanelProvider'

// Authenticator
export { MCPAuthenticator } from './MCPAuthenticator'
export type {
  MCPPromptOAuthConfig,
  MCPOAuthToken,
} from './MCPAuthenticator'

// VS Code Tools
export {
  getVSCodeMCPTools,
  registerFileSaveListener,
} from './vscodeTools'
export type { VSCodeToolDefinition } from './vscodeTools'

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Format server status for display
 */
export function formatServerStatus(status: string): string {
  const statusMap: Record<string, string> = {
    registered: 'Registered',
    connecting: 'Connecting...',
    connected: 'Connected',
    disconnected: 'Disconnected',
    failed: 'Failed',
  }
  return statusMap[status] || status
}

/**
 * Format approval state for display
 */
export function formatApprovalState(state: string): string {
  const stateMap: Record<string, string> = {
    pending: 'Pending',
    approved: 'Approved',
    denied: 'Denied',
  }
  return stateMap[state] || state
}

/**
 * Get status color for theming
 */
export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    connected: '#4CAF50',
    connecting: '#2196F3',
    failed: '#f44336',
    disconnected: '#9E9E9E',
    registered: '#757575',
  }
  return colorMap[status] || '#757575'
}

/**
 * Get approval state color for theming
 */
export function getApprovalColor(state: string): string {
  const colorMap: Record<string, string> = {
    approved: '#4CAF50',
    pending: '#FF9800',
    denied: '#f44336',
  }
  return colorMap[state] || '#757575'
}

/**
 * Get transport icon for display
 */
export function getTransportIcon(type: string): string {
  const iconMap: Record<string, string> = {
    stdio: '$(terminal)',
    sse: '$(globe)',
    http: '$(globe)',
    ws: '$(plug)',
  }
  return iconMap[type] || '$(server)'
}
