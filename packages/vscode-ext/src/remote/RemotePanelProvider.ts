/**
 * Remote Panel Provider - CCLocal VS Code Extension
 * Webview panel for managing remote connections and sessions
 */

import * as vscode from 'vscode'
import type { RemoteSessionManager } from './RemoteSessionManager.js'
import type { SSHConfig, RemoteSession, RemoteStats } from './types.js'

// ════════════════════════════════════════════════════════════════════════════
// REMOTE PANEL PROVIDER
// ════════════════════════════════════════════════════════════════════════════

export class RemotePanelProvider implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined
  private readonly manager: RemoteSessionManager

  constructor(manager: RemoteSessionManager) {
    this.manager = manager
  }

  /**
   * Show the remote management panel
   */
  show(): void {
    if (this.panel) {
      this.panel.reveal()
      return
    }

    this.panel = vscode.window.createWebviewPanel(
      'cclocal.remote',
      'Remote Connections',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    )

    this.panel.webview.html = this.getHtml()

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(async message => {
      await this.handleMessage(message)
    })

    this.panel.onDidDispose(() => {
      this.panel = undefined
    })
  }

  /**
   * Handle messages from the webview
   */
  private async handleMessage(message: { command: string; data?: unknown }): Promise<void> {
    switch (message.command) {
      case 'refresh':
        this.updatePanel()
        break

      case 'addConfig':
        await this.addSSHConfig()
        break

      case 'editConfig':
        await this.editSSHConfig(message.data as string)
        break

      case 'deleteConfig':
        await this.deleteSSHConfig(message.data as string)
        break

      case 'connect':
        await this.connectRemote(message.data as string)
        break

      case 'disconnect':
        await this.disconnectRemote(message.data as string)
        break

      case 'teleport':
        await this.teleportSession(message.data as { sessionId: string; remoteId: string })
        break

      case 'executeCommand':
        await this.executeRemoteCommand(message.data as { remoteId: string; command: string })
        break
    }
  }

  /**
   * Add a new SSH configuration
   */
  private async addSSHConfig(): Promise<void> {
    const name = await vscode.window.showInputBox({
      prompt: 'Enter connection name',
      placeHolder: 'My Server',
    })
    if (!name) return

    const host = await vscode.window.showInputBox({
      prompt: 'Enter hostname or IP address',
      placeHolder: 'example.com',
    })
    if (!host) return

    const portStr = await vscode.window.showInputBox({
      prompt: 'Enter SSH port',
      placeHolder: '22',
      value: '22',
    })
    const port = parseInt(portStr || '22', 10)

    const user = await vscode.window.showInputBox({
      prompt: 'Enter username',
      placeHolder: 'user',
    })
    if (!user) return

    const privateKey = await vscode.window.showInputBox({
      prompt: 'Private key path (leave empty for SSH agent)',
      placeHolder: '~/.ssh/id_rsa',
    })

    const config: SSHConfig = {
      id: crypto.randomUUID(),
      name,
      host,
      port,
      user,
      privateKey: privateKey || undefined,
      agentForwarding: true,
    }

    await this.manager.addConfiguration(config)
    this.updatePanel()
    vscode.window.showInformationMessage(`CCLocal: Added SSH configuration "${name}"`)
  }

  /**
   * Edit an SSH configuration
   */
  private async editSSHConfig(id: string): Promise<void> {
    const config = this.manager.getConfiguration(id)
    if (!config) return

    const name = await vscode.window.showInputBox({
      prompt: 'Connection name',
      value: config.name,
    })
    if (!name) return

    const host = await vscode.window.showInputBox({
      prompt: 'Hostname or IP',
      value: config.host,
    })
    if (!host) return

    const portStr = await vscode.window.showInputBox({
      prompt: 'SSH port',
      value: config.port.toString(),
    })
    const port = parseInt(portStr || '22', 10)

    const user = await vscode.window.showInputBox({
      prompt: 'Username',
      value: config.user,
    })
    if (!user) return

    const updatedConfig: SSHConfig = {
      ...config,
      name,
      host,
      port,
      user,
    }

    await this.manager.updateConfiguration(updatedConfig)
    this.updatePanel()
  }

  /**
   * Delete an SSH configuration
   */
  private async deleteSSHConfig(id: string): Promise<void> {
    const config = this.manager.getConfiguration(id)
    if (!config) return

    const confirm = await vscode.window.showWarningMessage(
      `Delete SSH configuration "${config.name}"?`,
      'Delete',
      'Cancel'
    )

    if (confirm === 'Delete') {
      await this.manager.removeConfiguration(id)
      this.updatePanel()
      vscode.window.showInformationMessage(`CCLocal: Deleted SSH configuration`)
    }
  }

  /**
   * Connect to a remote
   */
  private async connectRemote(configId: string): Promise<void> {
    const config = this.manager.getConfiguration(configId)
    if (!config) return

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Connecting to ${config.name}...`,
          cancellable: false,
        },
        async () => {
          await this.manager.connect({ config })
        }
      )
      this.updatePanel()
      vscode.window.showInformationMessage(`CCLocal: Connected to ${config.name}`)
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to connect: ${error}`)
    }
  }

  /**
   * Disconnect from a remote
   */
  private async disconnectRemote(sessionId: string): Promise<void> {
    await this.manager.disconnect(sessionId)
    this.updatePanel()
  }

  /**
   * Teleport a session to remote
   */
  private async teleportSession(data: { sessionId: string; remoteId: string }): Promise<void> {
    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Teleporting session...',
          cancellable: false,
        },
        async () => {
          await this.manager.teleport(data.sessionId, data.remoteId)
        }
      )
      vscode.window.showInformationMessage('CCLocal: Session teleported successfully')
    } catch (error) {
      vscode.window.showErrorMessage(`Teleport failed: ${error}`)
    }
  }

  /**
   * Execute a command on remote
   */
  private async executeRemoteCommand(data: { remoteId: string; command: string }): Promise<void> {
    try {
      const result = await this.manager.executeCommand(data.remoteId, data.command)
      if (result.exitCode === 0) {
        this.manager['outputChannel']?.info(`Command output:\n${result.stdout}`)
        vscode.window.showInformationMessage('Command executed successfully')
      } else {
        vscode.window.showWarningMessage(`Command exited with code ${result.exitCode}: ${result.stderr}`)
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Command failed: ${error}`)
    }
  }

  /**
   * Update the panel with current data
   */
  private updatePanel(): void {
    if (!this.panel) return

    const configs = this.manager.getConfigurations()
    const sessions = this.manager.getSessions()
    const stats = this.manager.getStats()

    this.panel.webview.postMessage({
      command: 'update',
      data: { configs, sessions, stats },
    })
  }

  /**
   * Get the HTML content for the panel
   */
  private getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Remote Connections</title>
  <style>
    :root {
      --font-family: var(--vscode-font-family);
      --bg: var(--vscode-editor-background);
      --fg: var(--vscode-foreground);
      --border: var(--vscode-widget-border);
      --input-bg: var(--vscode-input-background);
      --input-fg: var(--vscode-input-foreground);
      --button-bg: var(--vscode-button-background);
      --button-fg: var(--vscode-button-foreground);
      --button-hover: var(--vscode-button-hoverBackground);
      --list-hover: var(--vscode-list-hoverBackground);
    }
    * { box-sizing: border-box; }
    body {
      font-family: var(--font-family);
      background: var(--bg);
      color: var(--fg);
      padding: 16px;
      margin: 0;
    }
    h2 { margin-top: 0; font-size: 18px; }
    h3 { font-size: 14px; margin: 16px 0 8px; }
    .section { margin-bottom: 24px; }
    .card {
      background: var(--input-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 8px;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .card-title { font-weight: 600; }
    .card-actions { display: flex; gap: 8px; }
    .status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
    }
    .status.connected { background: #4CAF50; color: white; }
    .status.disconnected { background: #9E9E9E; color: white; }
    .status.connecting { background: #2196F3; color: white; }
    .status.error { background: #f44336; color: white; }
    .btn {
      background: var(--button-bg);
      color: var(--button-fg);
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    .btn:hover { background: var(--button-hover); }
    .btn-secondary {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--fg);
    }
    .btn-danger { background: #f44336; }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .stat-card {
      background: var(--input-bg);
      border-radius: 6px;
      padding: 12px;
      text-align: center;
    }
    .stat-value { font-size: 24px; font-weight: 600; }
    .stat-label { font-size: 11px; color: var(--vscode-descriptionForeground); }
    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
    }
    .empty { text-align: center; padding: 24px; color: var(--vscode-descriptionForeground); }
  </style>
</head>
<body>
  <h2>🔌 Remote Connections</h2>

  <div class="section">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h3 style="margin: 0;">SSH Configurations</h3>
      <button class="btn" onclick="addConfig()">+ Add</button>
    </div>
    <div id="configs"></div>
  </div>

  <div class="section">
    <h3>Active Sessions</h3>
    <div id="sessions"></div>
  </div>

  <div class="section">
    <h3>Statistics</h3>
    <div id="stats" class="stats"></div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function addConfig() {
      vscode.postMessage({ command: 'addConfig' });
    }

    function editConfig(id) {
      vscode.postMessage({ command: 'editConfig', data: id });
    }

    function deleteConfig(id) {
      vscode.postMessage({ command: 'deleteConfig', data: id });
    }

    function connect(configId) {
      vscode.postMessage({ command: 'connect', data: configId });
    }

    function disconnect(sessionId) {
      vscode.postMessage({ command: 'disconnect', data: sessionId });
    }

    function refresh() {
      vscode.postMessage({ command: 'refresh' });
    }

    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'update') {
        render(message.data);
      }
    });

    function render(data) {
      const { configs, sessions, stats } = data;

      // Render configs
      const configsEl = document.getElementById('configs');
      if (configs.length === 0) {
        configsEl.innerHTML = '<div class="empty">No SSH configurations. Click "Add" to create one.</div>';
      } else {
        configsEl.innerHTML = configs.map(c => \`
          <div class="card">
            <div class="card-header">
              <span class="card-title">\${c.name}</span>
              <div class="card-actions">
                <button class="btn btn-secondary" onclick="editConfig('\${c.id}')">Edit</button>
                <button class="btn btn-secondary" onclick="deleteConfig('\${c.id}')">Delete</button>
                <button class="btn" onclick="connect('\${c.id}')">Connect</button>
              </div>
            </div>
            <div class="info-row">
              <span>\${c.user}@\${c.host}:\${c.port}</span>
            </div>
          </div>
        \`).join('');
      }

      // Render sessions
      const sessionsEl = document.getElementById('sessions');
      if (sessions.length === 0) {
        sessionsEl.innerHTML = '<div class="empty">No active sessions.</div>';
      } else {
        sessionsEl.innerHTML = sessions.map(s => \`
          <div class="card">
            <div class="card-header">
              <span class="card-title">\${s.name}</span>
              <span class="status \${s.status}">\${s.status}</span>
            </div>
            <div class="info-row">
              <span>Working Dir: \${s.workingDirectory}</span>
              \${s.latency ? \`<span>Latency: \${s.latency}ms</span>\` : ''}
            </div>
            \${s.status === 'connected' ? \`
              <div class="card-actions" style="margin-top: 8px;">
                <button class="btn btn-secondary" onclick="disconnect('\${s.id}')">Disconnect</button>
              </div>
            \` : ''}
          </div>
        \`).join('');
      }

      // Render stats
      const statsEl = document.getElementById('stats');
      statsEl.innerHTML = \`
        <div class="stat-card">
          <div class="stat-value">\${stats.totalConfigured}</div>
          <div class="stat-label">Configured</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${stats.totalConnected}</div>
          <div class="stat-label">Connected</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${stats.totalSessions}</div>
          <div class="stat-label">Sessions</div>
        </div>
      \`;
    }

    // Initial refresh
    refresh();
  </script>
</body>
</html>`
  }

  dispose(): void {
    this.panel?.dispose()
  }
}
