/**
 * GlobalStateManager — Manages persistent extension state across VS Code restarts.
 *
 * 1:1 match with official Claude Code extension's globalState usage.
 * Keys are persisted via vscode.ExtensionContext.globalState.
 */

import * as vscode from 'vscode'

/** All globalState keys used by the extension (1:1 with official) */
export const GlobalStateKeys = {
  /** Whether walkthrough has been shown to the user */
  WALKTHROUGH_SHOWN: 'walkthroughShown',
  /** Persisted default permission mode */
  DEFAULT_PERMISSION_MODE: 'defaultPermissionMode',
  /** Persisted thinking level */
  THINKING_LEVEL: 'thinkingLevel',
  /** Whether to show terminal mode banner */
  SHOW_TERMINAL_BANNER: 'showTerminalBanner',
  /** Whether Chrome extension notification was dismissed */
  CHROME_EXT_NOTIF_DISMISSED: 'chromeExtensionNotificationDismissed',
  /** Review upsell banner dismissal metadata */
  REVIEW_UPSELL_DISMISSED: 'reviewUpsellDismissedMetadata',
  /** Review upsell banner last shown timestamp */
  REVIEW_UPSELL_LAST_SHOWN: 'reviewUpsellLastShownTimestamp',
  /** Hidden session IDs */
  HIDDEN_SESSION_IDS: 'hiddenSessionIds',
  /** Settings migration flag */
  SETTINGS_MIGRATED: 'settingsMigrated20251024',
  /** Last preferred Claude location (sidebar/panel) */
  LAST_CLAUDE_LOCATION: 'lastClaudeLocation',
  /** Location migration flag */
  LAST_CLAUDE_LOCATION_MIGRATED: 'lastClaudeLocationMigrated',
  /** Feature gate overrides for experiments */
  EXPERIMENT_GATES: 'experimentGates',
} as const

export type GlobalStateKey = (typeof GlobalStateKeys)[keyof typeof GlobalStateKeys]

export class GlobalStateManager implements vscode.Disposable {
  private context: vscode.ExtensionContext

  constructor(context: vscode.ExtensionContext) {
    this.context = context
    this.migrateIfNeeded()
  }

  /** Get a globalState value */
  get<T>(key: GlobalStateKey): T | undefined
  get<T>(key: GlobalStateKey, defaultValue: T): T
  get<T>(key: GlobalStateKey, defaultValue?: T): T | undefined {
    return this.context.globalState.get(key, defaultValue as T)
  }

  /** Set a globalState value */
  async set(key: GlobalStateKey, value: unknown): Promise<void> {
    await this.context.globalState.update(key, value)
  }

  /** Check if walkthrough has been shown */
  get walkthroughShown(): boolean {
    return this.get<boolean>(GlobalStateKeys.WALKTHROUGH_SHOWN, false)
  }

  async setWalkthroughShown(): Promise<void> {
    await this.set(GlobalStateKeys.WALKTHROUGH_SHOWN, true)
  }

  /** Default permission mode */
  get defaultPermissionMode(): string | undefined {
    return this.get<string>(GlobalStateKeys.DEFAULT_PERMISSION_MODE)
  }

  async setDefaultPermissionMode(mode: string): Promise<void> {
    await this.set(GlobalStateKeys.DEFAULT_PERMISSION_MODE, mode)
  }

  /** Thinking level */
  get thinkingLevel(): string | undefined {
    return this.get<string>(GlobalStateKeys.THINKING_LEVEL)
  }

  async setThinkingLevel(level: string): Promise<void> {
    await this.set(GlobalStateKeys.THINKING_LEVEL, level)
  }

  /** Terminal banner visibility */
  get showTerminalBanner(): boolean {
    return this.get<boolean>(GlobalStateKeys.SHOW_TERMINAL_BANNER, true)
  }

  async dismissTerminalBanner(): Promise<void> {
    await this.set(GlobalStateKeys.SHOW_TERMINAL_BANNER, false)
  }

  /** Chrome extension notification */
  get chromeExtNotifDismissed(): boolean {
    return this.get<boolean>(GlobalStateKeys.CHROME_EXT_NOTIF_DISMISSED, false)
  }

  async dismissChromeExtNotif(): Promise<void> {
    await this.set(GlobalStateKeys.CHROME_EXT_NOTIF_DISMISSED, true)
  }

  /** Review upsell banner */
  get reviewUpsellDismissed(): { count: number; lastDismissed: number } | undefined {
    return this.get<{ count: number; lastDismissed: number }>(GlobalStateKeys.REVIEW_UPSELL_DISMISSED)
  }

  async dismissReviewUpsell(): Promise<void> {
    const prev = this.reviewUpsellDismissed ?? { count: 0, lastDismissed: 0 }
    await this.set(GlobalStateKeys.REVIEW_UPSELL_DISMISSED, {
      count: prev.count + 1,
      lastDismissed: Date.now(),
    })
  }

  get reviewUpsellLastShown(): number {
    return this.get<number>(GlobalStateKeys.REVIEW_UPSELL_LAST_SHOWN, 0)
  }

  async setReviewUpsellLastShown(): Promise<void> {
    await this.set(GlobalStateKeys.REVIEW_UPSELL_LAST_SHOWN, Date.now())
  }

  /** Hidden sessions */
  get hiddenSessionIds(): string[] {
    return this.get<string[]>(GlobalStateKeys.HIDDEN_SESSION_IDS, [])
  }

  async hideSession(sessionId: string): Promise<void> {
    const ids = this.hiddenSessionIds
    if (!ids.includes(sessionId)) {
      ids.push(sessionId)
      await this.set(GlobalStateKeys.HIDDEN_SESSION_IDS, ids)
    }
  }

  /** Last Claude location */
  get lastClaudeLocation(): 'sidebar' | 'panel' | undefined {
    return this.get<'sidebar' | 'panel'>(GlobalStateKeys.LAST_CLAUDE_LOCATION)
  }

  async setLastClaudeLocation(location: 'sidebar' | 'panel'): Promise<void> {
    await this.set(GlobalStateKeys.LAST_CLAUDE_LOCATION, location)
  }

  /** Experiment gates */
  get experimentGates(): Record<string, boolean> {
    return this.get<Record<string, boolean>>(GlobalStateKeys.EXPERIMENT_GATES, {})
  }

  async setExperimentGate(name: string, enabled: boolean): Promise<void> {
    const gates = this.experimentGates
    gates[name] = enabled
    await this.set(GlobalStateKeys.EXPERIMENT_GATES, gates)
  }

  /** Run one-time migrations */
  private migrateIfNeeded(): void {
    // Settings migration (one-time)
    if (!this.get<boolean>(GlobalStateKeys.SETTINGS_MIGRATED)) {
      // Future: migrate old setting keys to new ones
      // For now just mark as done
      void this.set(GlobalStateKeys.SETTINGS_MIGRATED, true)
    }

    // Location migration
    if (!this.get<boolean>(GlobalStateKeys.LAST_CLAUDE_LOCATION_MIGRATED)) {
      const config = vscode.workspace.getConfiguration('cclocal')
      const preferred = config.get<string>('preferredLocation')
      if (preferred === 'sidebar' || preferred === 'panel') {
        void this.setLastClaudeLocation(preferred as 'sidebar' | 'panel')
      }
      void this.set(GlobalStateKeys.LAST_CLAUDE_LOCATION_MIGRATED, true)
    }
  }

  dispose(): void {
    // No-op; globalState is managed by ExtensionContext
  }
}
