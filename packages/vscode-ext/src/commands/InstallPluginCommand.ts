/**
 * InstallPlugin command — QuickPick-based plugin installer.
 *
 * Matches official extension's install plugin flow:
 *   - Fetches available plugins from marketplace
 *   - Shows QuickPick with plugin names and descriptions
 *   - Installs selected plugin
 *
 * Command: cclocal.installPlugin
 */

import * as vscode from 'vscode'
import type { PluginManager } from '../plugins/index.js'

export async function installPlugin(pluginManager: PluginManager, outputChannel: vscode.LogOutputChannel): Promise<void> {
  try {
    // Get available (not yet installed) plugins
    const allPlugins = await pluginManager.listAvailablePlugins()
    const installedIds = new Set(pluginManager.getInstalledPluginIds())

    const available = allPlugins.filter(p => !installedIds.has(p.id))

    if (available.length === 0) {
      vscode.window.showInformationMessage('CCLocal: No new plugins available')
      return
    }

    const items: vscode.QuickPickItem[] = available.map(p => ({
      label: p.name,
      description: p.version ? `v${p.version}` : undefined,
      detail: p.description,
      picked: false,
    }))

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a plugin to install',
      title: 'CCLocal: Install Plugin',
      canPickMany: false,
    })

    if (!selected) return

    const plugin = available.find(p => p.name === selected.label)
    if (!plugin) return

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Installing ${plugin.name}...`,
        cancellable: false,
      },
      async () => {
        await pluginManager.installPlugin(plugin.id)
      },
    )

    vscode.window.showInformationMessage(`CCLocal: ${plugin.name} installed successfully`)
  } catch (err: any) {
    outputChannel.error(`[InstallPlugin] Failed: ${err?.message}`)
    vscode.window.showErrorMessage(`CCLocal: Failed to install plugin — ${err?.message}`)
  }
}
