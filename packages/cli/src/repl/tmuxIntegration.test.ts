/**
 * Tests for tmux integration in native REPL
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../utils/worktree.js', () => ({
  execIntoTmuxWorktree: vi.fn(),
}))

vi.mock('../utils/worktreeModeEnabled.js', () => ({
  isWorktreeModeEnabled: vi.fn(() => true),
}))

describe('Tmux integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.TMUX
    delete process.env.CLAUDE_CODE_TMUX_SESSION
    delete process.env.CLAUDE_CODE_TMUX_PREFIX
    delete process.env.CLAUDE_CODE_TMUX_PREFIX_CONFLICTS
  })

  describe('handleTmuxWorktree', () => {
    it('returns error when --tmux is used without --worktree', async () => {
      const { handleTmuxWorktree } = await import('./tmuxIntegration.js')
      const result = await handleTmuxWorktree(['--tmux'], true, undefined)
      expect(result.handled).toBe(false)
      expect(result.error).toContain('--tmux requires --worktree')
    })

    it('returns not handled when neither flag is set', async () => {
      const { handleTmuxWorktree } = await import('./tmuxIntegration.js')
      const result = await handleTmuxWorktree([], undefined, undefined)
      expect(result.handled).toBe(false)
      expect(result.error).toBeUndefined()
    })

    it('delegates to execIntoTmuxWorktree when both flags are present', async () => {
      const { execIntoTmuxWorktree } = await import('../utils/worktree.js')
      vi.mocked(execIntoTmuxWorktree).mockResolvedValue({ handled: true })

      const { handleTmuxWorktree } = await import('./tmuxIntegration.js')
      const result = await handleTmuxWorktree(
        ['--tmux', '--worktree', 'test-branch'],
        true,
        'test-branch',
      )

      expect(result.handled).toBe(true)
      expect(execIntoTmuxWorktree).toHaveBeenCalled()
    })

    it('passes through error from execIntoTmuxWorktree', async () => {
      const { execIntoTmuxWorktree } = await import('../utils/worktree.js')
      vi.mocked(execIntoTmuxWorktree).mockResolvedValue({
        handled: false,
        error: 'Platform unsupported',
      })

      const { handleTmuxWorktree } = await import('./tmuxIntegration.js')
      const result = await handleTmuxWorktree(
        ['--tmux', '--worktree', 'my-branch'],
        true,
        'my-branch',
      )

      expect(result.handled).toBe(false)
      expect(result.error).toBe('Platform unsupported')
    })
  })

  describe('getTmuxInfo', () => {
    it('returns null when not inside tmux', async () => {
      const { getTmuxInfo } = await import('./tmuxIntegration.js')
      expect(getTmuxInfo()).toBeNull()
    })

    it('detects tmux session from env vars', async () => {
      process.env.TMUX = '/tmp/tmux-1000/default,1234,0'
      process.env.CLAUDE_CODE_TMUX_SESSION = 'my-project_feature'
      process.env.CLAUDE_CODE_TMUX_PREFIX = 'C-a'
      process.env.CLAUDE_CODE_TMUX_PREFIX_CONFLICTS = '1'

      const { getTmuxInfo } = await import('./tmuxIntegration.js')
      const info = getTmuxInfo()

      expect(info).not.toBeNull()
      expect(info!.sessionName).toBe('my-project_feature')
      expect(info!.prefix).toBe('C-a')
      expect(info!.prefixConflicts).toBe(true)
    })

    it('uses default prefix when env var not set', async () => {
      process.env.TMUX = '/tmp/tmux-1000/default,1234,0'

      const { getTmuxInfo } = await import('./tmuxIntegration.js')
      const info = getTmuxInfo()

      expect(info).not.toBeNull()
      expect(info!.prefix).toBe('C-b')
      expect(info!.prefixConflicts).toBe(false)
    })
  })
})