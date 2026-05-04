/**
 * IDE Integration for Native REPL
 *
 * Provides simplified IDE integration for the native mode.
 * For full IDE integration, use the Ink-based REPL with useIDEIntegration hook.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { spawn } from 'child_process'

/**
 * Supported IDE types
 */
export type IdeType =
  | 'cursor'
  | 'windsurf'
  | 'vscode'
  | 'pycharm'
  | 'intellij'
  | 'webstorm'
  | 'phpstorm'
  | 'rubymine'
  | 'clion'
  | 'goland'
  | 'rider'
  | 'datagrip'
  | 'appcode'
  | 'dataspell'
  | 'fleet'
  | 'androidstudio'

/**
 * IDE configuration
 */
interface IdeConfig {
  ideKind: 'vscode' | 'jetbrains'
  displayName: string
  command: string
  lockfileName: string
}

const IDE_CONFIGS: Record<IdeType, IdeConfig> = {
  cursor: { ideKind: 'vscode', displayName: 'Cursor', command: 'cursor', lockfileName: 'cursor-port' },
  windsurf: { ideKind: 'vscode', displayName: 'Windsurf', command: 'windsurf', lockfileName: 'windsurf-port' },
  vscode: { ideKind: 'vscode', displayName: 'VS Code', command: 'code', lockfileName: 'vscode-port' },
  pycharm: { ideKind: 'jetbrains', displayName: 'PyCharm', command: 'pycharm', lockfileName: 'pycharm-port' },
  intellij: { ideKind: 'jetbrains', displayName: 'IntelliJ IDEA', command: 'idea', lockfileName: 'idea-port' },
  webstorm: { ideKind: 'jetbrains', displayName: 'WebStorm', command: 'webstorm', lockfileName: 'webstorm-port' },
  phpstorm: { ideKind: 'jetbrains', displayName: 'PhpStorm', command: 'phpstorm', lockfileName: 'phpstorm-port' },
  rubymine: { ideKind: 'jetbrains', displayName: 'RubyMine', command: 'rubymine', lockfileName: 'rubymine-port' },
  clion: { ideKind: 'jetbrains', displayName: 'CLion', command: 'clion', lockfileName: 'clion-port' },
  goland: { ideKind: 'jetbrains', displayName: 'GoLand', command: 'goland', lockfileName: 'goland-port' },
  rider: { ideKind: 'jetbrains', displayName: 'Rider', command: 'rider', lockfileName: 'rider-port' },
  datagrip: { ideKind: 'jetbrains', displayName: 'DataGrip', command: 'datagrip', lockfileName: 'datagrip-port' },
  appcode: { ideKind: 'jetbrains', displayName: 'AppCode', command: 'appcode', lockfileName: 'appcode-port' },
  dataspell: { ideKind: 'jetbrains', displayName: 'DataSpell', command: 'dataspell', lockfileName: 'dataspell-port' },
  fleet: { ideKind: 'jetbrains', displayName: 'Fleet', command: 'fleet', lockfileName: 'fleet-port' },
  androidstudio: { ideKind: 'jetbrains', displayName: 'Android Studio', command: 'studio', lockfileName: 'studio-port' },
}

/**
 * Detected IDE information
 */
export interface DetectedIDE {
  type: IdeType
  displayName: string
  port?: number
  workspaceFolders: string[]
  isConnected: boolean
}

/**
 * IDE integration manager for native mode
 */
