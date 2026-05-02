/**
 * Worktree integration for native REPL
 *
 * Handles the --worktree flag for the native REPL path:
 * - Validates the flag (requires git repo or hook)
 * - Creates the worktree via shared worktree utils
 * - Changes cwd into the worktree
 * - Returns worktree metadata for the startup banner
 */

import {
  createWorktreeForSession,
  generateTmuxSessionName,
  worktreeBranchName,
  isTmuxAvailable,
  createTmuxSessionForWorktree,
  type WorktreeSession,
} from '../utils/worktree.js'
import { hasWorktreeCreateHook } from '../utils/hooks.js'
import { findCanonicalGitRoot, findGitRoot, getIsGit } from '../utils/git.js'
import { getCwdState, setCwdState } from '../bootstrap/state.js'

export interface WorktreeIntegrationResult {
  /** Whether a worktree was created/resumed */
  created: boolean
  /** The worktree session metadata */
  session: WorktreeSession | null
  /** The effective cwd (worktree path if created) */
  effectiveCwd: string
  /** Error message if setup failed */
  error?: string
}

/**
 * Set up a worktree for the native REPL.
 *
 * Mirrors the worktree logic from setup.ts but without React/Ink dependencies.
 */
export async function setupWorktree(
  worktreeName: string | undefined,
  tmuxEnabled: boolean = false,
): Promise<WorktreeIntegrationResult> {
  const cwd = getCwdState()

  // Pre-flight: need git repo or hook
  const hasHook = hasWorktreeCreateHook()
  const inGit = await getIsGit()

  if (!hasHook && !inGit) {
    return {
      created: false,
      session: null,
      effectiveCwd: cwd,
      error: `Error: Can only use --worktree in a git repository, but ${cwd} is not a git repository. Configure a WorktreeCreate hook in settings.json to use --worktree with other VCS systems.`,
    }
  }

  // Generate slug
  const slug = worktreeName ?? `work-${Date.now().toString(36)}`
  let tmuxSessionName: string | undefined

  // Git preamble
  if (inGit) {
    const mainRepoRoot = findCanonicalGitRoot(cwd)
    if (mainRepoRoot) {
      // If inside a worktree, switch to main repo
      const gitRoot = findGitRoot(cwd) ?? cwd
      if (mainRepoRoot !== gitRoot) {
        process.chdir(mainRepoRoot)
        setCwdState(mainRepoRoot)
      }

      if (tmuxEnabled) {
        tmuxSessionName = generateTmuxSessionName(mainRepoRoot, worktreeBranchName(slug))
      }
    }
  } else if (hasHook && tmuxEnabled) {
    tmuxSessionName = generateTmuxSessionName(cwd, worktreeBranchName(slug))
  }

  // Create the worktree
  try {
    const worktreeSession = await createWorktreeForSession(
      'native-repl', // sessionId placeholder
      slug,
      tmuxSessionName,
    )

    // Create tmux session if enabled
    if (tmuxEnabled && tmuxSessionName) {
      if (await isTmuxAvailable()) {
        const tmuxResult = await createTmuxSessionForWorktree(
          tmuxSessionName,
          worktreeSession.worktreePath,
        )
        if (tmuxResult.created) {
          console.log(`Created tmux session: ${tmuxSessionName}`)
          console.log(`To attach: tmux attach -t ${tmuxSessionName}`)
        }
      }
    }

    // Change into worktree directory
    process.chdir(worktreeSession.worktreePath)
    setCwdState(worktreeSession.worktreePath)

    return {
      created: true,
      session: worktreeSession,
      effectiveCwd: worktreeSession.worktreePath,
    }
  } catch (err) {
    return {
      created: false,
      session: null,
      effectiveCwd: cwd,
      error: `Error creating worktree: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}