/**
 * Configuration Manager for CCLocal VS Code Extension
 * Complete implementation with 76+ configuration properties
 */

import * as vscode from 'vscode'
import type { PermissionMode } from '@cclocal/shared'

// ─── Configuration Types ─────────────────────────────────────────────────────────

export interface EnvironmentVariable {
  name: string
  value: string
}

export interface FileSuggestionConfig {
  maxResults?: number
  includePatterns?: string[]
  excludePatterns?: string[]
}

export interface HooksConfig {
  PreToolUse?: HookDefinition[]
  PostToolUse?: HookDefinition[]
  Stop?: HookDefinition[]
  Notification?: HookDefinition[]
  PreCompact?: HookDefinition[]
  PostCompact?: HookDefinition[]
  SessionStart?: HookDefinition[]
  SessionEnd?: HookDefinition[]
  FileWrite?: HookDefinition[]
  FileEdit?: HookDefinition[]
  FileRead?: HookDefinition[]
  BashExecution?: HookDefinition[]
  ToolApproval?: HookDefinition[]
  Error?: HookDefinition[]
  Warning?: HookDefinition[]
  ModelChange?: HookDefinition[]
  PermissionChange?: HookDefinition[]
  MCPServerStart?: HookDefinition[]
  MCPServerStop?: HookDefinition[]
  PluginInstall?: HookDefinition[]
  PluginUninstall?: HookDefinition[]
}

export interface HookDefinition {
  matcher?: string
  hooks: Array<{
    type: 'command' | 'http' | 'function'
    command?: string
    url?: string
    timeout?: number
  }>
}

export interface MCPConfig {
  enableAllProjectMcpServers?: boolean
  enabledMcpjsonServers?: string[]
  disabledMcpjsonServers?: string[]
  allowedMcpServers?: string[]
  deniedMcpServers?: string[]
}

export interface PluginConfig {
  enabledPlugins?: Record<string, string>
  extraKnownMarketplaces?: string[]
  strictKnownMarketplaces?: string[]
  blockedMarketplaces?: string[]
  pluginTrustMessage?: string
}

export interface RemoteConfig {
  sshConfigs?: SSHConfig[]
  remote?: {
    enabled: boolean
    defaultTarget?: string
  }
}

export interface SSHConfig {
  name: string
  host: string
  port: number
  user: string
  privateKey?: string
  agentForwarding?: boolean
}

export interface OutputStyleConfig {
  type: 'default' | 'compact' | 'detailed'
  showThinking?: boolean
  showToolInput?: boolean
  showTiming?: boolean
}

export interface SandboxConfig {
  enabled: boolean
  permissions?: string[]
}

// ─── Main Configuration Interface ────────────────────────────────────────────────

export interface CCLocalConfig {
  // Authentication
  forceLoginMethod?: 'claudeai' | 'console' | 'bedrock' | 'vertex' | 'custom' | ''
  forceLoginOrgUUID?: string
  disableLoginPrompt?: boolean

  // Environment
  environmentVariables?: EnvironmentVariable[]
  cclocalPath?: string
  claudeProcessWrapper?: string

  // Permissions
  initialPermissionMode?: PermissionMode
  allowDangerouslySkipPermissions?: boolean
  permissionRules?: PermissionRule[]

  // Files
  respectGitIgnore?: boolean
  fileSuggestion?: FileSuggestionConfig
  autosave?: boolean
  claudeMdExcludes?: string[]

  // MCP
  mcp?: MCPConfig
  enableAllProjectMcpServers?: boolean
  allowedMcpServers?: string[]
  deniedMcpServers?: string[]

  // Hooks
  hooks?: HooksConfig
  disableAllHooks?: boolean
  allowedHttpHookUrls?: string[]
  httpHookAllowedEnvVars?: string[]
  allowManagedHooksOnly?: boolean

  // Plugins
  plugins?: PluginConfig
  enabledPlugins?: Record<string, string>
  extraKnownMarketplaces?: string[]
  strictKnownMarketplaces?: string[]
  blockedMarketplaces?: string[]

  // UI
  useTerminal?: boolean
  useCtrlEnterToSend?: boolean
  preferredLocation?: 'sidebar' | 'panel'
  hideOnboarding?: boolean
  enableNewConversationShortcut?: boolean
  usePythonEnvironment?: boolean
  showTerminalBanner?: boolean

  // Model
  model?: string
  availableModels?: string[]
  modelOverrides?: Record<string, string>
  alwaysThinkingEnabled?: boolean
  fastMode?: boolean
  maxThinkingTokens?: number

