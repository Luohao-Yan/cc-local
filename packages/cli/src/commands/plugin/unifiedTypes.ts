import type { MCPServerConnection } from '../../services/mcp/types.js'
import type { LoadedPlugin, PluginError } from '../../types/plugin.js'

/**
 * Stub discriminated union for the unified plugin / MCP manage UI.
 * Shapes mirror `ManagePlugins.tsx` construction sites.
 */
export type UnifiedInstalledItem =
  | {
      type: 'plugin'
      id: string
      name: string
      description?: string
      marketplace: string
      scope: string
      isEnabled: boolean
      errorCount: number
      errors: PluginError[]
      plugin: LoadedPlugin
      pendingEnable?: boolean
      pendingUpdate?: boolean
      pendingToggle?: 'will-enable' | 'will-disable'
    }
  | {
      type: 'mcp'
      id: string
      name: string
      description?: string
      scope: string
      status:
        | 'connected'
        | 'disabled'
        | 'pending'
        | 'needs-auth'
        | 'failed'
      client: MCPServerConnection
      indented?: boolean
    }
  | {
      type: 'flagged-plugin'
      id: string
      name: string
      marketplace: string
      scope: 'flagged'
      reason: string
      text: string
      flaggedAt: string
    }
  | {
      type: 'failed-plugin'
      id: string
      name: string
      marketplace: string
      scope: string
      errorCount: number
      errors: PluginError[]
    }
