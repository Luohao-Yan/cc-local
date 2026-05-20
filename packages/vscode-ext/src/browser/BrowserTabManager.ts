/**
 * BrowserTabManager — Manages browser tabs for Chrome MCP integration.
 *
 * 1:1 match with official Claude Code extension's browser tab management.
 * Allows Claude to create new browser tabs and track their state.
 */

import * as vscode from 'vscode'
import * as crypto from 'crypto'

export interface BrowserTab {
  id: string
  url: string
  title: string
  createdAt: number
  isActive: boolean
}

export class BrowserTabManager implements vscode.Disposable {
  private outputChannel: vscode.LogOutputChannel
  /** Active browser tabs */
  private tabs = new Map<string, BrowserTab>()
  /** Event emitter */
  private _onDidChangeTabs = new vscode.EventEmitter<BrowserTab[]>()
  readonly onDidChangeTabs = this._onDidChangeTabs.event

  constructor(outputChannel: vscode.LogOutputChannel) {
    this.outputChannel = outputChannel
  }

  /** Create a new browser tab */
  createTab(url: string = 'about:blank'): BrowserTab {
    const tab: BrowserTab = {
      id: crypto.randomUUID(),
      url,
      title: url === 'about:blank' ? 'New Tab' : new URL(url).hostname,
      createdAt: Date.now(),
      isActive: true,
    }

    // Deactivate other tabs
    for (const [, t] of this.tabs) {
      t.isActive = false
    }

    this.tabs.set(tab.id, tab)
    this.outputChannel.info(`[Browser] Created tab ${tab.id}: ${url}`)
    this._onDidChangeTabs.fire(this.getTabs())
    return tab
  }

  /** Get all tabs */
  getTabs(): BrowserTab[] {
    return Array.from(this.tabs.values())
  }

  /** Get active tab */
  getActiveTab(): BrowserTab | undefined {
    for (const [, tab] of this.tabs) {
      if (tab.isActive) return tab
    }
    return undefined
  }

  /** Switch to a tab */
  switchTab(tabId: string): boolean {
    const tab = this.tabs.get(tabId)
    if (!tab) return false

    for (const [, t] of this.tabs) {
      t.isActive = t.id === tabId
    }

    this._onDidChangeTabs.fire(this.getTabs())
    this.outputChannel.debug(`[Browser] Switched to tab ${tabId}`)
    return true
  }

  /** Update a tab's URL/title */
  updateTab(tabId: string, updates: Partial<Pick<BrowserTab, 'url' | 'title'>>): boolean {
    const tab = this.tabs.get(tabId)
    if (!tab) return false

    if (updates.url) tab.url = updates.url
    if (updates.title) tab.title = updates.title

    this._onDidChangeTabs.fire(this.getTabs())
    return true
  }

  /** Close a tab */
  closeTab(tabId: string): boolean {
    const deleted = this.tabs.delete(tabId)
    if (!deleted) return false

    // If the closed tab was active, activate another
    let hasActive = false
    for (const [, tab] of this.tabs) {
      if (tab.isActive) { hasActive = true; break }
    }
    if (!hasActive) {
      // Activate the most recently created tab
      const sorted = Array.from(this.tabs.values()).sort((a, b) => b.createdAt - a.createdAt)
      if (sorted.length > 0) sorted[0].isActive = true
    }

    this._onDidChangeTabs.fire(this.getTabs())
    this.outputChannel.debug(`[Browser] Closed tab ${tabId}`)
    return true
  }

  /** Get tab context for MCP (tabs_context_mcp) */
  getTabsContext(): Array<{ id: string; url: string; title: string; isActive: boolean }> {
    return this.getTabs().map(t => ({
      id: t.id,
      url: t.url,
      title: t.title,
      isActive: t.isActive,
    }))
  }

  dispose(): void {
    this.tabs.clear()
    this._onDidChangeTabs.dispose()
  }
}
