/**
 * ClaudeProcess - CLI Process Manager
 * Manages the lifecycle of the Claude CLI process
 */

import * as vscode from 'vscode'
import { Query, type QueryOptions } from './Query.js'
import type { SelectionInfo, DiagnosticInfo } from './Query.js'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ClaudeProcessOptions {
  cliPath: string
  cwd: string
  env?: Record<string, string>
  autoRestart?: boolean
  maxRestartAttempts?: number
  restartDelay?: number
}

export interface ProcessStatus {
  running: boolean
  pid?: number
  uptime?: number
  restartCount: number
}

// ─────────────────────────────────────────────────────────────────────────────
// ClaudeProcess Class
// ─────────────────────────────────────────────────────────────────────────────

export class ClaudeProcess implements vscode.Disposable {
  private query: Query | null = null
  private outputChannel: vscode.LogOutputChannel
  private options: ClaudeProcessOptions
  private startTime: number | null = null
  private restartCount = 0
  private disposed = false

  // 事件
  private readonly _onDidChangeStatus = new vscode.EventEmitter<ProcessStatus>()
  readonly onDidChangeStatus = this._onDidChangeStatus.event

  constructor(options: ClaudeProcessOptions, outputChannel: vscode.LogOutputChannel) {
    this.options = options
    this.outputChannel = outputChannel
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.disposed) {
      throw new Error('Process has been disposed')
    }

    if (this.query?.isRunning) {
      this.outputChannel.warn('Process already running')
      return
    }

    try {
      const queryOptions: QueryOptions = {
        cliPath: this.options.cliPath,
        cwd: this.options.cwd,
        env: this.options.env,
      }

      this.query = new Query(queryOptions, this.outputChannel)
      await this.query.initialize()

      this.startTime = Date.now()
      this._onDidChangeStatus.fire(this.getStatus())

      this.outputChannel.info('Claude CLI process started')

      // 设置通知处理
      this.setupNotificationHandlers()
    } catch (error) {
      this.outputChannel.error(`Failed to start CLI process: ${error}`)
      throw error
    }
  }

  async stop(): Promise<void> {
    if (this.query) {
      this.query.dispose()
      this.query = null
      this.startTime = null
      this._onDidChangeStatus.fire(this.getStatus())
      this.outputChannel.info('Claude CLI process stopped')
    }
  }

  async restart(): Promise<void> {
    await this.stop()
    this.restartCount++
    this._onDidChangeStatus.fire(this.getStatus())
    await this.start()
  }

  dispose(): void {
    this.disposed = true
    this.stop()
    this._onDidChangeStatus.dispose()
  }

  // ─── Notification Handlers ────────────────────────────────────────────────

  private setupNotificationHandlers(): void {
    if (!this.query) return

    // 监听各种通知
    this.query.onNotification('log', (params) => {
      this.outputChannel.info(`CLI: ${JSON.stringify(params)}`)
    })

    this.query.onNotification('error', (params) => {
      this.outputChannel.error(`CLI Error: ${JSON.stringify(params)}`)
    })
  }

  // ─── Query Access ──────────────────────────────────────────────────────────

  getQuery(): Query | null {
    return this.query
  }

  // ─── API Methods ───────────────────────────────────────────────────────────

  async selectionChanged(selection: SelectionInfo): Promise<void> {
    if (!this.query) throw new Error('Process not running')
    await this.query.selectionChanged(selection)
  }

  async atMentioned(files: string[]): Promise<void> {
    if (!this.query) throw new Error('Process not running')
    await this.query.atMentioned(files)
  }

  async diagnosticsChanged(diagnostics: DiagnosticInfo[]): Promise<void> {
    if (!this.query) throw new Error('Process not running')
    await this.query.diagnosticsChanged(diagnostics)
  }

  async fileSaved(filePath: string): Promise<void> {
    if (!this.query) throw new Error('Process not running')
    await this.query.fileSaved(filePath)
  }

  async getOpenFiles(): Promise<string[]> {
    if (!this.query) throw new Error('Process not running')
    return this.query.getOpenFiles()
  }

  async getVisibleText(): Promise<string> {
    if (!this.query) throw new Error('Process not running')
    return this.query.getVisibleText()
  }

  // ─── Status ────────────────────────────────────────────────────────────────

  getStatus(): ProcessStatus {
    return {
      running: this.query?.isRunning ?? false,
      pid: undefined, // 可以从 process 获取
      uptime: this.startTime ? Date.now() - this.startTime : undefined,
      restartCount: this.restartCount,
    }
  }

  get isRunning(): boolean {
    return this.query?.isRunning ?? false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Management
// ─────────────────────────────────────────────────────────────────────────────

let instance: ClaudeProcess | undefined

export function getClaudeProcess(
  options: ClaudeProcessOptions,
  outputChannel: vscode.LogOutputChannel
): ClaudeProcess {
  if (!instance) {
    instance = new ClaudeProcess(options, outputChannel)
  }
  return instance
}

export function disposeClaudeProcess(): void {
  instance?.dispose()
  instance = undefined
}
