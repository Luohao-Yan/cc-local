/**
 * Tmux integration for native REPL
 *
 * Handles the --tmux + --worktree fast-path: validates the flags,
 * calls execIntoTmuxWorktree() to create the worktree and tmux session,
 * and provides tmux environment detection for the startup banner.
 *
 * --tmux is a modifier of --worktree, not a standalone feature.
 * The inner Claude process (running inside tmux) doesn't see either flag.
 */

import { execIntoTmuxWorktree } from '../utils/worktree.js'
import { isWorktreeModeEnabled } from '../utils/worktreeModeEnabled.js'

export interface TmuxIntegrationResult {
  /** Whether the tmux fast-path was taken (process will exec) */
  handled: boolean
  /** Error message if validation or setup failed */
  error?: string
}

/**
 * Validate --tmux flag and execute the tmux+worktree fast-path.
 *
 * Returns { handled: true } if the process is about to exec into tmux.
 * Returns { handled: false, error? } if it should fall through.
 */
export async function handleTmuxWorktree(
  args: string[],
  tmuxFlag: boolean | string | undefined,
  worktreeFlag: string | boolean | undefined,
): Promise<TmuxIntegrationResult> {
  // --tmux without --worktree is invalid
  const hasTmux = tmuxFlag === true || tmuxFlag === 'classic' || args.includes('--tmux') || args.includes('--tmux=classic')
  const hasWorktree = worktreeFlag !== undefined && worktreeFlag !== false

  if (hasTmux && !hasWorktree) {
    return { handled: false, error: 'Error: --tmux requires --worktree' }
  }

  if (!hasTmux || !hasWorktree) {
    return { handled: false }
  }

  // Check if worktree mode is enabled (feature flag)
  if (!isWorktreeModeEnabled()) {
    return { handled: false, error: 'Error: --tmux --worktree is not enabled' }
  }

  // Delegate to the shared fast-path handler
  const result = await execIntoTmuxWorktree(args)
  return result
}

/**
 * Detect tmux environment for the startup banner.
 * Returns display info or null if not inside tmux.
 */
export function getTmuxInfo(): { sessionName: string; prefix: string; prefixConflicts: boolean } | null {
  if (!process.env.TMUX) {
    return null
  }

  const sessionName = process.env.CLAUDE_CODE_TMUX_SESSION ?? ''
  const prefix = process.env.CLAUDE_CODE_TMUX_PREFIX ?? 'C-b'
  const prefixConflicts = process.env.CLAUDE_CODE_TMUX_PREFIX_CONFLICTS === '1'

  return { sessionName, prefix, prefixConflicts }
}