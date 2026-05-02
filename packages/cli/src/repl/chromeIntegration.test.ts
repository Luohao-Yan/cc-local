/**
 * Tests for Chrome integration in native REPL
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock the heavy dependencies before importing
vi.mock('../utils/claudeInChrome/setup.js', () => ({
  shouldEnableClaudeInChrome: vi.fn(),
  shouldAutoEnableClaudeInChrome: vi.fn(),
  setupClaudeInChrome: vi.fn(),
}))

vi.mock('../utils/claudeInChrome/prompt.js', () => ({
  CLAUDE_IN_CHROME_SKILL_HINT: 'Chrome skill hint',
  CLAUDE_IN_CHROME_SKILL_HINT_WITH_WEBBROWSER: 'Chrome+WebBrowser hint',
  getChromeSystemPrompt: vi.fn(() => 'Chrome system prompt'),
}))

describe('Chrome integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('setupChromeIntegration', () => {
    it('returns disabled when neither enable nor auto-enable conditions met', async () => {
      const { shouldEnableClaudeInChrome, shouldAutoEnableClaudeInChrome } =
        await import('../utils/claudeInChrome/setup.js')

      vi.mocked(shouldEnableClaudeInChrome).mockReturnValue(false)
      vi.mocked(shouldAutoEnableClaudeInChrome).mockReturnValue(false)

      const { setupChromeIntegration } = await import('./chromeIntegration.js')

      const mockManager = {
        registerServer: vi.fn(),
        connectServer: vi.fn(),
        getServer: vi.fn(),
      }

      const result = await setupChromeIntegration(undefined, mockManager as any)
      expect(result.enabled).toBe(false)
      expect(result.systemPrompt).toBe('')
      expect(mockManager.registerServer).not.toHaveBeenCalled()
    })

    it('registers Chrome MCP server when explicitly enabled', async () => {
      const { shouldEnableClaudeInChrome } = await import('../utils/claudeInChrome/setup.js')
      const { setupClaudeInChrome } = await import('../utils/claudeInChrome/setup.js')

      vi.mocked(shouldEnableClaudeInChrome).mockReturnValue(true)
      vi.mocked(setupClaudeInChrome).mockReturnValue({
        mcpConfig: {
          'claude-in-chrome': {
            type: 'stdio',
            command: '/usr/bin/cclocal',
            args: ['--claude-in-chrome-mcp'],
            scope: 'dynamic',
          },
        },
        allowedTools: [
          'mcp__claude-in-chrome__tabs_context_mcp',
          'mcp__claude-in-chrome__tabs_create_mcp',
        ],
        systemPrompt: 'Chrome system prompt',
      })

      const { setupChromeIntegration } = await import('./chromeIntegration.js')

      const mockManager = {
        registerServer: vi.fn(),
        connectServer: vi.fn().mockResolvedValue({ status: 'connected' }),
        getServer: vi.fn().mockReturnValue(undefined),
      }

      const result = await setupChromeIntegration(true, mockManager as any)

      expect(result.enabled).toBe(true)
      expect(result.systemPrompt).toBe('Chrome system prompt')
      expect(mockManager.registerServer).toHaveBeenCalledWith({
        name: 'claude-in-chrome',
        config: expect.objectContaining({
          type: 'stdio',
          command: '/usr/bin/cclocal',
          args: ['--claude-in-chrome-mcp'],
        }),
      })
      expect(mockManager.connectServer).toHaveBeenCalledWith('claude-in-chrome')
    })

    it('uses skill hint for auto-enable', async () => {
      const { shouldEnableClaudeInChrome, shouldAutoEnableClaudeInChrome, setupClaudeInChrome } =
        await import('../utils/claudeInChrome/setup.js')

      vi.mocked(shouldEnableClaudeInChrome).mockReturnValue(false)
      vi.mocked(shouldAutoEnableClaudeInChrome).mockReturnValue(true)
      vi.mocked(setupClaudeInChrome).mockReturnValue({
        mcpConfig: {
          'claude-in-chrome': {
            type: 'stdio',
            command: 'node',
            args: ['mcp.js'],
            scope: 'dynamic',
          },
        },
        allowedTools: [],
        systemPrompt: 'Full chrome prompt',
      })

      const { setupChromeIntegration } = await import('./chromeIntegration.js')

      const mockManager = {
        registerServer: vi.fn(),
        connectServer: vi.fn().mockResolvedValue({ status: 'connected' }),
        getServer: vi.fn().mockReturnValue(undefined),
      }

      const result = await setupChromeIntegration(undefined, mockManager as any)

      expect(result.enabled).toBe(true)
      // Auto-enable should use the hint, not the full prompt
      expect(result.systemPrompt).toBe('Chrome skill hint')
    })

    it('skips registration if server already exists', async () => {
      const { shouldEnableClaudeInChrome, setupClaudeInChrome } =
        await import('../utils/claudeInChrome/setup.js')

      vi.mocked(shouldEnableClaudeInChrome).mockReturnValue(true)
      vi.mocked(setupClaudeInChrome).mockReturnValue({
        mcpConfig: {
          'claude-in-chrome': {
            type: 'stdio',
            command: 'node',
            args: ['mcp.js'],
            scope: 'dynamic',
          },
        },
        allowedTools: [],
        systemPrompt: 'prompt',
      })

      const { setupChromeIntegration } = await import('./chromeIntegration.js')

      const mockManager = {
        registerServer: vi.fn(),
        connectServer: vi.fn(),
        getServer: vi.fn().mockReturnValue({ name: 'claude-in-chrome', status: 'connected' }),
      }

      const result = await setupChromeIntegration(true, mockManager as any)

      expect(mockManager.registerServer).not.toHaveBeenCalled()
      expect(result.enabled).toBe(true)
    })

    it('silently handles auto-enable failure', async () => {
      const { shouldEnableClaudeInChrome, shouldAutoEnableClaudeInChrome, setupClaudeInChrome } =
        await import('../utils/claudeInChrome/setup.js')

      vi.mocked(shouldEnableClaudeInChrome).mockReturnValue(false)
      vi.mocked(shouldAutoEnableClaudeInChrome).mockReturnValue(true)
      vi.mocked(setupClaudeInChrome).mockImplementation(() => {
        throw new Error('Chrome not available')
      })

      const { setupChromeIntegration } = await import('./chromeIntegration.js')

      const mockManager = {
        registerServer: vi.fn(),
        connectServer: vi.fn(),
        getServer: vi.fn(),
      }

      // Should not throw
      const result = await setupChromeIntegration(undefined, mockManager as any)
      expect(result.enabled).toBe(false)
    })

    it('propagates error on explicit --chrome failure', async () => {
      const { shouldEnableClaudeInChrome, setupClaudeInChrome } =
        await import('../utils/claudeInChrome/setup.js')

      vi.mocked(shouldEnableClaudeInChrome).mockReturnValue(true)
      vi.mocked(setupClaudeInChrome).mockImplementation(() => {
        throw new Error('Platform unsupported')
      })

      const { setupChromeIntegration } = await import('./chromeIntegration.js')

      const mockManager = {
        registerServer: vi.fn(),
        connectServer: vi.fn(),
        getServer: vi.fn(),
      }

      await expect(setupChromeIntegration(true, mockManager as any)).rejects.toThrow(
        'Platform unsupported',
      )
    })
  })
})