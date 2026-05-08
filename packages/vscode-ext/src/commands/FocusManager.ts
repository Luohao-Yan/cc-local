/**
 * FocusManager — 管理侧边栏 webview 的聚焦/失焦
 *
 * 命令:
 *   cclocal.focus → 聚焦侧边栏输入框
 *   cclocal.blur  → 失焦，切回编辑器
 *
 * 同时管理 cclocal.sideBarActive context key，
 * 用于 keybinding when 条件判断。
 */

import * as vscode from 'vscode'

export class FocusManager {
  private sidebarView: vscode.WebviewView | undefined

  /** Called when the sidebar webview is resolved */
  setSidebarView(view: vscode.WebviewView): void {
    this.sidebarView = view

    // Track visibility changes for sideBarActive context key
    view.onDidChangeVisibility(() => {
      const active = view.visible
      void vscode.commands.executeCommand('setContext', 'cclocal.sideBarActive', active)
    })
  }

  /** Focus the sidebar input */
  focus(): void {
    if (this.sidebarView) {
      this.sidebarView.show(true) // true = preserveFocus=false, takes focus
      void vscode.commands.executeCommand('setContext', 'cclocal.sideBarActive', true)
    } else {
      // Fallback: show the view by command
      void vscode.commands.executeCommand('cclocal.chatView.focus')
      void vscode.commands.executeCommand('setContext', 'cclocal.sideBarActive', true)
    }
  }

  /** Blur — move focus back to the active editor */
  blur(): void {
    void vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup')
    void vscode.commands.executeCommand('setContext', 'cclocal.sideBarActive', false)
  }
}
