/**
 * MCP Manager for CCLocal VS Code Extension
 * Handles server discovery, approval, and state management
 */

import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import type {
  MCPServerInfo,
  MCPServerConfig,
  MCPConfigSource,
  MCPApprovalState,
  MCPAuthState,
  MCPConfigFile,
  MCPStateChangeEvent,
  MCPManagerOptions,
  MCPStats,
  MCPApprovalRequest,
} from './types'
import type { MCPServerStatus, MCPToolDefinition } from '@cclocal/core/mcp'

// ─── Config File Paths ────────────────────────────────────────────────────────

const CONFIG_FILE_NAMES = {
  user: '.claude.json',      // Global: ~/.claude.json
  local: 'cclocal.json',     // Local: ~/.claude/cclocal.json
  project: '.mcp.json',      // Project: <workspace>/.mcp.json
}

// ─── MCP Manager ──────────────────────────────────────────────────────────────

export class MCPManager implements vscode.Disposable {
  private outputChannel: vscode.LogOutputChannel
  private servers: Map<string, MCPServerInfo>
  private options: MCPManagerOptions
  private disposables: vscode.Disposable[]
  private stateChangeEmitter: vscode.EventEmitter<MCPStateChangeEvent>

  /** Event fired when MCP state changes */
  readonly onDidChangeState: vscode.Event<MCPStateChangeEvent>

  constructor(
    outputChannel: vscode.LogOutputChannel,
    options: MCPManagerOptions = {}
  ) {
    this.outputChannel = outputChannel
    this.options = {
      autoDiscoverProject: true,
      autoApproveKnown: false,
      preApprovedServers: [],
      deniedServers: [],
      allowedPatterns: [],
      blockedPatterns: [],
      ...options,
    }
    this.servers = new Map()
    this.disposables = []
    this.stateChangeEmitter = new vscode.EventEmitter<MCPStateChangeEvent>()
    this.onDidChangeState = this.stateChangeEmitter.event

    this.outputChannel.debug('MCPManager initialized')
  }

  // ─── Server Discovery ────────────────────────────────────────────────────────

  /**
   * Discover MCP servers from all config sources
   */
  async discoverServers(): Promise<MCPServerInfo[]> {
    this.outputChannel.debug('Discovering MCP servers...')

    const discovered: MCPServerInfo[] = []

    // Discover from user config (~/.claude.json)
    const userServers = await this.discoverFromConfig(
      this.getUserConfigPath(),
      'user'
    )
    discovered.push(...userServers)

    // Discover from local config (~/.claude/cclocal.json)
    const localServers = await this.discoverFromConfig(
      this.getLocalConfigPath(),
      'local'
    )
    discovered.push(...localServers)

    // Discover from project config (<workspace>/.mcp.json)
    if (this.options.autoDiscoverProject) {
      const projectServers = await this.discoverFromConfig(
        this.getProjectConfigPath(),
        'project'
      )
      discovered.push(...projectServers)
    }

    // Merge discovered servers with existing
    for (const server of discovered) {
      this.mergeServer(server)
    }

    this.outputChannel.info(`Discovered ${discovered.length} MCP servers`)
    return discovered
  }

