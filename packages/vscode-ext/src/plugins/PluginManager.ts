/**
 * Plugin Manager for CCLocal VS Code Extension
 * Handles plugin lifecycle, marketplace integration, and trust management
 */

import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import type {
  InstalledPlugin,
  PluginManifest,
  PluginState,
  PluginTrustLevel,
  PluginPermission,
  PluginEvent,
  PluginEventType,
  PluginInstallOptions,
  PluginManagerOptions,
  PluginStats,
  MarketplaceInfo,
  MarketplacePlugin,
} from './types'

// ─── Constants ────────────────────────────────────────────────────────────────

const PLUGIN_DIR = 'plugins'
const MANIFEST_FILE = 'plugin.json'
const KNOWN_MARKETPLACES = [
  'https://marketplace.anthropic.com',
  'https://plugins.claude.ai',
]

// ─── Plugin Manager ────────────────────────────────────────────────────────────

export class PluginManager implements vscode.Disposable {
  private outputChannel: vscode.LogOutputChannel
  private context: vscode.ExtensionContext
  private plugins: Map<string, InstalledPlugin>
  private marketplaces: Map<string, MarketplaceInfo>
  private options: PluginManagerOptions
  private eventEmitter: vscode.EventEmitter<PluginEvent>
  private pluginStorageDir: string

  /** Event fired when plugin state changes */
  readonly onDidPluginEvent: vscode.Event<PluginEvent>

  constructor(
    context: vscode.ExtensionContext,
    outputChannel: vscode.LogOutputChannel,
    options: PluginManagerOptions = {}
  ) {
    this.context = context
    this.outputChannel = outputChannel
    this.options = {
      officialMarketplaces: KNOWN_MARKETPLACES,
      extraKnownMarketplaces: [],
      strictKnownMarketplaces: [],
      blockedMarketplaces: [],
      autoUpdate: false,
      updateCheckInterval: 3600000, // 1 hour
      ...options,
    }
    this.plugins = new Map()
    this.marketplaces = new Map()
    this.eventEmitter = new vscode.EventEmitter<PluginEvent>()
    this.onDidPluginEvent = this.eventEmitter.event
    this.pluginStorageDir = path.join(context.globalStorageUri.fsPath, PLUGIN_DIR)

    // Ensure plugin directory exists
    this.ensurePluginDir()

    // Initialize marketplaces
    this.initializeMarketplaces()

    this.outputChannel.debug('PluginManager initialized')
  }

  // ─── Plugin Installation ───────────────────────────────────────────────────

  /**
   * Install a plugin from a marketplace
   */
  async install(
    pluginId: string,
    marketplaceUrl: string,
    options: PluginInstallOptions = {}
  ): Promise<InstalledPlugin> {
    this.outputChannel.info(`Installing plugin: ${pluginId}`)

    // Check if already installed
    if (this.plugins.has(pluginId)) {
      throw new Error(`Plugin "${pluginId}" is already installed`)
    }

    // Find plugin in marketplace
    const marketplace = this.marketplaces.get(marketplaceUrl)
    if (!marketplace?.plugins) {
      await this.refreshMarketplace(marketplaceUrl)
    }

    const marketplacePlugin = this.findMarketplacePlugin(pluginId, marketplaceUrl)
    if (!marketplacePlugin) {
      throw new Error(`Plugin "${pluginId}" not found in marketplace`)
    }

    // Trust verification (unless skipped)
    if (!options.skipTrust) {
      const trusted = await this.verifyPluginTrust(marketplacePlugin)
      if (!trusted) {
        throw new Error(`Plugin "${pluginId}" failed trust verification`)
      }
    }

    // Create plugin directory
    const installPath = path.join(this.pluginStorageDir, this.sanitizePluginId(pluginId))
    await fs.promises.mkdir(installPath, { recursive: true })

    // Download and extract plugin
    await this.downloadPlugin(marketplacePlugin, installPath)

    // Load manifest
    const manifest = await this.loadManifest(installPath)

    // Permission approval
    const approved = options.autoApprove || await this.requestPermissions(manifest)

    const installedPlugin: InstalledPlugin = {
      manifest,
      installPath,
      state: 'installed',
      trustLevel: marketplacePlugin.trustLevel,
      installedAt: Date.now(),
      updatedAt: Date.now(),
      permissionsApproved: approved,
      approvedPermissions: approved ? (manifest.permissions || []) : [],
      configuration: this.getDefaultConfig(manifest),
      marketplaceUrl,
    }

    this.plugins.set(pluginId, installedPlugin)
    this.emitEvent('plugin_installed', pluginId)

    // Activate if permissions approved
    if (approved) {
      await this.activate(pluginId)
    }

    this.outputChannel.info(`Plugin installed: ${pluginId}`)
    return installedPlugin
  }

