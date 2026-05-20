/**
 * ProactiveSuggestionsManager — Controls proactive suggestion feature.
 *
 * 1:1 match with official Claude Code extension's proactive suggestions system.
 * When enabled, Claude can proactively suggest code improvements when the user
 * is idle or editing relevant files.
 */

import * as vscode from 'vscode'
import * as crypto from 'crypto'

export interface ProactiveSuggestion {
  id: string
  type: 'refactor' | 'fix' | 'optimize' | 'test' | 'document' | 'security'
  message: string
  priority: number
  filePath?: string
  line?: number
  createdAt: number
}

export class ProactiveSuggestionsManager implements vscode.Disposable {
  private outputChannel: vscode.LogOutputChannel
  private _enabled = false
  /** Current suggestions queue */
  private suggestions: ProactiveSuggestion[] = []
  /** Event emitters */
  private _onDidChangeSuggestions = new vscode.EventEmitter<ProactiveSuggestion[]>()
  readonly onDidChangeSuggestions = this._onDidChangeSuggestions.event
  private _onDidChangeEnabled = new vscode.EventEmitter<boolean>()
  readonly onDidChangeEnabled = this._onDidChangeEnabled.event

  /** Idle timer — tracks user inactivity */
  private idleTimer: ReturnType<typeof setTimeout> | null = null
  private readonly IDLE_THRESHOLD_MS = 30_000 // 30 seconds of inactivity

  constructor(outputChannel: vscode.LogOutputChannel) {
    this.outputChannel = outputChannel
  }

  /** Whether proactive suggestions are enabled */
  get enabled(): boolean {
    return this._enabled
  }

  /** Enable/disable proactive suggestions */
  setEnabled(enabled: boolean): void {
    if (this._enabled === enabled) return
    this._enabled = enabled
    this.outputChannel.info(`[Proactive] ${enabled ? 'Enabled' : 'Disabled'}`)
    this._onDidChangeEnabled.fire(enabled)

    if (!enabled) {
      this.clearSuggestions()
      this.stopIdleTimer()
    }
  }

  /** Receive a proactive suggestion update from CLI */
  updateSuggestions(suggestions: Array<{ type: string; message: string; priority?: number }>): void {
    if (!this._enabled) return

    this.suggestions = suggestions.map(s => ({
      id: crypto.randomUUID(),
      type: s.type as ProactiveSuggestion['type'],
      message: s.message,
      priority: s.priority ?? 5,
      createdAt: Date.now(),
    }))

    this.suggestions.sort((a, b) => b.priority - a.priority)
    this.outputChannel.debug(`[Proactive] Received ${suggestions.length} suggestion(s)`)
    this._onDidChangeSuggestions.fire(this.suggestions)
  }

  /** Get current suggestions */
  getSuggestions(): ProactiveSuggestion[] {
    return [...this.suggestions]
  }

  /** Dismiss a specific suggestion */
  dismissSuggestion(id: string): void {
    this.suggestions = this.suggestions.filter(s => s.id !== id)
    this._onDidChangeSuggestions.fire(this.suggestions)
  }

  /** Clear all suggestions */
  clearSuggestions(): void {
    this.suggestions = []
    this._onDidChangeSuggestions.fire([])
  }

  /** Start idle timer (called when user stops typing) */
  startIdleTimer(): void {
    this.stopIdleTimer()
    if (!this._enabled) return
    this.idleTimer = setTimeout(() => {
      // When idle, we could trigger a check — but the CLI controls this
      this.outputChannel.debug('[Proactive] User idle threshold reached')
    }, this.IDLE_THRESHOLD_MS)
  }

  /** Stop idle timer (called when user starts typing) */
  stopIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
  }

  dispose(): void {
    this.stopIdleTimer()
    this.suggestions = []
    this._onDidChangeSuggestions.dispose()
    this._onDidChangeEnabled.dispose()
  }
}
