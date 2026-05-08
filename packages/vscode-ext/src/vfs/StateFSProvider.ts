/**
 * StateFSProvider — _claude_state VFS
 *
 * 用于 CLI 查询扩展侧的状态信息：
 *   _claude_state:/selection       → 当前编辑器选区
 *   _claude_state:/diagnostics     → 当前诊断信息
 *   _claude_state:/visibleEditors  → 可见编辑器列表
 *   _claude_state:/activeFile      → 活跃文件路径
 *
 * CLI 通过读取这些虚拟文件来获取 IDE 状态。
 * 扩展通过写入 _claude_state_response 来返回数据。
 */

import * as vscode from 'vscode'

type StateHandler = () => Promise<string>

export class StateFSProvider implements vscode.FileSystemProvider {
  private readonly emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>()
  readonly onDidChangeFile = this.emitter.event

  // Registered state handlers
  private handlers = new Map<string, StateHandler>()

  // Cached results
  private results = new Map<string, Uint8Array>()

  constructor() {
    this.registerDefaultHandlers()
  }

  /** Register a custom state handler */
  registerHandler(path: string, handler: StateHandler): void {
    this.handlers.set(path, handler)
  }

  stat(uri: vscode.Uri): vscode.FileStat {
    return {
      type: vscode.FileType.File,
      ctime: 0,
      mtime: Date.now(),
      size: this.results.get(uri.path)?.length ?? 0,
    }
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const cached = this.results.get(uri.path)
    if (cached) return cached

    const path = uri.path.replace(/^\//, '')
    const handler = this.handlers.get(path)

    let result: string
    if (handler) {
      result = await handler()
    } else {
      result = JSON.stringify({ error: `Unknown state path: ${path}` })
    }

    const encoded = new TextEncoder().encode(result)
    this.results.set(uri.path, encoded)
    return encoded
  }

  writeFile(uri: vscode.Uri, content: Uint8Array): void {
    this.results.set(uri.path, content)
    this.emitter.fire([{ type: vscode.FileChangeType.Changed, uri }])
  }

  delete(uri: vscode.Uri): void {
    this.results.delete(uri.path)
  }

  rename(_oldUri: vscode.Uri, _newUri: vscode.Uri): void {}
  watch(): vscode.Disposable { return { dispose: () => {} } }
  readDirectory(): [string, vscode.FileType][] { return [] }
  createDirectory(): void {}

  /** Invalidate cache for a specific path */
  invalidate(path: string): void {
    const uri = vscode.Uri.parse(`_claude_state:/${path}`)
    this.results.delete(`/${path}`)
    this.emitter.fire([{ type: vscode.FileChangeType.Changed, uri }])
  }

  /** Invalidate all cached state */
  invalidateAll(): void {
    this.results.clear()
  }

  private registerDefaultHandlers(): void {
    this.handlers.set('selection', async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) return JSON.stringify({ selection: null })
      const selection = editor.selection
      const text = editor.document.getText(selection)
      return JSON.stringify({
        file: editor.document.uri.fsPath,
        startLine: selection.start.line + 1,
        endLine: selection.end.line + 1,
        text,
      })
    })

    this.handlers.set('diagnostics', async () => {
      const diags = vscode.languages.getDiagnostics()
      const result: Record<string, unknown[]> = {}
      for (const [uri, diagnostics] of diags) {
        if (diagnostics.length > 0) {
          result[uri.fsPath] = diagnostics.map(d => ({
            severity: vscode.DiagnosticSeverity[d.severity],
            message: d.message,
            line: d.range.start.line + 1,
          }))
        }
      }
      return JSON.stringify(result)
    })

    this.handlers.set('visibleEditors', async () => {
      const editors = vscode.window.visibleTextEditors
      return JSON.stringify(editors.map(e => ({
        file: e.document.uri.fsPath,
        language: e.document.languageId,
        viewColumn: e.viewColumn,
      })))
    })

    this.handlers.set('activeFile', async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) return JSON.stringify({ file: null })
      return JSON.stringify({
        file: editor.document.uri.fsPath,
        language: editor.document.languageId,
        isDirty: editor.document.isDirty,
      })
    })

    this.handlers.set('workspaceFolders', async () => {
      return JSON.stringify(
        vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath) ?? []
      )
    })
  }
}

/**
 * StateResponseFSProvider — _claude_state_response VFS
 *
 * CLI 写入此 scheme 来返回状态查询的结果。
 * 实际上就是 StateFSProvider 的写入端。
 */
export class StateResponseFSProvider implements vscode.FileSystemProvider {
  private readonly emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>()
  readonly onDidChangeFile = this.emitter.event

  private responses = new Map<string, Uint8Array>()

  stat(uri: vscode.Uri): vscode.FileStat {
    return {
      type: vscode.FileType.File,
      ctime: 0,
      mtime: Date.now(),
      size: this.responses.get(uri.path)?.length ?? 0,
    }
  }

  readFile(uri: vscode.Uri): Promise<Uint8Array> {
    return Promise.resolve(this.responses.get(uri.path) ?? new Uint8Array(0))
  }

  writeFile(uri: vscode.Uri, content: Uint8Array): void {
    this.responses.set(uri.path, content)
    this.emitter.fire([{ type: vscode.FileChangeType.Changed, uri }])
  }

  delete(uri: vscode.Uri): void { this.responses.delete(uri.path) }
  rename(_o: vscode.Uri, _n: vscode.Uri): void {}
  watch(): vscode.Disposable { return { dispose: () => {} } }
  readDirectory(): [string, vscode.FileType][] { return [] }
  createDirectory(): void {}
}