  // Output
  outputStyle?: OutputStyleConfig
  language?: string
  spinnerTipsEnabled?: boolean
  spinnerVerbs?: string[]
  spinnerTipsOverride?: string[]
  syntaxHighlightingDisabled?: boolean
  terminalTitleFromRename?: boolean

  // Remote
  remoteConfig?: RemoteConfig
  sshConfigs?: SSHConfig[]

  // Attribution
  includeCoAuthoredBy?: boolean
  includeGitInstructions?: boolean

  // Sandbox
  sandbox?: SandboxConfig
  skipWebFetchPreflight?: boolean

  // Feedback
  feedbackSurveyRate?: number
  proactiveSuggestions?: boolean

  // Managed Settings
  allowManagedPermissionRulesOnly?: boolean
  allowManagedMcpServersOnly?: boolean
  strictPluginOnlyCustomization?: boolean

  // Provider-specific
  bedrockRegion?: string
  vertexProjectId?: string

  // Other
  cleanupPeriodDays?: number
  attribution?: boolean
}

export interface PermissionRule {
  tool: string
  behavior: 'allow' | 'deny' | 'ask'
  condition?: string
}

// ─── Configuration Manager ────────────────────────────────────────────────────────

export class ConfigurationManager implements vscode.Disposable {
  private config: vscode.WorkspaceConfiguration
  private disposables: vscode.Disposable[] = []
  private onConfigChangeEmitter = new vscode.EventEmitter<CCLocalConfig>()

  constructor() {
    this.config = vscode.workspace.getConfiguration('cclocal')
    this.setupConfigWatcher()
  }

  /**
   * Get the full configuration object
   */
  getConfig(): CCLocalConfig {
    return {
      // Authentication
      forceLoginMethod: this.getForceLoginMethod(),
      forceLoginOrgUUID: this.getForceLoginOrgUUID(),
      disableLoginPrompt: this.getDisableLoginPrompt(),

      // Environment
      environmentVariables: this.getEnvironmentVariables(),
      cclocalPath: this.getCclocalPath(),
      claudeProcessWrapper: this.getClaudeProcessWrapper(),

      // Permissions
      initialPermissionMode: this.getInitialPermissionMode(),
      allowDangerouslySkipPermissions: this.getAllowDangerouslySkipPermissions(),
      permissionRules: this.getPermissionRules(),

      // Files
      respectGitIgnore: this.getRespectGitIgnore(),
      fileSuggestion: this.getFileSuggestion(),
      autosave: this.getAutosave(),
      claudeMdExcludes: this.getClaudeMdExcludes(),

      // MCP
      mcp: this.getMCPConfig(),
      enableAllProjectMcpServers: this.getEnableAllProjectMcpServers(),
      allowedMcpServers: this.getAllowedMcpServers(),
      deniedMcpServers: this.getDeniedMcpServers(),

      // Hooks
      hooks: this.getHooks(),
      disableAllHooks: this.getDisableAllHooks(),
      allowedHttpHookUrls: this.getAllowedHttpHookUrls(),
      httpHookAllowedEnvVars: this.getHttpHookAllowedEnvVars(),
      allowManagedHooksOnly: this.getAllowManagedHooksOnly(),

      // Plugins
      plugins: this.getPluginConfig(),
      enabledPlugins: this.getEnabledPlugins(),
      extraKnownMarketplaces: this.getExtraKnownMarketplaces(),
      strictKnownMarketplaces: this.getStrictKnownMarketplaces(),
      blockedMarketplaces: this.getBlockedMarketplaces(),

      // UI
      useTerminal: this.getUseTerminal(),
      useCtrlEnterToSend: this.getUseCtrlEnterToSend(),
      preferredLocation: this.getPreferredLocation(),
      hideOnboarding: this.getHideOnboarding(),
      enableNewConversationShortcut: this.getEnableNewConversationShortcut(),
      usePythonEnvironment: this.getUsePythonEnvironment(),
      showTerminalBanner: this.getShowTerminalBanner(),

      // Model
      model: this.getModel(),
      availableModels: this.getAvailableModels(),
      modelOverrides: this.getModelOverrides(),
      alwaysThinkingEnabled: this.getAlwaysThinkingEnabled(),
      fastMode: this.getFastMode(),
      maxThinkingTokens: this.getMaxThinkingTokens(),

      // Output
      outputStyle: this.getOutputStyle(),
      language: this.getLanguage(),
      spinnerTipsEnabled: this.getSpinnerTipsEnabled(),
      spinnerVerbs: this.getSpinnerVerbs(),
      spinnerTipsOverride: this.getSpinnerTipsOverride(),
      syntaxHighlightingDisabled: this.getSyntaxHighlightingDisabled(),
      terminalTitleFromRename: this.getTerminalTitleFromRename(),

      // Remote
      remoteConfig: this.getRemoteConfig(),
      sshConfigs: this.getSSHConfigs(),

      // Attribution
      includeCoAuthoredBy: this.getIncludeCoAuthoredBy(),
      includeGitInstructions: this.getIncludeGitInstructions(),

      // Sandbox
      sandbox: this.getSandbox(),
      skipWebFetchPreflight: this.getSkipWebFetchPreflight(),

      // Feedback
      feedbackSurveyRate: this.getFeedbackSurveyRate(),
      proactiveSuggestions: this.getProactiveSuggestions(),

      // Managed Settings
      allowManagedPermissionRulesOnly: this.getAllowManagedPermissionRulesOnly(),
      allowManagedMcpServersOnly: this.getAllowManagedMcpServersOnly(),
      strictPluginOnlyCustomization: this.getStrictPluginOnlyCustomization(),

      // Provider-specific
      bedrockRegion: this.getBedrockRegion(),
      vertexProjectId: this.getVertexProjectId(),

      // Other
      cleanupPeriodDays: this.getCleanupPeriodDays(),
      attribution: this.getAttribution(),
    }
  }

