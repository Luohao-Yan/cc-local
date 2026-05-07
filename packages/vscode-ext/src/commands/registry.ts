/**
 * Command Registry for CCLocal VS Code Extension
 * Central registration and management of all commands
 */

import * as vscode from 'vscode'
import { SessionManager } from '../session/SessionManager'
import { SessionTreeProvider } from '../session/SessionTreeProvider'
import { HookManager } from '../hooks/HookManager'
import { MCPManager } from '../mcp/MCPManager'
import { PluginManager } from '../plugins/PluginManager'
import { ConfigurationManager } from '../ConfigurationManager'

// ════════════════════════════════════════════════════════════════════════════
// COMMAND DEFINITIONS
// ════════════════════════════════════════════════════════════════════════════

export interface CommandDefinition {
  id: string
  title: string
  category?: string
  icon?: string
  register: (context: vscode.ExtensionContext, deps: CommandDependencies) => void
}

export interface CommandDependencies {
  sessionManager: SessionManager
  sessionTree: SessionTreeProvider
  hookManager: HookManager
  mcpManager: MCPManager
  pluginManager: PluginManager
  configManager: ConfigurationManager
  outputChannel: vscode.LogOutputChannel
}

// ════════════════════════════════════════════════════════════════════════════
// CHAT COMMANDS
// Note: newConversation, clearChat, stopGeneration, focusInput, sendMessage
// are registered inline in extension.ts with mode-specific implementations
// ════════════════════════════════════════════════════════════════════════════

export const chatCommands: CommandDefinition[] = [
  // Mode-specific commands are registered in extension.ts
  // This array is kept for documentation purposes
]

// ════════════════════════════════════════════════════════════════════════════
// EDIT COMMANDS
// ════════════════════════════════════════════════════════════════════════════

export const editCommands: CommandDefinition[] = [
  {
    id: 'cclocal.acceptEdit',
    title: 'Accept Edit',
    icon: '$(check)',
    register: (context, deps) => {
      context.subscriptions.push(
        vscode.commands.registerCommand('cclocal.acceptEdit', async () => {
          // This command is typically called from the diff view
          // It signals to accept the proposed changes
          vscode.commands.executeCommand('workbench.action.closeActiveEditor')
          vscode.window.showInformationMessage('CCLocal: Changes accepted')
        })
      )
    },
  },
  {
    id: 'cclocal.rejectEdit',
    title: 'Reject Edit',
    icon: '$(discard)',
    register: (context, deps) => {
      context.subscriptions.push(
        vscode.commands.registerCommand('cclocal.rejectEdit', async () => {
          // This command is typically called from the diff view
          // It signals to reject the proposed changes
          vscode.commands.executeCommand('workbench.action.closeActiveEditor')
          vscode.window.showInformationMessage('CCLocal: Changes rejected')
        })
      )
    },
  },
  {
    id: 'cclocal.insertAtMention',
    title: 'Insert @-Mention',
    register: (context) => {
      context.subscriptions.push(
        vscode.commands.registerCommand('cclocal.insertAtMention', async () => {
          const editor = vscode.window.activeTextEditor
          if (!editor) {
            vscode.window.showWarningMessage('CCLocal: No active editor')
            return
          }

          // Show file picker for @-mention
          const files = await vscode.window.showOpenDialog({
            canSelectMany: true,
            filters: {
              'All Files': ['*'],
            },
          })

          if (files && files.length > 0) {
            const mentions = files.map(f => `@${f.fsPath}`).join(' ')
            const position = editor.selection.active
            editor.edit(editBuilder => {
              editBuilder.insert(position, mentions)
            })
          }
        })
      )
    },
  },
  {
    id: 'cclocal.toggleDictation',
    title: 'Toggle Voice Dictation',
    register: (context) => {
      let dictationActive = false

      context.subscriptions.push(
        vscode.commands.registerCommand('cclocal.toggleDictation', () => {
          dictationActive = !dictationActive

          if (dictationActive) {
            vscode.window.showInformationMessage('CCLocal: Voice dictation enabled')
            // TODO: Start voice recognition
          } else {
            vscode.window.showInformationMessage('CCLocal: Voice dictation disabled')
            // TODO: Stop voice recognition
          }
        })
      )
    },
  },
]

// ════════════════════════════════════════════════════════════════════════════
// NAVIGATION COMMANDS
// ════════════════════════════════════════════════════════════════════════════

