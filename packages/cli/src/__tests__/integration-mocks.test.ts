/**
 * External integration smoke tests using mock fixtures
 *
 * These tests verify that the native REPL and QueryEngine paths
 * handle external integration metadata correctly, without
 * requiring real IDE/Chrome/tmux/worktree connections.
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  createMockIdeMetadata,
  createMockChromeMetadata,
  createMockTmuxMetadata,
  createMockWorktreeDir,
  createMockPluginDir,
  createMockAuthToken,
  createMockSession,
  createMockUserMessage,
} from './mock-fixtures.js'

describe('external integration mocks', () => {
  describe('IDE integration', () => {
    it('produces valid IDE metadata', () => {
      const meta = createMockIdeMetadata()
      expect(meta.ide.name).toBe('vscode')
      expect(meta.ide.connected).toBe(true)
      expect(meta.openFiles).toHaveLength(2)
      expect(meta.diagnostics).toHaveLength(1)
    })

    it('includes file paths and languages', () => {
      const meta = createMockIdeMetadata()
      for (const file of meta.openFiles) {
        expect(file.path).toBeTruthy()
        expect(file.language).toBeTruthy()
        expect(typeof file.line).toBe('number')
      }
    })
  })

  describe('Chrome integration', () => {
    it('produces valid Chrome metadata', () => {
      const meta = createMockChromeMetadata()
      expect(meta.chrome.enabled).toBe(true)
      expect(meta.chrome.connected).toBe(true)
      expect(meta.chrome.tabUrl).toMatch(/^https?:\/\//)
    })
  })

  describe('tmux integration', () => {
    it('produces valid native tmux metadata', () => {
      const meta = createMockTmuxMetadata('native')
      expect(meta.tmux.mode).toBe('native')
      expect(meta.tmux.connected).toBe(true)
    })

    it('produces valid classic tmux metadata', () => {
      const meta = createMockTmuxMetadata('classic')
      expect(meta.tmux.mode).toBe('classic')
    })
  })

  describe('worktree', () => {
    it('creates a temporary worktree directory', () => {
      const wt = createMockWorktreeDir()
      expect(wt.path).toContain('cclocal-worktree-test')
      expect(wt.cleanup).toBeTypeOf('function')
      wt.cleanup()
    })
  })

  describe('plugin system', () => {
    it('creates a mock plugin with manifest', () => {
      const plugin = createMockPluginDir()
      expect(plugin.manifest.name).toBe('test-plugin')
      expect(plugin.manifest.commands).toHaveLength(1)
      expect(plugin.manifest.tools).toHaveLength(1)
      plugin.cleanup()
    })
  })

  describe('auth tokens', () => {
    it('produces a mock auth token', () => {
      const auth = createMockAuthToken()
      expect(auth.apiToken).toMatch(/^sk-test-/)
      expect(auth.serverUrl).toMatch(/^http:\/\/127\.0\.0\.1/)
    })
  })

  describe('session and message fixtures', () => {
    it('creates a mock session', () => {
      const session = createMockSession('/tmp/project')
      expect(session.id).toMatch(/^[0-9a-f-]+$/)
      expect(session.role).toBeUndefined() // session, not message
      expect(session.cwd).toBe('/tmp/project')
      expect(session.model).toBe('claude-sonnet-4-6')
    })

    it('creates a mock user message', () => {
      const msg = createMockUserMessage('hello world')
      expect(msg.role).toBe('user')
      expect(msg.content[0].type).toBe('text')
      expect(msg.content[0].text).toBe('hello world')
    })
  })
})
