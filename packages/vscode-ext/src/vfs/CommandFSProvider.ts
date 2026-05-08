/**
 * CommandFSProvider — _claude_command VFS
 *
 * 用于 CLI 与扩展之间的交互式命令执行：
 *   _claude_command:/exec?cmd=xxx  → 执行命令并返回结果
 *   _claude_command_keyboard:/exec → 键盘输入模式（终端模式用）
 *
 * 读取文件时，解析 URI path 作为命令，执行后返回结果。
 * 写入文件时，将内容作为标准输入发送给命令。
 */

import * as vscode from 'vscode'
import { execFile } from 'child_process'

export class CommandFSProvider implements vscode.FileSystemProvider {
  private readonly emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>()
  readonly onDidChangeFile = this.emitter.event

  // Cache results for reads
  private results = new Map<string, Uint8Array>()

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

    // Parse command from URI: _claude_command:/exec?cmd=ls
    const command = this.parseCommand(uri)
    const result = await this.executeCommand(command)
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

  rename(_oldUri: vscode.Uri, _newUri: vscode.Uri): void {
    // No-op
  }

  watch(): vscode.Disposable {
    return { dispose: () => {} }
  }

  readDirectory(): [string, vscode.FileType][] {
    return []
  }

  createDirectory(): void {
    // No-op
  }

  private parseCommand(uri: vscode.Uri): string {
    // URI format: _claude_command:/exec?cmd=xxx
    const query = new URLSearchParams(uri.query)
    return query.get('cmd') || uri.path.replace(/^\//, '')
  }

  private executeCommand(command: string): Promise<string> {
    return new Promise((resolve) => {
      const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
      execFile('sh', ['-c', command], { cwd, timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          resolve(`Error: ${error.message}\n${stderr}`)
        } else {
          resolve(stdout || stderr || '(no output)')
        }
      })
    })
  }
}

/**
 * KeyboardCommandFSProvider — _claude_command_keyboard VFS
 *
 * 终端模式下的命令交互，与 CommandFSProvider 相同但标记为 keyboard 模式。
 * CLI 通过此 scheme 知道需要用键盘输入而非直接执行。
 */
export class KeyboardCommandFSProvider extends CommandFSProvider {
  // Inherits all behavior, just uses a different scheme
}