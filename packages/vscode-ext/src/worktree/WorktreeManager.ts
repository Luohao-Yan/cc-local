/**
 * WorktreeManager — Git worktree management for parallel development.
 *
 * Matches official extension's worktree feature:
 *   - Creates a git worktree with a new branch
 *   - Opens the worktree in a new VS Code window
 *   - Tracks active worktrees for cleanup
 *
 * Command: cclocal.createWorktree
 */

import * as vscode from 'vscode'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export interface WorktreeInfo {
  branch: string
  path: string
  createdAt: number
}

export class WorktreeManager implements vscode.Disposable {
  private worktrees: WorktreeInfo[] = []
  private outputChannel: vscode.LogOutputChannel

  constructor(outputChannel: vscode.LogOutputChannel) {
    this.outputChannel = outputChannel
  }

  /** Create a new worktree with a new branch and open it in a new window */
  async createWorktree(branch: string): Promise<WorktreeInfo | undefined> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('No workspace folder open')
      return undefined
    }

    // Ensure branch name is valid
    const sanitizedBranch = branch.replace(/[^a-zA-Z0-9_\-\/]/g, '-')
    const worktreePath = `${workspaceRoot}-worktree-${sanitizedBranch}`

    try {
      // Create the worktree
      await execFileAsync('git', ['worktree', 'add', worktreePath, '-b', sanitizedBranch], {
        cwd: workspaceRoot,
        timeout: 30000,
      })

      const info: WorktreeInfo = {
        branch: sanitizedBranch,
        path: worktreePath,
        createdAt: Date.now(),
      }

      this.worktrees.push(info)
      this.outputChannel.info(`Created worktree: ${sanitizedBranch} at ${worktreePath}`)

      // Open in new window
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

  dispose(): void {
    // Worktrees persist — no automatic cleanup
  }
}
