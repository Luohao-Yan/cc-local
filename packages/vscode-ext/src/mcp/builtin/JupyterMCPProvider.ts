/**
 * JupyterMCPProvider — Built-in Jupyter notebook MCP integration.
 *
 * Matches official extension's built-in Jupyter MCP server.
 * Provides notebook cell execution and inspection.
 *
 * Commands:
 *   cclocal.mcp.enableJupyter — Enable Jupyter MCP
 *   cclocal.mcp.disableJupyter — Disable Jupyter MCP
 */

import * as vscode from 'vscode'

export class JupyterMCPProvider implements vscode.Disposable {
  private enabled = false
  private outputChannel: vscode.LogOutputChannel

  constructor(outputChannel: vscode.LogOutputChannel) {
    this.outputChannel = outputChannel
  }

  /** Enable Jupyter MCP server in settings */
  async enable(): Promise<void> {
    const config = vscode.workspace.getConfiguration('cclocal')
    const mcpServers = config.get<Record<string, any>>('mcpServers') || {}

    mcpServers['jupyter'] = {
      command: 'uvx',
      args: ['jupyter-mcp-server'],
      type: 'stdio',
    }

    await config.update('mcpServers', mcpServers, vscode.ConfigurationTarget.Global)
    this.enabled = true
    this.outputChannel.info('Jupyter MCP server enabled')
    vscode.window.showInformationMessage('CCLocal: Jupyter MCP server enabled')
  }

  /** Disable Jupyter MCP server */
  async disable(): Promise<void> {
    const config = vscode.workspace.getConfiguration('cclocal')
    const mcpServers = config.get<Record<string, any>>('mcpServers') || {}

    delete mcpServers['jupyter']
    await config.update('mcpServers', mcpServers, vscode.ConfigurationTarget.Global)
    this.enabled = false
    this.outputChannel.info('Jupyter MCP server disabled')
    vscode.window.showInformationMessage('CCLocal: Jupyter MCP server disabled')
  }

  /** Check if Jupyter MCP is enabled */
  isEnabled(): boolean {
    return this.enabled
  }

  dispose(): void {
    // No-op
  }
}
