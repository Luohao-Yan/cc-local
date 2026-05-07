/**
 * Plugin Panel Provider for CCLocal VS Code Extension
 * Visual plugin management panel with marketplace browsing
 */

import * as vscode from 'vscode'
import { PluginManager } from './PluginManager'
import type { InstalledPlugin, MarketplacePlugin, PluginState, PluginTrustLevel, PluginStats } from './types'

export class PluginPanelProvider implements vscode.Disposable {
  private panel: vscode.WebviewPanel | null = null
  private pluginManager: PluginManager

  constructor(pluginManager: PluginManager) {
    this.pluginManager = pluginManager

    // Listen for plugin events
    this.pluginManager.onDidPluginEvent(() => {
      this.sendState()
    })
  }

  show(): void {
    if (this.panel) {
      this.panel.reveal()
      return
    }

    this.panel = vscode.window.createWebviewPanel(
      'cclocal.plugins',
      'CCLocal Plugins',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    )

    this.panel.webview.html = this.getWebviewContent()
    this.setupMessageHandler()
  }

  private setupMessageHandler(): void {
    if (!this.panel) return

    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'getState':
          this.sendState()
          break

        case 'installPlugin':
          try {
            await this.pluginManager.install(message.pluginId, message.marketplaceUrl)
            vscode.window.showInformationMessage(`Plugin "${message.pluginId}" installed successfully`)
          } catch (error) {
            vscode.window.showErrorMessage(`Failed to install plugin: ${error}`)
          }
          this.sendState()
          break

        case 'uninstallPlugin':
          await this.pluginManager.uninstall(message.pluginId)
          vscode.window.showInformationMessage(`Plugin "${message.pluginId}" uninstalled`)
          this.sendState()
          break

        case 'activatePlugin':
          const activated = await this.pluginManager.activate(message.pluginId)
          if (!activated) {
            vscode.window.showWarningMessage(`Failed to activate plugin "${message.pluginId}"`)
          }
          this.sendState()
          break

        case 'deactivatePlugin':
          await this.pluginManager.deactivate(message.pluginId)
          this.sendState()
          break

        case 'enablePlugin':
          await this.pluginManager.enable(message.pluginId)
          this.sendState()
          break

        case 'disablePlugin':
          await this.pluginManager.disable(message.pluginId)
          this.sendState()
          break

        case 'addMarketplace':
          try {
            await this.pluginManager.addMarketplace(message.url)
            vscode.window.showInformationMessage(`Marketplace "${message.url}" added`)
          } catch (error) {
            vscode.window.showErrorMessage(`Failed to add marketplace: ${error}`)
          }
          this.sendState()
          break

        case 'removeMarketplace':
          await this.pluginManager.removeMarketplace(message.url)
          this.sendState()
          break

        case 'refreshMarketplace':
          await this.pluginManager.refreshMarketplace(message.url)
          this.sendState()
          break

        case 'openSettings':
          await vscode.commands.executeCommand('workbench.action.openSettings', 'cclocal')
          break
      }
    })
  }

  private sendState(): void {
    const plugins = this.pluginManager.getAllPlugins()
    const stats = this.pluginManager.getStats()
    const marketplaces = this.pluginManager.getMarketplaces()

    this.panel?.webview.postMessage({
      type: 'state',
      plugins,
      stats,
      marketplaces,
    })
  }

  private getWebviewContent(): string {
    return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CCLocal Plugins</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
    }
    .container { max-width: 900px; margin: 0 auto; padding: 20px; }
    h1 {
      font-size: 24px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--vscode-widget-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-actions { display: flex; gap: 8px; }
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
    .stat-value { font-size: 24px; font-weight: 600; color: var(--vscode-textLink-foreground); }
    .stat-label { font-size: 12px; color: var(--vscode-descriptionForeground); margin-top: 4px; }
    .tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--vscode-widget-border);
    }
    .tab {
      padding: 8px 16px;
      background: transparent;
      border: none;
      color: var(--vscode-descriptionForeground);
      cursor: pointer;
      font-family: inherit;
      font-size: 13px;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
    }
    .tab:hover { color: var(--vscode-foreground); }
    .tab.active { color: var(--vscode-foreground); border-bottom-color: var(--vscode-focusBorder); }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
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
    .section-title { font-size: 14px; font-weight: 600; }
    .plugin-list { display: flex; flex-direction: column; gap: 8px; }
    .plugin-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: var(--vscode-list-hoverBackground);
      border-radius: 4px;
      border-left: 3px solid transparent;
    }
    .plugin-item.active { border-left-color: var(--vscode-testing-iconPassed, #4CAF50); }
    .plugin-item.disabled { border-left-color: #9E9E9E; }
    .plugin-item.error { border-left-color: var(--vscode-testing-iconFailed, #f44336); }
    .plugin-info { flex: 1; }
    .plugin-name { font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .plugin-desc { font-size: 12px; color: var(--vscode-descriptionForeground); margin-top: 4px; }
    .plugin-meta { font-size: 11px; color: var(--vscode-textPreformat-foreground); margin-top: 4px; }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 500;
    }
    .badge.official { background: var(--vscode-textLink-foreground); color: white; }
    .badge.verified { background: #4CAF50; color: white; }
    .badge.community { background: #FF9800; color: white; }
    .badge.untrusted { background: #9E9E9E; color: white; }
    .badge.state-active { background: #4CAF50; color: white; }
    .badge.state-installed { background: #2196F3; color: white; }
    .badge.state-disabled { background: #9E9E9E; color: white; }
    .badge.state-error { background: #f44336; color: white; }
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
    .btn:hover { background: var(--vscode-button-hoverBackground); }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .btn-small { padding: 4px 8px; font-size: 11px; }
    .btn-danger { background: var(--vscode-inputValidation-errorBackground, #f44336); }
    .plugin-actions { display: flex; gap: 6px; }
    .marketplace-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: var(--vscode-list-hoverBackground);
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .inline-form {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    .inline-form input { flex: 1; }
    .empty {
      text-align: center;
      color: var(--vscode-descriptionForeground);
      padding: 20px;
    }
    input, textarea {
      width: 100%;
      padding: 6px 8px;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
      font-family: inherit;
      font-size: inherit;
    }
    input:focus, textarea:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>
      <span>🧩 CCLocal Plugins</span>
      <div class="header-actions">
        <button class="btn btn-secondary btn-small" id="refreshBtn">Refresh</button>
        <button class="btn btn-secondary btn-small" id="settingsBtn">Settings</button>
      </div>
    </h1>

    <div class="stats" id="stats"></div>

    <div class="tabs">
      <button class="tab active" data-tab="installed">Installed</button>
      <button class="tab" data-tab="marketplace">Marketplace</button>
      <button class="tab" data-tab="sources">Sources</button>
    </div>

    <!-- Installed Tab -->
    <div id="tab-installed" class="tab-content active">
      <div class="section">
        <div class="section-header">
          <span class="section-title">Installed Plugins</span>
        </div>
        <div class="plugin-list" id="installedList">
          <div class="empty">Loading...</div>
        </div>
      </div>
    </div>

    <!-- Marketplace Tab -->
    <div id="tab-marketplace" class="tab-content">
      <div class="section">
        <div class="section-header">
          <span class="section-title">Available Plugins</span>
          <input type="text" id="searchInput" placeholder="Search plugins..." style="width: 200px;" />
        </div>
        <div class="plugin-list" id="marketplaceList">
          <div class="empty">Loading marketplace...</div>
        </div>
      </div>
    </div>

    <!-- Sources Tab -->
    <div id="tab-sources" class="tab-content">
      <div class="section">
        <div class="section-header">
          <span class="section-title">Marketplace Sources</span>
        </div>
        <div class="inline-form">
          <input type="text" id="marketplaceUrl" placeholder="https://marketplace.example.com" />
          <button class="btn btn-small" id="addMarketplaceBtn">Add</button>
        </div>
        <div id="marketplaceSourceList"></div>
      </div>

      <div class="section">
        <div class="section-header">
          <span class="section-title">Install from Local</span>
        </div>
        <p style="color: var(--vscode-descriptionForeground); font-size: 12px; margin-bottom: 8px;">
          Install a plugin from a local directory containing a plugin.json manifest.
        </p>
        <button class="btn btn-secondary" id="installLocalBtn">Browse & Install</button>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    vscode.postMessage({ type: 'getState' });

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      });
    });

    window.addEventListener('message', event => {
      if (event.data.type === 'state') {
        renderState(event.data);
      }
    });

    function renderState(data) {
      renderStats(data.stats);
      renderInstalled(data.plugins);
      renderMarketplace(data.marketplaces);
      renderSources(data.marketplaces);
    }

    function renderStats(stats) {
      document.getElementById('stats').innerHTML = \`
        <div class="stat-card">
          <div class="stat-value">\${stats.totalInstalled}</div>
          <div class="stat-label">Installed</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${stats.totalActive}</div>
          <div class="stat-label">Active</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${stats.marketplaces}</div>
          <div class="stat-label">Sources</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${stats.availablePlugins}</div>
          <div class="stat-label">Available</div>
        </div>
      \`;
    }

    function renderInstalled(plugins) {
      const container = document.getElementById('installedList');
      if (plugins.length === 0) {
        container.innerHTML = '<div class="empty">No plugins installed. Browse the marketplace to find plugins.</div>';
        return;
      }

      container.innerHTML = plugins.map(p => \`
        <div class="plugin-item \${p.state}">
          <div class="plugin-info">
            <div class="plugin-name">
              <strong>\${escapeHtml(p.manifest.name)}</strong>
              <span class="badge state-\${p.state}">\${p.state}</span>
              <span class="badge \${p.trustLevel}">\${p.trustLevel}</span>
            </div>
            <div class="plugin-desc">\${escapeHtml(p.manifest.description || '')}</div>
            <div class="plugin-meta">
              v\${p.manifest.version} • \${p.manifest.publisher}
              \${p.manifest.permissions?.length ? ' • Permissions: ' + p.manifest.permissions.join(', ') : ''}
            </div>
            \${p.lastError ? '<div style="color: var(--vscode-errorForeground); margin-top: 4px;">Error: ' + escapeHtml(p.lastError) + '</div>' : ''}
          </div>
          <div class="plugin-actions">
            \${renderInstalledActions(p)}
          </div>
        </div>
      \`).join('');
    }

    function renderInstalledActions(plugin) {
      const id = plugin.manifest.id;
      switch (plugin.state) {
        case 'active':
          return \`
            <button class="btn btn-small btn-secondary" onclick="pluginAction('deactivate', '\${id}')">Deactivate</button>
            <button class="btn btn-small btn-danger" onclick="pluginAction('uninstall', '\${id}')">Uninstall</button>
          \`;
        case 'installed':
          return \`
            <button class="btn btn-small" onclick="pluginAction('activate', '\${id}')">Activate</button>
            <button class="btn btn-small btn-danger" onclick="pluginAction('uninstall', '\${id}')">Uninstall</button>
          \`;
        case 'disabled':
          return \`
            <button class="btn btn-small" onclick="pluginAction('enable', '\${id}')">Enable</button>
            <button class="btn btn-small btn-danger" onclick="pluginAction('uninstall', '\${id}')">Uninstall</button>
          \`;
        case 'error':
          return \`
            <button class="btn btn-small" onclick="pluginAction('activate', '\${id}')">Retry</button>
            <button class="btn btn-small btn-danger" onclick="pluginAction('uninstall', '\${id}')">Uninstall</button>
          \`;
        default:
          return '';
      }
    }

    function renderMarketplace(marketplaces) {
      const container = document.getElementById('marketplaceList');
      const search = document.getElementById('searchInput')?.value?.toLowerCase() || '';

      let allPlugins = [];
      const seenIds = new Set();
      for (const mp of marketplaces) {
        for (const p of mp.plugins || []) {
          if (!seenIds.has(p.manifest.id)) {
            seenIds.add(p.manifest.id);
            allPlugins.push(p);
          }
        }
      }

      if (search) {
        allPlugins = allPlugins.filter(p =>
          p.manifest.name.toLowerCase().includes(search) ||
          p.manifest.description?.toLowerCase().includes(search) ||
          p.manifest.publisher.toLowerCase().includes(search) ||
          p.manifest.keywords?.some(k => k.toLowerCase().includes(search))
        );
      }

      if (allPlugins.length === 0) {
        container.innerHTML = '<div class="empty">No plugins available. Add marketplace sources to discover plugins.</div>';
        return;
      }

      container.innerHTML = allPlugins.map(p => \`
        <div class="plugin-item">
          <div class="plugin-info">
            <div class="plugin-name">
              <strong>\${escapeHtml(p.manifest.name)}</strong>
              <span class="badge \${p.trustLevel}">\${p.trustLevel}</span>
              <span style="font-size: 11px; color: var(--vscode-descriptionForeground);">
                \${p.downloads} downloads • ★ \${p.rating.toFixed(1)}
              </span>
            </div>
            <div class="plugin-desc">\${escapeHtml(p.manifest.description || '')}</div>
            <div class="plugin-meta">
              v\${p.manifest.version} • \${p.manifest.publisher}
              \${p.manifest.mcpServers ? ' • Provides MCP servers' : ''}
            </div>
          </div>
          <div class="plugin-actions">
            <button class="btn btn-small" onclick="installPlugin('\${p.manifest.id}', '\${p.marketplaceUrl}')">Install</button>
          </div>
        </div>
      \`).join('');
    }

    function renderSources(marketplaces) {
      const container = document.getElementById('marketplaceSourceList');
      container.innerHTML = marketplaces.map(mp => \`
        <div class="marketplace-item">
          <div>
            <strong>\${escapeHtml(mp.name)}</strong>
            <span class="badge \${mp.trustLevel}" style="margin-left: 8px;">\${mp.trustLevel}</span>
            \${mp.isKnown ? '<span class="badge" style="background: #2196F3; color: white; margin-left: 4px;">known</span>' : ''}
            <div style="font-size: 12px; color: var(--vscode-descriptionForeground);">
              \${escapeHtml(mp.url)}
              \${mp.lastRefreshed ? ' • Last refreshed: ' + new Date(mp.lastRefreshed).toLocaleString() : ''}
            </div>
          </div>
          <div class="plugin-actions">
            <button class="btn btn-small btn-secondary" onclick="refreshMp('\${mp.url}')">Refresh</button>
            \${!mp.isKnown ? \`<button class="btn btn-small btn-danger" onclick="removeMp('\${mp.url}')">Remove</button>\` : ''}
          </div>
        </div>
      \`).join('');
    }

    function escapeHtml(str) {
      return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function pluginAction(action, pluginId) {
      vscode.postMessage({ type: action + 'Plugin', pluginId });
    }

    function installPlugin(pluginId, marketplaceUrl) {
      vscode.postMessage({ type: 'installPlugin', pluginId, marketplaceUrl });
    }

    function refreshMp(url) {
      vscode.postMessage({ type: 'refreshMarketplace', url });
    }

    function removeMp(url) {
      vscode.postMessage({ type: 'removeMarketplace', url });
    }

    // Button handlers
    document.getElementById('refreshBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'getState' });
    });

    document.getElementById('settingsBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'openSettings' });
    });

    document.getElementById('addMarketplaceBtn').addEventListener('click', () => {
      const url = document.getElementById('marketplaceUrl').value;
      if (url) {
        vscode.postMessage({ type: 'addMarketplace', url });
        document.getElementById('marketplaceUrl').value = '';
      }
    });

    document.getElementById('installLocalBtn').addEventListener('click', () => {
      // Prompt for local path via extension
      vscode.postMessage({ type: 'installLocal' });
    });

    document.getElementById('searchInput')?.addEventListener('input', () => {
      // Re-render marketplace with current search
      const state = window.__lastState;
      if (state) renderMarketplace(state.marketplaces);
    });

    // Cache last state for search re-render
    window.addEventListener('message', event => {
      if (event.data.type === 'state') {
        window.__lastState = event.data;
      }
    });
  </script>
</body>
</html>
`
  }

  dispose(): void {
    this.panel?.dispose()
    this.panel = null
  }
}
