/**
 * TerminalSettingFSProvider — _claude_terminal_setting VFS
 *
 * 终端模式下 CLI 查询/修改 VS Code 设置：
 *   _claude_terminal_setting:/shell       → 获取默认 shell
 *   _claude_terminal_setting:/cwd         → 获取工作目录
 *   _claude_terminal_setting:/theme       → 获取当前主题
 *   _claude_terminal_setting:/font        → 获取终端字体
 *
 * CLI 写入 _claude_terminal_setting_response 来返回确认。
 */

import * as vscode from 'vscode'

export class TerminalSettingFSProvider implements vscode.FileSystemProvider {
  private readonly emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>()
  readonly onDidChangeFile = this.emitter.event

  private cache = new Map<string, Uint8Array>()

  stat(uri: vscode.Uri): vscode.FileStat {
    return {
      type: vscode.FileType.File,
      ctime: 0,
      mtime: Date.now(),
      size: this.cache.get(uri.path)?.length ?? 0,
    }
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const cached = this.cache.get(uri.path)
    if (cached) return cached

    const path = uri.path.replace(/^\//, '')
    let result: string

    switch (path) {
      case 'shell': {
        const termProfile = vscode.workspace.getConfiguration('terminal.integrated')
          .get('defaultProfile.windows')
          ?? vscode.workspace.getConfiguration('terminal.integrated')
            .get('defaultProfile.linux')
          ?? vscode.workspace.getConfiguration('terminal.integrated')
            .get('defaultProfile.osx')
          ?? 'default'
        result = JSON.stringify({ shell: termProfile })
        break
      }
      case 'cwd': {
        const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.env.HOME ?? '/'
        result = JSON.stringify({ cwd })
        break
      }
      case 'theme': {
        const theme = vscode.window.activeColorTheme
        result = JSON.stringify({
          kind: vscode.ColorThemeKind[theme.kind],
          isDark: theme.kind === vscode.ColorThemeKind.Dark || theme.kind === vscode.ColorThemeKind.HighContrastDark,
        })
        break
      }
      case 'font': {
        const fontFamily = vscode.workspace.getConfiguration('terminal.integrated')
          .get('fontFamily') as string ?? 'Consolas'
        const fontSize = vscode.workspace.getConfiguration('terminal.integrated')
          .get('fontSize') as number ?? 14
        result = JSON.stringify({ fontFamily, fontSize })
        break
      }
      default:
        result = JSON.stringify({ error: `Unknown terminal setting: ${path}` })
    }

    const encoded = new TextEncoder().encode(result)
    this.cache.set(uri.path, encoded)
    return encoded
  }

  writeFile(uri: vscode.Uri, content: Uint8Array): void {
    this.cache.set(uri.path, content)
    this.emitter.fire([{ type: vscode.FileChangeType.Changed, uri }])
  }

  delete(uri: vscode.Uri): void { this.cache.delete(uri.path) }
  rename(_o: vscode.Uri, _n: vscode.Uri): void {}
  watch(): vscode.Disposable { return { dispose: () => {} } }
  readDirectory(): [string, vscode.FileType][] { return [] }
  createDirectory(): void {}
}

/**
 * TerminalSettingResponseFSProvider — _claude_terminal_setting_response VFS
 *
 * CLI 写入此 scheme 来返回终端设置变更的确认。
 */
export class TerminalSettingResponseFSProvider implements vscode.FileSystemProvider {
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