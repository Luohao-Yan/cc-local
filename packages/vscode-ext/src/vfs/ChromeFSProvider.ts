/**
 * ChromeFSProvider — _claude_in_chrome__ VFS
 *
 * Built-in Chrome MCP browser integration.
 * Provides virtual files for browser automation via Chrome DevTools Protocol.
 *
 * URI format:
 *   _claude_in_chrome__:/navigate?url=xxx  → Navigate browser
 *   _claude_in_chrome__:/screenshot        → Take screenshot
 *   _claude_in_chrome__:/click?selector=x  → Click element
 *   _claude_in_chrome__:/type?selector=x   → Type into element
 *
 * CLI reads/writes these virtual files to control the browser.
 */

import * as vscode from 'vscode'

export class ChromeFSProvider implements vscode.FileSystemProvider {
  private readonly emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>()
  readonly onDidChangeFile = this.emitter.event

  private cache = new Map<string, Uint8Array>()

  static readonly scheme = '_claude_in_chrome__'

  stat(uri: vscode.Uri): vscode.FileStat {
    return {
      type: vscode.FileType.File,
      ctime: 0,
      mtime: Date.now(),
      size: this.cache.get(uri.path)?.length ?? 0,
    }
  }

  readFile(uri: vscode.Uri): Uint8Array {
    const cached = this.cache.get(uri.path)
    if (cached) return cached

    // Return a placeholder — actual interaction happens via MCP protocol
    const result = JSON.stringify({ status: 'ready', path: uri.path })
    return new TextEncoder().encode(result)
  }

  writeFile(uri: vscode.Uri, content: Uint8Array, _options: { create: boolean; overwrite: boolean }): void {
    this.cache.set(uri.path, content)
    this.emitter.fire([{ type: vscode.FileChangeType.Changed, uri }])
  }

  delete(uri: vscode.Uri): void {
    this.cache.delete(uri.path)
    this.emitter.fire([{ type: vscode.FileChangeType.Deleted, uri }])
  }

  rename(_oldUri: vscode.Uri, _newUri: vscode.Uri): void {
    throw vscode.FileSystemError.NoPermissions('Chrome FS does not support rename')
  }

  watch(): vscode.Disposable { return { dispose: () => {} } }
  readDirectory(): [string, vscode.FileType][] { return [] }
  createDirectory(): void {}
}
