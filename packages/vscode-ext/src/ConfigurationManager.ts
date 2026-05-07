/**
 * Configuration Manager for CCLocal VS Code Extension
 * Provides type-safe access to VS Code configuration
 */

import * as vscode from 'vscode'
import type { ExtensionConfig, PermissionMode } from '@cclocal/shared'

export class ConfigurationManager {
  private config: vscode.WorkspaceConfiguration
  private disposables: vscode.Disposable[] = []
  private onConfigChangeEmitter = new vscode.EventEmitter<ExtensionConfig>()

  constructor() {
    this.config = vscode.workspace.getConfiguration('cclocal')
    this.setupConfigWatcher()
  }

  /**
   * Get the full configuration object
   */
  getConfig(): ExtensionConfig {
    return {
      cclocalPath: this.getCclocalPath(),
      model: this.getModel(),
      mode: this.getMode(),
      environmentVariables: this.getEnvironmentVariables(),
      initialPermissionMode: this.getInitialPermissionMode(),
      useTerminal: this.getUseTerminal(),
      autosave: this.getAutosave(),
      useCtrlEnterToSend: this.getUseCtrlEnterToSend(),
      preferredLocation: this.getPreferredLocation(),
      hideOnboarding: this.getHideOnboarding(),
      showToolInput: this.getShowToolInput(),
      maxMessageHistory: this.getMaxMessageHistory(),
      enableThinkingDisplay: this.getEnableThinkingDisplay(),
      thinkingExpandedByDefault: this.getThinkingExpandedByDefault(),
    }
  }

  // ─── Individual Getters ─────────────────────────────────────────────────────

  getCclocalPath(): string {
    return this.config.get<string>('cclocalPath') || 'cclocal'
  }

  getModel(): string {
    return this.config.get<string>('model') || ''
  }

  getMode(): 'ide' | 'cli' | 'websocket' {
    return this.config.get<'ide' | 'cli' | 'websocket'>('mode') || 'ide'
  }

  getEnvironmentVariables(): Record<string, string> {
    return this.config.get<Record<string, string>>('environmentVariables') || {}
  }

  getInitialPermissionMode(): PermissionMode {
    return this.config.get<PermissionMode>('initialPermissionMode') || 'default'
  }

  getUseTerminal(): boolean {
    return this.config.get<boolean>('useTerminal') ?? true
  }

  getAutosave(): boolean {
    return this.config.get<boolean>('autosave') ?? false
  }

  getUseCtrlEnterToSend(): boolean {
    return this.config.get<boolean>('useCtrlEnterToSend') ?? false
  }

  getPreferredLocation(): 'sidebar' | 'panel' {
    return this.config.get<'sidebar' | 'panel'>('preferredLocation') || 'sidebar'
  }

  getHideOnboarding(): boolean {
    return this.config.get<boolean>('hideOnboarding') ?? false
  }

  getShowToolInput(): boolean {
    return this.config.get<boolean>('showToolInput') ?? true
  }

  getMaxMessageHistory(): number {
    return this.config.get<number>('maxMessageHistory') || 100
  }

  getEnableThinkingDisplay(): boolean {
    return this.config.get<boolean>('enableThinkingDisplay') ?? true
  }

  getThinkingExpandedByDefault(): boolean {
    return this.config.get<boolean>('thinkingExpandedByDefault') ?? false
  }

  // ─── Setters ────────────────────────────────────────────────────────────────

  async update<T>(key: string, value: T, target?: vscode.ConfigurationTarget): Promise<void> {
    const configTarget = target ?? vscode.ConfigurationTarget.Global
    await this.config.update(key, value, configTarget)
  }

  async setPreferredLocation(location: 'sidebar' | 'panel'): Promise<void> {
    await this.update('preferredLocation', location)
  }

  async setInitialPermissionMode(mode: PermissionMode): Promise<void> {
    await this.update('initialPermissionMode', mode)
  }

  async setModel(model: string): Promise<void> {
    await this.update('model', model)
  }

  // ─── Event Handling ─────────────────────────────────────────────────────────

  get onConfigChange(): vscode.Event<ExtensionConfig> {
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

  // ─── Cleanup ────────────────────────────────────────────────────────────────

  dispose(): void {
    this.disposables.forEach((d) => d.dispose())
    this.onConfigChangeEmitter.dispose()
  }
}
