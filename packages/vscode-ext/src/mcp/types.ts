/**
 * MCP Types for CCLocal VS Code Extension
 * Extends core MCP types with approval and authentication state
 */

import type { MCPServerConfig, MCPServerStatus, MCPToolDefinition } from '@cclocal/core/mcp'

// Re-export core types
export type { MCPServerConfig, MCPServerStatus, MCPToolDefinition }

// ─── Extended Types ───────────────────────────────────────────────────────────

/**
 * Approval state for a discovered MCP server
 */
export type MCPApprovalState = 'pending' | 'approved' | 'denied'

/**
 * Authentication state for an MCP server
 */
export type MCPAuthState = 'none' | 'required' | 'authenticating' | 'authenticated' | 'failed'

/**
 * Source of MCP server configuration
 */
export type MCPConfigSource = 'user' | 'project' | 'local'

/**
 * Extended server record with approval and auth state
 */
export interface MCPServerInfo {
  /** Unique server name */
  name: string

  /** Server configuration */
  config: MCPServerConfig

  /** Connection status */
  status: MCPServerStatus

  /** Available tools from this server */
  tools: MCPToolDefinition[]

  /** Last error message */
  lastError?: string

  /** Approval state */
  approvalState: MCPApprovalState

  /** Authentication state */
  authState: MCPAuthState

  /** Configuration source */
  source: MCPConfigSource

  /** Last updated timestamp */
  updatedAt: number

  /** Server description (from config) */
  description?: string

  /** Whether this server requires OAuth */
  requiresOAuth?: boolean

  /** OAuth scopes required */
  oauthScopes?: string[]
}

/**
 * MCP configuration file format
 */
export interface MCPConfigFile {
  /** MCP servers indexed by name */
  mcpServers?: Record<string, MCPServerConfig>
}

/**
 * MCP approval request
 */
export interface MCPApprovalRequest {
  /** Server name */
  name: string

  /** Server info */
  info: MCPServerInfo

  /** Tools that will be available */
  tools: MCPToolDefinition[]

  /** Reason for approval request */
  reason: 'auto_discovery' | 'user_request' | 'config_change'
}

/**
 * MCP approval response
 */
export interface MCPApprovalResponse {
  /** Server name */
  name: string

  /** Whether approved */
  approved: boolean

  /** Whether to remember this decision */
  remember: boolean

  /** Optional reason for denial */
  reason?: string
}

/**
 * MCP state change event
 */
export interface MCPStateChangeEvent {
  /** Event type */
  type: 'server_discovered' | 'server_approved' | 'server_denied' |
        'server_connected' | 'server_disconnected' | 'server_failed' |
        'server_removed' | 'tools_updated' | 'auth_required' | 'auth_completed'

  /** Server name */
  serverName: string

  /** Server info (if applicable) */
  info?: MCPServerInfo

  /** Previous state (if applicable) */
  previousState?: Partial<MCPServerInfo>
}

/**
 * MCP manager configuration
 */
export interface MCPManagerOptions {
  /** Whether to auto-discover project servers */
  autoDiscoverProject?: boolean

  /** Whether to auto-approve known servers */
  autoApproveKnown?: boolean

  /** List of pre-approved server names */
  preApprovedServers?: string[]

  /** List of denied server names */
  deniedServers?: string[]

  /** List of allowed server patterns */
  allowedPatterns?: string[]

  /** List of blocked server patterns */
  blockedPatterns?: string[]
}

/**
 * MCP statistics
 */
export interface MCPStats {
  /** Total servers discovered */
  totalDiscovered: number

  /** Servers by status */
  byStatus: Record<MCPServerStatus, number>

  /** Servers by approval state */
  byApproval: Record<MCPApprovalState, number>

  /** Servers by source */
  bySource: Record<MCPConfigSource, number>

  /** Total tools available */
  totalTools: number

  /** Connected servers */
  connectedServers: string[]

  /** Failed servers */
  failedServers: string[]
}
