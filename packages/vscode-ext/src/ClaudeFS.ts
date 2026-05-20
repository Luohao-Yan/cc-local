/**
 * ClaudeFS — Virtual Filesystem Providers for diff editing.
 *
 * 与官方 Claude Code 扩展 1:1 一致，提供 7 个虚拟 FS scheme：
 *  - _claude_fs_left   — Diff 左侧（原始内容）
 *  - _claude_fs_right  — Diff 右侧（修改内容）
 *  - _claude_vscode_fs_readonly — 只读访问工作区文件
 *  - _claude_command   — 交互式命令执行（终端模式用）
 *  - _claude_command_keyboard — 键盘输入模式命令
 *  - _claude_state     — 状态查询（选区/诊断/可见编辑器等）
 *  - _claude_state_response — 状态查询响应
 *  - _claude_terminal_setting — 终端设置查询
 *  - _claude_terminal_setting_response — 终端设置响应
 *
 * 工作流程：
 *  1. CLI 发送 proposed diff → 扩展写入 left/right FS
 *  2. 打开 vscode.diff(left, right) 编辑器
 *  3. 用户可在 right FS 中编辑
 *  4. Accept → 将 right FS 内容写入磁盘
 *  5. Reject → 丢弃 right FS 内容
 */

import * as vscode from 'vscode'
import * as path from 'path'

// ═══════════════════════════════════════════════════════════════════════════
// Memory-backed Virtual Filesystem
// ═══════════════════════════════════════════════════════════════════════════

/** 存储在内存中的虚拟文件 */
interface VirtualFile {
  content: Uint8Array
  mtime: number
  ctime: number
  size: number
}

/**
 * 内存文件系统，支持读写和变更通知。
 * 用于 _claude_fs_left 和 _claude_fs_right。
 */
export class MemoryFS implements vscode.FileSystemProvider {
  private files = new Map<string, VirtualFile>()
  private readonly emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>()
  private watchers = new Map<string, Set<(uri: vscode.Uri) => void>>()

  readonly onDidChangeFile = this.event

  get event(): vscode.Event<vscode.FileChangeEvent[]> {
    return this.emitter.event
  }

  watch(uri: vscode.Uri, _options: { recursive: boolean; excludes: string[] }): vscode.Disposable {
    const key = uri.toString()
    return new vscode.Disposable(() => {
      this.watchers.get(key)?.clear()
    })
  }

  stat(uri: vscode.Uri): vscode.FileStat {
    const file = this.files.get(uri.path)
    if (file) {
      return {
        type: vscode.FileType.File,
        ctime: file.ctime,
        mtime: file.mtime,
        size: file.size,
      }
    }

    // 检查是否是目录（通过前缀匹配）
    const prefix = uri.path + '/'
    for (const key of this.files.keys()) {
      if (key.startsWith(prefix)) {
        return {
          type: vscode.FileType.Directory,
          ctime: 0,
          mtime: 0,
          size: 0,
        }
      }
    }

    throw vscode.FileSystemError.FileNotFound(uri)
  }

  readFile(uri: vscode.Uri): Uint8Array {
    const file = this.files.get(uri.path)
    if (!file) throw vscode.FileSystemError.FileNotFound(uri)
    return file.content
  }

  writeFile(uri: vscode.Uri, content: Uint8Array, _options: { create: boolean; overwrite: boolean }): void {
    const existing = this.files.get(uri.path)
    const now = Date.now()

    this.files.set(uri.path, {
      content,
      ctime: existing?.ctime ?? now,
      mtime: now,
      size: content.byteLength,
    })

    this.emitter.fire([{
      type: existing ? vscode.FileChangeType.Changed : vscode.FileChangeType.Created,
      uri,
    }])
  }

  delete(uri: vscode.Uri, _options: { recursive: boolean }): void {
    this.files.delete(uri.path)
    this.emitter.fire([{ type: vscode.FileChangeType.Deleted, uri }])
  }

  rename(_oldUri: vscode.Uri, _newUri: vscode.Uri, _options: { overwrite: boolean }): void {
    // 不支持重命名
    throw new Error('Not supported')
  }

  readDirectory(_uri: vscode.Uri): [string, vscode.FileType][] {
    // 简化实现
    return []
  }

  createDirectory(uri: vscode.Uri): void {
    // 虚拟目录不需要真正创建
    this.emitter.fire([{ type: vscode.FileChangeType.Changed, uri }])
  }

  // ─── ClaudeFS 特有方法 ──────────────────────────────────────────────────

  /** 写入文件内容（从 diff 数据填充） */
  setFileContent(filePath: string, content: string): vscode.Uri {
    const uri = vscode.Uri.parse(`${this.scheme}:/${filePath}`)
    this.writeFile(uri, Buffer.from(content, 'utf-8'), { create: true, overwrite: true })
    return uri
  }