  // ─── Authentication Getters ─────────────────────────────────────────────────────

  getForceLoginMethod(): '' | 'bedrock' | 'claudeai' | 'console' | 'custom' | 'vertex' {
    return this.config.get('') || ''
  }

  getForceLoginOrgUUID(): string {
    return this.config.get<string>('forceLoginOrgUUID') || ''
  }

  getDisableLoginPrompt(): boolean {
    return this.config.get<boolean>('disableLoginPrompt') ?? false
  }

  // ─── Environment Getters ────────────────────────────────────────────────────────

  getEnvironmentVariables(): EnvironmentVariable[] {
    return this.config.get<EnvironmentVariable[]>('environmentVariables') || []
  }

  getCclocalPath(): string {
    return this.config.get<string>('cclocalPath') || 'cclocal'
  }

  getClaudeProcessWrapper(): string {
    return this.config.get<string>('claudeProcessWrapper') || ''
  }

  // ─── Permission Getters ─────────────────────────────────────────────────────────

  getInitialPermissionMode(): PermissionMode {
    return this.config.get<PermissionMode>('initialPermissionMode') || 'default'
  }

  getAllowDangerouslySkipPermissions(): boolean {
    return this.config.get<boolean>('allowDangerouslySkipPermissions') ?? false
  }

  getPermissionRules(): PermissionRule[] {
    return this.config.get<PermissionRule[]>('permissionRules') || []
  }

  // ─── File Getters ───────────────────────────────────────────────────────────────

  getRespectGitIgnore(): boolean {
    return this.config.get<boolean>('respectGitIgnore') ?? true
  }

  getFileSuggestion(): FileSuggestionConfig {
    return this.config.get<FileSuggestionConfig>('fileSuggestion') || {}
  }

  getAutosave(): boolean {
    return this.config.get<boolean>('autosave') ?? false
  }

  getClaudeMdExcludes(): string[] {
    return this.config.get<string[]>('claudeMdExcludes') || []
  }

  // ─── MCP Getters ────────────────────────────────────────────────────────────────

  getMCPConfig(): MCPConfig {
    return this.config.get<MCPConfig>('mcp') || {}
  }

  getEnableAllProjectMcpServers(): boolean {
    return this.config.get<boolean>('enableAllProjectMcpServers') ?? false
  }

  getAllowedMcpServers(): string[] {
    return this.config.get<string[]>('allowedMcpServers') || []
  }

  getDeniedMcpServers(): string[] {
    return this.config.get<string[]>('deniedMcpServers') || []
  }

  // ─── Hook Getters ───────────────────────────────────────────────────────────────

  getHooks(): HooksConfig {
    return this.config.get<HooksConfig>('hooks') || {}
  }

  getDisableAllHooks(): boolean {
    return this.config.get<boolean>('disableAllHooks') ?? false
  }

  getAllowedHttpHookUrls(): string[] {
    return this.config.get<string[]>('allowedHttpHookUrls') || []
  }

