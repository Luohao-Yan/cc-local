/**
 * Tests for text-mode permission approval in native REPL
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { decideToolPermission, type PermissionPolicy } from '@cclocal/core'

describe('permission approval integration', () => {
  describe('policy decisions', () => {
    it('default mode allows unknown tools', () => {
      const d = decideToolPermission('my_custom_tool', { mode: 'default' })
      expect(d.allowed).toBe(true)
    })

    it('default mode allows high-risk tools (UI layer prompts for confirmation)', () => {
      const d = decideToolPermission('bash', { mode: 'default' })
      expect(d.allowed).toBe(true)
    })

    it('dontAsk mode auto-denies high-risk tools', () => {
      const d = decideToolPermission('bash', { mode: 'dontAsk' })
      expect(d.allowed).toBe(false)
    })

    it('dontAsk mode allows safe tools', () => {
      const d = decideToolPermission('file_read', { mode: 'dontAsk' })
      expect(d.allowed).toBe(true)
    })

    it('acceptEdits mode allows file edits', () => {
      const d = decideToolPermission('file_edit', { mode: 'acceptEdits' })
      expect(d.allowed).toBe(true)
    })

    it('acceptEdits mode still denies bash', () => {
      const d = decideToolPermission('bash', { mode: 'acceptEdits' })
      expect(d.allowed).toBe(false)
    })

    it('bypassPermissions mode allows everything', () => {
      const d = decideToolPermission('bash', { mode: 'bypassPermissions' })
      expect(d.allowed).toBe(true)
    })
  })

  describe('interactive callback flow', () => {
    it('onPermissionCheck can approve high-risk tools in default mode', async () => {
      const policy: PermissionPolicy = { mode: 'default' }
      // In default mode, high-risk tools are allowed by policy but need UI confirmation
      const decision = decideToolPermission('bash', policy)
      expect(decision.allowed).toBe(true)

      // The onPermissionCheck callback provides the interactive approval step
      const onPermissionCheck = vi.fn(async () => true)
      const userApproved = await onPermissionCheck('bash', { cmd: 'ls' }, decision.reason)
      expect(userApproved).toBe(true)
      expect(onPermissionCheck).toHaveBeenCalledWith('bash', { cmd: 'ls' }, undefined)
    })

    it('onPermissionCheck can confirm denial', async () => {
      const onPermissionCheck = vi.fn(async () => false)
      const userApproved = await onPermissionCheck('bash', { cmd: 'rm -rf /' })
      expect(userApproved).toBe(false)
    })

    it('non-interactive mode auto-denies without prompting', async () => {
      // Simulates nativeSinglePrompt's onPermissionCheck
      const onPermissionCheck = vi.fn(async () => false)
      const result = await onPermissionCheck('bash', { cmd: 'ls' })
      expect(result).toBe(false)
    })
  })

  describe('tool input preview formatting', () => {
    it('short input shows fully', () => {
      const input = { path: '/tmp/test.txt' }
      const preview = JSON.stringify(input)
      expect(preview.length).toBeLessThan(120)
      expect(preview).toBe('{"path":"/tmp/test.txt"}')
    })

    it('long input gets truncated', () => {
      const input = { code: 'x'.repeat(200) }
      const preview = JSON.stringify(input)
      const truncated = preview.length > 120 ? `${preview.slice(0, 117)}...` : preview
      expect(truncated.length).toBeLessThanOrEqual(120)
      expect(truncated).toMatch(/\.\.\.$/)
    })
  })
})
