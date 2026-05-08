/**
 * ChromeMCPProvider — Built-in Chrome browser MCP integration.
 *
 * Matches official extension's _claude_in_chrome__ VFS scheme.
 * Provides browser automation via Chrome DevTools Protocol.
 *
 * Commands:
 *   cclocal.mcp.ensureChromeEnabled — Enable Chrome MCP
 *   cclocal.mcp.disableChrome — Disable Chrome MCP
 */

import * as vscode from 'vscode'

export class ChromeMCPProvider implements vscode.Disposable {
  private enabled = false
  private outputChannel: vscode.LogOutputChannel

  constructor(outputChannel: vscode.LogOutputChannel) {
    this.outputChannel = outputChannel
  }

  /** Enable Chrome MCP server in settings */
  async enable(): Promise<void> {
    const config = vscode.workspace.getConfiguration('cclocal')
    const mcpServers = config.get<Record<string, any>>('mcpServers') || {}

    mcpServers['chrome'] = {
      command: 'npx',
      args: ['@anthropic-ai/chrome-mcp-server'],
      type: 'stdio',
    }

    await config.update('mcpServers', mcpServers, vscode.ConfigurationTarget.Global)
    this.enabled = true
    this.outputChannel.info('Chrome MCP server enabled')
    vscode.window.showInformationMessage('CCLocal: Chrome MCP server enabled')
  }

  /** Disable Chrome MCP server */
  async disable(): Promise<void> {
    const config = vscode.workspace.getConfiguration('cclocal')
    const mcpServers = config.get<Record<string, any>>('mcpServers') || {}

    delete mcpServers['chrome']
    await config.update('mcpServers', mcpServers, vscode.ConfigurationTarget.Global)
    this.enabled = false
    this.outputChannel.info('Chrome MCP server disabled')
    vscode.window.showInformationMessage('CCLocal: Chrome MCP server disabled')
  }

  /** Check if Chrome MCP is enabled */
  isEnabled(): boolean {
    return this.enabled
  }

  dispose(): void {
    // No-op
  }
}
