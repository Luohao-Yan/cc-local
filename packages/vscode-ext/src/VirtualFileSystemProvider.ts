/**
 * Virtual File System Provider for Diff Preview
 * Allows showing proposed file changes without modifying real files
 */

import * as vscode from 'vscode'
import * as path from 'path'
import { EventEmitter, Event } from 'vscode'

interface VirtualFile {
  uri: vscode.Uri
  content: Uint8Array
  originalContent?: Uint8Array
  timestamp: number
}

export class VirtualFileSystemProvider implements vscode.FileSystemProvider {
  static readonly scheme = 'cclocal-diff'

  private files: Map<string, VirtualFile> = new Map()
  private originalFiles: Map<string, Uint8Array> = new Map()

  private _onDidChangeFile = new EventEmitter<vscode.FileChangeEvent[]>()
  private _onDidCreateFile = new EventEmitter<vscode.Uri>()
  private _onDidDeleteFile = new EventEmitter<vscode.Uri>()

  onDidChangeFile: Event<vscode.FileChangeEvent[]> = this._onDidChangeFile.event
  onDidCreateFile: Event<vscode.Uri> = this._onDidCreateFile.event
  onDidDeleteFile: Event<vscode.Uri> = this._onDidDeleteFile.event

  // ─── FileSystemProvider Implementation ──────────────────────────────────────

  stat(uri: vscode.Uri): vscode.FileStat {
    const file = this.files.get(uri.path)
    if (!file) {
      throw vscode.FileSystemError.FileNotFound(uri)
    }
    return {
      type: vscode.FileType.File,
      ctime: file.timestamp,
      mtime: file.timestamp,
      size: file.content.length,
    }
  }

  readFile(uri: vscode.Uri): Uint8Array {
    const file = this.files.get(uri.path)
    if (!file) {
      throw vscode.FileSystemError.FileNotFound(uri)
    }
    return file.content
  }

  writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean }): void {
    const existing = this.files.get(uri.path)
    if (!existing && !options.create) {
      throw vscode.FileSystemError.FileNotFound(uri)
    }
    if (existing && !options.overwrite) {
      throw vscode.FileSystemError.FileExists(uri)
    }

    this.files.set(uri.path, {
      uri,
      content,
      timestamp: Date.now(),
    })

    this._onDidChangeFile.fire([{ type: vscode.FileChangeType.Changed, uri }])
  }

  delete(uri: vscode.Uri, options: { recursive: boolean }): void {
    if (!this.files.has(uri.path)) {
      throw vscode.FileSystemError.FileNotFound(uri)
    }
    this.files.delete(uri.path)
    this.originalFiles.delete(uri.path)
    this._onDidDeleteFile.fire(uri)
  }

  rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void {
    const file = this.files.get(oldUri.path)
    if (!file) {
      throw vscode.FileSystemError.FileNotFound(oldUri)
    }

    if (!options.overwrite && this.files.has(newUri.path)) {
      throw vscode.FileSystemError.FileExists(newUri)
    }

    this.files.delete(oldUri.path)
    this.files.set(newUri.path, { ...file, uri: newUri })

    this._onDidDeleteFile.fire(oldUri)
    this._onDidCreateFile.fire(newUri)
  }

  readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
    // Virtual FS doesn't support directories
    return []
  }

  createDirectory(uri: vscode.Uri): void {
    // Virtual FS doesn't support directories
  }

  watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[] }): vscode.Disposable {
    // Simple watch implementation
    return new vscode.Disposable(() => {})
  }

  // ─── Custom Methods ─────────────────────────────────────────────────────────

  /**
   * Create a virtual file for proposed changes
   * Returns the virtual URI for the modified file
   */
  createVirtualFile(filePath: string, content: string, originalContent?: string): vscode.Uri {
    // Normalize path for URI
    const normalizedPath = this.normalizePath(filePath)
    const virtualUri = vscode.Uri.parse(`${VirtualFileSystemProvider.scheme}://${normalizedPath}`)

    const contentBuffer = Buffer.from(content, 'utf8')
    const originalBuffer = originalContent ? Buffer.from(originalContent, 'utf8') : undefined

    this.files.set(virtualUri.path, {
      uri: virtualUri,
      content: contentBuffer,
      originalContent: originalBuffer,
      timestamp: Date.now(),
    })

    if (originalBuffer) {
      this.originalFiles.set(virtualUri.path, originalBuffer)
    }

    this._onDidCreateFile.fire(virtualUri)
    return virtualUri
  }

  /**
   * Get the original content of a virtual file
   */
  getOriginalContent(uri: vscode.Uri): Uint8Array | undefined {
    return this.originalFiles.get(uri.path)
  }

  /**
   * Accept the proposed changes - write to the real file
   */
  async acceptChanges(virtualUri: vscode.Uri): Promise<void> {
    const file = this.files.get(virtualUri.path)
    if (!file) {
      throw new Error(`Virtual file not found: ${virtualUri.path}`)
    }

    // Extract real file path from virtual URI
    const realPath = this.extractRealPath(virtualUri)
    const realUri = vscode.Uri.file(realPath)

    // Write to real file
    await vscode.workspace.fs.writeFile(realUri, file.content)

    // Clean up virtual file
    this.files.delete(virtualUri.path)
    this.originalFiles.delete(virtualUri.path)
    this._onDidDeleteFile.fire(virtualUri)
  }

  /**
   * Reject the proposed changes - discard virtual file
   */
  rejectChanges(virtualUri: vscode.Uri): void {
    if (this.files.has(virtualUri.path)) {
      this.files.delete(virtualUri.path)
      this.originalFiles.delete(virtualUri.path)
      this._onDidDeleteFile.fire(virtualUri)
    }
  }

  /**
   * Check if a URI is a virtual file
   */
  isVirtualFile(uri: vscode.Uri): boolean {
    return uri.scheme === VirtualFileSystemProvider.scheme
  }

  /**
   * Clear all virtual files
   */
  clearAll(): void {
    const uris = Array.from(this.files.keys())
    this.files.clear()
    this.originalFiles.clear()

    uris.forEach((path) => {
      this._onDidDeleteFile.fire(vscode.Uri.parse(`${VirtualFileSystemProvider.scheme}://${path}`))
    })
  }

  /**
   * Get all virtual files
   */
  getAllVirtualFiles(): VirtualFile[] {
    return Array.from(this.files.values())
  }

  // ─── Helper Methods ──────────────────────────────────────────────────────────

  private normalizePath(filePath: string): string {
    // Convert Windows path to forward slashes
    return filePath.replace(/\\/g, '/')
  }

  private extractRealPath(uri: vscode.Uri): string {
    // Extract the real file path from the virtual URI
    // cclocal-diff:///path/to/file.ts -> /path/to/file.ts
    return uri.path
  }
}

