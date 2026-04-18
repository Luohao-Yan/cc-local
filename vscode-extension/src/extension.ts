import * as vscode from 'vscode'
import { CclocalViewProvider } from './CclocalViewProvider'

/**
 * 扩展激活入口。
 * 注册侧边栏 Webview 和相关命令。
 * 每次用户发消息时，CclocalViewProvider 内部 spawn cclocal --print 进程处理对话。
 */
export function activate(context: vscode.ExtensionContext): void {
  /** 创建 Webview 提供者 */
  const provider = new CclocalViewProvider(context.extensionUri)

  /** 注册侧边栏 Webview */
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      CclocalViewProvider.viewType,
      provider,
      {
        /** 侧边栏隐藏后保留 Webview 状态，避免重新初始化 */
        webviewOptions: { retainContextWhenHidden: true },
      },
    ),
  )

  /** 注册命令：新建会话 */
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.newSession', () => {
      void vscode.commands.executeCommand('cclocal.chatView.focus')
      provider.handleCommand('newSession')
    }),
  )

  /** 注册命令：清空聊天记录 */
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.clearChat', () => {
      provider.handleCommand('clearChat')
    }),
  )

  /** 注册命令：停止生成 */
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.stopGeneration', () => {
      provider.handleCommand('stopGeneration')
    }),
  )

  /** 注册命令：发送编辑器中选中的代码 */
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.sendSelectedCode', () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        vscode.window.showWarningMessage('CCLocal: 没有活动的编辑器')
        return
      }
      const selection = editor.selection
      if (selection.isEmpty) {
        vscode.window.showWarningMessage('CCLocal: 请先选中代码')
        return
      }
      const selectedText = editor.document.getText(selection)
      const language = editor.document.languageId
      const fileName = editor.document.fileName.split('/').pop() ?? ''
      const message = `请解释以下 ${language} 代码（来自 ${fileName}）：\n\n\`\`\`${language}\n${selectedText}\n\`\`\``
      void vscode.commands.executeCommand('cclocal.chatView.focus').then(() => {
        provider.sendMessage(message)
      })
    }),
  )
}

/**
 * 扩展停用时调用。
 * CclocalViewProvider 内部的进程在 GC 时自动清理。
 */
export function deactivate(): void {
  // 无需额外清理
}