export const navigationCommands: CommandDefinition[] = [
  {
    id: 'cclocal.openInPanel',
    title: 'Open in Panel',
    icon: '$(empty-window)',
    register: (context) => {
      context.subscriptions.push(
        vscode.commands.registerCommand('cclocal.openInPanel', () => {
          vscode.commands.executeCommand('workbench.action.positionPanelBottom')
          vscode.commands.executeCommand('workbench.view.extension.cclocal-sidebar')
        })
      )
    },
  },
  {
    id: 'cclocal.openInSidebar',
    title: 'Open in Sidebar',
    icon: '$(layout-sidebar-left)',
    register: (context) => {
      context.subscriptions.push(
        vscode.commands.registerCommand('cclocal.openInSidebar', () => {
          vscode.commands.executeCommand('workbench.view.extension.cclocal-sidebar')
        })
      )
    },
  },
  {
    id: 'cclocal.openSettings',
    title: 'Open Settings',
    register: (context) => {
      context.subscriptions.push(
        vscode.commands.registerCommand('cclocal.openSettings', () => {
          vscode.commands.executeCommand('workbench.action.openSettings', 'cclocal')
        })
      )
    },
  },
  {
    id: 'cclocal.openConfigPanel',
    title: 'Open Configuration Panel',
    icon: '$(settings-gear)',
    register: (context, deps) => {
      context.subscriptions.push(
        vscode.commands.registerCommand('cclocal.openConfigPanel', async () => {
          // Import and show config panel
          const { ConfigPanelProvider } = await import('../ConfigPanelProvider')
          const panel = new ConfigPanelProvider(deps.configManager)
          context.subscriptions.push(panel)
          panel.show()
        })
      )
    },
  },
  {
    id: 'cclocal.showLogs',
    title: 'Show Logs',
    register: (context, deps) => {
      context.subscriptions.push(
        vscode.commands.registerCommand('cclocal.showLogs', () => {
          deps.outputChannel.show()
        })
      )
    },
  },
]

// ════════════════════════════════════════════════════════════════════════════
// MODEL & PERMISSION COMMANDS
// ════════════════════════════════════════════════════════════════════════════

export const modelCommands: CommandDefinition[] = [
  {
    id: 'cclocal.setModel',
    title: 'Set Model',
    register: (context, deps) => {
      context.subscriptions.push(
        vscode.commands.registerCommand('cclocal.setModel', async () => {
          const models = deps.configManager.get('availableModels') || []
          const customModel = 'custom'

          const items = [...models.map((m: string) => ({ label: m })), { label: customModel }]

          const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a model',
          })

          if (selected) {
            if (selected.label === customModel) {
              const customId = await vscode.window.showInputBox({
                prompt: 'Enter custom model ID',
                placeHolder: 'claude-3-opus-20240229',
              })

              if (customId) {
                await deps.configManager.setModel(customId)
                vscode.window.showInformationMessage(`CCLocal: Model set to ${customId}`)
              }
            } else {
              await deps.configManager.setModel(selected.label)
              vscode.window.showInformationMessage(`CCLocal: Model set to ${selected.label}`)
            }
          }
        })
      )
    },
  },
  {
    id: 'cclocal.setPermissionMode',
    title: 'Set Permission Mode',
    register: (context, deps) => {
      context.subscriptions.push(
        vscode.commands.registerCommand('cclocal.setPermissionMode', async () => {
          const modes = [
            { label: 'default', description: 'Ask for dangerous operations' },
            { label: 'acceptEdits', description: 'Auto-accept file edits' },
            { label: 'plan', description: 'Plan mode (no execution)' },
            { label: 'bypassPermissions', description: 'Auto-accept all (dangerous)' },
          ]

          const selected = await vscode.window.showQuickPick(modes, {
            placeHolder: 'Select permission mode',
          })

          if (selected) {
            await deps.configManager.update('initialPermissionMode', selected.label)
            vscode.window.showInformationMessage(`CCLocal: Permission mode set to ${selected.label}`)
          }
        })
      )
    },
  },
]

// ════════════════════════════════════════════════════════════════════════════
// UTILITY COMMANDS
// Note: sendSelectedCode is registered inline in extension.ts
// ════════════════════════════════════════════════════════════════════════════

export const utilityCommands: CommandDefinition[] = [
  // sendSelectedCode is registered in extension.ts
]

// ════════════════════════════════════════════════════════════════════════════
// ALL COMMANDS
// ════════════════════════════════════════════════════════════════════════════

export const allCommands: CommandDefinition[] = [
  ...chatCommands,
  ...editCommands,
  ...navigationCommands,
  ...modelCommands,
  ...utilityCommands,
]

// ════════════════════════════════════════════════════════════════════════════
// COMMAND REGISTRATION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Register all commands
 */
export function registerAllCommands(
  context: vscode.ExtensionContext,
  dependencies: CommandDependencies
): void {
  for (const cmd of allCommands) {
    cmd.register(context, dependencies)
  }
}
