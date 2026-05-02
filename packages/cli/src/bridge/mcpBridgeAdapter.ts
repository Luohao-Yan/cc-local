/**
 * MCP Bridge Adapter
 *
 * Bridges the core @cclocal/core MCPManager into the legacy Ink/React UI's
 * AppState.mcp slice. When the cclocal-next entrypoint uses the bridge
 * renderer, the old UI still reads from AppState — this adapter keeps
 * AppState.mcp in sync with the core MCPManager's real state.
 *
 * Lifecycle:
 * 1. connectAll() — called once at bridge startup, connects all registered
 *    servers that have status 'registered' or 'disconnected'.
 * 2. syncState() — called after each connect/disconnect/toggle, writes the
 *    current MCPManager server list into the Ink UI's store.
 * 3. reconnect/toggle — delegate to core MCPManager, then re-sync.
 */

import type { MCPServerRecord, MCPServerConfig } from '@cclocal/core/mcp'
import type { MCPManager } from '@cclocal/core'
import type { Store } from '../state/store.js'

/**
 * Legacy MCP types that the Ink UI expects.
 * We define a minimal shape sufficient for AppState.mcp.clients.
 */
export interface LegacyMCPClient {
  name: string
  type: 'connected' | 'failed' | 'needs-auth' | 'pending' | 'disabled'
  config: MCPServerConfig & { scope?: string }
  error?: string
}

/** Options for creating the bridge adapter */
export interface MCPBridgeAdapterOptions {
  /** The core MCPManager singleton */
  mcpManager: MCPManager
  /** The Ink UI's store (from AppStateProvider) */
  store: Store<{ mcp: { clients: unknown[]; tools: unknown[]; resources: unknown; commands: unknown[]; pluginReconnectKey: number } }>
  /** Config scope info for the legacy UI */
  dynamicMcpConfig?: Record<string, MCPServerConfig & { scope?: string }>
  strictMcpConfig?: boolean
}

export class MCPBridgeAdapter {
  private readonly mcpManager: MCPManager
  private readonly store: MCPBridgeAdapterOptions['store']
  private readonly dynamicMcpConfig: Record<string, MCPServerConfig & { scope?: string }>
  private readonly strictMcpConfig: boolean

  constructor(options: MCPBridgeAdapterOptions) {
    this.mcpManager = options.mcpManager
    this.store = options.store
    this.dynamicMcpConfig = options.dynamicMcpConfig ?? {}
    this.strictMcpConfig = options.strictMcpConfig ?? false
  }

  /**
   * Connect all registered servers that are not yet connected.
   * Called once at bridge startup.
   */
  async connectAll(): Promise<void> {
    const servers = this.mcpManager.listServers()
    for (const server of servers) {
      if (server.status === 'registered' || server.status === 'disconnected') {
        try {
          await this.mcpManager.connectServer(server.name)
        } catch {
          // Connection failures are recorded in the server record; continue
        }
      }
    }
    this.syncState()
  }

  /**
   * Reconnect a specific server (delegates to core MCPManager).
   */
  async reconnectServer(name: string): Promise<void> {
    try {
      await this.mcpManager.disconnectServer(name)
    } catch {
      // ignore
    }
    try {
      await this.mcpManager.connectServer(name)
    } catch {
      // Connection failures are recorded in the server record
    }
    this.syncState()
  }

  /**
   * Toggle a server between connected/disconnected states.
   */
  async toggleServer(name: string): Promise<void> {
    const record = this.mcpManager.getServer(name)
    if (!record) return

    if (record.status === 'connected') {
      await this.mcpManager.disconnectServer(name)
    } else {
      try {
        await this.mcpManager.connectServer(name)
      } catch {
        // recorded in server record
      }
    }
    this.syncState()
  }

  /**
   * Synchronize core MCPManager state into the legacy Ink UI's AppState.mcp.
   * This is the critical bridge: the Ink UI reads from AppState, core manages
   * its own state — this method keeps them aligned.
   */
  syncState(): void {
    const servers = this.mcpManager.listServers()

    // Convert core MCPServerRecord[] to legacy MCPServerConnection-like objects
    const clients: LegacyMCPClient[] = servers.map((record) => this.recordToLegacyClient(record))

    // Collect all tools from core MCPManager (they're already in toolRegistry,
    // but we also build the legacy mcp.tools list from server records)
    const tools: unknown[] = []
    for (const server of servers) {
      if (server.status === 'connected') {
        for (const tool of server.tools) {
          tools.push({
            name: tool.registeredName ?? `mcp__${server.name}__${tool.name}`,
            description: tool.description,
            input_schema: { type: 'object', ...(tool.inputSchema ?? {}) },
          })
        }
      }
    }

    // Collect resources
    const resources: Record<string, unknown[]> = {}

    // Collect commands (empty for now — core MCPManager doesn't expose commands)
    const commands: unknown[] = []

    // Write to the Ink UI's store
    this.store.setState((prev: any) => ({
      ...prev,
      mcp: {
        ...prev.mcp,
        clients,
        tools,
        resources,
        commands,
      },
    }))
  }

  /**
   * Convert a core MCPServerRecord into a legacy-compatible client object.
   */
  private recordToLegacyClient(record: MCPServerRecord): LegacyMCPClient {
    const config: MCPServerConfig & { scope?: string } = {
      ...record.config,
      scope: (this.dynamicMcpConfig[record.name] as any)?.scope ?? 'project',
    }

    switch (record.status) {
      case 'connected':
        return { name: record.name, type: 'connected', config }
      case 'failed':
        return { name: record.name, type: 'failed', config, error: record.lastError }
      case 'connecting':
        return { name: record.name, type: 'pending', config }
      case 'registered':
      case 'disconnected':
        return { name: record.name, type: 'disabled', config }
      default:
        return { name: record.name, type: 'disabled', config }
    }
  }

  /**
   * Get the reconnect and toggle functions for the legacy MCPConnectionManager.
   */
  get reconnectMcpServer(): (name: string) => Promise<void> {
    return (name: string) => this.reconnectServer(name)
  }

  get toggleMcpServer(): (name: string) => Promise<void> {
    return (name: string) => this.toggleServer(name)
  }
}