  /**
   * Discover servers from a specific config file
   */
  private async discoverFromConfig(
    configPath: string | undefined,
    source: MCPConfigSource
  ): Promise<MCPServerInfo[]> {
    if (!configPath) {
      return []
    }

    try {
      const content = await fs.promises.readFile(configPath, 'utf-8')
      const config: MCPConfigFile = JSON.parse(content)

      if (!config.mcpServers) {
        return []
      }

      const servers: MCPServerInfo[] = []
      const now = Date.now()

      for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
        const approvalState = this.determineApprovalState(name, source)
        const info: MCPServerInfo = {
          name,
          config: serverConfig,
          status: 'registered',
          tools: [],
          approvalState,
          authState: this.determineAuthState(serverConfig),
          source,
          updatedAt: now,
          description: (serverConfig as any).description,
        }
        servers.push(info)
      }

      this.outputChannel.debug(`Found ${servers.length} servers in ${configPath}`)
      return servers
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.outputChannel.warn(`Failed to read config ${configPath}: ${error}`)
      }
      return []
    }
  }

  /**
   * Determine approval state for a server
   */
  private determineApprovalState(name: string, source: MCPConfigSource): MCPApprovalState {
    // Check pre-approved list
    if (this.options.preApprovedServers?.includes(name)) {
      return 'approved'
    }

    // Check denied list
    if (this.options.deniedServers?.includes(name)) {
      return 'denied'
    }

    // Check allowed patterns
    if (this.options.allowedPatterns?.length) {
      for (const pattern of this.options.allowedPatterns) {
        if (new RegExp(pattern).test(name)) {
          return 'approved'
        }
      }
    }

    // Check blocked patterns
    if (this.options.blockedPatterns?.length) {
      for (const pattern of this.options.blockedPatterns) {
        if (new RegExp(pattern).test(name)) {
          return 'denied'
        }
      }
    }

    // User config servers are auto-approved
    if (source === 'user' || source === 'local') {
      return 'approved'
    }

    // Project servers need approval
    return 'pending'
  }

  /**
   * Determine auth state from config
   */
  private determineAuthState(config: MCPServerConfig): MCPAuthState {
    if (config.authToken) {
      return 'authenticated'
    }
    if ((config as any).oauth || (config as any).requiresAuth) {
      return 'required'
    }
    return 'none'
  }

  // ─── Server Management ────────────────────────────────────────────────────────

  /**
   * Approve a server
   */
  async approveServer(name: string, remember: boolean = false): Promise<boolean> {
    const server = this.servers.get(name)
    if (!server) {
      this.outputChannel.warn(`Cannot approve: server "${name}" not found`)
      return false
    }

    const previousState = { ...server }
    server.approvalState = 'approved'
    server.updatedAt = Date.now()

    if (remember) {
      await this.saveApprovalDecision(name, true)
    }

    this.emitStateChange('server_approved', name, server, previousState)
    this.outputChannel.info(`Approved MCP server: ${name}`)

    return true
  }

  /**
   * Deny a server
   */
  async denyServer(name: string, remember: boolean = false, reason?: string): Promise<boolean> {
    const server = this.servers.get(name)
    if (!server) {
      this.outputChannel.warn(`Cannot deny: server "${name}" not found`)
      return false
    }

    const previousState = { ...server }
    server.approvalState = 'denied'
    server.updatedAt = Date.now()

    if (remember) {
      await this.saveApprovalDecision(name, false)
    }

    this.emitStateChange('server_denied', name, server, previousState)
    this.outputChannel.info(`Denied MCP server: ${name}${reason ? ` (${reason})` : ''}`)

    return true
  }

  /**
   * Remove a server
   */
  async removeServer(name: string): Promise<boolean> {
    const server = this.servers.get(name)
    if (!server) {
      return false
    }

    this.servers.delete(name)
    this.emitStateChange('server_removed', name, undefined, server)
    this.outputChannel.info(`Removed MCP server: ${name}`)

    return true
  }

  /**
   * Enable a server (if approved)
   */
  async enableServer(name: string): Promise<boolean> {
    const server = this.servers.get(name)
    if (!server) {
      return false
    }

    if (server.approvalState !== 'approved') {
      this.outputChannel.warn(`Cannot enable: server "${name}" is not approved`)
      return false
    }

    // This will trigger connection via core MCPManager
    return true
  }

  /**
   * Disable a server
   */
  async disableServer(name: string): Promise<boolean> {
    const server = this.servers.get(name)
    if (!server) {
      return false
    }

    const previousState = { ...server }
    server.status = 'disconnected'
    server.updatedAt = Date.now()

    this.emitStateChange('server_disconnected', name, server, previousState)
    return true
  }

  // ─── Server Queries ───────────────────────────────────────────────────────────

  /**
   * Get a server by name
   */
  getServer(name: string): MCPServerInfo | undefined {
    return this.servers.get(name)
  }

  /**
   * Get all servers
   */
  getAllServers(): MCPServerInfo[] {
    return Array.from(this.servers.values())
  }

  /**
   * Get servers by approval state
   */
  getServersByApproval(state: MCPApprovalState): MCPServerInfo[] {
    return this.getAllServers().filter(s => s.approvalState === state)
  }

  /**
   * Get servers by status
   */
  getServersByStatus(status: MCPServerStatus): MCPServerInfo[] {
    return this.getAllServers().filter(s => s.status === status)
  }

  /**
   * Get pending approval servers
   */
  getPendingApprovals(): MCPServerInfo[] {
    return this.getServersByApproval('pending')
  }

  /**
   * Get approved and connected servers
   */
  getActiveServers(): MCPServerInfo[] {
    return this.getAllServers().filter(
      s => s.approvalState === 'approved' && s.status === 'connected'
    )
  }

  /**
   * Get MCP statistics
   */
  getStats(): MCPStats {
    const servers = this.getAllServers()
    const byStatus: Record<MCPServerStatus, number> = {
      registered: 0,
      connecting: 0,
      connected: 0,
      disconnected: 0,
      failed: 0,
    }
    const byApproval: Record<MCPApprovalState, number> = {
      pending: 0,
      approved: 0,
      denied: 0,
    }
    const bySource: Record<MCPConfigSource, number> = {
      user: 0,
      local: 0,
      project: 0,
    }

    for (const server of servers) {
      byStatus[server.status]++
      byApproval[server.approvalState]++
      bySource[server.source]++
    }

    const connectedServers = servers
      .filter(s => s.status === 'connected')
      .map(s => s.name)
    const failedServers = servers
      .filter(s => s.status === 'failed')
      .map(s => s.name)

    return {
      totalDiscovered: servers.length,
      byStatus,
      byApproval,
      bySource,
      totalTools: servers.reduce((sum, s) => sum + s.tools.length, 0),
      connectedServers,
      failedServers,
    }
  }

  // ─── Server Updates ────────────────────────────────────────────────────────────

  /**
   * Update server status (called from core MCPManager)
   */
  updateServerStatus(name: string, status: MCPServerStatus, error?: string): void {
    const server = this.servers.get(name)
    if (!server) {
      return
    }

    const previousState = { ...server }
    server.status = status
    server.lastError = error
    server.updatedAt = Date.now()

    const eventType = status === 'connected' ? 'server_connected' :
                      status === 'failed' ? 'server_failed' :
                      status === 'disconnected' ? 'server_disconnected' : 'server_discovered'

    this.emitStateChange(eventType, name, server, previousState)
  }

  /**
   * Update server tools
   */
  updateServerTools(name: string, tools: MCPToolDefinition[]): void {
    const server = this.servers.get(name)
    if (!server) {
      return
    }

    const previousState = { ...server }
    server.tools = tools
    server.updatedAt = Date.now()

    this.emitStateChange('tools_updated', name, server, previousState)
  }

  // ─── Approval Requests ────────────────────────────────────────────────────────

  /**
   * Show approval UI for pending servers
   */
  async showApprovalUI(request: MCPApprovalRequest): Promise<boolean> {
    const server = request.info

    const message = this.formatApprovalMessage(request)
    const items: vscode.MessageItem[] = [
      { title: 'Approve' },
      { title: 'Approve & Remember' },
      { title: 'Deny' },
      { title: 'Deny & Remember' },
    ]

    const result = await vscode.window.showInformationMessage(
      message,
      { modal: true, detail: this.formatApprovalDetail(request) },
      ...items
    )

    if (!result) {
      return false
    }

    if (result.title === 'Approve') {
      return this.approveServer(server.name, false)
    } else if (result.title === 'Approve & Remember') {
      return this.approveServer(server.name, true)
    } else if (result.title === 'Deny') {
      return this.denyServer(server.name, false)
    } else if (result.title === 'Deny & Remember') {
      return this.denyServer(server.name, true)
    }

    return false
  }

  private formatApprovalMessage(request: MCPApprovalRequest): string {
    return `MCP Server Approval Request: "${request.name}"`
  }

  private formatApprovalDetail(request: MCPApprovalRequest): string {
    const lines = [
      `Source: ${request.info.source}`,
      `Transport: ${request.info.config.type}`,
      '',
      'Tools that will be available:',
      ...request.tools.slice(0, 5).map(t => `  • ${t.name}: ${t.description || 'No description'}`),
      request.tools.length > 5 ? `  ... and ${request.tools.length - 5} more` : '',
    ]
    return lines.filter(Boolean).join('\n')
  }

  // ─── Config Paths ───────────────────────────────────────────────────────────────

  private getUserConfigPath(): string {
    const home = process.env.HOME || process.env.USERPROFILE || ''
    return path.join(home, CONFIG_FILE_NAMES.user)
  }

  private getLocalConfigPath(): string {
    const home = process.env.HOME || process.env.USERPROFILE || ''
    return path.join(home, '.claude', CONFIG_FILE_NAMES.local)
  }

  private getProjectConfigPath(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return undefined
    }
    return path.join(workspaceFolders[0].uri.fsPath, CONFIG_FILE_NAMES.project)
  }

  // ─── Persistence ───────────────────────────────────────────────────────────────

  /**
   * Save approval decision to config
   */
  private async saveApprovalDecision(name: string, approved: boolean): Promise<void> {
    const config = vscode.workspace.getConfiguration('cclocal')

    if (approved) {
      const approvedServers = config.get<string[]>('approvedMcpServers') || []
      if (!approvedServers.includes(name)) {
        approvedServers.push(name)
        await config.update('approvedMcpServers', approvedServers, vscode.ConfigurationTarget.Global)
      }
    } else {
      const deniedServers = config.get<string[]>('deniedMcpServers') || []
      if (!deniedServers.includes(name)) {
        deniedServers.push(name)
        await config.update('deniedMcpServers', deniedServers, vscode.ConfigurationTarget.Global)
      }
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────────

  private mergeServer(server: MCPServerInfo): void {
    const existing = this.servers.get(server.name)

    if (existing) {
      // Merge: prefer newer config, preserve approval state if already set
      const merged: MCPServerInfo = {
        ...server,
        approvalState: existing.approvalState !== 'pending' ? existing.approvalState : server.approvalState,
        updatedAt: Date.now(),
      }
      this.servers.set(server.name, merged)
    } else {
      this.servers.set(server.name, server)
      this.emitStateChange('server_discovered', server.name, server)
    }
  }

  private emitStateChange(
    type: MCPStateChangeEvent['type'],
    serverName: string,
    info?: MCPServerInfo,
    previousState?: Partial<MCPServerInfo>
  ): void {
    this.stateChangeEmitter.fire({
      type,
      serverName,
      info,
      previousState,
    })
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────────

  dispose(): void {
    this.servers.clear()
    this.disposables.forEach(d => d.dispose())
    this.disposables = []
    this.stateChangeEmitter.dispose()
    this.outputChannel.debug('MCPManager disposed')
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────────

let instance: MCPManager | null = null

export function getMCPManager(
  outputChannel?: vscode.LogOutputChannel,
  options?: MCPManagerOptions
): MCPManager {
  if (!instance && outputChannel) {
    instance = new MCPManager(outputChannel, options)
  }
  return instance!
}

export function disposeMCPManager(): void {
  if (instance) {
    instance.dispose()
    instance = null
  }
}
