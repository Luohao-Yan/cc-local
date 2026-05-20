/**
 * WorktreeManager — Git worktree management for parallel development.
 *
 * 1:1 match with official extension's worktree feature:
 *   - Creates a git worktree with a new branch
 *   - Opens the worktree in a new VS Code window
 *   - Tracks active worktrees for cleanup
 *   - symlinkDirectories: Creates symlinks in worktree for specified dirs (node_modules, etc.)
 *   - sparsePaths: Sparse checkout for large monorepo optimization
 *
 * Command: cclocal.createWorktree
 */

import * as vscode from 'vscode'
import { execFile } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'

const execFileAsync = promisify(execFile)

export interface WorktreeConfig {
  /** Directories to symlink from main repo into the worktree (e.g. ["node_modules", ".venv"]) */
  symlinkDirectories?: string[]
  /** Paths to include in sparse checkout (for large monorepos) */
  sparsePaths?: string[]
}

export interface WorktreeInfo {
  branch: string
  path: string
  createdAt: number
  config?: WorktreeConfig
}

export class WorktreeManager implements vscode.Disposable {
  private worktrees: WorktreeInfo[] = []
  private outputChannel: vscode.LogOutputChannel

  constructor(outputChannel: vscode.LogOutputChannel) {
    this.outputChannel = outputChannel
  }

  /** Create a new worktree with a new branch and open it in a new window */
  async createWorktree(branch: string, config?: WorktreeConfig): Promise<WorktreeInfo | undefined> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('No workspace folder open')
      return undefined
    }

    const sanitizedBranch = branch.replace(/[^a-zA-Z0-9_\-\/]/g, '-')
    const worktreePath = `${workspaceRoot}-worktree-${sanitizedBranch}`

    try {
      // 1. Create the worktree
      await execFileAsync('git', ['worktree', 'add', worktreePath, '-b', sanitizedBranch], {
        cwd: workspaceRoot,
        timeout: 30000,
      })

      const info: WorktreeInfo = {
        branch: sanitizedBranch,
        path: worktreePath,
        createdAt: Date.now(),
        config,
      }

      // 2. Set up sparse checkout if configured
      if (config?.sparsePaths && config.sparsePaths.length > 0) {
        await this.setupSparseCheckout(worktreePath, config.sparsePaths)
      }

      // 3. Create symlinks for specified directories
      if (config?.symlinkDirectories && config.symlinkDirectories.length > 0) {
        await this.createSymlinks(workspaceRoot, worktreePath, config.symlinkDirectories)
      }

      this.worktrees.push(info)
      this.outputChannel.info(`Created worktree: ${sanitizedBranch} at ${worktreePath}`)

      // 4. Open in new window
      await vscode.commands.executeCommand(
        'vscode.openFolder',
        vscode.Uri.file(worktreePath),
        true, // forceNewWindow
      )

      vscode.window.showInformationMessage(`Worktree created: ${sanitizedBranch}`)
      return info
    } catch (err: any) {
      const message = err?.message || String(err)
      vscode.window.showErrorMessage(`Failed to create worktree: ${message}`)
      this.outputChannel.error(`Worktree creation failed: ${message}`)
      return undefined
    }
  }

  /** List all worktrees managed by this extension */
  listWorktrees(): WorktreeInfo[] {
    return [...this.worktrees]
  }

  /** Remove a worktree by branch name */
  async removeWorktree(branch: string): Promise<boolean> {
    const info = this.worktrees.find(w => w.branch === branch)
    if (!info) return false

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
    if (!workspaceRoot) return false

    try {
      // Clean up symlinks before removing
      if (info.config?.symlinkDirectories) {
        for (const dir of info.config.symlinkDirectories) {
          const linkPath = path.join(info.path, dir)
          try {
            const stat = await fs.promises.lstat(linkPath)
            if (stat.isSymbolicLink()) {
              await fs.promises.unlink(linkPath)
            }
          } catch {
            // Ignore — may not exist
          }
        }
      }

      await execFileAsync('git', ['worktree', 'remove', info.path], {
        cwd: workspaceRoot,
        timeout: 30000,
      })

      this.worktrees = this.worktrees.filter(w => w.branch !== branch)
      this.outputChannel.info(`Removed worktree: ${branch}`)
      return true
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to remove worktree: ${err?.message}`)
      return false
    }
  }

  /** Set up sparse checkout for large monorepo optimization */
  private async setupSparseCheckout(worktreePath: string, sparsePaths: string[]): Promise<void> {
    try {
      // Enable sparse checkout
      await execFileAsync('git', ['sparse-checkout', 'init', '--cone'], {
        cwd: worktreePath,
        timeout: 10000,
      })

      // Set the sparse paths
      for (const sparsePath of sparsePaths) {
        await execFileAsync('git', ['sparse-checkout', 'set', sparsePath], {
          cwd: worktreePath,
          timeout: 10000,
        })
      }

      this.outputChannel.info(`Sparse checkout configured with paths: ${sparsePaths.join(', ')}`)
    } catch (err: any) {
      this.outputChannel.warn(`Sparse checkout setup failed: ${err?.message}`)
      // Non-fatal — continue without sparse checkout
    }
  }

  /** Create symlinks from main repo to worktree for specified directories */
  private async createSymlinks(mainRepoPath: string, worktreePath: string, directories: string[]): Promise<void> {
    for (const dir of directories) {
      const sourcePath = path.join(mainRepoPath, dir)
      const targetPath = path.join(worktreePath, dir)

      // Check if source exists
      try {
        await fs.promises.access(sourcePath, fs.constants.R_OK)
      } catch {
        this.outputChannel.debug(`Symlink source does not exist: ${sourcePath}`)
        continue
      }

      // Skip if target already exists
      try {
        await fs.promises.access(targetPath)
        this.outputChannel.debug(`Symlink target already exists: ${targetPath}`)
        continue
      } catch {
        // Good — target doesn't exist, proceed
      }

      // Ensure parent directory exists
      const targetDir = path.dirname(targetPath)
      try {
        await fs.promises.mkdir(targetDir, { recursive: true })
      } catch {
        // May already exist
      }

      // Create symlink (junction on Windows for directory symlinks)
      try {
        const type = process.platform === 'win32' ? 'junction' : 'dir'
        await fs.promises.symlink(sourcePath, targetPath, type)
        this.outputChannel.info(`Created symlink: ${targetPath} → ${sourcePath}`)
      } catch (err: any) {
        this.outputChannel.warn(`Failed to create symlink for ${dir}: ${err?.message}`)
      }
    }
  }

  dispose(): void {
    // Worktrees persist — no automatic cleanup
  }
}
