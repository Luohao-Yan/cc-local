/**
 * CCLocal VS Code 扩展 - WebSocket 客户端版本
 */

import * as vscode from 'vscode'
import { CCLocalViewProvider } from './CCLocalViewProvider.js'
import { ServerManager } from './ServerManager.js'

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('CCLocal extension activating...')

  // 创建服务端管理器
  const serverManager = new ServerManager()

  // 确保服务端已启动（嵌入式模式）
  await serverManager.ensureServerRunning()

  // 注册侧边栏 Webview
  const provider = new CCLocalViewProvider(context.extensionUri, serverManager)

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(CCLocalViewProvider.viewType, provider)
  )

  // 注册命令
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.sendMessage', async () => {
      const message = await vscode.window.showInputBox({
        prompt: 'Enter your message to CCLocal',
        placeHolder: 'How can I help you today?',
      })
      if (message) {
        await provider.sendMessage(message)
      }
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.clearChat', () => {
      provider.clearChat()
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.stopGeneration', () => {
      provider.stopGeneration()
    })
  )

  console.log('CCLocal extension activated')
}

export function deactivate(): void {
  console.log('CCLocal extension deactivated')
}
