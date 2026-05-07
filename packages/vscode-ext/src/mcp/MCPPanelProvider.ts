/**
 * MCP Panel Provider for CCLocal VS Code Extension
 * Visual MCP server management via webview
 */

import * as vscode from 'vscode'
import { MCPManager } from './MCPManager'
import type { MCPServerInfo, MCPApprovalState, MCPStats } from './types'

export class MCPPanelProvider implements vscode.Disposable {
  private panel: vscode.WebviewPanel | null = null
  private mcpManager: MCPManager

  constructor(mcpManager: MCPManager) {
    this.mcpManager = mcpManager
  }

  /**
   * Show MCP management panel
   */
  show(): void {
    if (this.panel) {
      this.panel.reveal()
      return
    }

    this.panel = vscode.window.createWebviewPanel(
      'cclocal.mcp',
      'MCP Servers',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    )

    this.panel.webview.html = this.getWebviewContent()
    this.setupMessageHandler()

    // Listen for state changes
    this.mcpManager.onDidChangeState((event) => {
      this.sendState()
    })
  }

  /**
   * Setup message handler for webview communication
   */
  private setupMessageHandler(): void {
    if (!this.panel) return

    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'getState':
          this.sendState()
          break

        case 'refreshServers':
          await this.mcpManager.discoverServers()
          this.sendState()
          break

        case 'approveServer':
          await this.mcpManager.approveServer(message.name, message.remember)
          this.sendState()
          break

        case 'denyServer':
          await this.mcpManager.denyServer(message.name, message.remember)
          this.sendState()
          break

        case 'enableServer':
          await this.mcpManager.enableServer(message.name)
          this.sendState()
          break

        case 'disableServer':
          await this.mcpManager.disableServer(message.name)
          this.sendState()
          break

        case 'removeServer':
          await this.mcpManager.removeServer(message.name)
          this.sendState()
          break

        case 'openSettings':
          await vscode.commands.executeCommand('workbench.action.openSettings', 'cclocal.mcp')
          break

        case 'openConfigFile':
          await this.openConfigFile(message.source)
          break
      }
    })
  }

  /**
   * Send current state to webview
   */
  private sendState(): void {
    const servers = this.mcpManager.getAllServers()
    const stats = this.mcpManager.getStats()
    const pending = this.mcpManager.getPendingApprovals()

    this.panel?.webview.postMessage({
      type: 'state',
      servers,
      stats,
      pendingApprovals: pending,
    })
  }

  /**
   * Open config file for editing
   */
  private async openConfigFile(source: 'user' | 'local' | 'project'): Promise<void> {
    const home = process.env.HOME || process.env.USERPROFILE || ''
    const paths: Record<string, string> = {
      user: `${home}/.claude.json`,
      local: `${home}/.claude/cclocal.json`,
      project: '',
    }

    if (source === 'project') {
      const workspaceFolders = vscode.workspace.workspaceFolders
      if (workspaceFolders && workspaceFolders.length > 0) {
        paths.project = `${workspaceFolders[0].uri.fsPath}/.mcp.json`
      } else {
        vscode.window.showWarningMessage('No workspace folder open')
        return
      }
    }

    const filePath = paths[source]
    if (!filePath) return

    try {
      const doc = await vscode.workspace.openTextDocument(filePath)
      await vscode.window.showTextDocument(doc)
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open ${filePath}: ${error}`)
    }
  }

  /**
   * Get webview HTML content
   */
  private getWebviewContent(): string {
    return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Servers</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--vscode-widget-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-actions {
      display: flex;
      gap: 8px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 6px;
      padding: 12px;
      text-align: center;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 600;
      color: var(--vscode-textLink-foreground);
    }
    .stat-label {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
    }
    .section {
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
    }
    .server-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .server-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: var(--vscode-list-hoverBackground);
      border-radius: 4px;
      border-left: 3px solid transparent;
    }
    .server-item.approved {
      border-left-color: var(--vscode-testing-iconPassed, #4CAF50);
    }
    .server-item.denied {
      border-left-color: var(--vscode-testing-iconFailed, #f44336);
    }
    .server-item.pending {
      border-left-color: var(--vscode-editorWarning-foreground, #FF9800);
    }
    .server-info {
      flex: 1;
    }
    .server-name {
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .server-meta {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
    }
    .server-tools {
      font-size: 11px;
      color: var(--vscode-textPreformat-foreground);
      margin-top: 4px;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 500;
    }
    .badge.status-connected {
      background: var(--vscode-testing-iconPassed, #4CAF50);
      color: white;
    }
    .badge.status-connecting {
      background: var(--vscode-progressBar-background, #2196F3);
      color: white;
    }
    .badge.status-failed {
      background: var(--vscode-testing-iconFailed, #f44336);
      color: white;
    }
    .badge.status-disconnected {
      background: var(--vscode-descriptionForeground);
      color: white;
    }
    .badge.source-user {
      background: var(--vscode-textLink-foreground);
      color: white;
    }
    .badge.source-project {
      background: var(--vscode-charts-orange, #FF9800);
      color: white;
    }
    .server-actions {
      display: flex;
      gap: 6px;
    }
    .btn {
      padding: 6px 12px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      font-size: 12px;
    }
    .btn:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .btn-small {
      padding: 4px 8px;
      font-size: 11px;
    }
    .btn-danger {
      background: var(--vscode-inputValidation-errorBackground, #f44336);
    }
    .empty {
      text-align: center;
      color: var(--vscode-descriptionForeground);
      padding: 20px;
    }
    .pending-banner {
      background: var(--vscode-inputValidation-warningBackground, #FFF3E0);
      border: 1px solid var(--vscode-inputValidation-warningBorder, #FF9800);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .pending-text {
      color: var(--vscode-editorWarning-foreground);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>
      <span>🔌 MCP Servers</span>
      <div class="header-actions">
        <button class="btn btn-secondary btn-small" id="refreshBtn">Refresh</button>
        <button class="btn btn-secondary btn-small" id="openSettingsBtn">Settings</button>
      </div>
    </h1>

    <div id="pendingBanner" class="pending-banner" style="display: none;">
      <span class="pending-text">
        <strong id="pendingCount">0</strong> server(s) pending approval
      </span>
      <button class="btn btn-small" id="reviewPendingBtn">Review</button>
    </div>

    <div class="stats" id="stats"></div>

    <div class="section">
      <div class="section-header">
        <span class="section-title">All Servers</span>
        <div>
          <button class="btn btn-secondary btn-small" id="openUserConfigBtn">User Config</button>
          <button class="btn btn-secondary btn-small" id="openProjectConfigBtn">Project Config</button>
        </div>
      </div>
      <div class="server-list" id="serverList">
        <div class="empty">Loading...</div>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    // Get state on load
    vscode.postMessage({ type: 'getState' });

    // Listen for state from extension
    window.addEventListener('message', event => {
      if (event.data.type === 'state') {
        renderState(event.data);
      }
    });

    function renderState(data) {
      renderStats(data.stats);
      renderServers(data.servers);
      renderPendingBanner(data.pendingApprovals);
    }

    function renderStats(stats) {
      const container = document.getElementById('stats');
      container.innerHTML = \`
        <div class="stat-card">
          <div class="stat-value">\${stats.totalDiscovered}</div>
          <div class="stat-label">Discovered</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${stats.byStatus.connected || 0}</div>
          <div class="stat-label">Connected</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${stats.byApproval.approved || 0}</div>
          <div class="stat-label">Approved</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${stats.totalTools}</div>
          <div class="stat-label">Tools</div>
        </div>
      \`;
    }

    function renderServers(servers) {
      const container = document.getElementById('serverList');

      if (servers.length === 0) {
        container.innerHTML = '<div class="empty">No MCP servers discovered. Add servers to your config files.</div>';
        return;
      }

      container.innerHTML = servers.map(server => \`
        <div class="server-item \${server.approvalState}">
          <div class="server-info">
            <div class="server-name">
              <strong>\${escapeHtml(server.name)}</strong>
              <span class="badge status-\${server.status}">\${server.status}</span>
              <span class="badge source-\${server.source}">\${server.source}</span>
            </div>
            <div class="server-meta">
              Transport: \${server.config.type}
              \${server.config.type === 'stdio' ? '• Command: ' + escapeHtml(server.config.command || '') : ''}
              \${server.config.type !== 'stdio' ? '• URL: ' + escapeHtml(server.config.url || '') : ''}
            </div>
            \${server.tools.length > 0 ? \`
              <div class="server-tools">
                Tools: \${server.tools.slice(0, 3).map(t => t.name).join(', ')}
                \${server.tools.length > 3 ? '...' : ''}
              </div>
            \` : ''}
            \${server.lastError ? '<div style="color: var(--vscode-errorForeground); margin-top: 4px;">Error: ' + escapeHtml(server.lastError) + '</div>' : ''}
          </div>
          <div class="server-actions">
            \${renderServerActions(server)}
          </div>
        </div>
      \`).join('');
    }

    function renderServerActions(server) {
      if (server.approvalState === 'pending') {
        return \`
          <button class="btn btn-small" onclick="approveServer('\${server.name}', false)">Approve</button>
          <button class="btn btn-small btn-secondary" onclick="approveServer('\${server.name}', true)">Approve & Remember</button>
          <button class="btn btn-small btn-danger" onclick="denyServer('\${server.name}', false)">Deny</button>
        \`;
      }
      if (server.approvalState === 'approved') {
        if (server.status === 'connected') {
          return \`
            <button class="btn btn-small btn-secondary" onclick="disableServer('\${server.name}')">Disable</button>
          \`;
        } else {
          return \`
            <button class="btn btn-small" onclick="enableServer('\${server.name}')">Enable</button>
          \`;
        }
      }
      if (server.approvalState === 'denied') {
        return \`
          <button class="btn btn-small" onclick="approveServer('\${server.name}', false)">Approve</button>
          <button class="btn btn-small btn-secondary btn-danger" onclick="removeServer('\${server.name}')">Remove</button>
        \`;
      }
      return '';
    }

    function renderPendingBanner(pending) {
      const banner = document.getElementById('pendingBanner');
      const count = document.getElementById('pendingCount');

      if (pending.length > 0) {
        banner.style.display = 'flex';
        count.textContent = pending.length;
      } else {
        banner.style.display = 'none';
      }
    }

    function escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Action handlers
    function approveServer(name, remember) {
      vscode.postMessage({ type: 'approveServer', name, remember });
    }

    function denyServer(name, remember) {
      vscode.postMessage({ type: 'denyServer', name, remember });
    }

    function enableServer(name) {
      vscode.postMessage({ type: 'enableServer', name });
    }

    function disableServer(name) {
      vscode.postMessage({ type: 'disableServer', name });
    }

    function removeServer(name) {
      vscode.postMessage({ type: 'removeServer', name });
    }

    // Button handlers
    document.getElementById('refreshBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'refreshServers' });
    });

    document.getElementById('openSettingsBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'openSettings' });
    });

    document.getElementById('openUserConfigBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'openConfigFile', source: 'user' });
    });

    document.getElementById('openProjectConfigBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'openConfigFile', source: 'project' });
    });

    document.getElementById('reviewPendingBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'refreshServers' });
    });
  </script>
</body>
</html>
`
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.panel?.dispose()
    this.panel = null
  }
}
