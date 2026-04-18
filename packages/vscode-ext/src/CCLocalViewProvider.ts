/**
 * CCLocal VS Code 视图提供者 - WebSocket 版本
 */

import * as vscode from 'vscode'
import type { ServerManager } from './ServerManager.js'
import type { StreamEvent } from '@cclocal/shared'

interface WebviewMessage {
  type: string
  text?: string
  messageId?: string
}

export class CCLocalViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'cclocal.chatView'

  private view?: vscode.WebviewView
  private ws?: WebSocket
  private serverManager: ServerManager
  private currentMessageId = ''
  private messageBuffer = ''
  private status: 'idle' | 'running' | 'error' = 'idle'

  constructor(extensionUri: vscode.Uri, serverManager: ServerManager) {
    this.serverManager = serverManager
    this.connectToServer()
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.getExtensionUri()],
    }

    webviewView.webview.html = this.getWebviewContent()

    // 处理来自 Webview 的消息
    webviewView.webview.onDidReceiveMessage(async (data: WebviewMessage) => {
      switch (data.type) {
        case 'sendMessage':
          if (data.text) {
            await this.sendMessage(data.text)
          }
          break
        case 'cancel':
          this.stopGeneration()
          break
      }
    })

    // 视图关闭时清理
    webviewView.onDidDispose(() => {
      this.ws?.close()
    })
  }

  private async connectToServer(): Promise<void> {
    const serverUrl = this.serverManager.getServerUrl()

    try {
      // 动态导入 ws 库
      const { default: WebSocketClient } = await import('ws')
      this.ws = new WebSocketClient(`${serverUrl}/ws?token=default`) as unknown as WebSocket

      this.ws.onopen = () => {
        console.log('Connected to CCLocal server')
        // 发送认证
        this.ws?.send(
          JSON.stringify({
            type: 'auth',
            payload: { clientType: 'vscode' },
            timestamp: Date.now(),
          })
        )
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data.toString())
          this.handleServerMessage(message)
        } catch (error) {
          console.error('Failed to parse message:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.setStatus('error')
        this.sendToWebview({
          type: 'error',
          message: 'Connection error. Please try again.',
        })
      }

      this.ws.onclose = () => {
        console.log('Disconnected from CCLocal server')
        // 尝试重新连接
        setTimeout(() => this.connectToServer(), 3000)
      }
    } catch (error) {
      console.error('Failed to connect:', error)
    }
  }

  private handleServerMessage(message: { type: string; payload?: unknown }): void {
    switch (message.type) {
      case 'auth_success':
        console.log('Authenticated with server')
        break

      case 'stream_start':
        this.messageBuffer = ''
        this.setStatus('running')
        break

      case 'stream_delta': {
        const payload = message.payload as { delta?: { type: string; text?: string } } | undefined
        if (payload?.delta?.type === 'text_delta' && payload.delta.text) {
          this.messageBuffer += payload.delta.text
          this.sendToWebview({
            type: 'stream_delta',
            text: payload.delta.text,
            messageId: this.currentMessageId,
          })
        }
        break
      }

      case 'stream_end':
        this.setStatus('idle')
        this.sendToWebview({
          type: 'assistantDone',
          messageId: this.currentMessageId,
        })
        this.currentMessageId = ''
        break

      case 'error': {
        const payload = message.payload as { message?: string } | undefined
        this.setStatus('error')
        this.sendToWebview({
          type: 'error',
          message: payload?.message || 'Unknown error',
        })
        break
      }

      case 'cancelled':
        this.setStatus('idle')
        break
    }
  }

  async sendMessage(text: string): Promise<void> {
    if (this.status === 'running') {
      vscode.window.showWarningMessage('Already processing a message. Please wait or cancel.')
      return
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      vscode.window.showErrorMessage('Not connected to CCLocal server. Please try again.')
      return
    }

    this.currentMessageId = this.generateId()

    // 发送用户消息到 Webview
    this.sendToWebview({
      type: 'userMessage',
      text,
      messageId: this.generateId(),
    })

    this.setStatus('running')

    // 发送消息到服务端
    this.ws.send(
      JSON.stringify({
        type: 'message',
        payload: {
          sessionId: 'default-session',
          content: text,
        },
        timestamp: Date.now(),
      })
    )
  }

  stopGeneration(): void {
    if (this.status !== 'running') return

    this.ws?.send(
      JSON.stringify({
        type: 'cancel',
        payload: { sessionId: 'default-session' },
        timestamp: Date.now(),
      })
    )
  }

  clearChat(): void {
    this.sendToWebview({ type: 'clear' })
  }

  private setStatus(status: typeof this.status): void {
    this.status = status
    this.sendToWebview({ type: 'status', status })
  }

  private sendToWebview(message: Record<string, unknown>): void {
    this.view?.webview.postMessage(message)
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getExtensionUri(): vscode.Uri {
    // 返回扩展的根 URI
    return vscode.Uri.file(__dirname)
  }

  private getWebviewContent(): string {
    // 简化的 Webview HTML 内容
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CCLocal Chat</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
    }
    .container {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    .input-area {
      border-top: 1px solid var(--vscode-panel-border);
      padding: 16px;
    }
    .input-row {
      display: flex;
      gap: 8px;
    }
    input[type="text"] {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
    }
    button {
      padding: 8px 16px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .message {
      margin-bottom: 16px;
      padding: 12px;
      border-radius: 8px;
    }
    .user-message {
      background: var(--vscode-button-background);
      margin-left: 32px;
    }
    .assistant-message {
      background: var(--vscode-editor-inactiveSelectionBackground);
      margin-right: 32px;
    }
    .status {
      padding: 4px 16px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
    .status.running {
      color: var(--vscode-progressBar-background);
    }
    .status.error {
      color: var(--vscode-errorForeground);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="status" id="status">Ready</div>
    <div class="messages" id="messages"></div>
    <div class="input-area">
      <div class="input-row">
        <input type="text" id="messageInput" placeholder="Type your message..." />
        <button id="sendBtn">Send</button>
        <button id="cancelBtn" style="display: none;">Cancel</button>
      </div>
    </div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const messagesEl = document.getElementById('messages');
    const inputEl = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const statusEl = document.getElementById('status');
    let currentMessageEl = null;

    function addMessage(text, isUser) {
      const div = document.createElement('div');
      div.className = 'message ' + (isUser ? 'user-message' : 'assistant-message');
      div.textContent = text;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return div;
    }

    sendBtn.addEventListener('click', () => {
      const text = inputEl.value.trim();
      if (text) {
        addMessage(text, true);
        vscode.postMessage({ type: 'sendMessage', text });
        inputEl.value = '';
        currentMessageEl = null;
      }
    });

    inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendBtn.click();
      }
    });

    cancelBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'cancel' });
    });

    window.addEventListener('message', (event) => {
      const message = event.data;
      switch (message.type) {
        case 'userMessage':
          addMessage(message.text, true);
          break;
        case 'stream_delta':
          if (!currentMessageEl) {
            currentMessageEl = addMessage('', false);
          }
          currentMessageEl.textContent += message.text;
          messagesEl.scrollTop = messagesEl.scrollHeight;
          break;
        case 'assistantDone':
          currentMessageEl = null;
          break;
        case 'error':
          statusEl.textContent = 'Error: ' + message.message;
          statusEl.className = 'status error';
          break;
        case 'status':
          statusEl.textContent = message.status === 'running' ? 'Thinking...' : 
                                message.status === 'error' ? 'Error' : 'Ready';
          statusEl.className = 'status ' + message.status;
          sendBtn.style.display = message.status === 'running' ? 'none' : 'block';
          cancelBtn.style.display = message.status === 'running' ? 'block' : 'none';
          break;
        case 'clear':
          messagesEl.innerHTML = '';
          currentMessageEl = null;
          break;
      }
    });
  </script>
</body>
</html>`
  }
}