  /** 读取文件文本内容 */
  getFileText(uri: vscode.Uri): string {
    return Buffer.from(this.readFile(uri)).toString('utf-8')
  }

  /** 清除所有虚拟文件 */
  clear(): void {
    const uris: vscode.Uri[] = []
    for (const key of this.files.keys()) {
      uris.push(vscode.Uri.parse(`${this.scheme}:${key}`))
    }
    this.files.clear()
    if (uris.length > 0) {
      this.emitter.fire(uris.map(uri => ({
        type: vscode.FileChangeType.Deleted,
        uri,
      })))
    }
  }

  /** 虚拟 FS 的 scheme（子类设置） */
  get scheme(): string {
    return '_claude_fs'
  }
}

/**
 * Diff 左侧（原始内容）
 */
export class LeftFS extends MemoryFS {
  override get scheme(): string {
    return '_claude_fs_left'
  }
}

/**
 * Diff 右侧（修改内容）
 */
export class RightFS extends MemoryFS {
  override get scheme(): string {
    return '_claude_fs_right'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Read-only Workspace FS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 只读访问工作区文件。
 * 使用 vscode.workspace.fs 委托读取，但禁止写入。
 */
export class ReadOnlyFS implements vscode.FileSystemProvider {
  private readonly emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>()

  readonly onDidChangeFile = this.emitter.event

  static readonly scheme = '_claude_vscode_fs_readonly'

  watch(uri: vscode.Uri, _options: { recursive: boolean; excludes: string[] }): vscode.Disposable {
    return new vscode.Disposable(() => {})
  }

  stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
    const realUri = this.toRealUri(uri)
    return vscode.workspace.fs.stat(realUri)
  }

  readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
    const realUri = this.toRealUri(uri)
    return vscode.workspace.fs.readFile(realUri)
  }

  writeFile(_uri: vscode.Uri, _content: Uint8Array, _options: { create: boolean; overwrite: boolean }): void {
    throw vscode.FileSystemError.NoPermissions('Read-only filesystem')
  }

  delete(_uri: vscode.Uri, _options: { recursive: boolean }): void {
    throw vscode.FileSystemError.NoPermissions('Read-only filesystem')
  }

  rename(_oldUri: vscode.Uri, _newUri: vscode.Uri, _options: { overwrite: boolean }): void {
    throw vscode.FileSystemError.NoPermissions('Read-only filesystem')
  }

  readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
    const realUri = this.toRealUri(uri)
    return vscode.workspace.fs.readDirectory(realUri)
  }

  createDirectory(_uri: vscode.Uri): void {
    throw vscode.FileSystemError.NoPermissions('Read-only filesystem')
  }

  /** 将虚拟 URI 转换为真实的文件系统 URI */
  private toRealUri(uri: vscode.Uri): vscode.Uri {
    // _claude_vscode_fs_readonly:///path/to/file → file:///path/to/file
    return vscode.Uri.file(uri.path)
  }

  /** 将真实文件路径转换为虚拟 URI */
  static toVirtualUri(filePath: string): vscode.Uri {
    return vscode.Uri.parse(`${ReadOnlyFS.scheme}:${filePath}`)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Diff Manager
// ═══════════════════════════════════════════════════════════════════════════

/** 待处理的 diff 条目 */
export interface ProposedDiff {
  id: string
  filePath: string
  oldContent: string
  newContent: string
  toolUseId?: string
  /** 对应的 right FS URI */
  rightUri?: vscode.Uri
  /** 对应的 left FS URI */
  leftUri?: vscode.Uri
  /** diff 编辑器是否已打开 */
  editorOpen?: boolean
}

/**
 * Diff 管理器 — 协调虚拟 FS 和编辑器
 */
export class DiffManager {
  private pendingDiffs = new Map<string, ProposedDiff>()
  private leftFS: LeftFS
  private rightFS: RightFS

  constructor(leftFS: LeftFS, rightFS: RightFS) {
    this.leftFS = leftFS
    this.rightFS = rightFS
  }

  /**
   * 注册一个 proposed diff 并打开 diff 编辑器。
   * @returns diff ID
   */
  async proposeDiff(
    filePath: string,
    oldContent: string,
    newContent: string,
    toolUseId?: string,
  ): Promise<string> {
    const id = `diff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const diff: ProposedDiff = { id, filePath, oldContent, newContent, toolUseId }

    // 写入虚拟 FS
    const fileName = path.basename(filePath)
    const dirName = path.dirname(filePath)
    const leftPath = `${dirName}/${fileName}`
    const rightPath = `${dirName}/${fileName}`

    diff.leftUri = this.leftFS.setFileContent(leftPath, oldContent)
    diff.rightUri = this.rightFS.setFileContent(rightPath, newContent)
    diff.editorOpen = true

    this.pendingDiffs.set(id, diff)

    // 打开 diff 编辑器
    const title = `${fileName} (Proposed Changes)`
    await vscode.commands.executeCommand(
      'vscode.diff',
      diff.leftUri,
      diff.rightUri,
      title,
      { preview: true },
    )

    return id
  }

  /**
   * 接受 diff：将 right FS 中的内容写入磁盘
   */
  async acceptDiff(diffId: string): Promise<boolean> {
    const diff = this.pendingDiffs.get(diffId)
    if (!diff?.rightUri) return false

    try {
      const newContent = this.rightFS.getFileText(diff.rightUri)
      const realUri = vscode.Uri.file(diff.filePath)
      await vscode.workspace.fs.writeFile(realUri, Buffer.from(newContent, 'utf-8'))
      this.removeDiff(diffId)
      return true
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to accept changes: ${error}`)
      return false
    }
  }

  /**
   * 拒绝 diff：丢弃虚拟 FS 内容
   */
  rejectDiff(diffId: string): void {
    this.removeDiff(diffId)
  }

  /** 接受当前活动的 diff 编辑器中的修改 */
  async acceptActiveDiff(): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor
    if (!activeEditor) return

    // 查找匹配的 diff
    for (const [id, diff] of this.pendingDiffs) {
      if (diff.editorOpen && diff.rightUri) {
        // 检查当前编辑器是否是这个 diff 的 right side
        const tab = vscode.window.tabGroups.activeTabGroup.activeTab
        if (tab && 'input' in tab) {
          const input = tab.input as any
          if (input?.modified?.toString() === diff.rightUri.toString()) {
            await this.acceptDiff(id)
            return
          }
        }
      }
    }
  }

  /** 拒绝当前活动的 diff 编辑器中的修改 */
  async rejectActiveDiff(): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor
    if (!activeEditor) return

    for (const [id, diff] of this.pendingDiffs) {
      if (diff.editorOpen && diff.rightUri) {
        const tab = vscode.window.tabGroups.activeTabGroup.activeTab
        if (tab && 'input' in tab) {
          const input = tab.input as any
          if (input?.modified?.toString() === diff.rightUri.toString()) {
            this.rejectDiff(id)
            // 关闭 diff 编辑器标签
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor')
            return
          }
        }
      }
    }
  }

  /** 获取所有待处理 diff */
  getPendingDiffs(): ProposedDiff[] {
    return Array.from(this.pendingDiffs.values())
  }

  /**
   * Open multi-file changes view using vscode.changes command.
   * 1:1 match with official extension's multi-file diff support.
   */
  async openMultiFileChanges(filePaths: string[]): Promise<void> {
    if (filePaths.length === 0) return

    // If only one file, use single diff
    if (filePaths.length === 1) {
      const diff = this.findDiffByFilePath(filePaths[0])
      if (diff?.leftUri && diff?.rightUri) {
        await vscode.commands.executeCommand(
          'vscode.diff',
          diff.leftUri,
          diff.rightUri,
          `${path.basename(filePaths[0])} (Proposed Changes)`,
          { preview: true },
        )
      }
      return
    }

    // Multiple files: build changes array for vscode.changes
    const changes: Array<{ original: vscode.Uri; modified: vscode.Uri; label: string }> = []
    for (const filePath of filePaths) {
      const diff = this.findDiffByFilePath(filePath)
      if (diff?.leftUri && diff?.rightUri) {
        changes.push({
          original: diff.leftUri,
          modified: diff.rightUri,
          label: `${path.basename(filePath)} (Proposed)`,
        })
      }
    }

    if (changes.length > 0) {
      // vscode.changes is available in VS Code >= 1.86
      try {
        await vscode.commands.executeCommand(
          'vscode.changes',
          'CCLocal: Proposed Changes',
          changes,
        )
      } catch {
        // Fallback: open each diff individually if vscode.changes not supported
        for (const change of changes) {
          await vscode.commands.executeCommand(
            'vscode.diff',
            change.original,
            change.modified,
            change.label,
            { preview: true },
          )
        }
      }
    }
  }

  /** Find a pending diff by file path */
  private findDiffByFilePath(filePath: string): ProposedDiff | undefined {
    for (const [, diff] of this.pendingDiffs) {
      if (diff.filePath === filePath) return diff
    }
    return undefined
  }

  /** 清理所有 diff */
  clearAll(): void {
    this.leftFS.clear()
    this.rightFS.clear()
    this.pendingDiffs.clear()
  }

  private removeDiff(diffId: string): void {
    const diff = this.pendingDiffs.get(diffId)
    if (diff) {
      if (diff.leftUri) {
        try { this.leftFS.delete(diff.leftUri, { recursive: false }) } catch {}
      }
      if (diff.rightUri) {
        try { this.rightFS.delete(diff.rightUri, { recursive: false }) } catch {}
      }
      this.pendingDiffs.delete(diffId)
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Registration
// ═══════════════════════════════════════════════════════════════════════════

/** 注册所有虚拟 FS 和相关命令 */
export function registerClaudeFS(context: vscode.ExtensionContext): {
  leftFS: LeftFS
  rightFS: RightFS
  readOnlyFS: ReadOnlyFS
  diffManager: DiffManager
  commandFS: import('./vfs/CommandFSProvider.js').CommandFSProvider
  keyboardCommandFS: import('./vfs/CommandFSProvider.js').KeyboardCommandFSProvider
  stateFS: import('./vfs/StateFSProvider.js').StateFSProvider
  stateResponseFS: import('./vfs/StateFSProvider.js').StateResponseFSProvider
  terminalSettingFS: import('./vfs/TerminalSettingFSProvider.js').TerminalSettingFSProvider
  terminalSettingResponseFS: import('./vfs/TerminalSettingFSProvider.js').TerminalSettingResponseFSProvider
  chromeFS: import('./vfs/ChromeFSProvider.js').ChromeFSProvider
} {
  const leftFS = new LeftFS()
  const rightFS = new RightFS()
  const readOnlyFS = new ReadOnlyFS()
  const diffManager = new DiffManager(leftFS, rightFS)

  // New VFS providers
  const { CommandFSProvider, KeyboardCommandFSProvider } = require('./vfs/CommandFSProvider.js') as typeof import('./vfs/CommandFSProvider.js')
  const { StateFSProvider, StateResponseFSProvider } = require('./vfs/StateFSProvider.js') as typeof import('./vfs/StateFSProvider.js')
  const { TerminalSettingFSProvider, TerminalSettingResponseFSProvider } = require('./vfs/TerminalSettingFSProvider.js') as typeof import('./vfs/TerminalSettingFSProvider.js')
  const { ChromeFSProvider } = require('./vfs/ChromeFSProvider.js') as typeof import('./vfs/ChromeFSProvider.js')

  const commandFS = new CommandFSProvider()
  const keyboardCommandFS = new KeyboardCommandFSProvider()
  const stateFS = new StateFSProvider()
  const stateResponseFS = new StateResponseFSProvider()
  const terminalSettingFS = new TerminalSettingFSProvider()
  const terminalSettingResponseFS = new TerminalSettingResponseFSProvider()
  const chromeFS = new ChromeFSProvider()

  // 注册文件系统提供者
  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider(leftFS.scheme, leftFS, { isCaseSensitive: true }),
    vscode.workspace.registerFileSystemProvider(rightFS.scheme, rightFS, { isCaseSensitive: true, isReadonly: false }),
    vscode.workspace.registerFileSystemProvider(ReadOnlyFS.scheme, readOnlyFS, { isCaseSensitive: true, isReadonly: true }),
    // New VFS providers
    vscode.workspace.registerFileSystemProvider('_claude_command', commandFS, { isCaseSensitive: true, isReadonly: false }),
    vscode.workspace.registerFileSystemProvider('_claude_command_keyboard', keyboardCommandFS, { isCaseSensitive: true, isReadonly: false }),
    vscode.workspace.registerFileSystemProvider('_claude_state', stateFS, { isCaseSensitive: true, isReadonly: true }),
    vscode.workspace.registerFileSystemProvider('_claude_state_response', stateResponseFS, { isCaseSensitive: true, isReadonly: false }),
    vscode.workspace.registerFileSystemProvider('_claude_terminal_setting', terminalSettingFS, { isCaseSensitive: true, isReadonly: true }),
    vscode.workspace.registerFileSystemProvider('_claude_terminal_setting_response', terminalSettingResponseFS, { isCaseSensitive: true, isReadonly: false }),
    vscode.workspace.registerFileSystemProvider(ChromeFSProvider.scheme, chromeFS, { isCaseSensitive: true, isReadonly: false }),
  )

  // 注册 Accept/Reject 命令
  context.subscriptions.push(
    vscode.commands.registerCommand('cclocal.acceptProposedDiff', () => {
      void diffManager.acceptActiveDiff()
    }),
    vscode.commands.registerCommand('cclocal.rejectProposedDiff', async () => {
      await diffManager.rejectActiveDiff()
    }),
  )

  return {
    leftFS,
    rightFS,
    readOnlyFS,
    diffManager,
    commandFS,
    keyboardCommandFS,
    stateFS,
    stateResponseFS,
    terminalSettingFS,
    terminalSettingResponseFS,
    chromeFS,
  }
}