// ─── Diff View Manager ────────────────────────────────────────────────────────

export class DiffViewManager {
  private vfs: VirtualFileSystemProvider
  private currentDiff: { virtualUri: vscode.Uri; realUri: vscode.Uri } | null = null
  private disposables: vscode.Disposable[] = []

  constructor(vfs: VirtualFileSystemProvider) {
    this.vfs = vfs
  }

  /**
   * Show a diff preview for proposed file changes
   */
  async showDiffPreview(
    filePath: string,
    newContent: string,
    options: { title?: string } = {}
  ): Promise<void> {
    // Read original content
    const realUri = vscode.Uri.file(filePath)
    let originalContent: string

    try {
      const originalBuffer = await vscode.workspace.fs.readFile(realUri)
      originalContent = Buffer.from(originalBuffer).toString('utf8')
    } catch {
      // File doesn't exist, use empty content
      originalContent = ''
    }

    // Create virtual file with proposed changes
    const virtualUri = this.vfs.createVirtualFile(filePath, newContent, originalContent)

    // Store current diff
    this.currentDiff = { virtualUri, realUri }

    // Show diff
    const title = options.title || `Review: ${path.basename(filePath)}`
    await vscode.commands.executeCommand('vscode.diff', realUri, virtualUri, title)

    // Set context for accept/reject commands
    await vscode.commands.executeCommand('setContext', 'cclocal.viewingProposedDiff', true)
  }

  /**
   * Accept the current diff
   */
  async acceptDiff(): Promise<void> {
    if (!this.currentDiff) {
      return
    }

    await this.vfs.acceptChanges(this.currentDiff.virtualUri)
    this.currentDiff = null

    // Clear context
    await vscode.commands.executeCommand('setContext', 'cclocal.viewingProposedDiff', false)
  }

  /**
   * Reject the current diff
   */
  async rejectDiff(): Promise<void> {
    if (!this.currentDiff) {
      return
    }

    this.vfs.rejectChanges(this.currentDiff.virtualUri)
    this.currentDiff = null

    // Clear context
    await vscode.commands.executeCommand('setContext', 'cclocal.viewingProposedDiff', false)

    // Close the diff tab
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor')
  }

  /**
   * Check if there's an active diff
   */
  hasActiveDiff(): boolean {
    return this.currentDiff !== null
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.disposables.forEach((d) => d.dispose())
    this.vfs.clearAll()
  }
}