export class NativeIDEIntegration {
  private detectedIDE: DetectedIDE | null = null
  private cwd: string

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd
  }

  /**
   * Set working directory
   */
  setCwd(cwd: string): void {
    this.cwd = cwd
  }

  /**
   * Detect connected IDE
   *
   * Checks for running IDE processes and lock files.
   */
  async detectIDE(): Promise<DetectedIDE | null> {
    // Check environment variables first (set by IDE extension)
    const ssePort = process.env.CLAUDE_CODE_SSE_PORT
    if (ssePort) {
      const port = parseInt(ssePort, 10)
      const ideName = process.env.CLAUDE_CODE_IDE_NAME as IdeType | undefined
      const workspaceFolders = process.env.CLAUDE_CODE_WORKSPACE_FOLDERS?.split(':') || [this.cwd]

      if (ideName && IDE_CONFIGS[ideName]) {
        this.detectedIDE = {
          type: ideName,
          displayName: IDE_CONFIGS[ideName].displayName,
          port,
          workspaceFolders,
          isConnected: true,
        }
        return this.detectedIDE
      }

      // Generic IDE detection via port
      this.detectedIDE = {
        type: 'vscode',
        displayName: 'IDE',
        port,
        workspaceFolders,
        isConnected: true,
      }
      return this.detectedIDE
    }

    // Check lock files in standard locations
    const homeDir = process.env.HOME || process.env.USERPROFILE || ''
    const configDirs = [
      path.join(homeDir, '.cursor'),
      path.join(homeDir, '.windsurf'),
      path.join(homeDir, '.vscode'),
      path.join(homeDir, '.config', 'Code'),
    ]

    for (const dir of configDirs) {
      try {
        const lockfile = path.join(dir, 'port.lock')
        const content = await fs.readFile(lockfile, 'utf-8')
        const port = parseInt(content.trim(), 10)

        if (!isNaN(port) && port > 0) {
          const ideType = this.detectIdeTypeFromDir(dir)
          this.detectedIDE = {
            type: ideType,
            displayName: IDE_CONFIGS[ideType]?.displayName || 'IDE',
            port,
            workspaceFolders: [this.cwd],
            isConnected: true,
          }
          return this.detectedIDE
        }
      } catch {
        // Lock file doesn't exist or can't be read
      }
    }

    this.detectedIDE = null
    return null
  }

  /**
   * Detect IDE type from directory name
   */
  private detectIdeTypeFromDir(dir: string): IdeType {
    if (dir.includes('.cursor')) return 'cursor'
    if (dir.includes('.windsurf')) return 'windsurf'
    if (dir.includes('.vscode') || dir.includes('Code')) return 'vscode'
    return 'vscode'
  }

  /**
   * Get detected IDE
   */
  getDetectedIDE(): DetectedIDE | null {
    return this.detectedIDE
  }

  /**
   * Open file in IDE
   */
  async openFile(filePath: string, line?: number, column?: number): Promise<boolean> {
    const absolutePath = path.resolve(this.cwd, filePath)

    // Check if file exists
    try {
      await fs.access(absolutePath)
    } catch {
      console.error(`File not found: ${absolutePath}`)
      return false
    }

    // If we have a detected IDE with port, use HTTP API
    if (this.detectedIDE?.port) {
      try {
        const url = `http://127.0.0.1:${this.detectedIDE.port}/open`
        const body = JSON.stringify({
          file: absolutePath,
          line,
          column,
        })

        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        })
        return true
      } catch {
        // Fall through to command line
      }
    }

    // Fall back to command line
    const ideType = this.detectedIDE?.type || 'vscode'
    const command = IDE_CONFIGS[ideType]?.command || 'code'

    try {
      const args = line ? ['-g', absolutePath, `${line}:${column || 1}`] : [absolutePath]
      spawn(command, args, { stdio: 'ignore' })
      return true
    } catch (error) {
      console.error(`Failed to open file in IDE: ${error}`)
      return false
    }
  }

  /**
   * Open diff view in IDE
   */
  async openDiff(file1: string, file2: string, title?: string): Promise<boolean> {
    const absolutePath1 = path.resolve(this.cwd, file1)
    const absolutePath2 = path.resolve(this.cwd, file2)

    // If we have a detected IDE with port, use HTTP API
    if (this.detectedIDE?.port) {
      try {
        const url = `http://127.0.0.1:${this.detectedIDE.port}/diff`
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file1: absolutePath1,
            file2: absolutePath2,
            title,
          }),
        })
        return true
      } catch {
        // Fall through to command line
      }
    }

    // Fall back to command line diff
    const ideType = this.detectedIDE?.type || 'vscode'
    const command = IDE_CONFIGS[ideType]?.command || 'code'

    try {
      spawn(command, ['--diff', absolutePath1, absolutePath2], { stdio: 'ignore' })
      return true
    } catch (error) {
      console.error(`Failed to open diff in IDE: ${error}`)
      return false
    }
  }

  /**
   * Get current selection from IDE
   *
   * Requires IDE extension support.
   */
  async getSelection(): Promise<{ file: string; selection: string; range: { start: number; end: number } } | null> {
    if (!this.detectedIDE?.port) {
      return null
    }

    try {
      const url = `http://127.0.0.1:${this.detectedIDE.port}/selection`
      const response = await fetch(url)
      if (!response.ok) return null

      return await response.json()
    } catch {
      return null
    }
  }

  /**
   * Get workspace folders
   */
  getWorkspaceFolders(): string[] {
    return this.detectedIDE?.workspaceFolders || [this.cwd]
  }

  /**
   * Check if path is in workspace
   */
  isInWorkspace(filePath: string): boolean {
    const absolutePath = path.resolve(this.cwd, filePath)
    return this.getWorkspaceFolders().some(folder => absolutePath.startsWith(folder))
  }

  /**
   * Get relative path from workspace root
   */
  getRelativePath(filePath: string): string {
    const absolutePath = path.resolve(this.cwd, filePath)
    for (const folder of this.getWorkspaceFolders()) {
      if (absolutePath.startsWith(folder)) {
        return path.relative(folder, absolutePath)
      }
    }
    return path.relative(this.cwd, absolutePath)
  }
}

/**
 * Create IDE integration instance
 */
export function createNativeIDEIntegration(cwd?: string): NativeIDEIntegration {
  return new NativeIDEIntegration(cwd)
}
