/**
 * Query - JSON-RPC 2.0 Client for CLI Communication
 * Handles communication between VS Code extension and CLI process
 */

import { spawn, type ChildProcess } from 'child_process'
import * as vscode from 'vscode'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: unknown
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: number
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

interface JsonRpcNotification {
  jsonrpc: '2.0'
  method: string
  params?: unknown
}

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timeout?: NodeJS.Timeout
}

export interface SelectionInfo {
  filePath: string
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number
  selectedText: string
}

export interface DiagnosticInfo {
  filePath: string
  severity: 'error' | 'warning' | 'info' | 'hint'
  message: string
  line: number
  column: number
}

export interface QueryOptions {
  cliPath: string
  cwd: string
  env?: Record<string, string>
  timeout?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Query Class
// ─────────────────────────────────────────────────────────────────────────────

export class Query implements vscode.Disposable {
  private process: ChildProcess | null = null
  private requestId = 0
  private pendingRequests: Map<number, PendingRequest> = new Map()
  private buffer = ''
  private outputChannel: vscode.LogOutputChannel
  private options: QueryOptions
  private initialized = false

  // 事件处理
  private notificationHandlers: Map<string, Set<(params: unknown) => void>> = new Map()

  constructor(options: QueryOptions, outputChannel: vscode.LogOutputChannel) {
    this.options = options
    this.outputChannel = outputChannel
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this.initialized) return

    return new Promise((resolve, reject) => {
      try {
        this.outputChannel.info(`Starting CLI process: ${this.options.cliPath}`)

        this.process = spawn(this.options.cliPath, ['--json'], {
          cwd: this.options.cwd,
          env: {
            ...process.env,
            ...this.options.env,
            NODE_ENV: 'production',
          },
          stdio: ['pipe', 'pipe', 'pipe'],
        })

        // 处理标准输出
        this.process.stdout?.on('data', (data: Buffer) => {
          this.handleData(data.toString())
        })

        // 处理标准错误
        this.process.stderr?.on('data', (data: Buffer) => {
          this.outputChannel.error(`CLI stderr: ${data.toString()}`)
        })

        // 处理进程退出
        this.process.on('close', (code) => {
          this.outputChannel.info(`CLI process exited with code ${code}`)
          this.cleanup()
        })

        // 处理错误
        this.process.on('error', (error) => {
          this.outputChannel.error(`CLI process error: ${error.message}`)
          reject(error)
        })

        // 发送初始化请求
        this.request('initialize', {
          protocolVersion: '2024-01-01',
          capabilities: {
            tools: {},
          },
        })
          .then(() => {
            this.initialized = true
            resolve()
          })
          .catch(reject)
      } catch (error) {
        reject(error)
      }
    })
  }

  async restart(): Promise<void> {
    this.dispose()
    this.initialized = false
    await this.initialize()
  }

  dispose(): void {
    this.cleanup()
    this.initialized = false
  }

  private cleanup(): void {
    // 清理所有待处理的请求
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new Error('CLI process closed'))
      pending.timeout && clearTimeout(pending.timeout)
    }
    this.pendingRequests.clear()

    // 终止进程
    if (this.process) {
      this.process.kill()
      this.process = null
    }
  }

  // ─── JSON-RPC Methods ──────────────────────────────────────────────────────

  async request<T = unknown>(method: string, params?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin) {
        reject(new Error('CLI process not running'))
        return
      }

      const id = ++this.requestId
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      }

      // 设置超时
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`Request ${method} timed out`))
      }, this.options.timeout ?? 30000)

      this.pendingRequests.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timeout,
      })

      const message = JSON.stringify(request) + '\n'
      this.process.stdin.write(message)
      this.outputChannel.debug(`Sent request: ${method}(${id})`)
    })
  }

  async notify(method: string, params?: unknown): Promise<void> {
    if (!this.process || !this.process.stdin) {
      throw new Error('CLI process not running')
    }

    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      params,
    }

    const message = JSON.stringify(notification) + '\n'
    this.process.stdin.write(message)
    this.outputChannel.debug(`Sent notification: ${method}`)
  }

  // ─── Data Handling ────────────────────────────────────────────────────────

  private handleData(data: string): void {
    this.buffer += data

    // 处理缓冲区中的完整消息
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.trim()) continue

      try {
        const message = JSON.parse(line)
        this.handleMessage(message)
      } catch (error) {
        this.outputChannel.error(`Failed to parse message: ${line}`)
      }
    }
  }

  private handleMessage(message: JsonRpcResponse | JsonRpcNotification): void {
    // 响应
    if ('id' in message) {
      const pending = this.pendingRequests.get(message.id)
      if (pending) {
        pending.timeout && clearTimeout(pending.timeout)
        this.pendingRequests.delete(message.id)

        if (message.error) {
          pending.reject(new Error(message.error.message))
        } else {
          pending.resolve(message.result)
        }
      }
    }

    // 通知
    if ('method' in message && !('id' in message)) {
      this.handleNotification(message.method, message.params)
    }
  }

  private handleNotification(method: string, params: unknown): void {
    const handlers = this.notificationHandlers.get(method)
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(params)
        } catch (error) {
          this.outputChannel.error(`Notification handler error: ${error}`)
        }
      }
    }
  }

  // ─── Event Handling ───────────────────────────────────────────────────────

  onNotification(method: string, handler: (params: unknown) => void): vscode.Disposable {
    if (!this.notificationHandlers.has(method)) {
      this.notificationHandlers.set(method, new Set())
    }
    this.notificationHandlers.get(method)!.add(handler)

    return {
      dispose: () => {
        this.notificationHandlers.get(method)?.delete(handler)
      },
    }
  }

  // ─── API Methods ───────────────────────────────────────────────────────────

  async selectionChanged(selection: SelectionInfo): Promise<void> {
    await this.notify('selection_changed', selection)
  }

  async atMentioned(files: string[]): Promise<void> {
    await this.notify('at_mentioned', { files })
  }

  async diagnosticsChanged(diagnostics: DiagnosticInfo[]): Promise<void> {
    await this.notify('diagnostics_changed', { diagnostics })
  }

  async fileSaved(filePath: string): Promise<void> {
    await this.notify('file_saved', { filePath })
  }

  async getOpenFiles(): Promise<string[]> {
    const result = await this.request<{ files: string[] }>('get_open_files')
    return result.files ?? []
  }

  async getVisibleText(): Promise<string> {
    const result = await this.request<{ text: string }>('get_visible_text')
    return result.text ?? ''
  }

  // ─── Status ────────────────────────────────────────────────────────────────

  get isRunning(): boolean {
    return this.process !== null && this.initialized
  }
}
