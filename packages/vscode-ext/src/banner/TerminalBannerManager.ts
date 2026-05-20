/**
 * TerminalBannerManager — Manages terminal mode banner display and dismissal.
 *
 * 1:1 match with official Claude Code extension's terminal banner.
 * When running in terminal mode, a banner is shown to the user.
 * The banner can be dismissed, and the dismissal state is persisted.
 */

import * as vscode from 'vscode'
import type { GlobalStateManager } from '../GlobalStateManager.js'

export class TerminalBannerManager implements vscode.Disposable {
  private outputChannel: vscode.LogOutputChannel
  private globalStateManager: GlobalStateManager | null
  private statusItem: vscode.StatusBarItem | null = null

  constructor(outputChannel: vscode.LogOutputChannel, globalStateManager?: GlobalStateManager) {
    this.outputChannel = outputChannel
    this.globalStateManager = globalStateManager ?? null
  }

  /** Show the terminal banner if not previously dismissed */
  showBannerIfNeeded(): void {
    if (!this.globalStateManager) return
    if (!this.globalStateManager.showTerminalBanner) {
      this.outputChannel.debug('[Banner] Terminal banner previously dismissed')
      return
    }

    this.createStatusItem()
    this.outputChannel.debug('[Banner] Showing terminal mode banner')
  }

  /** Dismiss the terminal banner (persisted) */
  async dismiss(): Promise<void> {
    if (this.statusItem) {
      this.statusItem.hide()
      this.statusItem.dispose()
      this.statusItem = null
    }

    await this.globalStateManager?.dismissTerminalBanner()
    this.outputChannel.info('[Banner] Terminal banner dismissed')
  }

  /** Create the status bar item for the banner */
  private createStatusItem(): void {
    if (this.statusItem) return

    this.statusItem = vscode.window.createStatusBarItem(
      'cclocal.terminalBanner',
      vscode.StatusBarAlignment.Left,
      100,
    )
    this.statusItem.name = 'CCLocal Terminal Banner'
    this.statusItem.text = '$(info) CCLocal: Running in terminal mode'
    this.statusItem.tooltip = 'Click to dismiss or switch to native UI'
    this.statusItem.command = 'cclocal.dismissTerminalBanner'
    this.statusItem.show()
  }

  dispose(): void {
    this.statusItem?.dispose()
    this.statusItem = null
  }
}
