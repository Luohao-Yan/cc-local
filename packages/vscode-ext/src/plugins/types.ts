/**
 * Plugin Types for CCLocal VS Code Extension
 * Complete plugin system with marketplace, trust, and lifecycle management
 */

import type { MCPServerConfig } from '@cclocal/core/mcp'

// ─── Plugin Lifecycle ─────────────────────────────────────────────────────────

export type PluginState =
  | 'available'     // In marketplace, not installed
  | 'installed'     // Installed but not active
  | 'active'        // Running and active
  | 'disabled'      // Explicitly disabled
  | 'error'         // Failed to load/start
  | 'updating'      // Being updated
  | 'uninstalling'  // Being uninstalled

export type PluginTrustLevel =
  | 'untrusted'     // No trust established
  | 'community'     // Community verified
  | 'verified'      // Publisher verified
  | 'official'      // Official Anthropic plugin
  | 'enterprise'    // Enterprise approved

export type PluginPermission =
  | 'read-files'       // Read file contents
  | 'write-files'      // Write/edit files
  | 'execute-commands' // Run shell commands
  | 'access-network'   // Make HTTP requests
  | 'access-mcp'       // Register MCP servers
  | 'access-clipboard' // Read/write clipboard
  | 'access-workspace' // Access workspace info
  | 'access-extensions' // Access other extensions
  | 'full-access'      // Unrestricted access

// ─── Plugin Definition ────────────────────────────────────────────────────────

export interface PluginManifest {
  /** Unique plugin identifier (e.g., "formatter@anthropics") */
  id: string

  /** Human-readable name */
  name: string

  /** Plugin version (semver) */
  version: string

  /** Plugin description */
  description: string

  /** Publisher/author */
  publisher: string

  /** Homepage URL */
  homepage?: string

  /** Repository URL */
  repository?: string

  /** License identifier */
  license?: string

  /** Required CCLocal version */
  minCCLocalVersion?: string

  /** Required VS Code version */
  minVSCodeVersion?: string

  /** Plugin categories */
  categories?: string[]

  /** Keywords for search */
  keywords?: string[]

  /** Icon URL */
  icon?: string

  /** MCP servers this plugin provides */
  mcpServers?: Record<string, MCPServerConfig>

  /** Requested permissions */
  permissions?: PluginPermission[]

  /** Configuration schema */
  configuration?: PluginConfigurationSchema

  /** Hook definitions */
  hooks?: PluginHooks

  /** Plugin entry point */
  main?: string

  /** Contributed commands */
  commands?: PluginCommand[]

  /** Runtime type */
  runtime?: 'node' | 'browser' | 'mcp-only'
}

export interface PluginConfigurationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object'
    default?: unknown
    description?: string
    enum?: string[]
  }
}

export interface PluginHooks {
  [hookType: string]: string[]  // hookType -> command patterns
}

export interface PluginCommand {
  /** Command ID (without cclocal. prefix) */
  id: string

  /** Display title */
  title: string

  /** Command handler function name in plugin main */
  handler: string
}

// ─── Installed Plugin ──────────────────────────────────────────────────────────

export interface InstalledPlugin {
  /** Plugin manifest */
  manifest: PluginManifest

  /** Installation path */
  installPath: string

  /** Current state */
  state: PluginState

  /** Trust level */
  trustLevel: PluginTrustLevel

  /** Installation timestamp */
  installedAt: number

  /** Last update timestamp */
  updatedAt: number

  /** Whether user has approved permissions */
  permissionsApproved: boolean

  /** Approved permissions list */
  approvedPermissions: PluginPermission[]

  /** Plugin configuration values */
  configuration: Record<string, unknown>

  /** Source marketplace */
  marketplaceUrl?: string

  /** Last error message */
  lastError?: string
}

// ─── Marketplace ───────────────────────────────────────────────────────────────

export interface MarketplaceInfo {
  /** Marketplace URL */
  url: string

  /** Marketplace name */
  name: string

  /** Trust level of marketplace */
  trustLevel: 'official' | 'verified' | 'community' | 'untrusted'

  /** Whether this is a known marketplace */
  isKnown: boolean

  /** Last refresh timestamp */
  lastRefreshed?: number

  /** Available plugins from this marketplace */
  plugins?: MarketplacePlugin[]
}

export interface MarketplacePlugin {
  /** Plugin manifest */
  manifest: PluginManifest

  /** Download URL */
  downloadUrl: string

  /** SHA256 checksum */
  checksum: string

  /** Download count */
  downloads: number

  /** Star rating (0-5) */
  rating: number

  /** Trust level */
  trustLevel: PluginTrustLevel

  /** Source marketplace URL */
  marketplaceUrl: string
}

// ─── Plugin Events ─────────────────────────────────────────────────────────────

export type PluginEventType =
  | 'plugin_installed'
  | 'plugin_uninstalled'
  | 'plugin_activated'
  | 'plugin_deactivated'
  | 'plugin_updated'
  | 'plugin_error'
  | 'permissions_requested'
  | 'permissions_granted'
  | 'trust_changed'
  | 'marketplace_added'
  | 'marketplace_removed'
  | 'marketplace_refreshed'

export interface PluginEvent {
  type: PluginEventType
  pluginId?: string
  marketplaceUrl?: string
  data?: unknown
}

// ─── Plugin Install Options ─────────────────────────────────────────────────────

export interface PluginInstallOptions {
  /** Skip trust verification */
  skipTrust?: boolean

  /** Auto-approve permissions */
  autoApprove?: boolean

  /** Specific version to install */
  version?: string

  /** Install from local path */
  localPath?: string
}

// ─── Plugin Manager Options ─────────────────────────────────────────────────────

export interface PluginManagerOptions {
  /** Known official marketplaces */
  officialMarketplaces?: string[]

  /** Extra known marketplaces */
  extraKnownMarketplaces?: string[]

  /** Strict marketplace whitelist */
  strictKnownMarketplaces?: string[]

  /** Blocked marketplaces */
  blockedMarketplaces?: string[]

  /** Auto-update plugins */
  autoUpdate?: boolean

  /** Check updates interval (ms) */
  updateCheckInterval?: number
}

// ─── Plugin Stats ───────────────────────────────────────────────────────────────

export interface PluginStats {
  totalInstalled: number
  totalActive: number
  byState: Record<PluginState, number>
  byTrust: Record<PluginTrustLevel, number>
  marketplaces: number
  availablePlugins: number
}