  /**
   * Install a plugin from a local path
   */
  async installLocal(
    localPath: string,
    options: PluginInstallOptions = {}
  ): Promise<InstalledPlugin> {
    // Load manifest from local path
    const manifest = await this.loadManifest(localPath)
    const pluginId = manifest.id

    if (this.plugins.has(pluginId)) {
      throw new Error(`Plugin "${pluginId}" is already installed`)
    }

    const approved = options.autoApprove || await this.requestPermissions(manifest)

    const installedPlugin: InstalledPlugin = {
      manifest,
      installPath: localPath,
      state: 'installed',
      trustLevel: 'untrusted',
      installedAt: Date.now(),
      updatedAt: Date.now(),
      permissionsApproved: approved,
      approvedPermissions: approved ? (manifest.permissions || []) : [],
      configuration: this.getDefaultConfig(manifest),
    }

    this.plugins.set(pluginId, installedPlugin)
    this.emitEvent('plugin_installed', pluginId)

    if (approved) {
      await this.activate(pluginId)
    }

    this.outputChannel.info(`Local plugin installed: ${pluginId}`)
    return installedPlugin
  }

  /**
   * Uninstall a plugin
   */
  async uninstall(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      return false
    }

    // Deactivate first
    if (plugin.state === 'active') {
      await this.deactivate(pluginId)
    }

    plugin.state = 'uninstalling'
    this.emitEvent('plugin_uninstalled', pluginId)

    // Remove files
    try {
      await fs.promises.rm(plugin.installPath, { recursive: true, force: true })
    } catch (error) {
      this.outputChannel.warn(`Failed to remove plugin files: ${error}`)
    }