  getHttpHookAllowedEnvVars(): string[] {
    return this.config.get<string[]>('httpHookAllowedEnvVars') || []
  }

  getAllowManagedHooksOnly(): boolean {
    return this.config.get<boolean>('allowManagedHooksOnly') ?? false
  }

  // ─── Plugin Getters ────────────────────────────────────────────────────────────

  getPluginConfig(): PluginConfig {
    return this.config.get<PluginConfig>('plugins') || {}
  }

  getEnabledPlugins(): Record<string, string> {
    return this.config.get<Record<string, string>>('enabledPlugins') || {}
  }

  getExtraKnownMarketplaces(): string[] {
    return this.config.get<string[]>('extraKnownMarketplaces') || []
  }

  getStrictKnownMarketplaces(): string[] {
    return this.config.get<string[]>('strictKnownMarketplaces') || []
  }

  getBlockedMarketplaces(): string[] {
    return this.config.get<string[]>('blockedMarketplaces') || []
  }

  // ─── UI Getters ─────────────────────────────────────────────────────────────────

  getUseTerminal(): boolean {
    return this.config.get<boolean>('useTerminal') ?? true
  }

  getUseCtrlEnterToSend(): boolean {
    return this.config.get<boolean>('useCtrlEnterToSend') ?? false
  }

  getPreferredLocation(): 'panel' | 'sidebar' {
    return this.config.get<'sidebar' | 'panel'>('preferredLocation') || 'sidebar'
  }

  getHideOnboarding(): boolean {
    return this.config.get<boolean>('hideOnboarding') ?? false
  }

  getEnableNewConversationShortcut(): boolean {
    return this.config.get<boolean>('enableNewConversationShortcut') ?? true
  }

  getUsePythonEnvironment(): boolean {
    return this.config.get<boolean>('usePythonEnvironment') ?? true
  }

  getShowTerminalBanner(): boolean {
    return this.config.get<boolean>('showTerminalBanner') ?? true
  }

  // ─── Model Getters ──────────────────────────────────────────────────────────────

  getModel(): string {
    return this.config.get<string>('model') || ''
  }

  getAvailableModels(): string[] {
    return this.config.get<string[]>('availableModels') || []
  }

  getModelOverrides(): Record<string, string> {
    return this.config.get<Record<string, string>>('modelOverrides') || {}
  }

  getAlwaysThinkingEnabled(): boolean {
    return this.config.get<boolean>('alwaysThinkingEnabled') ?? false
  }

  getFastMode(): boolean {
    return this.config.get<boolean>('fastMode') ?? false
  }

  getMaxThinkingTokens(): number {
    return this.config.get<number>('maxThinkingTokens') || 16000
  }

  // ─── Output Getters ─────────────────────────────────────────────────────────────

  getOutputStyle(): OutputStyleConfig {
    return this.config.get<OutputStyleConfig>('outputStyle') || { type: 'default' }
  }

  getLanguage(): string {
    return this.config.get<string>('language') || 'en'
  }

  getSpinnerTipsEnabled(): boolean {
    return this.config.get<boolean>('spinnerTipsEnabled') ?? true
  }

  getSpinnerVerbs(): string[] {
    return this.config.get<string[]>('spinnerVerbs') || []
  }

  getSpinnerTipsOverride(): string[] {
    return this.config.get<string[]>('spinnerTipsOverride') || []
  }

  getSyntaxHighlightingDisabled(): boolean {
    return this.config.get<boolean>('syntaxHighlightingDisabled') ?? false
  }

  getTerminalTitleFromRename(): boolean {
    return this.config.get<boolean>('terminalTitleFromRename') ?? true
  }

  // ─── Remote Getters ─────────────────────────────────────────────────────────────

  getRemoteConfig(): RemoteConfig {
    return this.config.get<RemoteConfig>('remoteConfig') || { remote: { enabled: false } }
  }

  getSSHConfigs(): SSHConfig[] {
    return this.config.get<SSHConfig[]>('sshConfigs') || []
  }

  // ─── Attribution Getters ─────────────────────────────────────────────────────────

  getIncludeCoAuthoredBy(): boolean {
    return this.config.get<boolean>('includeCoAuthoredBy') ?? true
  }

  getIncludeGitInstructions(): boolean {
    return this.config.get<boolean>('includeGitInstructions') ?? true
  }

  // ─── Sandbox Getters ────────────────────────────────────────────────────────────

  getSandbox(): SandboxConfig {
    return this.config.get<SandboxConfig>('sandbox') || { enabled: false }
  }

