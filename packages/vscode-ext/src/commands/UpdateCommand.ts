/**
 * Update command — Check and install extension updates.
 *
 * Matches official extension's update flow:
 *   - Checks VS Code Marketplace for newer version
 *   - Shows notification with update details
 *   - Installs update if user confirms
 *
 * Command: cclocal.update
 */

import * as vscode from 'vscode'

export async function checkForUpdates(context: vscode.ExtensionContext, outputChannel: vscode.LogOutputChannel): Promise<void> {
  const currentVersion = context.extension.packageJSON.version as string
  outputChannel.info(`[Update] Current version: ${currentVersion}`)

  try {
    // Check marketplace for updates
    const result = await vscode.commands.executeCommand<{
      updateAvailable: boolean
      latestVersion?: string
    }>('extension.checkForUpdates', 'cclocal.cclocal-vscode-ext')

    if (result?.updateAvailable && result.latestVersion) {
      const action = await vscode.window.showInformationMessage(
        `CCLocal update available: v${result.latestVersion} (current: v${currentVersion})`,
        'Install Update',
        'Dismiss',
      )

      if (action === 'Install Update') {
        await vscode.commands.executeCommand('workbench.extensions.installExtension', 'cclocal.cclocal-vscode-ext')
        vscode.window.showInformationMessage('CCLocal: Update installed. Please reload VS Code.')
      }
    } else {
      vscode.window.showInformationMessage(`CCLocal is up to date (v${currentVersion})`)
    }
  } catch (err: any) {
    outputChannel.error(`[Update] Check failed: ${err?.message}`)
    vscode.window.showWarningMessage('CCLocal: Could not check for updates')
  }
}
