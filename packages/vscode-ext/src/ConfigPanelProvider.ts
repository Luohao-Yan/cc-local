/**
 * Configuration Panel Provider
 * Visual settings management via webview
 */

import * as vscode from 'vscode'
import { ConfigurationManager, type CCLocalConfig, type EnvironmentVariable, type PermissionRule } from './ConfigurationManager'
import type { PermissionMode } from '@cclocal/shared'

export class ConfigPanelProvider implements vscode.Disposable {
  private panel: vscode.WebviewPanel | null = null
  private configManager: ConfigurationManager

  constructor(configManager: ConfigurationManager) {
    this.configManager = configManager
  }

  /**
   * Show configuration panel
   */
  show(): void {
    if (this.panel) {
      this.panel.reveal()
      return
    }

    this.panel = vscode.window.createWebviewPanel(
      'cclocal.config',
      'CCLocal Settings',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    )

    this.panel.webview.html = this.getWebviewContent()
    this.setupMessageHandler()
  }

  /**
   * Setup message handler for webview communication
   */
  private setupMessageHandler(): void {
    if (!this.panel) return

    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'getConfig':
          const config = this.configManager.getConfig()
          this.panel?.webview.postMessage({
            type: 'config',
            config,
          })
          break

        case 'updateConfig':
          await this.updateConfig(message.key, message.value)
          break

        case 'resetConfig':
          await this.resetConfig(message.key)
          break

        case 'addEnvironmentVariable':
          await this.configManager.addEnvironmentVariable(message.name, message.value)
          this.sendConfig()
          break

        case 'removeEnvironmentVariable':
          await this.configManager.removeEnvironmentVariable(message.name)
          this.sendConfig()
          break

        case 'addPermissionRule':
          await this.configManager.addPermissionRule(message.rule)
          this.sendConfig()
          break

        case 'addAllowedMcpServer':
          await this.configManager.addAllowedMcpServer(message.server)
          this.sendConfig()
          break

        case 'addDeniedMcpServer':
          await this.configManager.addDeniedMcpServer(message.server)
          this.sendConfig()
          break

        case 'openSettings':
          await vscode.commands.executeCommand('workbench.action.openSettings', 'cclocal')
          break

        case 'editModelsJson':
          await vscode.commands.executeCommand('cclocal.configureCustomProvider')
          break

        case 'addHook':
          await this.addHook(message.hookType, message.definition)
          this.sendConfig()
          break

        case 'removeHook':
          await this.removeHook(message.hookType, message.defIndex, message.handlerIndex)
          this.sendConfig()
          break

        case 'getHookStats':
          const stats = await vscode.commands.executeCommand('cclocal.hooks.stats')
          this.panel?.webview.postMessage({
            type: 'hookStats',
            stats,
          })
          break
      }
    })
  }

  /**
   * Update configuration value
   */
  private async updateConfig(key: string, value: unknown): Promise<void> {
    await this.configManager.update(key, value)
    this.sendConfig()
  }

  /**
   * Reset configuration to default
   */
  private async resetConfig(key: string): Promise<void> {
    await this.configManager.update(key, undefined)
    this.sendConfig()
  }

  /**
   * Send current config to webview
   */
  private sendConfig(): void {
    const config = this.configManager.getConfig()
    this.panel?.webview.postMessage({
      type: 'config',
      config,
    })
  }

  /**
   * Add a hook definition
   */
  private async addHook(hookType: string, definition: unknown): Promise<void> {
    const hooks = this.configManager.get('hooks') || {}
    const typeHooks = hooks[hookType] || []
    typeHooks.push(definition)
    hooks[hookType] = typeHooks
    await this.configManager.update('hooks', hooks)
  }

  /**
   * Remove a hook
   */
  private async removeHook(hookType: string, defIndex: number, handlerIndex: number): Promise<void> {
    const hooks = this.configManager.get('hooks') || {}
    const typeHooks = hooks[hookType]
    if (typeHooks && typeHooks[defIndex]) {
      const def = typeHooks[defIndex]
      if (def.hooks && def.hooks.length > handlerIndex) {
        def.hooks.splice(handlerIndex, 1)
        if (def.hooks.length === 0) {
          typeHooks.splice(defIndex, 1)
        }
      }
      if (typeHooks.length === 0) {
        delete hooks[hookType]
      }
      await this.configManager.update('hooks', hooks)
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
  <title>CCLocal Settings</title>
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
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--vscode-widget-border);
    }
    h2 {
      font-size: 16px;
      margin: 20px 0 10px;
      color: var(--vscode-descriptionForeground);
    }
    .section {
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .setting {
      margin-bottom: 16px;
    }
    .setting:last-child {
      margin-bottom: 0;
    }
    .setting-label {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .setting-description {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
    }
    .setting-input {
      width: 100%;
      padding: 6px 8px;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
      font-family: inherit;
      font-size: inherit;
    }
    .setting-input:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }
    .setting-select {
      width: 100%;
      padding: 6px 8px;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
    }
    .setting-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .setting-checkbox input {
      width: 16px;
      height: 16px;
    }
    .btn {
      padding: 6px 12px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      font-size: 13px;
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
      font-size: 12px;
    }
    .env-list, .permission-list, .mcp-list {
      margin-top: 8px;
    }
    .env-item, .permission-item, .mcp-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px;
      background: var(--vscode-list-hoverBackground);
      border-radius: 4px;
      margin-bottom: 4px;
    }
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
    .tab:hover {
      color: var(--vscode-foreground);
    }
    .tab.active {
      color: var(--vscode-foreground);
      border-bottom-color: var(--vscode-focusBorder);
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }
    .inline-form {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }
    .inline-form input {
      flex: 1;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 10px;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>⚙️ CCLocal Settings</h1>

    <div class="tabs">
      <button class="tab active" data-tab="general">General</button>
      <button class="tab" data-tab="auth">Authentication</button>
      <button class="tab" data-tab="model">Model</button>
      <button class="tab" data-tab="permissions">Permissions</button>
      <button class="tab" data-tab="mcp">MCP</button>
      <button class="tab" data-tab="hooks">Hooks</button>
      <button class="tab" data-tab="plugins">Plugins</button>
      <button class="tab" data-tab="remote">Remote</button>
    </div>

    <!-- General Tab -->
    <div id="tab-general" class="tab-content active">
      <div class="section">
        <h2>UI Settings</h2>
        <div class="setting">
          <label class="setting-label">Preferred Location</label>
          <p class="setting-description">Where to display CCLocal</p>
          <select id="preferredLocation" class="setting-select">
            <option value="sidebar">Sidebar</option>
            <option value="panel">Panel (New Tab)</option>
          </select>
        </div>
        <div class="setting">
          <div class="setting-checkbox">
            <input type="checkbox" id="useTerminal" />
            <label for="useTerminal">Use integrated terminal for bash commands</label>
          </div>
        </div>
        <div class="setting">
          <div class="setting-checkbox">
            <input type="checkbox" id="useCtrlEnterToSend" />
            <label for="useCtrlEnterToSend">Use Ctrl+Enter to send message</label>
          </div>
        </div>
        <div class="setting">
          <div class="setting-checkbox">
            <input type="checkbox" id="hideOnboarding" />
            <label for="hideOnboarding">Hide onboarding message</label>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>File Settings</h2>
        <div class="setting">
          <div class="setting-checkbox">
            <input type="checkbox" id="respectGitIgnore" />
            <label for="respectGitIgnore">Respect .gitignore</label>
          </div>
        </div>
        <div class="setting">
          <div class="setting-checkbox">
            <input type="checkbox" id="autosave" />
            <label for="autosave">Autosave files before editing</label>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Environment Variables</h2>
        <p class="setting-description">Custom environment variables for cclocal process</p>
        <div class="inline-form">
          <input type="text" id="envName" placeholder="NAME" />
          <input type="text" id="envValue" placeholder="value" />
          <button class="btn btn-small" id="addEnvBtn">Add</button>
        </div>
        <div id="envList" class="env-list"></div>
      </div>
    </div>

    <!-- Auth Tab -->
    <div id="tab-auth" class="tab-content">
      <div class="section">
        <h2>Login Method</h2>
        <div class="setting">
          <label class="setting-label">Force Login Method</label>
          <select id="forceLoginMethod" class="setting-select">
            <option value="">Auto-detect</option>
            <option value="claudeai">Claude.ai OAuth</option>
            <option value="console">API Key (Console)</option>
            <option value="bedrock">AWS Bedrock</option>
            <option value="vertex">GCP Vertex AI</option>
            <option value="custom">Third-party API</option>
          </select>
        </div>
        <div class="setting">
          <div class="setting-checkbox">
            <input type="checkbox" id="disableLoginPrompt" />
            <label for="disableLoginPrompt">Disable login prompt</label>
          </div>
        </div>
        <div class="setting">
          <label class="setting-label">OAuth Organization UUID</label>
          <input type="text" id="forceLoginOrgUUID" class="setting-input" placeholder="Optional" />
        </div>
      </div>

      <div class="section">
        <h2>Provider Settings</h2>
        <div class="setting">
          <label class="setting-label">AWS Bedrock Region</label>
          <input type="text" id="bedrockRegion" class="setting-input" value="us-east-1" />
        </div>
        <div class="setting">
          <label class="setting-label">GCP Vertex AI Project ID</label>
          <input type="text" id="vertexProjectId" class="setting-input" placeholder="my-project-id" />
        </div>
        <div class="setting">
          <button class="btn" id="configureCustomProvider">Configure Custom Provider</button>
        </div>
      </div>
    </div>

    <!-- Model Tab -->
    <div id="tab-model" class="tab-content">
      <div class="section">
        <h2>Model Settings</h2>
        <div class="setting">
          <label class="setting-label">Default Model</label>
          <input type="text" id="model" class="setting-input" placeholder="Leave empty for default" />
        </div>
        <div class="setting">
          <div class="setting-checkbox">
            <input type="checkbox" id="alwaysThinkingEnabled" />
            <label for="alwaysThinkingEnabled">Always enable thinking</label>
          </div>
        </div>
        <div class="setting">
          <div class="setting-checkbox">
            <input type="checkbox" id="fastMode" />
            <label for="fastMode">Fast mode</label>
          </div>
        </div>
        <div class="setting">
          <label class="setting-label">Max Thinking Tokens</label>
          <input type="number" id="maxThinkingTokens" class="setting-input" value="16000" />
        </div>
      </div>
    </div>

    <!-- Permissions Tab -->
    <div id="tab-permissions" class="tab-content">
      <div class="section">
        <h2>Permission Mode</h2>
        <div class="setting">
          <label class="setting-label">Initial Permission Mode</label>
          <select id="initialPermissionMode" class="setting-select">
            <option value="default">Default (ask for dangerous)</option>
            <option value="acceptEdits">Accept Edits (auto-accept file edits)</option>
            <option value="plan">Plan (no execution)</option>
            <option value="bypassPermissions">Bypass (auto-accept all)</option>
          </select>
        </div>
        <div class="setting">
          <div class="setting-checkbox">
            <input type="checkbox" id="allowDangerouslySkipPermissions" />
            <label for="allowDangerouslySkipPermissions">Allow dangerously skip permissions</label>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Custom Permission Rules</h2>
        <p class="setting-description">Define custom permission rules for specific tools</p>
        <div class="inline-form">
          <input type="text" id="ruleTool" placeholder="Tool name" style="width: 150px" />
          <select id="ruleBehavior" style="width: 100px">
            <option value="allow">Allow</option>
            <option value="deny">Deny</option>
            <option value="ask">Ask</option>
          </select>
          <button class="btn btn-small" id="addRuleBtn">Add</button>
        </div>
        <div id="permissionList" class="permission-list"></div>
      </div>
    </div>

    <!-- MCP Tab -->
    <div id="tab-mcp" class="tab-content">
      <div class="section">
        <h2>MCP Server Settings</h2>
        <div class="setting">
          <div class="setting-checkbox">
            <input type="checkbox" id="enableAllProjectMcpServers" />
            <label for="enableAllProjectMcpServers">Enable all project MCP servers</label>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Allowed MCP Servers</h2>
        <div class="inline-form">
          <input type="text" id="allowedMcpServer" placeholder="Server name" />
          <button class="btn btn-small" id="addAllowedMcpBtn">Add</button>
        </div>
        <div id="allowedMcpList" class="mcp-list"></div>
      </div>

      <div class="section">
        <h2>Denied MCP Servers</h2>
        <div class="inline-form">
          <input type="text" id="deniedMcpServer" placeholder="Server name" />
          <button class="btn btn-small" id="addDeniedMcpBtn">Add</button>
        </div>
        <div id="deniedMcpList" class="mcp-list"></div>
      </div>
    </div>

    <!-- Hooks Tab -->
    <div id="tab-hooks" class="tab-content">
      <div class="section">
        <h2>Hook Settings</h2>
        <div class="setting">
          <div class="setting-checkbox">
            <input type="checkbox" id="disableAllHooks" />
            <label for="disableAllHooks">Disable all hooks</label>
          </div>
        </div>
        <div class="setting">
          <label class="setting-label">Allowed HTTP Hook URLs</label>
          <p class="setting-description">Whitelist of URLs that HTTP hooks can call</p>
          <textarea id="allowedHttpHookUrls" class="setting-input" rows="2" placeholder="One URL per line"></textarea>
        </div>
        <div class="setting">
          <label class="setting-label">Allowed Commands</label>
          <p class="setting-description">Whitelist of commands that command hooks can execute</p>
          <textarea id="allowedCommands" class="setting-input" rows="2" placeholder="One command pattern per line"></textarea>
        </div>
        <div class="setting">
          <label class="setting-label">Allowed Environment Variables</label>
          <p class="setting-description">Environment variables that can be passed to hooks</p>
          <textarea id="allowedEnvVars" class="setting-input" rows="2" placeholder="One variable name per line"></textarea>
        </div>
      </div>

      <div class="section">
        <h2>Hook Configuration</h2>
        <p class="setting-description">Configure hooks by type. Hooks are executed in order.</p>

        <div class="setting">
          <label class="setting-label">Hook Type</label>
          <select id="hookType" class="setting-select">
            <option value="">Select a hook type...</option>
            <option value="PreToolUse">PreToolUse - Before tool execution</option>
            <option value="PostToolUse">PostToolUse - After tool execution</option>
            <option value="SessionStart">SessionStart - When session starts</option>
            <option value="SessionEnd">SessionEnd - When session ends</option>
            <option value="FileWrite">FileWrite - When file is written</option>
            <option value="FileEdit">FileEdit - When file is edited</option>
            <option value="FileRead">FileRead - When file is read</option>
            <option value="BashExecution">BashExecution - Before bash command</option>
            <option value="Error">Error - When error occurs</option>
            <option value="ModelChange">ModelChange - When model changes</option>
            <option value="MCPServerStart">MCPServerStart - When MCP server starts</option>
            <option value="MCPServerStop">MCPServerStop - When MCP server stops</option>
          </select>
        </div>

        <div id="hookEditor" style="display: none; margin-top: 16px;">
          <div class="setting">
            <label class="setting-label">Matcher Pattern (Regex)</label>
            <input type="text" id="hookMatcher" class="setting-input" placeholder="e.g., Bash|Edit or .* for all" />
          </div>
          <div class="setting">
            <label class="setting-label">Handler Type</label>
            <select id="hookHandlerType" class="setting-select">
              <option value="command">Command - Execute shell command</option>
              <option value="http">HTTP - Send HTTP request</option>
              <option value="function">Function - Call registered function</option>
            </select>
          </div>
          <div class="setting" id="hookCommandInput">
            <label class="setting-label">Command</label>
            <input type="text" id="hookCommand" class="setting-input" placeholder="e.g., echo 'Hook triggered'" />
          </div>
          <div class="setting" id="hookHttpInput" style="display: none;">
            <label class="setting-label">URL</label>
            <input type="text" id="hookUrl" class="setting-input" placeholder="https://api.example.com/hook" />
          </div>
          <div class="setting" id="hookFunctionInput" style="display: none;">
            <label class="setting-label">Function Name</label>
            <input type="text" id="hookFunction" class="setting-input" placeholder="myCustomHook" />
          </div>
          <div class="setting">
            <label class="setting-label">Timeout (ms)</label>
            <input type="number" id="hookTimeout" class="setting-input" value="30000" />
          </div>
          <div class="setting">
            <label class="setting-label">Description</label>
            <input type="text" id="hookDescription" class="setting-input" placeholder="What this hook does" />
          </div>
          <div style="margin-top: 8px;">
            <button class="btn btn-small" id="addHookBtn">Add Hook</button>
          </div>
        </div>

        <div id="hooksList" style="margin-top: 16px;"></div>
      </div>

      <div class="section">
        <h2>Hook Statistics</h2>
        <button class="btn btn-secondary" id="showHookStatsBtn">Show Hook Statistics</button>
        <div id="hookStats" style="margin-top: 12px; display: none;"></div>
      </div>

      <div class="section">
        <p class="setting-description">For advanced hook configuration, edit settings.json directly.</p>
        <button class="btn btn-secondary" id="openSettingsBtn">Open settings.json</button>
      </div>
    </div>

    <!-- Plugins Tab -->
    <div id="tab-plugins" class="tab-content">
      <div class="section">
        <h2>Plugin Settings</h2>
        <p class="setting-description">Plugins extend CCLocal functionality.</p>
        <div class="setting">
          <label class="setting-label">Enabled Plugins</label>
          <p class="setting-description">Format: { "plugin-id": "version" }</p>
          <textarea id="enabledPlugins" class="setting-input" rows="4" placeholder='{"formatter@anthropics": "1.0.0"}'></textarea>
        </div>
      </div>

      <div class="section">
        <h2>Marketplaces</h2>
        <div class="setting">
          <label class="setting-label">Extra Known Marketplaces</label>
          <textarea id="extraKnownMarketplaces" class="setting-input" rows="2" placeholder="One URL per line"></textarea>
        </div>
        <div class="setting">
          <label class="setting-label">Blocked Marketplaces</label>
          <textarea id="blockedMarketplaces" class="setting-input" rows="2" placeholder="One URL per line"></textarea>
        </div>
      </div>
    </div>

    <!-- Remote Tab -->
    <div id="tab-remote" class="tab-content">
      <div class="section">
        <h2>Remote Settings</h2>
        <p class="setting-description">Configure SSH connections for remote sessions.</p>
        <div class="setting">
          <label class="setting-label">SSH Configurations</label>
          <textarea id="sshConfigs" class="setting-input" rows="4" placeholder='[{"name": "server1", "host": "example.com", "user": "user"}]'></textarea>
        </div>
      </div>
    </div>

    <div style="margin-top: 20px; text-align: right;">
      <button class="btn btn-secondary" id="resetAllBtn">Reset All to Defaults</button>
      <button class="btn" id="saveBtn">Save Settings</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    // Get config on load
    vscode.postMessage({ type: 'getConfig' });

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      });
    });

    // Listen for config from extension
    window.addEventListener('message', event => {
      if (event.data.type === 'config') {
        const config = event.data.config;
        populateConfig(config);
      }
    });

    // Populate config values
    function populateConfig(config) {
      // General
      document.getElementById('preferredLocation').value = config.preferredLocation || 'sidebar';
      document.getElementById('useTerminal').checked = config.useTerminal ?? true;
      document.getElementById('useCtrlEnterToSend').checked = config.useCtrlEnterToSend ?? false;
      document.getElementById('hideOnboarding').checked = config.hideOnboarding ?? false;
      document.getElementById('respectGitIgnore').checked = config.respectGitIgnore ?? true;
      document.getElementById('autosave').checked = config.autosave ?? false;

      // Auth
      document.getElementById('forceLoginMethod').value = config.forceLoginMethod || '';
      document.getElementById('disableLoginPrompt').checked = config.disableLoginPrompt ?? false;
      document.getElementById('forceLoginOrgUUID').value = config.forceLoginOrgUUID || '';
      document.getElementById('bedrockRegion').value = config.bedrockRegion || 'us-east-1';
      document.getElementById('vertexProjectId').value = config.vertexProjectId || '';

      // Model
      document.getElementById('model').value = config.model || '';
      document.getElementById('alwaysThinkingEnabled').checked = config.alwaysThinkingEnabled ?? false;
      document.getElementById('fastMode').checked = config.fastMode ?? false;
      document.getElementById('maxThinkingTokens').value = config.maxThinkingTokens || 16000;

      // Permissions
      document.getElementById('initialPermissionMode').value = config.initialPermissionMode || 'default';
      document.getElementById('allowDangerouslySkipPermissions').checked = config.allowDangerouslySkipPermissions ?? false;

      // MCP
      document.getElementById('enableAllProjectMcpServers').checked = config.enableAllProjectMcpServers ?? false;

      // Hooks
      document.getElementById('disableAllHooks').checked = config.disableAllHooks ?? false;
      document.getElementById('allowedHttpHookUrls').value = (config.allowedHttpHookUrls || []).join('\\n');
      document.getElementById('allowedCommands').value = (config.allowedCommands || []).join('\\n');
      document.getElementById('allowedEnvVars').value = (config.allowedEnvVars || []).join('\\n');
      renderHooksList(config.hooks || {});

      // Plugins
      document.getElementById('enabledPlugins').value = JSON.stringify(config.enabledPlugins || {}, null, 2);
      document.getElementById('extraKnownMarketplaces').value = (config.extraKnownMarketplaces || []).join('\\n');
      document.getElementById('blockedMarketplaces').value = (config.blockedMarketplaces || []).join('\\n');

      // Remote
      document.getElementById('sshConfigs').value = JSON.stringify(config.sshConfigs || [], null, 2);

      // Lists
      renderEnvList(config.environmentVariables || []);
      renderPermissionList(config.permissionRules || []);
      renderMcpList('allowedMcpList', config.allowedMcpServers || [], 'removeAllowed');
      renderMcpList('deniedMcpList', config.deniedMcpServers || [], 'removeDenied');
    }

    function renderEnvList(envVars) {
      const container = document.getElementById('envList');
      container.innerHTML = envVars.map((env, i) => \`
        <div class="env-item">
          <span><strong>\${env.name}</strong>: \${env.value}</span>
          <button class="btn btn-small btn-secondary" data-index="\${i}" class="remove-env">Remove</button>
        </div>
      \`).join('');
    }

    function renderPermissionList(rules) {
      const container = document.getElementById('permissionList');
      container.innerHTML = rules.map((rule, i) => \`
        <div class="permission-item">
          <span><strong>\${rule.tool}</strong>: <span class="badge">\${rule.behavior}</span></span>
          <button class="btn btn-small btn-secondary" data-index="\${i}">Remove</button>
        </div>
      \`).join('');
    }

    function renderMcpList(containerId, servers, action) {
      const container = document.getElementById(containerId);
      container.innerHTML = servers.map((server, i) => \`
        <div class="mcp-item">
          <span>\${server}</span>
          <button class="btn btn-small btn-secondary" data-index="\${i}">Remove</button>
        </div>
      \`).join('');
    }

    function renderHooksList(hooks) {
      const container = document.getElementById('hooksList');
      if (!container) return;

      let html = '';
      const hookTypes = Object.keys(hooks);

      if (hookTypes.length === 0) {
        html = '<p class="setting-description">No hooks configured.</p>';
      } else {
        hookTypes.forEach(type => {
          const definitions = hooks[type] || [];
          if (definitions.length > 0) {
            html += \`<div style="margin-bottom: 12px;"><strong>\${type}</strong>\`;
            definitions.forEach((def, defIndex) => {
              def.hooks.forEach((handler, handlerIndex) => {
                const handlerInfo = getHandlerInfo(handler);
                html += \`
                  <div class="env-item" style="margin-top: 4px; margin-left: 12px;">
                    <span>
                      \${def.matcher ? '<span class="badge">' + def.matcher + '</span> ' : ''}
                      <strong>\${handler.type}</strong>: \${handlerInfo}
                      \${def.description ? '<small style="margin-left: 8px;">' + def.description + '</small>' : ''}
                    </span>
                    <button class="btn btn-small btn-secondary" onclick="removeHook('\${type}', \${defIndex}, \${handlerIndex})">Remove</button>
                  </div>
                \`;
              });
            });
            html += '</div>';
          }
        });
      }

      container.innerHTML = html;
    }

    function getHandlerInfo(handler) {
      switch (handler.type) {
        case 'command':
          return handler.command || 'undefined';
        case 'http':
          return handler.url || 'undefined';
        case 'function':
          return handler.handler || 'undefined';
        default:
          return 'unknown';
      }
    }

    // Hook type selector
    document.getElementById('hookType')?.addEventListener('change', (e) => {
      const editor = document.getElementById('hookEditor');
      if (e.target.value) {
        editor.style.display = 'block';
      } else {
        editor.style.display = 'none';
      }
    });

    // Hook handler type selector
    document.getElementById('hookHandlerType')?.addEventListener('change', (e) => {
      const type = e.target.value;
      document.getElementById('hookCommandInput').style.display = type === 'command' ? 'block' : 'none';
      document.getElementById('hookHttpInput').style.display = type === 'http' ? 'block' : 'none';
      document.getElementById('hookFunctionInput').style.display = type === 'function' ? 'block' : 'none';
    });

    // Add hook button
    document.getElementById('addHookBtn')?.addEventListener('click', () => {
      const type = document.getElementById('hookType').value;
      const matcher = document.getElementById('hookMatcher').value;
      const handlerType = document.getElementById('hookHandlerType').value;
      const timeout = parseInt(document.getElementById('hookTimeout').value) || 30000;
      const description = document.getElementById('hookDescription').value;

      let handler = { type: handlerType, timeout };

      if (handlerType === 'command') {
        handler.command = document.getElementById('hookCommand').value;
      } else if (handlerType === 'http') {
        handler.url = document.getElementById('hookUrl').value;
        handler.method = 'POST';
      } else if (handlerType === 'function') {
        handler.handler = document.getElementById('hookFunction').value;
      }

      vscode.postMessage({
        type: 'addHook',
        hookType: type,
        definition: {
          matcher: matcher || undefined,
          hooks: [handler],
          description: description || undefined,
          enabled: true
        }
      });

      // Clear inputs
      document.getElementById('hookMatcher').value = '';
      document.getElementById('hookCommand').value = '';
      document.getElementById('hookUrl').value = '';
      document.getElementById('hookFunction').value = '';
      document.getElementById('hookDescription').value = '';
    });

    // Show hook stats button
    document.getElementById('showHookStatsBtn')?.addEventListener('click', () => {
      vscode.postMessage({ type: 'getHookStats' });
    });

    // Event handlers
    document.getElementById('addEnvBtn').addEventListener('click', () => {
      const name = document.getElementById('envName').value;
      const value = document.getElementById('envValue').value;
      if (name && value) {
        vscode.postMessage({ type: 'addEnvironmentVariable', name, value });
        document.getElementById('envName').value = '';
        document.getElementById('envValue').value = '';
      }
    });

    document.getElementById('addRuleBtn').addEventListener('click', () => {
      const tool = document.getElementById('ruleTool').value;
      const behavior = document.getElementById('ruleBehavior').value;
      if (tool) {
        vscode.postMessage({ type: 'addPermissionRule', rule: { tool, behavior } });
        document.getElementById('ruleTool').value = '';
      }
    });

    document.getElementById('addAllowedMcpBtn').addEventListener('click', () => {
      const server = document.getElementById('allowedMcpServer').value;
      if (server) {
        vscode.postMessage({ type: 'addAllowedMcpServer', server });
        document.getElementById('allowedMcpServer').value = '';
      }
    });

    document.getElementById('addDeniedMcpBtn').addEventListener('click', () => {
      const server = document.getElementById('deniedMcpServer').value;
      if (server) {
        vscode.postMessage({ type: 'addDeniedMcpServer', server });
        document.getElementById('deniedMcpServer').value = '';
      }
    });

    document.getElementById('configureCustomProvider').addEventListener('click', () => {
      vscode.postMessage({ type: 'editModelsJson' });
    });

    document.getElementById('openSettingsBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'openSettings' });
    });

    document.getElementById('saveBtn').addEventListener('click', () => {
      // Collect all values and send to extension
      vscode.postMessage({
        type: 'saveAll',
        config: {
          preferredLocation: document.getElementById('preferredLocation').value,
          useTerminal: document.getElementById('useTerminal').checked,
          useCtrlEnterToSend: document.getElementById('useCtrlEnterToSend').checked,
          hideOnboarding: document.getElementById('hideOnboarding').checked,
          respectGitIgnore: document.getElementById('respectGitIgnore').checked,
          autosave: document.getElementById('autosave').checked,
          forceLoginMethod: document.getElementById('forceLoginMethod').value,
          disableLoginPrompt: document.getElementById('disableLoginPrompt').checked,
          forceLoginOrgUUID: document.getElementById('forceLoginOrgUUID').value,
          bedrockRegion: document.getElementById('bedrockRegion').value,
          vertexProjectId: document.getElementById('vertexProjectId').value,
          model: document.getElementById('model').value,
          alwaysThinkingEnabled: document.getElementById('alwaysThinkingEnabled').checked,
          fastMode: document.getElementById('fastMode').checked,
          maxThinkingTokens: parseInt(document.getElementById('maxThinkingTokens').value),
          initialPermissionMode: document.getElementById('initialPermissionMode').value,
          allowDangerouslySkipPermissions: document.getElementById('allowDangerouslySkipPermissions').checked,
          enableAllProjectMcpServers: document.getElementById('enableAllProjectMcpServers').checked,
          disableAllHooks: document.getElementById('disableAllHooks').checked,
          allowedHttpHookUrls: document.getElementById('allowedHttpHookUrls').value.split('\\n').filter(s => s.trim()),
          allowedCommands: document.getElementById('allowedCommands').value.split('\\n').filter(s => s.trim()),
          allowedEnvVars: document.getElementById('allowedEnvVars').value.split('\\n').filter(s => s.trim()),
        }
      });
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