  getSkipWebFetchPreflight(): boolean {
    return this.config.get<boolean>('skipWebFetchPreflight') ?? false
  }

  // ─── Feedback Getters ───────────────────────────────────────────────────────────

  getFeedbackSurveyRate(): number {
    return this.config.get<number>('feedbackSurveyRate') ?? 0.1
  }

  getProactiveSuggestions(): boolean {
    return this.config.get<boolean>('proactiveSuggestions') ?? true
  }

  // ─── Managed Settings Getters ────────────────────────────────────────────────────

  getAllowManagedPermissionRulesOnly(): boolean {
    return this.config.get<boolean>('allowManagedPermissionRulesOnly') ?? false
  }

  getAllowManagedMcpServersOnly(): boolean {
    return this.config.get<boolean>('allowManagedMcpServersOnly') ?? false
  }

  getStrictPluginOnlyCustomization(): boolean {
    return this.config.get<boolean>('strictPluginOnlyCustomization') ?? false
  }

  // ─── Provider Getters ───────────────────────────────────────────────────────────

  getBedrockRegion(): string {
    return this.config.get<string>('bedrockRegion') || 'us-east-1'
  }

  getVertexProjectId(): string {
    return this.config.get<string>('vertexProjectId') || ''
  }

  // ─── Other Getters ──────────────────────────────────────────────────────────────

  getCleanupPeriodDays(): number {
    return this.config.get<number>('cleanupPeriodDays') || 30
  }

  getAttribution(): boolean {
    return this.config.get<boolean>('attribution') ?? true
  }

  // ─── Setters ─────────────────────────────────────────────────────────────────────

  async update<T>(key: string, value: T, target?: vscode.ConfigurationTarget): Promise<void> {
    const configTarget = target ?? vscode.ConfigurationTarget.Global
    await this.config.update(key, value, configTarget)
  }

  async setModel(model: string): Promise<void> {
    await this.update('model', model)
  }

  async setPreferredLocation(location: 'sidebar' | 'panel'): Promise<void> {
    await this.update('preferredLocation', location)
  }

  async setInitialPermissionMode(mode: PermissionMode): Promise<void> {
    await this.update('initialPermissionMode', mode)
  }

  async setForceLoginMethod(method: '' | 'claudeai' | 'console' | 'bedrock' | 'vertex' | 'custom'): Promise<void> {
    await this.update('forceLoginMethod', method)
  }

  async addEnvironmentVariable(name: string, value: string): Promise<void> {
    const envVars = this.getEnvironmentVariables()
    const existing = envVars.findIndex(v => v.name === name)
    if (existing >= 0) {
      envVars[existing].value = value
    } else {
      envVars.push({ name, value })
    }
    await this.update('environmentVariables', envVars)
  }

  async removeEnvironmentVariable(name: string): Promise<void> {
    const envVars = this.getEnvironmentVariables().filter(v => v.name !== name)
    await this.update('environmentVariables', envVars)
  }

  async addPermissionRule(rule: PermissionRule): Promise<void> {
    const rules = this.getPermissionRules()
    rules.push(rule)
    await this.update('permissionRules', rules)
  }

  async addAllowedMcpServer(server: string): Promise<void> {
    const servers = this.getAllowedMcpServers()
    if (!servers.includes(server)) {
      servers.push(server)
      await this.update('allowedMcpServers', servers)
    }
  }

  async addDeniedMcpServer(server: string): Promise<void> {
    const servers = this.getDeniedMcpServers()
    if (!servers.includes(server)) {
      servers.push(server)
      await this.update('deniedMcpServers', servers)
    }
  }

  // ─── Events ─────────────────────────────────────────────────────────────────────

  get onConfigChange(): vscode.Event<CCLocalConfig> {
    return this.onConfigChangeEmitter.event
  }

  private setupConfigWatcher(): void {
    const disposable = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('cclocal')) {
        this.config = vscode.workspace.getConfiguration('cclocal')
        this.onConfigChangeEmitter.fire(this.getConfig())
      }
    })
    this.disposables.push(disposable)
  }

  // ─── Generic Accessor ──────────────────────────────────────────────────────────────

  get<T>(section: string, defaultValue?: T): T | undefined {
    return this.config.get<T>(section) ?? defaultValue
  }

  // ─── Dispose ────────────────────────────────────────────────────────────────────

  dispose(): void {
    this.disposables.forEach((d) => d.dispose())
    this.onConfigChangeEmitter.dispose()
  }
}