    this.plugins.delete(pluginId)
    this.outputChannel.info(`Plugin uninstalled: ${pluginId}`)
    return true
  }

  // ─── Plugin Lifecycle ──────────────────────────────────────────────────────

  /**
   * Activate a plugin
   */
  async activate(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin "${pluginId}" not found`)
    }

    if (plugin.state === 'active') {
      return true
    }

    if (!plugin.permissionsApproved) {
      const approved = await this.requestPermissions(plugin.manifest)
      if (!approved) {
        return false
      }
      plugin.permissionsApproved = true
      plugin.approvedPermissions = plugin.manifest.permissions || []
    }

    try {
      // Register MCP servers from plugin
      if (plugin.manifest.mcpServers) {
        await this.registerPluginMcpServers(plugin)
      }

      plugin.state = 'active'
      plugin.updatedAt = Date.now()
      this.emitEvent('plugin_activated', pluginId)
      this.outputChannel.info(`Plugin activated: ${pluginId}`)
      return true
    } catch (error) {
      plugin.state = 'error'
      plugin.lastError = error instanceof Error ? error.message : String(error)
      this.emitEvent('plugin_error', pluginId, { error: plugin.lastError })
      this.outputChannel.error(`Plugin activation failed: ${pluginId}: ${error}`)
      return false
    }
  }

  /**
   * Deactivate a plugin
   */
  async deactivate(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin || plugin.state !== 'active') {
      return false
    }

    plugin.state = 'installed'
    plugin.updatedAt = Date.now()
    this.emitEvent('plugin_deactivated', pluginId)
    this.outputChannel.info(`Plugin deactivated: ${pluginId}`)
    return true
  }

  /**
   * Enable a disabled plugin
   */
  async enable(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin || plugin.state !== 'disabled') {
      return false
    }
    return this.activate(pluginId)
  }

  /**
   * Disable an active plugin
   */
  async disable(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      return false
    }

    if (plugin.state === 'active') {
      await this.deactivate(pluginId)
    }

    plugin.state = 'disabled'
    plugin.updatedAt = Date.now()
    return true
  }

  // ─── Plugin Queries ────────────────────────────────────────────────────────

  /**
   * Get an installed plugin
   */
  getPlugin(pluginId: string): InstalledPlugin | undefined {
    return this.plugins.get(pluginId)
  }

  /**
   * Get all installed plugins
   */
  getAllPlugins(): InstalledPlugin[] {
    return Array.from(this.plugins.values())
  }

  /**
   * Get plugins by state
   */
  getPluginsByState(state: PluginState): InstalledPlugin[] {
    return this.getAllPlugins().filter(p => p.state === state)
  }

  /**
   * Get active plugins
   */
  getActivePlugins(): InstalledPlugin[] {
    return this.getPluginsByState('active')
  }

  /**
   * Get plugin statistics
   */
  getStats(): PluginStats {
    const plugins = this.getAllPlugins()
    const byState: Record<PluginState, number> = {
      available: 0,
      installed: 0,
      active: 0,
      disabled: 0,
      error: 0,
      updating: 0,
      uninstalling: 0,
    }
    const byTrust: Record<PluginTrustLevel, number> = {
      untrusted: 0,
      community: 0,
      verified: 0,
      official: 0,
      enterprise: 0,
    }

    for (const plugin of plugins) {
      byState[plugin.state]++
      byTrust[plugin.trustLevel]++
    }

    return {
      totalInstalled: plugins.length,
      totalActive: byState.active,
      byState,
      byTrust,
      marketplaces: this.marketplaces.size,
      availablePlugins: this.getTotalAvailablePlugins(),
    }
  }

  // ─── Permissions ────────────────────────────────────────────────────────────

  /**
   * Request user approval for plugin permissions
   */
  async requestPermissions(manifest: PluginManifest): Promise<boolean> {
    const permissions = manifest.permissions || []

    if (permissions.length === 0) {
      return true
    }

    const dangerousPerms = permissions.filter(p =>
      ['execute-commands', 'write-files', 'full-access'].includes(p)
    )

    if (dangerousPerms.length === 0) {
      // Auto-approve safe permissions
      return true
    }

    const detail = [
      `Plugin: ${manifest.name} v${manifest.version}`,
      `Publisher: ${manifest.publisher}`,
      '',
      'This plugin requests the following permissions:',
      ...permissions.map(p => `  • ${this.formatPermission(p)}`),
      '',
      'Dangerous permissions require your approval:',
      ...dangerousPerms.map(p => `  ⚠ ${this.formatPermission(p)}`),
    ].join('\n')

    const result = await vscode.window.showWarningMessage(
      `Plugin Permission Request: ${manifest.name}`,
      { modal: true, detail },
      { title: 'Approve' },
      { title: 'Deny' },
    )

    return result?.title === 'Approve'
  }

  /**
   * Update permissions for an installed plugin
   */
  async updatePermissions(
    pluginId: string,
    permissions: PluginPermission[]
  ): Promise<boolean> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      return false
    }

    plugin.approvedPermissions = permissions
    plugin.permissionsApproved = true
    plugin.updatedAt = Date.now()
    this.emitEvent('permissions_granted', pluginId, { permissions })
    return true
  }

  // ─── Trust Management ──────────────────────────────────────────────────────

  /**
   * Verify plugin trust before installation
   */
  private async verifyPluginTrust(marketplacePlugin: MarketplacePlugin): Promise<boolean> {
    const trustLevel = marketplacePlugin.trustLevel

    if (trustLevel === 'official' || trustLevel === 'verified') {
      return true
    }

    if (trustLevel === 'enterprise') {
      return true
    }

    if (trustLevel === 'community') {
      const result = await vscode.window.showWarningMessage(
        `Community Plugin: ${marketplacePlugin.manifest.name}`,
        {
          modal: true,
          detail: [
            `Publisher: ${marketplacePlugin.manifest.publisher}`,
            `This plugin is community-verified but not officially reviewed.`,
            `Install at your own risk.`,
          ].join('\n'),
        },
        { title: 'Install Anyway' },
        { title: 'Cancel' },
      )
      return result?.title === 'Install Anyway'
    }

    // Untrusted
    const result = await vscode.window.showWarningMessage(
      `Untrusted Plugin: ${marketplacePlugin.manifest.name}`,
      {
        modal: true,
        detail: [
          `Publisher: ${marketplacePlugin.manifest.publisher}`,
          `This plugin has not been verified by any trusted source.`,
          `Installing untrusted plugins may pose security risks.`,
        ].join('\n'),
      },
      { title: 'Install at Own Risk' },
      { title: 'Cancel' },
    )
    return result?.title === 'Install at Own Risk'
  }

  /**
   * Update trust level for a plugin
   */
  updateTrustLevel(pluginId: string, trustLevel: PluginTrustLevel): boolean {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      return false
    }

    plugin.trustLevel = trustLevel
    plugin.updatedAt = Date.now()
    this.emitEvent('trust_changed', pluginId, { trustLevel })
    return true
  }

  // ─── Marketplace Management ────────────────────────────────────────────────

  /**
   * Add a marketplace
   */
  async addMarketplace(url: string): Promise<MarketplaceInfo> {
    if (this.isMarketplaceBlocked(url)) {
      throw new Error(`Marketplace "${url}" is blocked by policy`)
    }

    if (this.marketplaces.has(url)) {
      return this.marketplaces.get(url)!
    }

    const trustLevel = this.determineMarketplaceTrust(url)
    const marketplace: MarketplaceInfo = {
      url,
      name: this.extractMarketplaceName(url),
      trustLevel,
      isKnown: this.isKnownMarketplace(url),
    }

    this.marketplaces.set(url, marketplace)
    await this.refreshMarketplace(url)
    this.emitEvent('marketplace_added', undefined, url)

    // Persist
    const config = vscode.workspace.getConfiguration('cclocal')
    const extra = config.get<string[]>('extraKnownMarketplaces') || []
    if (!extra.includes(url)) {
      extra.push(url)
      await config.update('extraKnownMarketplaces', extra, vscode.ConfigurationTarget.Global)
    }

    this.outputChannel.info(`Marketplace added: ${url}`)
    return marketplace
  }

  /**
   * Remove a marketplace
   */
  async removeMarketplace(url: string): Promise<boolean> {
    if (!this.marketplaces.has(url)) {
      return false
    }

    this.marketplaces.delete(url)
    this.emitEvent('marketplace_removed', undefined, url)

    const config = vscode.workspace.getConfiguration('cclocal')
    const extra = config.get<string[]>('extraKnownMarketplaces') || []
    const filtered = extra.filter(u => u !== url)
    await config.update('extraKnownMarketplaces', filtered, vscode.ConfigurationTarget.Global)

    this.outputChannel.info(`Marketplace removed: ${url}`)
    return true
  }

  /**
   * Refresh marketplace data
   */
  async refreshMarketplace(url: string): Promise<void> {
    const marketplace = this.marketplaces.get(url)
    if (!marketplace) {
      return
    }

    try {
      const response = await fetch(`${url}/api/plugins`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json() as { plugins?: MarketplacePlugin[] }
      marketplace.plugins = data.plugins || []
      marketplace.lastRefreshed = Date.now()
      this.emitEvent('marketplace_refreshed', undefined, url)
    } catch (error) {
      this.outputChannel.warn(`Failed to refresh marketplace ${url}: ${error}`)
      marketplace.plugins = []
    }
  }

  /**
   * Get all marketplaces
   */
  getMarketplaces(): MarketplaceInfo[] {
    return Array.from(this.marketplaces.values())
  }

  // ─── Configuration ─────────────────────────────────────────────────────────

  /**
   * Get plugin configuration
   */
  getPluginConfig(pluginId: string): Record<string, unknown> | undefined {
    return this.plugins.get(pluginId)?.configuration
  }

  /**
   * Update plugin configuration
   */
  async updatePluginConfig(pluginId: string, key: string, value: unknown): Promise<boolean> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      return false
    }

    plugin.configuration[key] = value
    plugin.updatedAt = Date.now()
    return true
  }

  // ─── Load Installed Plugins ────────────────────────────────────────────────

  /**
   * Load all installed plugins from storage
   */
  async loadInstalledPlugins(): Promise<void> {
    try {
      const entries = await fs.promises.readdir(this.pluginStorageDir, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isDirectory()) continue

        const pluginDir = path.join(this.pluginStorageDir, entry.name)
        const manifestPath = path.join(pluginDir, MANIFEST_FILE)

        try {
          const manifest = await this.loadManifest(pluginDir)
          const pluginId = manifest.id

          const installed: InstalledPlugin = {
            manifest,
            installPath: pluginDir,
            state: 'installed',
            trustLevel: 'community',
            installedAt: 0,
            updatedAt: Date.now(),
            permissionsApproved: false,
            approvedPermissions: [],
            configuration: this.getDefaultConfig(manifest),
          }

          this.plugins.set(pluginId, installed)
          this.outputChannel.debug(`Loaded plugin: ${pluginId}`)
        } catch {
          this.outputChannel.warn(`Failed to load plugin from: ${pluginDir}`)
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.outputChannel.error(`Failed to load plugins: ${error}`)
      }
    }
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private ensurePluginDir(): void {
    if (!fs.existsSync(this.pluginStorageDir)) {
      fs.mkdirSync(this.pluginStorageDir, { recursive: true })
    }
  }

  private initializeMarketplaces(): void {
    // Add official marketplaces
    const official = this.options.officialMarketplaces || KNOWN_MARKETPLACES
    for (const url of official) {
      this.marketplaces.set(url, {
        url,
        name: this.extractMarketplaceName(url),
        trustLevel: 'official',
        isKnown: true,
      })
    }

    // Add extra known marketplaces from config
    const extra = this.options.extraKnownMarketplaces || []
    for (const url of extra) {
      if (!this.marketplaces.has(url)) {
        this.marketplaces.set(url, {
          url,
          name: this.extractMarketplaceName(url),
          trustLevel: 'community',
          isKnown: true,
        })
      }
    }
  }

  private async downloadPlugin(plugin: MarketplacePlugin, targetDir: string): Promise<void> {
    const response = await fetch(plugin.downloadUrl)
    if (!response.ok) {
      throw new Error(`Download failed: HTTP ${response.status}`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    await fs.promises.writeFile(path.join(targetDir, 'plugin.tar.gz'), buffer)

    // TODO: Extract archive, verify checksum
    this.outputChannel.debug(`Downloaded plugin: ${plugin.manifest.id}`)
  }

  private async loadManifest(pluginDir: string): Promise<PluginManifest> {
    const manifestPath = path.join(pluginDir, MANIFEST_FILE)
    const content = await fs.promises.readFile(manifestPath, 'utf-8')
    return JSON.parse(content) as PluginManifest
  }

  private async registerPluginMcpServers(plugin: InstalledPlugin): Promise<void> {
    if (!plugin.manifest.mcpServers) return

    // Delegate to MCP manager
    const { getMCPManager } = await import('../mcp/index.js')
    const mcpManager = getMCPManager()

    for (const [name, config] of Object.entries(plugin.manifest.mcpServers)) {
      try {
        mcpManager.registerServer({
          name: `${plugin.manifest.id}__${name}`,
          config,
        })
      } catch (error) {
        this.outputChannel.warn(`Failed to register MCP server ${name}: ${error}`)
      }
    }
  }

  private getDefaultConfig(manifest: PluginManifest): Record<string, unknown> {
    const config: Record<string, unknown> = {}
    if (manifest.configuration) {
      for (const [key, schema] of Object.entries(manifest.configuration)) {
        config[key] = schema.default
      }
    }
    return config
  }

  private formatPermission(perm: PluginPermission): string {
    const labels: Record<PluginPermission, string> = {
      'read-files': 'Read file contents',
      'write-files': 'Write/edit files',
      'execute-commands': 'Run shell commands',
      'access-network': 'Make HTTP requests',
      'access-mcp': 'Register MCP servers',
      'access-clipboard': 'Access clipboard',
      'access-workspace': 'Access workspace info',
      'access-extensions': 'Access other extensions',
      'full-access': 'Full unrestricted access',
    }
    return labels[perm] || perm
  }

  private sanitizePluginId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_-]/g, '_')
  }

  private extractMarketplaceName(url: string): string {
    try {
      const hostname = new URL(url).hostname
      return hostname.replace(/^(www\.|marketplace\.)/, '')
    } catch {
      return url
    }
  }

  private isKnownMarketplace(url: string): boolean {
    const allKnown = [
      ...(this.options.officialMarketplaces || []),
      ...(this.options.extraKnownMarketplaces || []),
      ...(this.options.strictKnownMarketplaces || []),
    ]
    return allKnown.some(u => u === url)
  }

  private isMarketplaceBlocked(url: string): boolean {
    return (this.options.blockedMarketplaces || []).includes(url)
  }

  private determineMarketplaceTrust(url: string): MarketplaceInfo['trustLevel'] {
    const official = this.options.officialMarketplaces || KNOWN_MARKETPLACES
    if (official.includes(url)) return 'official'
    if (this.options.strictKnownMarketplaces?.includes(url)) return 'verified'
    if (this.options.extraKnownMarketplaces?.includes(url)) return 'community'
    return 'untrusted'
  }

  private findMarketplacePlugin(pluginId: string, marketplaceUrl: string): MarketplacePlugin | undefined {
    const marketplace = this.marketplaces.get(marketplaceUrl)
    return marketplace?.plugins?.find(p => p.manifest.id === pluginId)
  }

  private getTotalAvailablePlugins(): number {
    let total = 0
    const seenIds = new Set<string>()
    for (const marketplace of this.marketplaces.values()) {
      for (const plugin of marketplace.plugins || []) {
        if (!seenIds.has(plugin.manifest.id)) {
          seenIds.add(plugin.manifest.id)
          total++
        }
      }
    }
    return total
  }

  private emitEvent(type: PluginEventType, pluginId?: string, data?: unknown): void {
    this.eventEmitter.fire({ type, pluginId, data })
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  dispose(): void {
    this.eventEmitter.dispose()
    this.plugins.clear()
    this.marketplaces.clear()
    this.outputChannel.debug('PluginManager disposed')
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────────

let instance: PluginManager | null = null

export function getPluginManager(
  context?: vscode.ExtensionContext,
  outputChannel?: vscode.LogOutputChannel,
  options?: PluginManagerOptions
): PluginManager {
  if (!instance && context && outputChannel) {
    instance = new PluginManager(context, outputChannel, options)
  }
  return instance!
}

export function disposePluginManager(): void {
  if (instance) {
    instance.dispose()
    instance = null
  }
}
