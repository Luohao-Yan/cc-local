/**
 * Keyboard Shortcuts for CCLocal VS Code Extension
 * Additional keybinding handlers beyond package.json declarations
 */

import * as vscode from 'vscode'
import type { SessionManager } from '../session/SessionManager.js'

// ════════════════════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUT HANDLERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Register keyboard shortcut handlers
 */
export function registerKeyboardShortcuts(
  context: vscode.ExtensionContext,
  sessionManager: SessionManager
): void {
  // Handle Ctrl/Cmd + Enter to send message
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.keyboard.sendWithCtrlEnter', () => {
      const config = vscode.workspace.getConfiguration('cclocal')
      const useCtrlEnter = config.get<boolean>('useCtrlEnterToSend') ?? false

      if (useCtrlEnter) {
        vscode.commands.executeCommand('cclocal.sendMessage')
      }
    })
  )

  // Handle Escape to cancel generation or clear input
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.keyboard.escape', () => {
      const activeId = sessionManager.getActiveSessionId()
      if (activeId) {
        const status = sessionManager.getStatus(activeId)
        if (status === 'running') {
          vscode.commands.executeCommand('cclocal.stopGeneration')
        }
      }
    })
  )

  // Handle Ctrl/Cmd + N for new conversation
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.keyboard.newConversation', () => {
      const config = vscode.workspace.getConfiguration('cclocal')
      const enabled = config.get<boolean>('enableNewConversationShortcut') ?? true

      if (enabled) {
        vscode.commands.executeCommand('cclocal.newConversation')
      }
    })
  )

  // Handle Ctrl/Cmd + Shift + P for command palette
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.keyboard.showCommandPalette', () => {
      vscode.commands.executeCommand('cclocal.showCommandPalette')
    })
  )

  // Handle Alt/Option + Up to navigate to previous session
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.keyboard.previousSession', async () => {
      const sessions = sessionManager.listSessions()
      const activeId = sessionManager.getActiveSessionId()

      if (sessions.length > 0 && activeId) {
        const currentIndex = sessions.findIndex((s: { id: string }) => s.id === activeId)
        const prevIndex = (currentIndex - 1 + sessions.length) % sessions.length
        await sessionManager.switchSession(sessions[prevIndex].id)
      }
    })
  )

  // Handle Alt/Option + Down to navigate to next session
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.keyboard.nextSession', async () => {
      const sessions = sessionManager.listSessions()
      const activeId = sessionManager.getActiveSessionId()

      if (sessions.length > 0 && activeId) {
        const currentIndex = sessions.findIndex((s: { id: string }) => s.id === activeId)
        const nextIndex = (currentIndex + 1) % sessions.length
        await sessionManager.switchSession(sessions[nextIndex].id)
      }
    })
  )
}

// ════════════════════════════════════════════════════════════════════════════
// COMMAND PALETTE
// ════════════════════════════════════════════════════════════════════════════

interface PaletteCommand {
  id: string
  label: string
  description?: string
  icon?: string
  shortcut?: string
  action: () => Thenable<void> | Promise<void> | void
}

/**
 * Show command palette
 */
export async function showCommandPalette(): Promise<void> {
  const commands: PaletteCommand[] = [
    {
      id: 'new',
      label: 'New Conversation',
      icon: '$(add)',
      action: () => vscode.commands.executeCommand('cclocal.newConversation'),
    },
    {
      id: 'clear',
      label: 'Clear Chat',
      icon: '$(clear-all)',
      action: () => vscode.commands.executeCommand('cclocal.clearChat'),
    },
    {
      id: 'stop',
      label: 'Stop Generation',
      icon: '$(debug-stop)',
      action: () => vscode.commands.executeCommand('cclocal.stopGeneration'),
    },
    {
      id: 'model',
      label: 'Set Model',
      icon: '$(symbol-color)',
      action: () => vscode.commands.executeCommand('cclocal.setModel'),
    },
    {
      id: 'permissions',
      label: 'Set Permission Mode',
      icon: '$(shield)',
      action: () => vscode.commands.executeCommand('cclocal.setPermissionMode'),
    },
    {
      id: 'settings',
      label: 'Open Settings',
      icon: '$(settings-gear)',
      action: () => vscode.commands.executeCommand('cclocal.openSettings'),
    },
    {
      id: 'config',
      label: 'Open Configuration Panel',
      icon: '$(editor-glyph)',
      action: () => vscode.commands.executeCommand('cclocal.openConfigPanel'),
    },
    {
      id: 'sessions',
      label: 'Show Session Statistics',
      icon: '$(graph)',
      action: () => vscode.commands.executeCommand('cclocal.sessionStats'),
    },
    {
      id: 'mcp',
      label: 'Show MCP Settings',
      icon: '$(server)',
      action: () => vscode.commands.executeCommand('cclocal.showMCPSettings'),
    },
    {
      id: 'plugins',
      label: 'Show Plugin Settings',
      icon: '$(extensions)',
      action: () => vscode.commands.executeCommand('cclocal.showPluginSettings'),
    },
    {
      id: 'hooks',
      label: 'Show Hook Statistics',
      icon: '$(bell)',
      action: () => vscode.commands.executeCommand('cclocal.hooks.stats'),
    },
    {
      id: 'logs',
      label: 'Show Logs',
      icon: '$(output)',
      action: () => vscode.commands.executeCommand('cclocal.showLogs'),
    },
    {
      id: 'focus',
      label: 'Focus Input',
      icon: '$(edit)',
      shortcut: 'Ctrl+Escape',
      action: () => vscode.commands.executeCommand('cclocal.focusInput'),
    },
  ]

  const selected = await vscode.window.showQuickPick(
    commands.map(cmd => ({
      label: cmd.icon ? `${cmd.icon} ${cmd.label}` : cmd.label,
      description: cmd.description,
      detail: cmd.shortcut,
      command: cmd,
    })),
    {
      placeHolder: 'CCLocal Commands',
      matchOnDescription: true,
    }
  )

  if (selected) {
    await selected.command.action()
  }
}

// Register the command palette command
export function registerCommandPalette(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.showCommandPalette', () => showCommandPalette())
  )
}
