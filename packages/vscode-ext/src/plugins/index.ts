/**
 * Plugins Module - CCLocal VS Code Extension
 * Complete plugin system with marketplace, trust, and lifecycle management
 */

// Types
export type {
  PluginState,
  PluginTrustLevel,
  PluginPermission,
  PluginManifest,
  PluginConfigurationSchema,
  PluginHooks,
  PluginCommand,
  InstalledPlugin,
  MarketplaceInfo,
  MarketplacePlugin,
  PluginEvent,
  PluginEventType,
  PluginInstallOptions,
  PluginManagerOptions,
  PluginStats,
} from './types'

// Manager
export {
  PluginManager,
  getPluginManager,
  disposePluginManager,
} from './PluginManager'

// Panel
export { PluginPanelProvider } from './PluginPanelProvider'

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Format plugin state for display
 */
export function formatPluginState(state: string): string {
  const stateMap: Record<string, string> = {
    available: 'Available',
    installed: 'Installed',
    active: 'Active',
    disabled: 'Disabled',
    error: 'Error',
    updating: 'Updating...',
    uninstalling: 'Uninstalling...',
  }
  return stateMap[state] || state
}

/**
 * Format trust level for display
 */
export function formatTrustLevel(level: string): string {
  const levelMap: Record<string, string> = {
    untrusted: 'Untrusted',
    community: 'Community',
    verified: 'Verified',
    official: 'Official',
    enterprise: 'Enterprise',
  }
  return levelMap[level] || level
}

/**
 * Format permission for display
 */
export function formatPermission(perm: string): string {
  const permMap: Record<string, string> = {
    'read-files': 'Read files',
    'write-files': 'Write files',
    'execute-commands': 'Execute commands',
    'access-network': 'Network access',
    'access-mcp': 'MCP access',
    'access-clipboard': 'Clipboard access',
    'access-workspace': 'Workspace access',
    'access-extensions': 'Extensions access',
    'full-access': 'Full access',
  }
  return permMap[perm] || perm
}

/**
 * Get trust level color
 */
export function getTrustColor(level: string): string {
  const colorMap: Record<string, string> = {
    official: '#4CAF50',
    verified: '#4CAF50',
    community: '#FF9800',
    enterprise: '#2196F3',
    untrusted: '#9E9E9E',
  }
  return colorMap[level] || '#9E9E9E'
}

/**
 * Get state color
 */
export function getStateColor(state: string): string {
  const colorMap: Record<string, string> = {
    active: '#4CAF50',
    installed: '#2196F3',
    disabled: '#9E9E9E',
    error: '#f44336',
    available: '#757575',
    updating: '#FF9800',
    uninstalling: '#f44336',
  }
  return colorMap[state] || '#757575'
}

/**
 * Check if a permission is dangerous
 */
export function isDangerousPermission(perm: string): boolean {
  return ['execute-commands', 'write-files', 'full-access'].includes(perm)
}

/**
 * Get the official Anthropic marketplace URL
 */
export function getOfficialMarketplaceUrl(): string {
  return 'https://marketplace.anthropic.com'
}
