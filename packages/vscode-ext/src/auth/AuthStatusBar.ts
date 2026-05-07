/**
 * Authentication Status Bar Item
 * Shows current login status in VS Code status bar
 */

import * as vscode from 'vscode'
import { AuthManager, AuthMethod, AuthStatus } from './AuthManager'

export class AuthStatusBarItem implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem
  private authManager: AuthManager

  constructor(authManager: AuthManager) {
    this.authManager = authManager
    this.statusBarItem = vscode.window.createStatusBarItem(
      'cclocal.auth',
      vscode.StatusBarAlignment.Left,
      100
    )

    this.statusBarItem.command = 'cclocal.login'
    this.statusBarItem.name = 'CCLocal Auth'
    this.statusBarItem.tooltip = 'CCLocal Authentication'

    this.updateStatusBar()
    this.authManager.onDidChangeState(() => this.updateStatusBar())
  }

  /**
   * Update status bar based on auth state
   */
  private updateStatusBar(): void {
    const state = this.authManager.getState()

    switch (state.status) {
      case 'authenticated':
        this.statusBarItem.text = `$(check) CCLocal`
        this.statusBarItem.tooltip = `Logged in with ${state.provider || 'Unknown'}`
        this.statusBarItem.command = 'cclocal.logout'
        this.statusBarItem.backgroundColor = undefined
        break

      case 'connecting':
        this.statusBarItem.text = `$(sync~spin) CCLocal`
        this.statusBarItem.tooltip = 'Logging in...'
        this.statusBarItem.command = undefined
        this.statusBarItem.backgroundColor = undefined
        break

      case 'expired':
        this.statusBarItem.text = `$(alert) CCLocal`
        this.statusBarItem.tooltip = 'Session expired. Click to re-login.'
        this.statusBarItem.command = 'cclocal.login'
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground')
        break

      case 'error':
        this.statusBarItem.text = `$(error) CCLocal`
        this.statusBarItem.tooltip = `Error: ${state.error || 'Unknown error'}`
        this.statusBarItem.command = 'cclocal.login'
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground')
        break

      case 'unauthenticated':
      default:
        this.statusBarItem.text = `$(account) CCLocal`
        this.statusBarItem.tooltip = 'Click to login'
        this.statusBarItem.command = 'cclocal.login'
        this.statusBarItem.backgroundColor = undefined
        break
    }

    this.statusBarItem.show()
  }

  /**
   * Show status bar item
   */
  show(): void {
    this.statusBarItem.show()
  }

  /**
   * Hide status bar item
   */
  hide(): void {
    this.statusBarItem.hide()
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.statusBarItem.dispose()
  }
}

/**
 * AuthStatusBar - Wrapper class that creates AuthManager internally
 * This is the preferred way to create the status bar in the extension
 */
export class AuthStatusBar implements vscode.Disposable {
  private item: AuthStatusBarItem
  private authManager: AuthManager

  constructor(context: vscode.ExtensionContext) {
    this.authManager = new AuthManager(context)
    this.item = new AuthStatusBarItem(this.authManager)
    registerAuthCommands(context, this.authManager, this.item)
  }

  getAuthManager(): AuthManager {
    return this.authManager
  }

  dispose(): void {
    this.item.dispose()
    this.authManager.dispose()
  }
}

/**
 * Register authentication commands
 */
export function registerAuthCommands(
  context: vscode.ExtensionContext,
  authManager: AuthManager,
  statusBar: AuthStatusBarItem
): void {
  // Login command
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.login', async () => {
      // Show method picker
      const method = await authManager.showLoginPicker()
      if (!method) return

      const success = await authManager.login(method)

      if (success) {
        vscode.window.showInformationMessage(
          `Successfully logged in with ${authManager.getProviderInfo(method)?.name}`
        )
      }
    })
  )

  // Logout command
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.logout', async () => {
      const confirm = await vscode.window.showWarningMessage(
        'Are you sure you want to logout?',
        'Yes',
        'No'
      )

      if (confirm === 'Yes') {
        await authManager.logout()
        vscode.window.showInformationMessage('Logged out successfully')
      }
    })
  )

  // Check auth status command
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.checkAuth', async () => {
      const state = await authManager.checkAuthStatus()

      if (state.status === 'authenticated') {
        vscode.window.showInformationMessage(
          `Logged in with ${state.provider || 'Unknown'}`
        )
      } else {
        vscode.window.showInformationMessage('Not logged in')
      }
    })
  )

  // Switch auth method command
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.switchAuthMethod', async () => {
      const method = await authManager.showLoginPicker()
      if (!method) return

      // Logout first if authenticated
      if (authManager.isAuthenticated()) {
        await authManager.logout()
      }

      await authManager.login(method)
    })
  )

  // Configure custom provider command
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.configureCustomProvider', async () => {
      const { CustomProviderAuth } = await import('./providers/CustomProviderAuth')
      const customAuth = new CustomProviderAuth(new SecureStorage(context))
      await customAuth.configure()
    })
  )
}

// Import SecureStorage for the command above
import { SecureStorage } from './SecureStorage'
