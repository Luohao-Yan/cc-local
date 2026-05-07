/**
 * Session Tree Data Provider for CCLocal VS Code Extension
 * Shows session list in sidebar with search, rename, delete actions
 */

import * as vscode from 'vscode'
import { SessionManager } from './SessionManager'
import type { SessionListItem, SessionStatus } from './types'

// ─── Tree Item Types ────────────────────────────────────────────────────────────

export class SessionTreeItem extends vscode.TreeItem {
  constructor(
    public readonly sessionItem: SessionListItem,
  ) {
    super(sessionItem.name, vscode.TreeItemCollapsibleState.None)

    this.id = sessionItem.id
    this.description = this.formatDescription(sessionItem)
    this.tooltip = this.formatTooltip(sessionItem)
    this.iconPath = this.getIcon(sessionItem)
    this.contextValue = this.getContextValue(sessionItem)
    this.resourceUri = undefined

    // Set highlighting for active session
    if (sessionItem.isActive) {
      this.description = `● ${this.description}`
    }

    this.command = {
      command: 'cclocal.switchSession',
      title: 'Switch to Session',
      arguments: [sessionItem.id],
    }
  }

  private formatDescription(item: SessionListItem): string {
    const parts: string[] = []

    if (item.messageCount > 0) {
      parts.push(`${item.messageCount} msgs`)
    }

    const age = this.formatRelativeTime(item.updatedAt)
    parts.push(age)

    return parts.join(' • ')
  }

  private formatTooltip(item: SessionListItem): string {
    const lines = [
      `Session: ${item.name}`,
      `ID: ${item.id}`,
      `Status: ${item.status}`,
      `Messages: ${item.messageCount}`,
      `Model: ${item.model || 'default'}`,
      `Created: ${new Date(item.createdAt).toLocaleString()}`,
      `Updated: ${new Date(item.updatedAt).toLocaleString()}`,
    ]

    if (item.tags?.length) {
      lines.push(`Tags: ${item.tags.join(', ')}`)
    }

    if (item.isFork) {
      lines.push(`Fork of: ${item.forkSourceId}`)
    }

    if (item.lastMessagePreview) {
      lines.push('', `Last message: ${item.lastMessagePreview}`)
    }

    return lines.join('\n')
  }

  private getIcon(item: SessionListItem): vscode.ThemeIcon {
    if (item.isActive) {
      return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'))
    }

    switch (item.status) {
      case 'running':
        return new vscode.ThemeIcon('sync~spin')
      case 'error':
        return new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'))
      case 'paused':
        return new vscode.ThemeIcon('debug-pause')
      case 'loading':
        return new vscode.ThemeIcon('loading~spin')
      default:
        return new vscode.ThemeIcon('circle-outline')
    }
  }

  private getContextValue(item: SessionListItem): string {
    const parts = ['session']

    if (item.isActive) parts.push('active')
    if (item.isFork) parts.push('fork')
    if (item.status === 'running') parts.push('running')
    if (item.status === 'error') parts.push('error')

    return parts.join('.')
  }

  private formatRelativeTime(timestamp: number): string {
    const diff = Date.now() - timestamp
    const seconds = Math.floor(diff / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }
}

// ─── Tree Data Provider ────────────────────────────────────────────────────────

export class SessionTreeProvider
  implements vscode.TreeDataProvider<SessionTreeItem>, vscode.Disposable
{
  private treeView: vscode.TreeView<SessionTreeItem>
  private _onDidChangeTreeData = new vscode.EventEmitter<
    SessionTreeItem | undefined | null | void
  >()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  private searchQuery: string = ''

  constructor(
    private sessionManager: SessionManager,
  ) {
    this.treeView = vscode.window.createTreeView('cclocal.sessions', {
      treeDataProvider: this,
      showCollapseAll: false,
    })

    // Refresh on session events
    this.sessionManager.onDidSessionEvent(() => {
      this.refresh()
    })
  }

  refresh(): void {
    this._onDidChangeTreeData.fire()
  }

  setSearchQuery(query: string): void {
    this.searchQuery = query
    this.refresh()
  }

  getTreeItem(element: SessionTreeItem): vscode.TreeItem {
    return element
  }

  getChildren(_element?: SessionTreeItem): SessionTreeItem[] {
    let sessions = this.sessionManager.listSessions()

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase()
      sessions = sessions.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.lastMessagePreview || '').toLowerCase().includes(q) ||
        (s.tags || []).some(t => t.toLowerCase().includes(q))
      )
    }

    return sessions.map(s => new SessionTreeItem(s))
  }

  dispose(): void {
    this.treeView.dispose()
    this._onDidChangeTreeData.dispose()
  }
}
