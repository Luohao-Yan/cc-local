/**
 * CCLocal VS Code 扩展
 *
 * 支持两种通信模式：
 *  1. WebSocket 模式（默认）：连接到 @cclocal/server 进程
 *  2. CLI 进程模式（回退）：spawn cclocal --print 子进程
 */

import * as vscode from 'vscode'
import { CliViewProvider } from './CliViewProvider.js'
import { WsViewProvider } from './WsViewProvider.js'
import { ServerManager } from './ServerManager.js'

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('CCLocal extension activating...')

  const config = vscode.workspace.getConfiguration('cclocal')
  const mode: string = config.get('mode') || 'websocket'

  // 统一的消息发送接口，两种模式共享 sendSelectedCode 命令
  let sendMessage: (text: string) => Promise<void> | void

  if (mode === 'cli') {
    const provider = new CliViewProvider(context.extensionUri)

    sendMessage = (text: string) => provider.sendMessage(text)

    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        CliViewProvider.viewType,
        provider,
        { webviewOptions: { retainContextWhenHidden: true } },
      ),
    )

    context.subscriptions.push(
      vscode.commands.registerCommand('cclocal.newSession', () => {
        void vscode.commands.executeCommand('cclocal.chatView.focus')
        provider.handleCommand('newSession')
      }),
    )

    context.subscriptions.push(
      vscode.commands.registerCommand('cclocal.clearChat', () => {
        provider.handleCommand('clearChat')
      }),
    )

    context.subscriptions.push(
      vscode.commands.registerCommand('cclocal.stopGeneration', () => {
        provider.handleCommand('stopGeneration')
      }),
    )
  } else {
    const serverManager = new ServerManager()
    await serverManager.ensureServerRunning()

    const provider = new WsViewProvider(context.extensionUri, serverManager)

    sendMessage = (text: string) => provider.sendMessage(text)

    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(WsViewProvider.viewType, provider),
    )

    context.subscriptions.push(
      vscode.commands.registerCommand('cclocal.sendMessage', async () => {
        const message = await vscode.window.showInputBox({
          prompt: 'Enter your message to CCLocal',
          placeHolder: 'How can I help you today?',
        })
        if (message) {
          await provider.sendMessage(message)
        }
      }),
    )

    context.subscriptions.push(
      vscode.commands.registerCommand('cclocal.clearChat', () => {
        provider.clearChat()
      }),
    )

    context.subscriptions.push(
      vscode.commands.registerCommand('cclocal.stopGeneration', () => {
        provider.stopGeneration()
      }),
    )
  }

  // 公共命令：发送选中代码（两种模式共享）
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
        sendMessage(message)
      })
    }),
  )

  console.log('CCLocal extension activated')
}

export function deactivate(): void {
  // 无需额外清理
}
